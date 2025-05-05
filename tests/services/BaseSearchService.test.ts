/**
 * Tests for BaseSearchService
 * 
 * This test file focuses on testing the functionality of the BaseSearchService
 * by creating a concrete implementation of the abstract class.
 */
import { mock } from 'bun:test';
import { beforeEach, describe, expect, test } from 'bun:test';

import type { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import { type BaseSearchOptions, BaseSearchService } from '@/services/common/baseSearchService';
import { ValidationError } from '@/utils/errorUtils';
import { MockBaseRepository, type MockEntity } from '@test/__mocks__/services/BaseRepository';
import { MockBaseEmbeddingService } from '@test/__mocks__/services/common/baseEmbeddingService';

/**
 * Concrete implementation of BaseSearchService for testing
 * This extends the abstract BaseSearchService with a concrete implementation 
 * for testing purposes.
 */

class TestSearchService extends BaseSearchService<
  MockEntity,
  MockBaseRepository<MockEntity>,
  BaseEmbeddingService
> {
  // Singleton implementation for Component Interface Standardization pattern
  private static instance: TestSearchService | null = null;

  /**
   * Get the singleton instance
   */
  public static getInstance(): TestSearchService {
    if (!TestSearchService.instance) {
      const repository = MockBaseRepository.getInstance();
      const embeddingService = MockBaseEmbeddingService.getInstance() as unknown as BaseEmbeddingService;

      TestSearchService.instance = new TestSearchService(
        { entityName: 'test-entity' },
        { repository, embeddingService },
      );
    }

    return TestSearchService.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    TestSearchService.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(
    repository = MockBaseRepository.createFresh<MockEntity>(),
    embeddingService = MockBaseEmbeddingService.createFresh() as unknown as BaseEmbeddingService,
  ): TestSearchService {
    return new TestSearchService(
      { entityName: 'test-entity' },
      { repository, embeddingService },
    );
  }

  /**
   * Create with dependencies
   */
  public static createWithDependencies(
    config: Record<string, unknown> = {},
    dependencies: Record<string, unknown> = {},
  ): TestSearchService {
    // Extract dependencies with proper type checking
    const repo = dependencies['repository'] as MockBaseRepository<MockEntity> ||
      MockBaseRepository.createFresh<MockEntity>();

    const embeddingService = (dependencies['embeddingService'] || MockBaseEmbeddingService.createFresh()) as unknown as BaseEmbeddingService;

    return new TestSearchService(
      { entityName: config['entityName'] as string || 'test-entity' },
      { repository: repo, embeddingService },
    );
  }

  // We need to make protected methods public for testing
  // This is a valid testing approach to be able to spy on these methods
  public keywordSearch(
    query?: string,
    tags?: string[],
    limit = 10,
    _offset = 0,
  ): Promise<MockEntity[]> {
    const mockData: MockEntity[] = [
      { id: '1', name: 'Test Entity 1', tags: ['test'] },
      { id: '2', name: 'Test Entity 2', tags: ['example'] },
      { id: '3', name: 'Another Entity', tags: ['test', 'example'] },
    ];

    let results = [...mockData];

    // Filter by query if provided
    if (query) {
      results = results.filter(entity =>
        entity.name.toLowerCase().includes(query.toLowerCase()),
      );
    }

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      results = results.filter(entity =>
        entity.tags && entity.tags.some(tag => tags.includes(tag)),
      );
    }

    return Promise.resolve(results.slice(0, limit));
  }

  public semanticSearch(
    query: string,
    tags?: string[],
    limit = 10,
    _offset = 0,
  ): Promise<MockEntity[]> {
    // Generate embedding for query using the embedding service
    return this.embeddingService.generateEmbedding(query)
      .then(_embedding => {
        // Mock data with similarity scores (would normally come from vector search)
        const mockData: (MockEntity & { similarity?: number })[] = [
          { id: '1', name: 'Semantic Result 1', similarity: 0.95, tags: ['test'] },
          { id: '2', name: 'Semantic Result 2', similarity: 0.85, tags: ['example'] },
          { id: '3', name: 'Semantic Result 3', similarity: 0.75, tags: ['test', 'example'] },
        ];

        // Filter by tags if provided
        let results = [...mockData];
        if (tags && tags.length > 0) {
          results = results.filter(entity =>
            entity.tags && entity.tags.some(tag => tags.includes(tag)),
          );
        }

        return results.slice(0, limit);
      });
  }

  async findRelated(
    entityId: string,
    maxResults = 5,
  ): Promise<MockEntity[]> {
    // For testing, just return some mock related entities
    const mockData: MockEntity[] = [
      { id: `related-to-${entityId}-1`, name: 'Related Entity 1', tags: ['test'] },
      { id: `related-to-${entityId}-2`, name: 'Related Entity 2', tags: ['example'] },
    ];

    return Promise.resolve(mockData.slice(0, maxResults));
  }

  // Make the protected method public for testing
  public override calculateTagMatchScore(sourceTags: string[], targetTags: string[]): number {
    // Call the parent implementation
    return super.calculateTagMatchScore(sourceTags, targetTags);
  }

  protected extractKeywords(
    text: string,
    maxKeywords = 5,
  ): string[] {
    // Simple mock implementation that extracts "words" from the text
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    return [...new Set(words)].slice(0, maxKeywords);
  }
}

describe('BaseSearchService', () => {
  let searchService: TestSearchService;
  let repository: MockBaseRepository<MockEntity>;
  // Fix type declaration to use BaseEmbeddingService
  let embeddingService: BaseEmbeddingService;

  beforeEach(() => {
    // Reset all singletons
    TestSearchService.resetInstance();
    MockBaseRepository.resetInstance();
    MockBaseEmbeddingService.resetInstance();

    // Create fresh instances
    repository = MockBaseRepository.createFresh();
    // Add explicit type assertion
    embeddingService = MockBaseEmbeddingService.createFresh() as unknown as BaseEmbeddingService;

    // Mock repository methods as needed
    repository.getById = mock(async (id: string) => {
      return { id, name: `Entity ${id}`, tags: ['test'] };
    });

    // Create search service with mocked dependencies (fix TS error with explicit casting)
    searchService = TestSearchService.createFresh(repository, embeddingService);
  });

  test('singleton instance management', () => {
    // Test getInstance returns same instance
    const instance1 = TestSearchService.getInstance();
    const instance2 = TestSearchService.getInstance();
    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(TestSearchService);
    
    // Test resetInstance clears instance
    TestSearchService.resetInstance();
    const instance3 = TestSearchService.getInstance();
    expect(instance1).not.toBe(instance3);
  });

  test('search functionality with different modes and options', async () => {
    // Test option validation
    await expect(
      searchService.search(null as unknown as BaseSearchOptions),
    ).rejects.toThrow(ValidationError);

    // Set up spies for search methods
    const semanticSearchSpy = mock(searchService.semanticSearch);
    const keywordSearchSpy = mock(searchService.keywordSearch);
    searchService.semanticSearch = semanticSearchSpy;
    searchService.keywordSearch = keywordSearchSpy;

    // Test semantic search mode
    await searchService.search({
      query: 'test query',
      semanticSearch: true,
    });
    expect(semanticSearchSpy).toHaveBeenCalled();
    
    // Reset spies
    semanticSearchSpy.mockClear();
    keywordSearchSpy.mockClear();

    // Test keyword search mode
    await searchService.search({
      query: 'test query',
      semanticSearch: false,
    });
    expect(keywordSearchSpy).toHaveBeenCalled();

    // Test limit parameter by returning a limited set directly
    semanticSearchSpy.mockImplementation(() => Promise.resolve([
      { id: '1', name: 'Result 1', tags: [] },
    ]));
    
    const results = await searchService.search({
      query: 'test',
      limit: 1,
      semanticSearch: true,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  test('related entities and tag matching', async () => {
    // Test findRelated functionality
    const entityId = 'test-123';
    const relatedResults = await searchService.findRelated(entityId, 2);

    expect(Array.isArray(relatedResults)).toBe(true);
    expect(relatedResults.length).toBeLessThanOrEqual(2);
    expect(relatedResults[0].id).toContain(entityId);

    // Test tag matching scenarios
    const tagMatchTestCases = [
      // [sourceTags, targetTags, expectedScoreCondition]
      [['test', 'example', 'common'], ['common', 'other'], 'positive'], // Some match
      [[], ['test'], 'zero'],                                           // Empty source
      [['test'], [], 'zero'],                                           // Empty target
      [[], [], 'zero'],                                                 // Both empty
    ];

    for (const [sourceTags, targetTags, condition] of tagMatchTestCases) {
      const score = searchService.calculateTagMatchScore(
        sourceTags as string[], 
        targetTags as string[],
      );
      
      expect(typeof score).toBe('number');
      
      if (condition === 'positive') {
        expect(score).toBeGreaterThan(0);
      } else if (condition === 'zero') {
        expect(score).toBe(0);
      }
    }
  });
});