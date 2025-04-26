/**
 * Tests for BaseSearchService
 * 
 * This test file focuses on testing the functionality of the BaseSearchService
 * by creating a concrete implementation of the abstract class.
 */
import { mock } from 'bun:test';
import { beforeEach, describe, expect, test } from 'bun:test';

import { BaseSearchService, type BaseSearchOptions } from '@/services/common/baseSearchService';
import { ValidationError } from '@/utils/errorUtils';
import { MockBaseEmbeddingService } from '@test/__mocks__/services/common/baseEmbeddingService';
import { MockBaseRepository, type MockEntity } from '@test/__mocks__/services/BaseRepository';
import type { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';

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
    embeddingService = MockBaseEmbeddingService.createFresh() as unknown as BaseEmbeddingService
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

    const embeddingService = (dependencies['embeddingService'] || MockBaseEmbeddingService.createFresh()) as unknown as BaseEmbeddingService

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

  test('getInstance should return a singleton instance', () => {
    const instance1 = TestSearchService.getInstance();
    const instance2 = TestSearchService.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(TestSearchService);
  });

  test('resetInstance should clear the singleton instance', () => {
    const instance1 = TestSearchService.getInstance();
    TestSearchService.resetInstance();
    const instance2 = TestSearchService.getInstance();

    expect(instance1).not.toBe(instance2);
  });

  test('search should validate options', async () => {
    await expect(
      searchService.search(null as unknown as BaseSearchOptions),
    ).rejects.toThrow(ValidationError);
  });

  test('search should use semanticSearch when enabled with query', async () => {
    // Use a spy on the public semanticSearch method
    const semanticSearchSpy = mock(searchService.semanticSearch);
    searchService.semanticSearch = semanticSearchSpy;

    // Call search with semanticSearch enabled
    await searchService.search({
      query: 'test query',
      semanticSearch: true,
    });

    // Verify the expected behavior
    expect(semanticSearchSpy).toHaveBeenCalled();
  });

  test('search should fall back to keyword search when semantic search is disabled', async () => {
    // Use a spy on the public keywordSearch method
    const keywordSearchSpy = mock(searchService.keywordSearch);
    searchService.keywordSearch = keywordSearchSpy;

    // Call search with semanticSearch disabled
    await searchService.search({
      query: 'test query',
      semanticSearch: false,
    });

    // Verify the expected behavior
    expect(keywordSearchSpy).toHaveBeenCalled();
  });

  test('search should respect limit parameter', async () => {
    const results = await searchService.search({
      query: 'test',
      limit: 1,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  test('findRelated should return related entities', async () => {
    const entityId = 'test-123';
    const results = await searchService.findRelated(entityId, 2);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results[0].id).toContain(entityId);
  });

  test('calculateTagMatchScore should measure tag similarity', async () => {
    const sourceTags = ['test', 'example', 'common'];
    const targetTags = ['common', 'other'];

    // Use the public method we exposed for testing
    const score = searchService.calculateTagMatchScore(sourceTags, targetTags);

    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThan(0); // Should find at least one match
  });

  test('calculateTagMatchScore should handle empty tags gracefully', async () => {
    // Use the public method we exposed for testing
    const score1 = searchService.calculateTagMatchScore([], ['test']);
    const score2 = searchService.calculateTagMatchScore(['test'], []);
    const score3 = searchService.calculateTagMatchScore([], []);

    expect(score1).toBe(0);
    expect(score2).toBe(0);
    expect(score3).toBe(0);
  });
});
