/**
 * Mock BaseSearchService Implementation
 * 
 * This file provides a standardized mock implementation of the BaseSearchService
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';

import type { BaseSearchOptions } from '@/services/common/baseSearchService';
import type { ISearchService } from '@/services/interfaces/ISearchService';
import { MockBaseEmbeddingService } from '@test/__mocks__/services/common/baseEmbeddingService';
import { MockBaseRepository } from '@test/__mocks__/services/BaseRepository';
import type { MockEntity } from '@test/__mocks__/services/BaseRepository';

/**
 * MockBaseSearchService class with standardized interface
 * 
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockBaseSearchService<
  TEntity extends MockEntity = MockEntity,
  TRepository extends MockBaseRepository<TEntity> = MockBaseRepository<TEntity>,
  TEmbeddingService extends MockBaseEmbeddingService<TEntity> = MockBaseEmbeddingService<TEntity>
> implements Partial<ISearchService<TEntity>> {
  private static instance: MockBaseSearchService | null = null;
  
  // Dependencies
  protected repository: TRepository;
  protected embeddingService: TEmbeddingService;
  protected entityName: string;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockBaseSearchService {
    if (!MockBaseSearchService.instance) {
      MockBaseSearchService.instance = MockBaseSearchService.createWithDependencies();
    }
    return MockBaseSearchService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockBaseSearchService.instance = null;
  }
  
  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(): MockBaseSearchService {
    return MockBaseSearchService.createWithDependencies();
  }
  
  /**
   * Create an instance with explicit dependencies
   */
  public static createWithDependencies<
    T extends MockEntity = MockEntity,
    R extends MockBaseRepository<T> = MockBaseRepository<T>,
    E extends MockBaseEmbeddingService<T> = MockBaseEmbeddingService<T>
  >(
    config: Record<string, unknown> = {},
    dependencies: Record<string, unknown> = {}
  ): MockBaseSearchService<T, R, E> {
    const entityName = config['entityName'] as string || 'mock';
    const repository = dependencies['repository'] as R || MockBaseRepository.createFresh() as unknown as R;
    const embeddingService = dependencies['embeddingService'] as E || 
      MockBaseEmbeddingService.createFresh() as unknown as E;
    
    return new MockBaseSearchService<T, R, E>(entityName, repository, embeddingService);
  }
  
  /**
   * Private constructor to enforce factory methods
   */
  protected constructor(
    entityName: string,
    repository: TRepository,
    embeddingService: TEmbeddingService
  ) {
    this.entityName = entityName;
    this.repository = repository;
    this.embeddingService = embeddingService;
  }
  
  // Mock methods
  search = mock(async (options: BaseSearchOptions): Promise<TEntity[]> => {
    // Validate options
    if (!options) {
      throw new Error('Search options cannot be null or undefined');
    }
    
    // Determine which search method to use based on options
    if (options.semanticSearch && options.query) {
      return this.semanticSearch(options.query, options.tags, options.limit, options.offset);
    }
    
    if (options.query || (options.tags && options.tags.length > 0)) {
      return this.keywordSearch(options.query, options.tags, options.limit, options.offset);
    }
    
    // Fall back to recent entities if no search criteria provided
    return this.repository.getRecentEntities();
  });
  
  findRelated = mock(async (_entityId: string, _maxResults = 5): Promise<TEntity[]> => {
    return [
      { id: '7', name: 'Related 1' } as TEntity,
      { id: '8', name: 'Related 2' } as TEntity,
    ];
  });
  
  // Protected methods (exposed for testing)
  protected keywordSearch = mock(async (
    _query?: string,
    _tags?: string[],
    _limit = 10,
    _offset = 0,
  ): Promise<TEntity[]> => {
    return this.repository.searchByKeywords(_query, _tags);
  });
  
  protected semanticSearch = mock(async (
    query: string,
    _tags?: string[],
    _limit = 10,
    _offset = 0,
  ): Promise<TEntity[]> => {
    const embedding = await this.embeddingService.generateEmbedding(query);
    return this.embeddingService.searchSimilar(embedding);
  });
  
  protected extractKeywords = mock((text: string, maxKeywords = 10): string[] => {
    return text.split(' ').slice(0, maxKeywords);
  });
  
  // Helper method to expose protected method for testing
  public exposeCalculateTagMatchScore(sourceTags: string[], targetTags: string[]): number {
    return this.calculateTagMatchScore(sourceTags, targetTags);
  }
  
  // Implementation of tag match calculation for testing
  protected calculateTagMatchScore(sourceTags: string[], targetTags: string[]): number {
    if (!sourceTags || sourceTags.length === 0 || !targetTags || targetTags.length === 0) {
      return 0;
    }
    
    let score = 0;
    
    // Check for exact matches (1.0 points each)
    for (const sourceTag of sourceTags) {
      if (targetTags.includes(sourceTag)) {
        score += 1.0;
        continue;
      }
      
      // Check for partial matches (0.5 points each)
      for (const targetTag of targetTags) {
        if (
          (sourceTag.includes(targetTag) && targetTag.length > 3) ||
          (targetTag.includes(sourceTag) && sourceTag.length > 3)
        ) {
          score += 0.5;
          break;
        }
      }
    }
    
    return score;
  }
  
  // Helper method to expose protected method for testing
  public exposeDeduplicateResults<T>(
    results: T[],
    getEntityId: (entity: T) => string,
    excludeId?: string,
  ): T[] {
    return this.deduplicateResults(results, getEntityId, excludeId);
  }
  
  // Implementation of deduplication for testing
  protected deduplicateResults<T>(
    results: T[],
    getEntityId: (entity: T) => string,
    excludeId?: string,
  ): T[] {
    const seen = new Set<string>();
    const filtered: T[] = [];
    
    for (const result of results) {
      const id = getEntityId(result);
      
      // Skip excluded ID if specified
      if (excludeId && id === excludeId) {
        continue;
      }
      
      // Skip duplicates
      if (seen.has(id)) {
        continue;
      }
      
      seen.add(id);
      filtered.push(result);
    }
    
    return filtered;
  }
}