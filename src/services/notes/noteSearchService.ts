/**
 * Service for searching notes using various strategies
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import type { Note } from '@/models/note';
import { BaseSearchService } from '@/services/common/baseSearchService';
import type { BaseSearchOptions } from '@/services/common/baseSearchService';
import { ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import { extractKeywords } from '@/utils/textUtils';

import { NoteEmbeddingService } from './noteEmbeddingService';
import { NoteRepository } from './noteRepository';


export type NoteSearchOptions = BaseSearchOptions;

/**
 * Service for searching notes using various strategies
 */
export class NoteSearchService extends BaseSearchService<Note, NoteRepository, NoteEmbeddingService> {
  protected entityName = 'note';
  protected repository: NoteRepository;
  protected embeddingService: NoteEmbeddingService;
  
  /**
   * Singleton instance of NoteSearchService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: NoteSearchService | null = null;
  
  /**
   * Override the logger from the base class with protected visibility
   * This allows the derived class to use the logger directly
   */
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param repository Repository for accessing notes (defaults to singleton instance)
   * @param embeddingService Service for note embeddings (defaults to singleton instance)
   * @returns The singleton instance
   */
  public static getInstance(
    repository?: NoteRepository,
    embeddingService?: NoteEmbeddingService,
  ): NoteSearchService {
    if (!NoteSearchService.instance) {
      NoteSearchService.instance = new NoteSearchService(
        repository || NoteRepository.getInstance(),
        embeddingService || NoteEmbeddingService.getInstance(),
      );
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('NoteSearchService singleton instance created');
    } else if (repository || embeddingService) {
      // Log a warning if trying to get instance with different dependencies
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.warn('getInstance called with dependencies but instance already exists. Dependencies ignored.');
    }
    
    return NoteSearchService.instance;
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
      if (NoteSearchService.instance) {
        // No specific cleanup needed for this service
      }
    } catch (error) {
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.error('Error during NoteSearchService instance reset:', error);
    } finally {
      NoteSearchService.instance = null;
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('NoteSearchService singleton instance reset');
    }
  }
  
  /**
   * Create a fresh NoteSearchService instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param repository Repository for accessing notes
   * @param embeddingService Service for note embeddings
   * @returns A new NoteSearchService instance
   */
  public static createFresh(
    repository: NoteRepository,
    embeddingService: NoteEmbeddingService,
  ): NoteSearchService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh NoteSearchService instance');
    
    return new NoteSearchService(repository, embeddingService);
  }

  /**
   * Create a new NoteSearchService with injected dependencies
   * 
   * Note: When not testing, prefer using getInstance() or createFresh() factory methods
   * 
   * @param repository Repository for accessing notes
   * @param embeddingService Service for note embeddings
   */
  public constructor(
    repository: NoteRepository,
    embeddingService: NoteEmbeddingService,
  ) {
    super();
    this.repository = repository;
    this.embeddingService = embeddingService;
    this.logger.debug('NoteSearchService instance created with dependencies');
  }


  /**
   * Search notes with various strategies
   * @param options Search options including query, tags, limit, offset, and search type
   * @returns Array of matching notes
   */
  async searchNotes(options: NoteSearchOptions): Promise<Note[]> {
    return this.search(options);
  }

  /**
   * Search using traditional keyword matching
   * @param query Optional search query
   * @param tags Optional tags to filter by
   * @param limit Maximum results to return
   * @param offset Pagination offset
   * @returns Array of matching notes
   */
  protected async keywordSearch(
    query?: string,
    tags?: string[],
    limit = 10,
    offset = 0,
  ): Promise<Note[]> {
    try {
      this.logger.debug(`Performing keyword search with query: ${query}, tags: ${tags?.join(', ')}`);
      return await this.repository.searchNotesByKeywords(query, tags, limit, offset);
    } catch (error) {
      this.logger.error(`Keyword search failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.repository.getRecentNotes(limit);
    }
  }

  /**
   * Search using vector similarity
   * @param query The search query
   * @param tags Optional tags to filter by
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns Array of matching notes
   */
  protected async semanticSearch(
    query: string,
    tags?: string[],
    limit = 10,
    offset = 0,
  ): Promise<Note[]> {
    try {
      if (!isNonEmptyString(query)) {
        throw new ValidationError('Empty query for semantic search');
      }

      // Apply safe limits
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);

      // Generate embedding for the query
      const embedding = await this.embeddingService.generateEmbedding(query);

      // Search for similar notes
      const scoredNotes = await this.embeddingService.searchSimilarNotes(embedding, safeLimit + safeOffset);

      // Filter by tags if provided
      const filteredNotes = isDefined(tags) && tags.length > 0
        ? scoredNotes.filter(note => {
          if (!Array.isArray(note.tags)) return false;
          return tags.some(tag => note.tags?.includes(tag));
        })
        : scoredNotes;

      // Apply pagination
      const paginatedNotes = filteredNotes.slice(safeOffset, safeOffset + safeLimit);

      // Return notes without the score property
      return paginatedNotes.map(({ score: _score, ...note }) => note);
    } catch (error) {
      // Log but don't fail - fall back to keyword search
      this.logger.error(`Error in semantic search: ${error instanceof Error ? error.message : String(error)}`);

      // Try keyword search as fallback
      this.logger.debug('Falling back to keyword search');
      return this.keywordSearch(query, tags, limit, offset);
    }
  }

  /**
   * Find related notes for a note
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   */
  async findRelated(noteId: string, maxResults = 5): Promise<Note[]> {
    try {
      // Try semantic similarity first
      const relatedNotes = await this.embeddingService.findRelatedNotes(noteId, maxResults);

      if (relatedNotes.length > 0) {
        // Remove score property before returning
        return relatedNotes.map(({ score: _score, ...note }) => note);
      }

      // Fall back to keyword-based related notes if no semantic results
      return this.getKeywordRelatedNotes(noteId, maxResults);
    } catch (error) {
      this.logger.error(`Error finding related notes: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.debug('Falling back to keyword-based related notes');
      return this.getKeywordRelatedNotes(noteId, maxResults);
    }
  }

  /**
   * Fall back to keyword-based related notes when embeddings aren't available
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   */
  private async getKeywordRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    try {
      // Apply safe limits
      const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));

      // Get the source note
      const sourceNote = await this.repository.getNoteById(noteId);

      if (!isDefined(sourceNote)) {
        this.logger.warn(`Source note not found for keyword relation: ${noteId}`);
        return [];
      }

      // Make sure the note has content
      if (!isNonEmptyString(sourceNote.content)) {
        this.logger.debug(`Source note has no content for keyword extraction: ${noteId}`);
        return this.repository.getRecentNotes(safeMaxResults);
      }

      // Extract keywords from the source note
      const keywords = this.extractKeywords(sourceNote.content);

      if (!Array.isArray(keywords) || keywords.length === 0) {
        this.logger.debug(`No keywords extracted from note: ${noteId}`);
        return this.repository.getRecentNotes(safeMaxResults);
      }

      this.logger.debug(`Extracted ${keywords.length} keywords from note ${noteId}: ${keywords.join(', ')}`);

      // Use each keyword as a search term
      const keywordPromises = keywords.map(keyword =>
        this.repository.searchNotesByKeywords(keyword, undefined, Math.ceil(safeMaxResults / 2), 0),
      );

      const keywordResults = await Promise.all(keywordPromises);

      // Combine and deduplicate results
      const allResults = keywordResults.flat();

      // Remove duplicates and the source note itself using the base class method
      return this.deduplicateResults(
        allResults,
        note => note.id,
        noteId,
      ).slice(0, safeMaxResults);
    } catch (error) {
      this.logger.error(`Error finding keyword-related notes: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.debug(`Falling back to recent notes with limit ${maxResults}`);
      return this.repository.getRecentNotes(maxResults);
    }
  }

  /**
   * Extract keywords from text
   * @param text The text to extract keywords from
   * @param maxKeywords Maximum number of keywords to extract (default: 10)
   * @returns Array of extracted keywords
   */
  protected extractKeywords(text: string, maxKeywords = 10): string[] {
    if (!isNonEmptyString(text)) {
      this.logger.debug('Empty text provided for keyword extraction');
      return [];
    }

    try {
      // Apply safe limits with defaults
      const safeMaxKeywords = Math.max(1, Math.min(maxKeywords || 10, 50));

      // Use the utility function to extract keywords
      const keywords = extractKeywords(text, safeMaxKeywords);
      
      const validKeywords = Array.isArray(keywords) ? keywords.filter(isNonEmptyString) : [];
      this.logger.debug(`Extracted ${validKeywords.length} keywords from text`);

      // Ensure we return a valid array
      return validKeywords;
    } catch (error) {
      this.logger.warn(`Error extracting keywords: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
