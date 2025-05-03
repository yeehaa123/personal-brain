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
import { TextUtils } from '@/utils/textUtils';

import { NoteEmbeddingService } from './noteEmbeddingService';
import { NoteRepository } from './noteRepository';


/**
 * Note search service configuration options
 */
export interface NoteSearchServiceConfig {
  /** Name of the entity being searched */
  entityName?: string;
}

/**
 * Note search service dependencies
 */
export interface NoteSearchServiceDependencies {
  /** Repository for accessing notes */
  repository: NoteRepository;
  /** Embedding service for semantic operations */
  embeddingService: NoteEmbeddingService;
  /** Logger instance */
  logger: Logger;
  /** TextUtils instance */
  textUtils: TextUtils;
}

export type NoteSearchOptions = BaseSearchOptions;

/**
 * Service for searching notes using various strategies
 */
export class NoteSearchService extends BaseSearchService<Note, NoteRepository, NoteEmbeddingService> {
  protected override entityName = 'note';
  
  /** Text utilities instance for text processing */
  private readonly textUtils: TextUtils;
  
  /**
   * Singleton instance of NoteSearchService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: NoteSearchService | null = null;
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param config Optional configuration
   * @returns The singleton instance
   */
  public static getInstance(): NoteSearchService {
    if (!NoteSearchService.instance) {
      // Create with defaults if instance doesn't exist
      const logger = Logger.getInstance();
      
      const dependencies: NoteSearchServiceDependencies = {
        repository: NoteRepository.getInstance(),
        embeddingService: NoteEmbeddingService.getInstance(),
        logger: logger,
        textUtils: TextUtils.getInstance(),
      };
      
      NoteSearchService.instance = new NoteSearchService({ entityName: 'note' }, dependencies);
      logger.debug('NoteSearchService singleton instance created');
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
      const logger = Logger.getInstance();
      logger.error('Error during NoteSearchService instance reset:', error);
    } finally {
      NoteSearchService.instance = null;
      
      const logger = Logger.getInstance();
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
   * @param config Optional configuration
   * @returns A new NoteSearchService instance
   */
  public static createFresh(
    config: NoteSearchServiceConfig = { entityName: 'note' },
    dependencies?: NoteSearchServiceDependencies,
  ): NoteSearchService {
    if (dependencies) {
      // Use provided dependencies as-is
      dependencies.logger.debug('Creating fresh NoteSearchService instance');
      return new NoteSearchService(config, dependencies);
    } else {
      // Create default dependencies
      const logger = Logger.getInstance();
      logger.debug('Creating fresh NoteSearchService instance with default dependencies');
      
      const defaultDeps: NoteSearchServiceDependencies = {
        repository: NoteRepository.getInstance(),
        embeddingService: NoteEmbeddingService.getInstance(),
        logger: logger,
        textUtils: TextUtils.getInstance(),
      };
      
      return new NoteSearchService(config, defaultDeps);
    }
  }
  

  /**
   * Create a new NoteSearchService with injected dependencies
   * 
   * Note: When not testing, prefer using getInstance() or createFresh() factory methods
   * 
   * @param config Service configuration
   * @param dependencies Service dependencies
   */
  constructor(
    config: NoteSearchServiceConfig,
    dependencies: NoteSearchServiceDependencies,
  ) {
    super(
      { entityName: config.entityName || 'note' },
      {
        repository: dependencies.repository,
        embeddingService: dependencies.embeddingService,
        logger: dependencies.logger,
      },
    );
    
    // Store the TextUtils instance
    this.textUtils = dependencies.textUtils;
    
    dependencies.logger.debug('NoteSearchService instance created with dependencies');
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
  protected override async keywordSearch(
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
  protected override async semanticSearch(
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
  override async findRelated(noteId: string, maxResults = 5): Promise<Note[]> {
    try {
      // Apply safe limits
      const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));
      
      // Try semantic similarity
      const relatedNotes = await this.embeddingService.findRelatedNotes(noteId, safeMaxResults);

      if (relatedNotes.length > 0) {
        // Remove score property before returning
        return relatedNotes.map(({ score: _score, ...note }) => note);
      }

      // Fall back to recent notes if no semantic results or an error occurs
      this.logger.debug('No semantic related notes found, returning recent notes');
      return this.repository.getRecentNotes(safeMaxResults);
    } catch (error) {
      this.logger.error(`Error finding related notes: ${error instanceof Error ? error.message : String(error)}`);
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
  protected override extractKeywords(text: string, maxKeywords = 10): string[] {
    if (!isNonEmptyString(text)) {
      this.logger.debug('Empty text provided for keyword extraction');
      return [];
    }

    try {
      // Apply safe limits with defaults
      const safeMaxKeywords = Math.max(1, Math.min(maxKeywords || 10, 50));

      // Use TextUtils instance to extract keywords
      const keywords = this.textUtils.extractKeywords(text, safeMaxKeywords);
      
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
