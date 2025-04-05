/**
 * Shared command handlers for the CLI and Matrix interfaces
 * This module defines the core command logic that can be reused across interfaces
 */


import type { ExternalCitation, ExternalSourceContext, NoteContext, ProfileContext } from '@/mcp';
import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import { DependencyContainer } from '@/utils/dependencyContainer';
import logger from '@/utils/logger';

/**
 * Command result types to make interfaces easier to manage
 */

/**
 * Interface for command descriptions
 */
export interface CommandInfo {
  command: string;
  description: string;
  usage: string;
  examples?: string[];
}

export type CommandResult =
  | { type: 'error'; message: string }
  | { type: 'help'; commands: CommandInfo[] }
  | { type: 'profile'; profile: Profile }
  | { type: 'profile-related'; profile: Profile; relatedNotes: Note[]; matchType: 'tags' | 'semantic' | 'keyword' }
  | { type: 'notes'; notes: Note[]; title?: string }
  | { type: 'note'; note: Note }
  | { type: 'tags'; tags: Array<{ tag: string; count: number }> }
  | { type: 'search'; query: string; notes: Note[] }
  | { type: 'ask'; answer: string; citations: Array<{ noteId: string; noteTitle: string; excerpt: string }>; relatedNotes: Note[]; profile: Profile | undefined; externalSources: ExternalCitation[] | undefined }
  | { type: 'external'; enabled: boolean; message: string }
  | {
    type: 'status'; status: {
      apiConnected: boolean;
      dbConnected: boolean;
      noteCount: number;
      externalSources: Record<string, boolean>;
      externalSourcesEnabled: boolean;
    }
  }
  | { type: 'save-note-preview'; noteContent: string; title: string; conversationId: string }
  | { type: 'save-note-confirm'; noteId: string; title: string }
  | { type: 'conversation-notes'; notes: Note[] };

/**
 * Command handler for processing commands and returning structured results
 */
export class CommandHandler {
  private brainProtocol: BrainProtocol;
  private noteContext: NoteContext;
  private profileContext: ProfileContext;
  private externalContext: ExternalSourceContext;

  constructor(brainProtocol: BrainProtocol) {
    this.brainProtocol = brainProtocol;
    this.noteContext = brainProtocol.getNoteContext();
    this.profileContext = brainProtocol.getProfileContext();
    this.externalContext = brainProtocol.getExternalSourceContext();
  }

  /**
   * Get all available commands with their descriptions
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'help',
        description: 'Show available commands',
        usage: 'help',
      },
      {
        command: 'search',
        description: 'Search for notes',
        usage: 'search <query>',
        examples: ['search ecosystem', 'search "personal knowledge"'],
      },
      {
        command: 'tags',
        description: 'List all tags in the system',
        usage: 'tags',
      },
      {
        command: 'list',
        description: 'List all notes or notes with a specific tag',
        usage: 'list [tag]',
        examples: ['list', 'list ecosystem'],
      },
      {
        command: 'note',
        description: 'Show a specific note by ID',
        usage: 'note <id>',
        examples: ['note abc123'],
      },
      {
        command: 'profile',
        description: 'View your profile information',
        usage: 'profile [related]',
        examples: ['profile', 'profile related'],
      },
      {
        command: 'ask',
        description: 'Ask a question to your brain',
        usage: 'ask <question>',
        examples: ['ask "What are the principles of ecosystem architecture?"'],
      },
      {
        command: 'external',
        description: 'Enable or disable external knowledge sources',
        usage: 'external <on|off>',
        examples: ['external on', 'external off'],
      },
      {
        command: 'status',
        description: 'Check system status including external sources',
        usage: 'status',
        examples: ['status'],
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
   * Process a command and return a structured result
   */
  async processCommand(command: string, args: string): Promise<CommandResult> {
    try {
      switch (command) {
      case 'search':
        return await this.handleSearch(args);
      case 'list':
        return await this.handleList(args);
      case 'tags':
        return await this.handleTags();
      case 'note':
        return await this.handleNote(args);
      case 'profile':
        return await this.handleProfile(args);
      case 'ask':
        return await this.handleAsk(args);
      case 'external':
        return await this.handleExternal(args);
      case 'status':
        return await this.handleStatus();
      case 'save-note':
        return await this.handleSaveNote(args);
      case 'conversation-notes':
        return await this.handleConversationNotes();
      default:
        return { type: 'error', message: `Unknown command: ${command}` };
      }
    } catch (error: unknown) {
      return {
        type: 'error',
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Handle search command
   */
  private async handleSearch(query: string): Promise<CommandResult> {
    if (!query) {
      return { type: 'error', message: 'Please provide a search query' };
    }

    const notes = await this.noteContext.searchNotes({ query, limit: 10 });
    return { type: 'search', query, notes };
  }

  /**
   * Handle list command
   */
  private async handleList(tagFilter?: string): Promise<CommandResult> {
    let notes: Note[];
    let title: string;

    if (tagFilter) {
      notes = await this.noteContext.searchNotes({ tags: [tagFilter], limit: 10 });
      title = `Notes with tag: ${tagFilter}`;

      if (notes.length === 0) {
        return { type: 'error', message: `No notes found with tag: ${tagFilter}` };
      }
    } else {
      notes = await this.noteContext.searchNotes({ limit: 10 });
      title = 'Recent Notes';

      if (notes.length === 0) {
        return { type: 'error', message: 'No notes found in the system' };
      }
    }

    return { type: 'notes', notes, title };
  }

  /**
   * Handle tags command
   */
  private async handleTags(): Promise<CommandResult> {
    // Get all notes
    const allNotes = await this.noteContext.searchNotes({ limit: 1000 });

    // Extract and count all tags
    const tagCounts: { [tag: string]: number } = {};

    allNotes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          if (typeof tag === 'string') {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });

    // Sort tags by count
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    if (sortedTags.length === 0) {
      return { type: 'error', message: 'No tags found in the system' };
    }

    return { type: 'tags', tags: sortedTags };
  }

  /**
   * Handle note command
   */
  private async handleNote(noteId: string): Promise<CommandResult> {
    if (!noteId) {
      return { type: 'error', message: 'Please provide a note ID' };
    }

    const note = await this.noteContext.getNoteById(noteId);

    if (!note) {
      return { type: 'error', message: `Note with ID ${noteId} not found` };
    }

    return { type: 'note', note };
  }

  /**
   * Handle profile command
   */
  private async handleProfile(args: string): Promise<CommandResult> {
    const profile = await this.profileContext.getProfile();

    if (!profile) {
      return { type: 'error', message: 'No profile found. Use "bun run src/import.ts profile <path/to/profile.yaml>" to import a profile.' };
    }

    // Check if we want related notes
    if (args && args.toLowerCase() === 'related') {
      const noteContext = this.brainProtocol.getNoteContext();
      const relatedNotes = await this.profileContext.findRelatedNotes(noteContext, 5);

      // Determine match type
      let matchType: 'tags' | 'semantic' | 'keyword' = 'keyword';
      if (profile.tags && profile.tags.length > 0) {
        matchType = 'tags';
      } else if (profile.embedding) {
        matchType = 'semantic';
      }

      // Type assertion to resolve compatibility issue between NoteWithSimilarity and Note types
      return {
        type: 'profile-related',
        profile,
        // Ensure type compatibility by using a properly typed mapping function
        relatedNotes: relatedNotes.map(note => ({
          id: note.id,
          title: note.title, 
          content: note.content,
          embedding: note.embedding || null,
          tags: note.tags || null,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          source: note.source || 'import',
          confidence: note.confidence || null,
          conversationMetadata: note.conversationMetadata || null,
          verified: note.verified || false,
        })),
        matchType,
      };
    }

    return {
      type: 'profile',
      profile,
    };
  }

  /**
   * Handle ask command
   */
  private async handleAsk(question: string): Promise<CommandResult> {
    if (!question) {
      return { type: 'error', message: 'Please provide a question' };
    }

    // Use aiConfig to check for API key instead of direct process.env access
    if (!this.brainProtocol.hasAnthropicApiKey()) {
      return { type: 'error', message: 'No Anthropic API key found. Set the ANTHROPIC_API_KEY environment variable to use this feature.' };
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
      return { type: 'error', message: `Error processing question: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Handle external command - toggle external sources
   */
  private async handleExternal(args: string): Promise<CommandResult> {
    const arg = args.trim().toLowerCase();

    if (arg === 'on' || arg === 'enable') {
      this.brainProtocol.setUseExternalSources(true);
      return {
        type: 'external',
        enabled: true,
        message: 'External knowledge sources have been enabled.',
      };
    } else if (arg === 'off' || arg === 'disable') {
      this.brainProtocol.setUseExternalSources(false);
      return {
        type: 'external',
        enabled: false,
        message: 'External knowledge sources have been disabled.',
      };
    } else {
      return {
        type: 'error',
        message: 'Usage: external <on|off> - Enable or disable external knowledge sources',
      };
    }
  }

  /**
   * Handle status command - check system status
   */
  private async handleStatus(): Promise<CommandResult> {
    // Check API connection using BrainProtocol methods
    const apiConnected = this.brainProtocol.hasAnthropicApiKey() || this.brainProtocol.hasOpenAIApiKey();

    // Check database connection with a single operation
    let dbConnected = false;
    let noteCount = 0;

    try {
      // Get recent notes - this operation will tell us both if DB is connected
      // and how many notes exist (length of returned array)
      const notes = await this.noteContext.searchNotes({ limit: 1 });
      dbConnected = true;

      // If we were able to get notes, we can also get the total count
      try {
        noteCount = await this.noteContext.getNoteCount();
      } catch (countError) {
        // If count fails but we got notes, use the notes array length as fallback
        noteCount = notes.length;
        logger.error(`Error getting note count, using fallback: ${countError}`);
      }
    } catch (error) {
      logger.error(`Error checking database connection: ${error}`);
      dbConnected = false;
    }

    // Check external sources with error handling
    let externalSources = {};
    try {
      externalSources = await this.externalContext.checkSourcesAvailability();
    } catch (error) {
      logger.error(`Error checking external sources: ${error}`);
      // Failed to check external sources, continue with empty object
    }

    const externalSourcesEnabled = this.brainProtocol.getUseExternalSources();

    return {
      type: 'status',
      status: {
        apiConnected,
        dbConnected,
        noteCount,
        externalSources,
        externalSourcesEnabled,
      },
    };
  }

  /**
   * Handle save-note command
   */
  private async handleSaveNote(title?: string): Promise<CommandResult> {
    // Check if conversation memory is initialized
    if (!this.brainProtocol.hasActiveConversation()) {
      return { type: 'error', message: 'No active conversation. Start a conversation first.' };
    }

    // Get the current conversation and recent turns
    const conversationId = this.brainProtocol.getCurrentConversationId();
    if (!conversationId) {
      return { type: 'error', message: 'No active conversation found.' };
    }

    // Get the conversation
    const conversation = await this.brainProtocol.getConversation(conversationId);
    if (!conversation) {
      return { type: 'error', message: 'Conversation not found.' };
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
      return { type: 'error', message: 'Conversation has no turns to save.' };
    }

    // Get or create the ConversationToNoteService
    const serviceRegistry = DependencyContainer.getInstance();
    let conversationToNoteService: ConversationToNoteService;
    
    if (serviceRegistry.isRegistered('conversationToNoteService')) {
      conversationToNoteService = serviceRegistry.resolve('conversationToNoteService');
    } else {
      // Create the service with required dependencies
      const noteRepository = this.noteContext.getNoteRepository();
      const noteEmbeddingService = this.noteContext.getNoteEmbeddingService();
      
      // Create new service without explicitly passing memory storage,
      // it will use the singleton instance internally
      conversationToNoteService = new ConversationToNoteService(
        noteRepository,
        noteEmbeddingService,
      );
      
      // Register for future use
      serviceRegistry.register('conversationToNoteService', () => conversationToNoteService, true);
    }

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
      return { type: 'error', message: 'Conversation not found.' };
    }

    // Get all active turns from the conversation
    const turns: ConversationTurn[] = conversation.activeTurns;
    if (turns.length === 0) {
      return { type: 'error', message: 'Conversation has no turns to save.' };
    }

    // Get the ConversationToNoteService
    const serviceRegistry = DependencyContainer.getInstance();
    const conversationToNoteService = serviceRegistry.resolve<ConversationToNoteService>('conversationToNoteService');

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
    const serviceRegistry = DependencyContainer.getInstance();
    let conversationToNoteService: ConversationToNoteService;
    
    if (serviceRegistry.isRegistered('conversationToNoteService')) {
      conversationToNoteService = serviceRegistry.resolve('conversationToNoteService');
    } else {
      // Create the service with required dependencies
      const noteRepository = this.noteContext.getNoteRepository();
      const noteEmbeddingService = this.noteContext.getNoteEmbeddingService();
      
      // Create new service without explicitly passing memory storage,
      // it will use the singleton instance internally
      conversationToNoteService = new ConversationToNoteService(
        noteRepository,
        noteEmbeddingService,
      );
      
      // Register for future use
      serviceRegistry.register('conversationToNoteService', () => conversationToNoteService, true);
    }

    // Get all notes created from conversations
    const notes = await conversationToNoteService.findConversationNotes(10, 0);

    if (notes.length === 0) {
      return { type: 'error', message: 'No notes created from conversations found.' };
    }

    return {
      type: 'conversation-notes',
      notes,
    };
  }

}
