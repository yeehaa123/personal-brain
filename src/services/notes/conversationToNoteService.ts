/**
 * Service for converting conversations to permanent notes
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import { nanoid } from 'nanoid';

import { ConversationContext, type ConversationStorage } from '@/contexts/conversations';
import type { NewNote, Note } from '@/models/note';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';
import { Logger } from '@/utils/logger';
import { extractTags } from '@/utils/tagExtractor';

import { NoteEmbeddingService } from './noteEmbeddingService';
import { NoteRepository } from './noteRepository';

export class ConversationToNoteService {
  private noteRepository: NoteRepository;
  private embeddingService: NoteEmbeddingService;
  private conversationStorage: ConversationStorage;
  
  /**
   * Singleton instance of ConversationToNoteService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ConversationToNoteService | null = null;
  
  /**
   * Logger instance for this class
   */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param noteRepository Repository for accessing notes (defaults to singleton instance)
   * @param embeddingService Service for note embeddings (defaults to singleton instance)
   * @param conversationStorage Optional custom conversation storage
   * @returns The singleton instance
   */
  public static getInstance(
    noteRepository?: NoteRepository,
    embeddingService?: NoteEmbeddingService,
    conversationStorage?: ConversationStorage,
  ): ConversationToNoteService {
    if (!ConversationToNoteService.instance) {
      // Get dependencies from their respective singletons if not provided
      const actualRepository = noteRepository ?? NoteRepository.getInstance();
      const actualEmbeddingService = embeddingService ?? NoteEmbeddingService.getInstance();
      
      ConversationToNoteService.instance = new ConversationToNoteService(
        actualRepository,
        actualEmbeddingService,
        conversationStorage,
      );
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ConversationToNoteService singleton instance created');
    } else if (noteRepository || embeddingService || conversationStorage) {
      // Log a warning if trying to get instance with different dependencies
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.warn('getInstance called with dependencies but instance already exists. Dependencies ignored.');
    }
    
    return ConversationToNoteService.instance;
  }
  
  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (ConversationToNoteService.instance) {
        // No specific cleanup needed for this service
      }
    } catch (error) {
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.error('Error during ConversationToNoteService instance reset:', error);
    } finally {
      ConversationToNoteService.instance = null;
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ConversationToNoteService singleton instance reset');
    }
  }
  
  /**
   * Create a fresh service instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param noteRepository Repository for accessing notes
   * @param embeddingService Service for note embeddings
   * @param conversationStorage Optional custom conversation storage
   * @returns A new ConversationToNoteService instance
   */
  public static createFresh(
    noteRepository: NoteRepository,
    embeddingService: NoteEmbeddingService,
    conversationStorage?: ConversationStorage,
  ): ConversationToNoteService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ConversationToNoteService instance');
    
    return new ConversationToNoteService(noteRepository, embeddingService, conversationStorage);
  }
  
  /**
   * Create a new ConversationToNoteService
   * 
   * While this constructor is public, it is recommended to use the factory methods
   * getInstance() or createFresh() instead to ensure consistent instance management.
   * 
   * @param noteRepository Repository for accessing notes
   * @param embeddingService Service for note embeddings
   * @param conversationStorage Optional custom conversation storage
   */
  constructor(
    noteRepository: NoteRepository, 
    embeddingService: NoteEmbeddingService,
    conversationStorage?: ConversationStorage,
  ) {
    this.logger.debug('Creating ConversationToNoteService instance');
    
    // Validate required dependencies
    if (!noteRepository) {
      throw new Error('NoteRepository is required for ConversationToNoteService');
    }
    
    if (!embeddingService) {
      throw new Error('NoteEmbeddingService is required for ConversationToNoteService');
    }
    
    this.noteRepository = noteRepository;
    this.embeddingService = embeddingService;
    
    // Use provided storage or get from ConversationContext
    // Note: In tests, always pass explicit storage for proper isolation
    if (conversationStorage) {
      this.logger.debug('Using provided conversation storage');
      this.conversationStorage = conversationStorage;
    } else {
      this.logger.debug('Getting conversation storage from ConversationContext');
      const contextStorage = ConversationContext.getInstance().getStorage();
      
      // If it's the adapter, get the underlying storage
      if ('getStorageImplementation' in contextStorage) {
        this.logger.debug('Using storage implementation from adapter');
        this.conversationStorage = (contextStorage as unknown as { 
          getStorageImplementation(): ConversationStorage 
        }).getStorageImplementation();
      } else {
        this.logger.debug('Using storage directly from context');
        this.conversationStorage = contextStorage as ConversationStorage;
      }
    }
    
    this.logger.debug('ConversationToNoteService instance created');
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
      return this.addAttributionFooter(userEdits, turns);
    }
    
    // Group the turns into question-answer pairs for proper formatting
    let formattedContent = '';
    
    // Add debug information about all turns
    this.logger.debug(`Processing ${turns.length} turns for note creation`);
    turns.forEach((turn, idx) => {
      this.logger.debug(`Turn ${idx}: userId=${turn.userId}, query=${turn.query ? 'present' : 'empty'}, response=${turn.response ? 'present' : 'empty'}`);
    });
    
    // We need to go through the turns and correctly pair user questions with assistant answers
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      // Check if turn is from a user (userId is NOT 'assistant') or from the assistant (userId IS 'assistant')
      const isUser = turn.userId !== 'assistant';
      
      // Add detailed debug logging for userId detection
      this.logger.debug(`Turn ${i}: userId=${turn.userId}, isUser=${isUser}, has query=${!!turn.query}, has response=${!!turn.response}`);
      
      if (isUser) {
        // This is a user question
        formattedContent += `**Question**: ${turn.query}\n\n`;
        
        // Look for the next assistant response to pair with this question
        // Skip past any other user messages to find the next assistant response
        let foundAnswer = false;
        for (let j = i + 1; j < turns.length; j++) {
          const nextTurn = turns[j];
          // Use exact match instead of startsWith to ensure we only match 'assistant' exactly
          const isAssistant = nextTurn.userId === 'assistant';
          
          if (isAssistant) {
            // Add debug info about the matching assistant turn
            this.logger.debug(`Found assistant turn at index ${j} with userId=${nextTurn.userId}`);
            
            // Found an assistant turn
            if (nextTurn.response) {
              // Log debug info about the response
              if (nextTurn.response.includes('<') && nextTurn.response.includes('>')) {
                this.logger.debug(`HTML tags found in response: ${nextTurn.response.substring(0, 100)}...`);
              }
              
              // Check if the response is empty
              const trimmedResponse = nextTurn.response.trim();
              if (trimmedResponse.length === 0) {
                this.logger.debug(`Empty response found in assistant turn ${j}`);
                formattedContent += '**Answer**: (No response)\n\n';
              } else {
                this.logger.debug(`Found valid response in assistant turn ${j}: "${trimmedResponse.substring(0, 50)}..."`);
                // Clean HTML from responses before adding to note content
                const cleanResponse = this.sanitizeHtmlIfPresent(nextTurn.response);
                formattedContent += `**Answer**: ${cleanResponse}\n\n`;
              }
              foundAnswer = true;
              break;
            } else {
              this.logger.debug(`Assistant turn ${j} has undefined or null response`);
              // Found an assistant turn but with empty response
              formattedContent += '**Answer**: (No response)\n\n';
              foundAnswer = true;
              break;
            }
          }
        }
        
        // If we didn't find an answer at all, still add a placeholder
        if (!foundAnswer) {
          formattedContent += '**Answer**: (No response)\n\n';
        }
      } else {
        // This is an assistant response without a preceding user question
        // Skip it - we only want to include assistant responses paired with user questions
        continue;
      }
    }
    
    return this.addAttributionFooter(formattedContent, turns);
  }
  
  /**
   * Add attribution footer to note content
   */
  private addAttributionFooter(content: string, turns: ConversationTurn[]): string {
    const firstTurn = turns[0];
    // We don't need lastTurn for now
    const dateStr = firstTurn.timestamp ? 
      firstTurn.timestamp.toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0];
    
    const footer = `

---

> **Note**: This content was derived from a conversation on ${dateStr}.
> **Source**: Conversation with AI assistant
> **Original Query**: "${firstTurn.query}"`;
    
    return content + footer;
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
      this.logger.debug('Generating tags for note content');
      return await extractTags(content);
    } catch (error) {
      // Log at debug level since we have a fallback mechanism
      this.logger.debug('Tag extraction API failed, using fallback keyword extraction:', error);
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
      const conversation = await this.conversationStorage.getConversation(conversationId);
      
      if (!conversation) {
        this.logger.warn(`Cannot link note: Conversation ${conversationId} not found`);
        return;
      }
      
      // Update the conversation metadata to include the note ID
      await this.conversationStorage.updateMetadata(conversationId, {
        noteId,
        noteCreatedAt: new Date(),
      });
      
      this.logger.info(`Linked conversation ${conversationId} to note ${noteId}`);
    } catch (error) {
      this.logger.error(`Error linking conversation ${conversationId} to note ${noteId}:`, error);
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
    this.logger.debug(`Highlighting segment in conversation ${conversationId}, turn ${turnId}: ${text}`);
    return true; // Placeholder for successful operation
  }
  
  /**
   * Sanitize HTML content if present in the text
   * This helps ensure we're storing clean text in notes without HTML tags
   */
  private sanitizeHtmlIfPresent(text: string): string {
    // Check if the text contains HTML tags
    if (text.includes('<') && text.includes('>') && /<\/?[a-z]/.test(text)) {
      this.logger.debug('Sanitizing HTML from response for note content');
      
      // Replace HTML tags with appropriate markdown or text alternatives
      return text
        .replace(/<h[1-6]>(.*?)<\/h[1-6]>/g, '**$1**\n') // Convert headers to bold
        .replace(/<p>(.*?)<\/p>/g, '$1\n\n')            // Extract paragraph content
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')  // Convert strong to markdown bold
        .replace(/<em>(.*?)<\/em>/g, '*$1*')            // Convert em to markdown italic
        .replace(/<code>(.*?)<\/code>/g, '`$1`')        // Convert code to markdown code
        .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1') // Convert blockquote
        .replace(/<hr\/?>/g, '---')                     // Convert hr to markdown hr
        .replace(/<br\/?>/g, '\n')                      // Convert br to newline
        .replace(/<pre>(.*?)<\/pre>/g, '```\n$1\n```')  // Convert pre to code block
        .replace(/<ul>(.*?)<\/ul>/gs, '$1')             // Extract ul content
        .replace(/<li>(.*?)<\/li>/g, '- $1\n')          // Convert li to bullet points
        .replace(/<.+?>/g, '');                         // Remove any remaining tags
    }
    
    return text;
  }
}