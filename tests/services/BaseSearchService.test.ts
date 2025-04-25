/**
 * Tests for BaseSearchService
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { BaseRepository } from '@/services/BaseRepository';
import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import { BaseSearchService } from '@/services/common/baseSearchService';
import type { BaseSearchOptions } from '@/services/common/baseSearchService';
import { ValidationError } from '@/utils/errorUtils';



// Create mock entity type
interface TestEntity {
  id: string;
  name: string;
  tags?: string[];
  embedding?: number[] | null;
}

// Create mock repository
class TestRepository extends BaseRepository<SQLiteTable, TestEntity> {
  protected get table() {
    return { id: { name: 'id' } } as unknown as SQLiteTable;
  }

  protected get entityName() {
    return 'test';
  }

  protected getIdColumn() {
    return { name: 'id' } as unknown as SQLiteColumn;
  }

  // Add methods needed for search
  async searchByKeywords(_query?: string, _tags?: string[]): Promise<TestEntity[]> {
    return [
      { id: '1', name: 'Test 1', tags: ['tag1'] },
      { id: '2', name: 'Test 2', tags: ['tag2'] },
    ];
  }

  async getRecentEntities(): Promise<TestEntity[]> {
    return [
      { id: '3', name: 'Recent 1' },
      { id: '4', name: 'Recent 2' },
    ];
  }
}

// Create mock embedding service
class TestEmbeddingService extends BaseEmbeddingService {
  async searchSimilar(_embedding: number[]): Promise<TestEntity[]> {
    return [
      { id: '5', name: 'Similar 1', embedding: [0.1, 0.2, 0.3] },
      { id: '6', name: 'Similar 2', embedding: [0.2, 0.3, 0.4] },
    ];
  }
}

// Concrete implementation of BaseSearchService for testing
class TestSearchService extends BaseSearchService<TestEntity, TestRepository, TestEmbeddingService> {
  // Configuration values with override modifier
  protected override entityName = 'test';
  // We don't need to re-declare these properties as they're provided by the base class
  // and initialized in the constructor via super()

  constructor() {
    // Call super with minimal configuration
    super({ entityName: 'test' }, {
      repository: new TestRepository(),
      embeddingService: new TestEmbeddingService(),
    });
  }

  protected override async keywordSearch(
    _query?: string,
    _tags?: string[],
    _limit = 10,
    _offset = 0,
  ): Promise<TestEntity[]> {
    return this.repository.searchByKeywords(_query, _tags);
  }

  protected override async semanticSearch(
    query: string,
    tags?: string[],
    _limit = 10,
    _offset = 0,
  ): Promise<TestEntity[]> {
    const embedding = await this.embeddingService.generateEmbedding(query); // Variable used
    const results = await this.embeddingService.searchSimilar(embedding);

    // Filter by tags if needed
    if (tags && tags.length > 0) {
      return results.filter(entity => {
        return entity.tags?.some(tag => tags.includes(tag));
      });
    }

    return results;
  }

  override async findRelated(_entityId: string, _maxResults = 5): Promise<TestEntity[]> {
    return [
      { id: '7', name: 'Related 1' },
      { id: '8', name: 'Related 2' },
    ];
  }

  protected override extractKeywords(text: string, _maxKeywords = 10): string[] {
    return text.split(' ').slice(0, _maxKeywords);
  }
}

describe('BaseSearchService', () => {
  let searchService: TestSearchService;

  beforeAll(() => {
    searchService = new TestSearchService();
  });


  test('search method should validate options', async () => {
    expect(searchService.search(null as unknown as BaseSearchOptions)).rejects.toThrow(ValidationError);
  });

  test('search should use semantic search when enabled with query', async () => {
    // Since semanticSearch is protected, we need to use a different approach
    // Create a spy instance with mocked semanticSearch implementation
    const spy = new TestSearchService();

    // Keep track of whether semanticSearch was called
    let semanticSearchCalled = false;

    // Override the protected method using Object.defineProperty
    Object.defineProperty(spy, 'semanticSearch', {
      value: async function() {
        semanticSearchCalled = true;
        return [{ id: '5', name: 'Semantic Result' }];
      },
    });

    const options: BaseSearchOptions = {
      query: 'test query',
      semanticSearch: true,
    };

    const results = await spy.search(options);

    expect(semanticSearchCalled).toBe(true);
    expect(results).toContainEqual({ id: '5', name: 'Semantic Result' });
  });

  test('search should fall back to keyword search', async () => {
    // Since keywordSearch is protected, we need to use a different approach
    const spy = new TestSearchService();

    // Keep track of whether keywordSearch was called
    let keywordSearchCalled = false;

    // Override the protected method using Object.defineProperty
    Object.defineProperty(spy, 'keywordSearch', {
      value: async function() {
        keywordSearchCalled = true;
        return [{ id: '1', name: 'Keyword Result' }];
      },
    });

    const options: BaseSearchOptions = {
      query: 'test query',
      semanticSearch: false,
    };

    const results = await spy.search(options);

    expect(keywordSearchCalled).toBe(true);
    expect(results).toContainEqual({ id: '1', name: 'Keyword Result' });
  });

  test('search should handle limit and offset options', async () => {
    // Create a spy instance
    const spy = new TestSearchService();

    // Keep track of captured values
    let capturedLimit = 0;
    let capturedOffset = 0;

    // Override the protected method
    Object.defineProperty(spy, 'keywordSearch', {
      value: async function(_query: string, _tags: string[], limit: number, offset: number) {
        capturedLimit = limit;
        capturedOffset = offset;
        return [{ id: '1', name: 'Result' }];
      },
    });

    await spy.search({
      limit: 20,
      offset: 5,
      semanticSearch: false,
    });

    expect(capturedLimit).toBe(20);
    expect(capturedOffset).toBe(5);
  });

  test('calculateTagMatchScore should correctly calculate score', () => {
    // Create a test subclass that exposes the protected method
    class TestServiceWithExposedMethods extends BaseSearchService<TestEntity, TestRepository, TestEmbeddingService> {
      protected override entityName = 'test';
      // Properties come from base class

      constructor() {
        super({ entityName: 'test' }, {
          repository: new TestRepository(),
          embeddingService: new TestEmbeddingService(),
        });
      }

      // Expose protected methods for testing
      public exposeCalculateTagMatchScore(sourceTags: string[], targetTags: string[]): number {
        return this.calculateTagMatchScore(sourceTags, targetTags);
      }

      // Implement abstract methods
      protected override keywordSearch() { return Promise.resolve([]); }
      protected override semanticSearch() { return Promise.resolve([]); }
      override async findRelated() { return Promise.resolve([]); }
      protected override extractKeywords() { return []; }
    }

    const testService = new TestServiceWithExposedMethods();

    // Direct matches
    const sourceTags = ['tag1', 'tag2', 'tag3'];
    const targetTags = ['tag1', 'tag4', 'tag5'];
    const score1 = testService.exposeCalculateTagMatchScore(sourceTags, targetTags);
    expect(score1).toBe(1); // One exact match

    // Partial matches
    const sourceTags2 = ['system', 'architecture'];
    const targetTags2 = ['ecosystem', 'architect'];
    const score2 = testService.exposeCalculateTagMatchScore(sourceTags2, targetTags2);
    expect(score2).toBe(1); // Two partial matches at 0.5 each

    // No matches
    const sourceTags3 = ['tag1', 'tag2'];
    const targetTags3 = ['tag3', 'tag4'];
    const score3 = testService.exposeCalculateTagMatchScore(sourceTags3, targetTags3);
    expect(score3).toBe(0); // No matches
  });

  test('deduplicateResults should remove duplicates', () => {
    // Create a test subclass that exposes the protected method
    class TestServiceWithExposedMethods extends BaseSearchService<TestEntity, TestRepository, TestEmbeddingService> {
      protected override entityName = 'test';
      // Properties come from base class

      constructor() {
        super({ entityName: 'test' }, {
          repository: new TestRepository(),
          embeddingService: new TestEmbeddingService(),
        });
      }

      // Expose protected methods for testing
      public exposeDeduplicateResults<T>(
        results: T[],
        getEntityId: (entity: T) => string,
        excludeId?: string,
      ): T[] {
        return this.deduplicateResults(results, getEntityId, excludeId);
      }

      // Implement abstract methods
      protected override keywordSearch() { return Promise.resolve([]); }
      protected override semanticSearch() { return Promise.resolve([]); }
      override async findRelated() { return Promise.resolve([]); }
      protected override extractKeywords() { return []; }
    }

    const testService = new TestServiceWithExposedMethods();
    const entities = [
      { id: '1', name: 'Entity 1' },
      { id: '2', name: 'Entity 2' },
      { id: '1', name: 'Entity 1 Duplicate' },
      { id: '3', name: 'Entity 3' },
    ];

    const deduplicated = testService.exposeDeduplicateResults(
      entities,
      entity => entity.id,
    );

    expect(deduplicated.length).toBe(3);
    expect(deduplicated).toContainEqual({ id: '1', name: 'Entity 1' });
    expect(deduplicated).toContainEqual({ id: '2', name: 'Entity 2' });
    expect(deduplicated).toContainEqual({ id: '3', name: 'Entity 3' });
    expect(deduplicated).not.toContainEqual({ id: '1', name: 'Entity 1 Duplicate' });
  });

  test('deduplicateResults should exclude specified ID', () => {
    // Use the same exposed method class
    class TestServiceWithExposedMethods extends BaseSearchService<TestEntity, TestRepository, TestEmbeddingService> {
      protected override entityName = 'test';
      // Properties come from base class

      constructor() {
        super({ entityName: 'test' }, {
          repository: new TestRepository(),
          embeddingService: new TestEmbeddingService(),
        });
      }

      // Expose protected methods for testing
      public exposeDeduplicateResults<T>(
        results: T[],
        getEntityId: (entity: T) => string,
        excludeId?: string,
      ): T[] {
        return this.deduplicateResults(results, getEntityId, excludeId);
      }

      // Implement abstract methods
      protected override keywordSearch() { return Promise.resolve([]); }
      protected override semanticSearch() { return Promise.resolve([]); }
      override async findRelated() { return Promise.resolve([]); }
      protected override extractKeywords() { return []; }
    }

    const testService = new TestServiceWithExposedMethods();
    const entities = [
      { id: '1', name: 'Entity 1' },
      { id: '2', name: 'Entity 2' },
      { id: '3', name: 'Entity 3' },
    ];

    const deduplicated = testService.exposeDeduplicateResults(
      entities,
      entity => entity.id,
      '2',
    );

    expect(deduplicated.length).toBe(2);
    expect(deduplicated).toContainEqual({ id: '1', name: 'Entity 1' });
    expect(deduplicated).toContainEqual({ id: '3', name: 'Entity 3' });
    expect(deduplicated).not.toContainEqual({ id: '2', name: 'Entity 2' });
  });
});
