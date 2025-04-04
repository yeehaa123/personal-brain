/**
 * Service for converting conversations to permanent notes
 */
import { nanoid } from 'nanoid';

import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import type { NewNote, Note } from '@/models/note';
import logger from '@/utils/logger';
import { extractTags } from '@/utils/tagExtractor';

import type { NoteEmbeddingService } from './noteEmbeddingService';
import type { NoteRepository } from './noteRepository';

export class ConversationToNoteService {
  private noteRepository: NoteRepository;
  private embeddingService: NoteEmbeddingService;
  private memoryStorage: InMemoryStorage;

  constructor(
    noteRepository: NoteRepository, 
    embeddingService: NoteEmbeddingService,
    memoryStorage?: InMemoryStorage,
  ) {
    this.noteRepository = noteRepository;
    this.embeddingService = embeddingService;
    
    // Use provided storage or get singleton instance
    // Note: In tests, always use createFresh() and pass it explicitly for proper isolation
    this.memoryStorage = memoryStorage || InMemoryStorage.getInstance();
  }

  /**
   * Create a note from conversation turns
   */
  async createNoteFromConversation(
    conversation: Conversation,
    turns: ConversationTurn[],
    title?: string,
    userEdits?: string,
  ): Promise<Note> {
    // Generate note content from conversation turns with attribution
    const content = this.formatConversationAsNote(turns, userEdits);
    
    // Generate title if not provided
    const noteTitle = title || this.generateTitleFromConversation(turns);
    
    // Extract tags from content
    const tags = await this.generateTagsFromContent(content);
    
    // Create new note
    const newNote: NewNote = {
      id: `note-${nanoid(8)}`,
      title: noteTitle,
      content,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'conversation',
      conversationMetadata: {
        conversationId: conversation.id,
        timestamp: new Date(),
        userName: this.getMainUserName(turns),
        promptSegment: turns.map(t => t.query).join(' ').substring(0, 100),
      },
      confidence: 75, // Default confidence score
      verified: false,
    };
    
    // Save note
    // Convert null values to undefined for insertNote
    const insertData = {
      ...newNote,
      embedding: newNote.embedding === null ? undefined : newNote.embedding,
      tags: newNote.tags === null ? undefined : newNote.tags,
    };
    
    // We need to use insertNote method from NoteRepository
    const noteId = await this.noteRepository.insertNote(insertData);
    const note = await this.noteRepository.getNoteById(noteId) as Note;
    
    // Generate embeddings - pass full content for embedding generation
    if (note.id) {
      await this.embeddingService.generateNoteEmbedding(note.id, content);
    }
    
    // Update conversation to link to the note
    await this.updateConversationWithNoteLink(conversation.id, turns, note.id);
    
    return note;
  }

  /**
   * Format conversation turns into a note with attribution
   */
  private formatConversationAsNote(turns: ConversationTurn[], userEdits?: string): string {
    // Use userEdits content if provided (user has edited the conversation)
    if (userEdits) {
      return this.addAttributionHeader(userEdits, turns);
    }
    
    // Format the conversation as a note with attribution
    const formattedContent = turns.map(turn => {
      // We don't need userName here, just using turn role
      const isUser = !turn.userId?.startsWith('assistant');
      
      return isUser
        ? `**Question**: ${turn.query}\n\n`
        : `**Answer**: ${turn.response}\n\n`;
    }).join('');
    
    return this.addAttributionHeader(formattedContent, turns);
  }
  
  /**
   * Add attribution header to note content
   */
  private addAttributionHeader(content: string, turns: ConversationTurn[]): string {
    const firstTurn = turns[0];
    // We don't need lastTurn for now
    const dateStr = firstTurn.timestamp.toISOString().split('T')[0];
    
    const header = `> **Note**: This content was derived from a conversation on ${dateStr}.
> **Source**: Conversation with AI assistant
> **Original Query**: "${firstTurn.query}"

`;
    
    return header + content;
  }
  
  /**
   * Generate a title from conversation turns
   */
  private generateTitleFromConversation(turns: ConversationTurn[]): string {
    // Use the first user query as the basis for the title
    const firstQuery = turns[0]?.query || '';
    
    // Limit to a reasonable title length
    return firstQuery.length > 50
      ? `${firstQuery.substring(0, 47)}...`
      : firstQuery;
  }
  
  /**
   * Generate tags for note content
   */
  private async generateTagsFromContent(content: string): Promise<string[]> {
    try {
      return await extractTags(content);
    } catch (error) {
      // Log at debug level since we have a fallback mechanism
      logger.debug('Tag extraction API failed, using fallback keyword extraction:', error);
      // Extract keywords as fallback
      return this.extractKeywords(content);
    }
  }
  
  /**
   * Extract keywords from content as a fallback for tag generation
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction logic
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
      
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Sort by frequency and return top 5
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  /**
   * Get the main user name from conversation turns
   */
  private getMainUserName(turns: ConversationTurn[]): string {
    // Filter to user turns only
    const userTurns = turns.filter(turn => !turn.userId?.startsWith('assistant'));
    
    // Get the most frequent user name
    const userNameCount: Record<string, number> = {};
    userTurns.forEach(turn => {
      const name = turn.userName || 'User';
      userNameCount[name] = (userNameCount[name] || 0) + 1;
    });
    
    // Return the most frequent user name
    const sortedNames = Object.entries(userNameCount)
      .sort((a, b) => b[1] - a[1]);
    return sortedNames[0]?.[0] || 'User';
  }
  
  /**
   * Update conversation to link to the created note
   */
  private async updateConversationWithNoteLink(
    conversationId: string,
    _turns: ConversationTurn[],
    noteId: string,
  ): Promise<void> {
    try {
      // Get the conversation from storage
      const conversation = await this.memoryStorage.getConversation(conversationId);
      
      if (!conversation) {
        logger.warn(`Cannot link note: Conversation ${conversationId} not found`);
        return;
      }
      
      // Update the conversation metadata to include the note ID
      await this.memoryStorage.updateMetadata(conversationId, {
        noteId,
        noteCreatedAt: new Date(),
      });
      
      logger.info(`Linked conversation ${conversationId} to note ${noteId}`);
    } catch (error) {
      logger.error(`Error linking conversation ${conversationId} to note ${noteId}:`, error);
    }
  }
  
  /**
   * Find notes created from conversations
   */
  async findConversationNotes(_limit = 10, _offset = 0): Promise<Note[]> {
    // Now we can implement this with the findBySource method
    return this.noteRepository.findBySource('conversation', _limit, _offset);
  }
  
  /**
   * Find notes linked to a specific conversation
   */
  async findNotesByConversationId(_conversationId: string): Promise<Note[]> {
    // This would call a method on NoteRepository that we'll implement
    return this.noteRepository.findByConversationMetadata('conversationId', _conversationId);
  }

  /**
   * Prepare conversation preview for user approval
   */
  async prepareNotePreview(
    _conversation: Conversation,
    turns: ConversationTurn[],
    suggestedTitle?: string,
  ): Promise<{ content: string; title: string }> {
    const content = this.formatConversationAsNote(turns);
    const title = suggestedTitle || this.generateTitleFromConversation(turns);
    
    return { content, title };
  }

  /**
   * Highlight an important segment of conversation
   */
  async highlightConversationSegment(
    conversationId: string,
    turnId: string,
    text: string,
  ): Promise<boolean> {
    // This will be implemented when we have access to the conversation storage
    logger.debug(`Highlighting segment in conversation ${conversationId}, turn ${turnId}: ${text}`);
    return true; // Placeholder for successful operation
  }
}