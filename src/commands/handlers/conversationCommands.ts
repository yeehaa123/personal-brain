/**
 * Conversation commands handler
 * Handles conversation-related commands like ask, save-note, and conversation-notes
 */

import type { NoteContext } from '@/mcp';
import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import { DependencyContainer } from '@/utils/dependencyContainer';
import logger from '@/utils/logger';

import { BaseCommandHandler } from '../core/baseCommandHandler';
import type { CommandInfo, CommandResult } from '../core/commandTypes';

/**
 * Handler for conversation-related commands
 */
export class ConversationCommandHandler extends BaseCommandHandler {
  private noteContext: NoteContext;

  constructor(brainProtocol: BrainProtocol) {
    super(brainProtocol);
    this.noteContext = brainProtocol.getNoteContext();
  }

  /**
   * Get supported commands
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'ask',
        description: 'Ask a question to your brain',
        usage: 'ask <question>',
        examples: ['ask "What are the principles of ecosystem architecture?"'],
      },
      {
        command: 'save-note',
        description: 'Create a note from recent conversation',
        usage: 'save-note [title]',
        examples: ['save-note', 'save-note "Ecosystem Architecture Discussion"'],
      },
      {
        command: 'conversation-notes',
        description: 'List notes created from conversations',
        usage: 'conversation-notes',
        examples: ['conversation-notes'],
      },
    ];
  }

  /**
   * Check if this handler can process the command
   */
  canHandle(command: string): boolean {
    return ['ask', 'save-note', 'confirm-save-note', 'conversation-notes'].includes(command);
  }

  /**
   * Execute a command
   */
  async execute(command: string, args: string): Promise<CommandResult> {
    switch (command) {
    case 'ask':
      return await this.handleAsk(args);
    case 'save-note':
      return await this.handleSaveNote(args);
    case 'conversation-notes':
      return await this.handleConversationNotes();
    default:
      return this.formatError(`Unknown command: ${command}`);
    }
  }

  /**
   * Handle ask command
   */
  private async handleAsk(question: string): Promise<CommandResult> {
    if (!question) {
      return this.formatError('Please provide a question');
    }

    // Check for API key
    if (!this.requireApiKey()) {
      return this.formatError(this.getApiKeyErrorMessage());
    }

    try {
      const result = await this.brainProtocol.processQuery(question);
      
      // DEBUG: Log the answer to check for HTML content
      logger.debug(`[DEBUG ASK] Raw answer from processQuery: ${result.answer.substring(0, 100)}...`);
      if (result.answer.includes('<') && result.answer.includes('>')) {
        logger.warn(`[DEBUG ASK] Found HTML tags in answer: ${result.answer.substring(0, 200)}...`);
      }

      return {
        type: 'ask',
        answer: result.answer,
        citations: result.citations,
        relatedNotes: result.relatedNotes,
        profile: result.profile,
        externalSources: result.externalSources,
      };
    } catch (error: unknown) {
      return this.formatError(`Error processing question: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle save-note command
   */
  private async handleSaveNote(title?: string): Promise<CommandResult> {
    // Check if conversation memory is initialized
    if (!this.hasActiveConversation()) {
      return this.formatError('No active conversation. Start a conversation first.');
    }

    // Get the current conversation and recent turns
    const conversationId = this.brainProtocol.getCurrentConversationId();
    if (!conversationId) {
      return this.formatError('No active conversation found.');
    }

    // Get the conversation
    const conversation = await this.brainProtocol.getConversation(conversationId);
    if (!conversation) {
      return this.formatError('Conversation not found.');
    }

    // Get all active turns from the conversation
    const turns: ConversationTurn[] = conversation.activeTurns;
    
    // Enhanced debugging for conversation content
    logger.debug(`Conversation ID: ${conversationId}`);
    logger.debug(`Interface type: ${conversation.interfaceType}`);
    logger.debug(`Number of turns: ${turns.length}`);
    
    // Log details about all turns to diagnose issues
    turns.forEach((turn, index) => {
      const isUser = !turn.userId?.startsWith('assistant');
      const role = isUser ? 'User' : 'Assistant';
      
      logger.debug(`Turn ${index + 1} (${role}):`);
      if (isUser) {
        logger.debug(`  Query: ${turn.query.substring(0, 50)}...`);
      } else {
        logger.debug(`  Response length: ${turn.response?.length || 0}`);
        
        if (turn.response) {
          // Check for HTML content
          const responsePreview = turn.response.substring(0, 100);
          logger.debug(`  Response preview: ${responsePreview}`);
          
          if (responsePreview.includes('<') && responsePreview.includes('>')) {
            logger.warn(`  Found potential HTML in response: ${responsePreview}`);
          }
        } else {
          logger.warn(`  Empty response in turn ${index + 1}`);
        }
      }
    });
    
    if (turns.length === 0) {
      return this.formatError('Conversation has no turns to save.');
    }

    // Get the ConversationToNoteService
    const conversationToNoteService = this.getConversationToNoteService();

    // In preview mode, just show the content that would be saved
    const preview = await conversationToNoteService.prepareNotePreview(
      conversation,
      turns,
      title,
    );

    // Return preview for confirmation
    return {
      type: 'save-note-preview',
      noteContent: preview.content,
      title: preview.title,
      conversationId,
    };
  }

  /**
   * Handle the second part of save-note after user confirmation
   */
  async confirmSaveNote(conversationId: string, title?: string, userEdits?: string): Promise<CommandResult> {
    // Get the conversation
    const conversation = await this.brainProtocol.getConversation(conversationId);
    if (!conversation) {
      return this.formatError('Conversation not found.');
    }

    // Get all active turns from the conversation
    const turns: ConversationTurn[] = conversation.activeTurns;
    if (turns.length === 0) {
      return this.formatError('Conversation has no turns to save.');
    }

    // Get the ConversationToNoteService
    const conversationToNoteService = this.getConversationToNoteService();

    // Create the note
    const note = await conversationToNoteService.createNoteFromConversation(
      conversation,
      turns,
      title,
      userEdits,
    );

    return {
      type: 'save-note-confirm',
      noteId: note.id,
      title: note.title,
    };
  }

  /**
   * Handle conversation-notes command
   */
  private async handleConversationNotes(): Promise<CommandResult> {
    // Get the ConversationToNoteService
    const conversationToNoteService = this.getConversationToNoteService();

    // Get all notes created from conversations
    const notes = await conversationToNoteService.findConversationNotes(10, 0);

    if (notes.length === 0) {
      return this.formatError('No notes created from conversations found.');
    }

    return {
      type: 'conversation-notes',
      notes,
    };
  }

  /**
   * Get or create the ConversationToNoteService
   */
  private getConversationToNoteService(): ConversationToNoteService {
    const serviceRegistry = DependencyContainer.getInstance();
    
    if (serviceRegistry.isRegistered('conversationToNoteService')) {
      return serviceRegistry.resolve('conversationToNoteService');
    } else {
      // Create the service with required dependencies
      const noteRepository = this.noteContext.getNoteRepository();
      const noteEmbeddingService = this.noteContext.getNoteEmbeddingService();
      
      // Create new service without explicitly passing memory storage,
      // it will use the singleton instance internally
      const conversationToNoteService = new ConversationToNoteService(
        noteRepository,
        noteEmbeddingService,
      );
      
      // Register for future use
      serviceRegistry.register('conversationToNoteService', () => conversationToNoteService, true);
      return conversationToNoteService;
    }
  }
}