/**
 * Service for searching notes using various strategies
 */
import { NoteRepository } from './noteRepository';
import { NoteEmbeddingService } from './noteEmbeddingService';
import type { Note } from '@/models/note';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import { ValidationError, safeExec } from '@/utils/errorUtils';
import { extractKeywords } from '@/utils/textUtils';

export interface SearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  semanticSearch?: boolean;
}

/**
 * Service for searching notes using various strategies
 */
export class NoteSearchService {
  private noteRepository: NoteRepository;
  private embeddingService: NoteEmbeddingService;

  constructor(apiKey?: string) {
    this.noteRepository = new NoteRepository();
    this.embeddingService = new NoteEmbeddingService(apiKey);
  }

  /**
   * Search notes with various strategies
   * @param options Search options including query, tags, limit, offset, and search type
   * @returns Array of matching notes
   */
  async searchNotes(options: SearchOptions): Promise<Note[]> {
    // Validate options parameter
    if (!options || typeof options !== 'object') {
      throw new ValidationError('Invalid search options', { optionsType: typeof options });
    }
    
    return safeExec(async () => {
      // Safely extract options with defaults
      const limit = isDefined(options.limit) ? Math.max(1, Math.min(options.limit, 100)) : 10;
      const offset = isDefined(options.offset) ? Math.max(0, options.offset) : 0;
      const semanticSearch = options.semanticSearch !== false; // Default to true
      
      // Handle query safely, ensuring it's a string
      const query = isNonEmptyString(options.query) ? options.query : undefined;
      
      // Ensure tags is an array if present and filter out invalid tags
      const tags = Array.isArray(options.tags) 
        ? options.tags.filter(isNonEmptyString)
        : undefined;
        
      logger.debug(`Searching notes with: ${JSON.stringify({
        query: query?.substring(0, 30) + (query && query.length > 30 ? '...' : ''),
        tagsCount: tags?.length,
        limit,
        offset,
        semanticSearch,
      })}`);

      // If semantic search is enabled and there's a query, perform vector search
      if (semanticSearch && query) {
        const results = await this.semanticSearch(query, tags, limit, offset);
        logger.info(`Semantic search found ${results.length} results`);
        return results;
      }

      // Otherwise, fall back to keyword search
      const results = await this.keywordSearch(query, tags, limit, offset);
      
      logger.info(`Keyword search found ${results.length} results`);
      return results;
    }, [], 'warn');  // Use 'warn' level and return empty array on error
  }

  /**
   * Search using traditional keyword matching
   * @param query Optional search query
   * @param tags Optional tags to filter by
   * @param limit Maximum results to return
   * @param offset Pagination offset
   * @returns Array of matching notes
   */
  private async keywordSearch(
    query?: string, 
    tags?: string[], 
    limit = 10, 
    offset = 0,
  ): Promise<Note[]> {
    try {
      return await this.noteRepository.searchNotesByKeywords(query, tags, limit, offset);
    } catch (error) {
      logger.error(`Keyword search failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.noteRepository.getRecentNotes(limit);
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
  private async semanticSearch(
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
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
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
      const sourceNote = await this.noteRepository.getNoteById(noteId);
      
      if (!isDefined(sourceNote)) {
        logger.warn(`Source note not found for keyword relation: ${noteId}`);
        return [];
      }
      
      // Make sure the note has content
      if (!isNonEmptyString(sourceNote.content)) {
        logger.debug(`Source note has no content for keyword extraction: ${noteId}`);
        return this.noteRepository.getRecentNotes(safeMaxResults);
      }
      
      // Extract keywords from the source note
      const keywords = this.extractKeywords(sourceNote.content);
      
      if (!Array.isArray(keywords) || keywords.length === 0) {
        logger.debug(`No keywords extracted from note: ${noteId}`);
        return this.noteRepository.getRecentNotes(safeMaxResults);
      }
      
      logger.debug(`Extracted ${keywords.length} keywords from note ${noteId}: ${keywords.join(', ')}`);
      
      // Use each keyword as a search term
      const keywordPromises = keywords.map(keyword => 
        this.noteRepository.searchNotesByKeywords(keyword, undefined, Math.ceil(safeMaxResults / 2), 0),
      );
      
      const keywordResults = await Promise.all(keywordPromises);
      
      // Combine and deduplicate results
      const allResults = keywordResults.flat();
      
      // Remove duplicates and the source note itself
      const uniqueResults = allResults.reduce<Note[]>((unique, note) => {
        if (
          note.id !== noteId && 
          !unique.some(existingNote => existingNote.id === note.id)
        ) {
          unique.push(note);
        }
        return unique;
      }, []);
      
      return uniqueResults.slice(0, safeMaxResults);
    } catch (error) {
      logger.error(`Error finding keyword-related notes: ${error instanceof Error ? error.message : String(error)}`);
      return this.noteRepository.getRecentNotes(maxResults);
    }
  }

  /**
   * Extract keywords from text
   * @param text The text to extract keywords from
   * @param maxKeywords Maximum number of keywords to extract (default: 10)
   * @returns Array of extracted keywords
   */
  private extractKeywords(text: string, maxKeywords = 10): string[] {
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