/**
 * Service for searching notes using various strategies
 */
import { NoteRepository } from './noteRepository';
import { NoteEmbeddingService } from './noteEmbeddingService';
import type { Note } from '@/models/note';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import { ValidationError } from '@/utils/errorUtils';
import { extractKeywords } from '@/utils/textUtils';
import { BaseSearchService } from '@/services/common/baseSearchService';
import type { BaseSearchOptions } from '@/services/common/baseSearchService';

export type NoteSearchOptions = BaseSearchOptions;

/**
 * Service for searching notes using various strategies
 */
export class NoteSearchService extends BaseSearchService<Note, NoteRepository, NoteEmbeddingService> {
  protected entityName = 'note';
  protected repository: NoteRepository;
  protected embeddingService: NoteEmbeddingService;

  /**
   * Create a new NoteSearchService with injected dependencies
   * @param repository Repository for accessing notes
   * @param embeddingService Service for note embeddings
   */
  constructor(
    repository: NoteRepository,
    embeddingService: NoteEmbeddingService,
  ) {
    super();
    this.repository = repository;
    this.embeddingService = embeddingService;
  }

  /**
   * Legacy constructor support for backwards compatibility
   * @deprecated Use dependency injection instead
   * @param apiKey Optional API key for embeddings
   */
  static createWithApiKey(apiKey?: string): NoteSearchService {
    const repository = new NoteRepository();
    const embeddingService = new NoteEmbeddingService(apiKey);
    return new NoteSearchService(repository, embeddingService);
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
      return await this.repository.searchNotesByKeywords(query, tags, limit, offset);
    } catch (error) {
      logger.error(`Keyword search failed: ${error instanceof Error ? error.message : String(error)}`);
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
      logger.error(`Error in semantic search: ${error instanceof Error ? error.message : String(error)}`);

      // Try keyword search as fallback
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
      logger.error(`Error finding related notes: ${error instanceof Error ? error.message : String(error)}`);
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
        logger.warn(`Source note not found for keyword relation: ${noteId}`);
        return [];
      }

      // Make sure the note has content
      if (!isNonEmptyString(sourceNote.content)) {
        logger.debug(`Source note has no content for keyword extraction: ${noteId}`);
        return this.repository.getRecentNotes(safeMaxResults);
      }

      // Extract keywords from the source note
      const keywords = this.extractKeywords(sourceNote.content);

      if (!Array.isArray(keywords) || keywords.length === 0) {
        logger.debug(`No keywords extracted from note: ${noteId}`);
        return this.repository.getRecentNotes(safeMaxResults);
      }

      logger.debug(`Extracted ${keywords.length} keywords from note ${noteId}: ${keywords.join(', ')}`);

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
      logger.error(`Error finding keyword-related notes: ${error instanceof Error ? error.message : String(error)}`);
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
      logger.debug('Empty text provided for keyword extraction');
      return [];
    }

    try {
      // Apply safe limits with defaults
      const safeMaxKeywords = Math.max(1, Math.min(maxKeywords || 10, 50));

      // Use the utility function to extract keywords
      const keywords = extractKeywords(text, safeMaxKeywords);

      // Ensure we return a valid array
      return Array.isArray(keywords) ? keywords.filter(isNonEmptyString) : [];
    } catch (error) {
      logger.warn(`Error extracting keywords: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
