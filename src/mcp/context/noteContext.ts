/**
 * Context for working with notes
 * Provides a facade over note services
 */
import type { Note } from '@/models/note';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import logger from '@/utils/logger';
import { textConfig } from '@/config';
import { 
  NoteRepository, 
  NoteEmbeddingService, 
  NoteSearchService, 
} from '@/services/notes';
import type { SearchOptions } from '@/services/notes/noteSearchService';

/**
 * Context for working with notes
 * Provides a unified API for note operations
 */
export class NoteContext {
  private repository: NoteRepository;
  private embeddingService: NoteEmbeddingService;
  private searchService: NoteSearchService;

  /**
   * Create a new NoteContext
   * @param apiKey Optional API key for embedding service
   */
  constructor(apiKey?: string) {
    this.repository = new NoteRepository();
    this.embeddingService = new NoteEmbeddingService(apiKey);
    this.searchService = new NoteSearchService(apiKey);
    
    logger.debug('NoteContext initialized');
  }

  /**
   * Retrieve a note by its ID
   * @param id The ID of the note to retrieve
   * @returns The note object or undefined if not found
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    return this.repository.getNoteById(id);
  }

  /**
   * Create a new note with embeddings
   * @param note The note data to create
   * @returns The ID of the created note
   */
  async createNote(note: Omit<Note, 'embedding'> & { embedding?: number[] }): Promise<string> {
    // Generate embedding if not provided
    let embedding = note.embedding;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      try {
        const title = isNonEmptyString(note.title) ? note.title : '';
        const content = isNonEmptyString(note.content) ? note.content : '';
        
        if (title.length > 0 || content.length > 0) {
          embedding = await this.embeddingService.generateEmbedding(title, content);
        }
      } catch (error) {
        logger.error(`Error generating embedding for new note: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Insert the note
    const noteId = await this.repository.insertNote({
      id: note.id,
      title: note.title,
      content: note.content,
      embedding,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags || undefined,
    });
    
    // If the note is long, also create chunks
    const content = isNonEmptyString(note.content) ? note.content : '';
    if (content.length > (textConfig.defaultChunkThreshold || 1000)) {
      try {
        await this.embeddingService.createNoteChunks(noteId, content);
      } catch (error) {
        logger.error(`Failed to create chunks for note ${noteId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return noteId;
  }

  /**
   * Search notes based on query text and/or tags with optional semantic search
   * @param options Search options including query, tags, limit, offset, and search type
   * @returns Array of matching notes
   */
  async searchNotes(options: SearchOptions): Promise<Note[]> {
    return this.searchService.searchNotes(options);
  }

  /**
   * Get related notes based on vector similarity
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   */
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    return this.searchService.getRelatedNotes(noteId, maxResults);
  }
  
  /**
   * Search notes by embedding similarity (for profile integration)
   * Finds notes similar to a given embedding vector
   * @param embedding The embedding vector to search with
   * @param maxResults Maximum number of results to return
   * @returns Array of similar notes
   */
  async searchNotesWithEmbedding(embedding: number[], maxResults = 5): Promise<Note[]> {
    if (!isDefined(embedding) || !Array.isArray(embedding)) {
      logger.warn('Invalid embedding provided to searchNotesWithEmbedding');
      return [];
    }
    
    try {
      const scoredNotes = await this.embeddingService.searchSimilarNotes(embedding, maxResults);
      
      // Return notes without the score property
      return scoredNotes.map(({ score: _score, ...note }) => note);
    } catch (error) {
      logger.error(`Error searching notes with embedding: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get recent notes ordered by update time
   * @param limit Maximum number of notes to return
   * @returns Array of recent notes
   */
  async getRecentNotes(limit = 5): Promise<Note[]> {
    return this.repository.getRecentNotes(limit);
  }

  /**
   * Generate or update embeddings for existing notes
   * @returns Statistics on the update operation
   */
  async generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    return this.embeddingService.generateEmbeddingsForAllNotes();
  }
  
  /**
   * Get the total count of notes in the database
   * @returns The total number of notes
   */
  async getNoteCount(): Promise<number> {
    return this.repository.getNoteCount();
  }
}