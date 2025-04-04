/**
 * Base search service for common search functionality
 * Provides shared search patterns for different entity types
 */

import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { BaseRepository } from '@/services/BaseRepository';
import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import type { ISearchService, SearchOptions } from '@/services/interfaces/ISearchService';
import { safeExec, ValidationError } from '@/utils/errorUtils';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';




/**
 * Re-export SearchOptions type from interface
 */
export type BaseSearchOptions = SearchOptions;

/**
 * Scored entity with similarity score and other metadata
 */
export type ScoredEntity<T> = {
  score?: number;
  tagScore?: number;
  matchRatio?: number;
  entity: T;
}

/**
 * Base class for search services that provides common search functionality
 */
export abstract class BaseSearchService<
  TEntity, 
  TRepository extends BaseRepository<SQLiteTable, TEntity>,
  TEmbeddingService extends BaseEmbeddingService
> implements ISearchService<TEntity> {
  protected abstract entityName: string;
  protected abstract repository: TRepository;
  protected abstract embeddingService: TEmbeddingService;

  /**
   * Search entities using various search strategies
   * @param options Search options
   * @returns Array of matching entities
   */
  async search(options: BaseSearchOptions): Promise<TEntity[]> {
    // Validate options parameter
    if (!options || typeof options !== 'object') {
      throw new ValidationError(`Invalid ${this.entityName} search options`, { optionsType: typeof options });
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
        
      logger.debug(`Searching ${this.entityName}s with: ${JSON.stringify({
        query: query?.substring(0, 30) + (query && query.length > 30 ? '...' : ''),
        tagsCount: tags?.length,
        limit,
        offset,
        semanticSearch,
      })}`);

      // If semantic search is enabled and there's a query, perform vector search
      if (semanticSearch && query) {
        const results = await this.semanticSearch(query, tags, limit, offset);
        logger.info(`Semantic search found ${results.length} ${this.entityName} results`);
        return results;
      }

      // Otherwise, fall back to keyword search
      const results = await this.keywordSearch(query, tags, limit, offset);
      
      logger.info(`Keyword search found ${results.length} ${this.entityName} results`);
      return results;
    }, [], 'warn');  // Use 'warn' level and return empty array on error
  }

  /**
   * Perform keyword-based search
   * @param query Search query
   * @param tags Tags to filter by
   * @param limit Maximum results
   * @param offset Pagination offset
   */
  protected abstract keywordSearch(
    query?: string, 
    tags?: string[], 
    limit?: number, 
    offset?: number
  ): Promise<TEntity[]>;

  /**
   * Perform semantic vector search
   * @param query Search query
   * @param tags Tags to filter by
   * @param limit Maximum results
   * @param offset Pagination offset
   */
  protected abstract semanticSearch(
    query: string, 
    tags?: string[], 
    limit?: number, 
    offset?: number
  ): Promise<TEntity[]>;

  /**
   * Find related entities based on a source entity
   * @param entityId ID of the source entity
   * @param maxResults Maximum number of results
   */
  abstract findRelated(
    entityId: string, 
    maxResults?: number
  ): Promise<TEntity[]>;

  /**
   * Extract meaningful keywords from text
   * @param text Source text
   * @param maxKeywords Maximum number of keywords
   */
  protected abstract extractKeywords(
    text: string, 
    maxKeywords?: number
  ): string[];

  /**
   * Calculate tag match score between two sets of tags
   * @param sourceTags First set of tags
   * @param targetTags Second set of tags
   * @returns Match score (higher is better match)
   */
  protected calculateTagMatchScore(sourceTags: string[], targetTags: string[]): number {
    if (!isDefined(sourceTags) || !isDefined(targetTags) || 
        sourceTags.length === 0 || targetTags.length === 0) {
      return 0;
    }
    
    return sourceTags.reduce((count, sourceTag) => {
      // Direct match (exact tag match)
      const directMatch = targetTags.includes(sourceTag);

      // Partial match (tag contains or is contained by a target tag)
      const partialMatch = !directMatch && targetTags.some(targetTag =>
        sourceTag.includes(targetTag) || targetTag.includes(sourceTag),
      );

      return count + (directMatch ? 1 : partialMatch ? 0.5 : 0);
    }, 0);
  }

  /**
   * Filter and remove duplicate entities from results
   * @param results Array of entities to deduplicate
   * @param getEntityId Function to get entity ID
   * @param excludeId Optional ID to exclude from results
   * @returns Deduplicated array of entities
   */
  protected deduplicateResults<T>(
    results: T[], 
    getEntityId: (entity: T) => string,
    excludeId?: string,
  ): T[] {
    return results.reduce<T[]>((unique, entity) => {
      const id = getEntityId(entity);
      if (
        (!excludeId || id !== excludeId) && 
        !unique.some(existing => getEntityId(existing) === id)
      ) {
        unique.push(entity);
      }
      return unique;
    }, []);
  }

  /**
   * Remove score and other metadata properties from scored entities
   * @param entities Array of scored entities
   * @returns Array of entities without score properties
   */
  protected removeScoreProperties<T>(entities: ScoredEntity<T>[]): T[] {
    return entities.map(({ score: _score, tagScore: _tagScore, matchRatio: _matchRatio, entity }) => entity);
  }
}