/**
 * Mock implementation for BaseSearchService
 * 
 * Provides a standardized mock that follows the Component Interface Standardization pattern.
 */

// We use SearchOptions directly from ISearchService instead
// import type { BaseSearchOptions } from '@/services/common/baseSearchService';
import type { SearchOptions } from '@/services/interfaces/ISearchService';

// Define SearchResult type locally
export type SearchResult<T> = {
  item: T;
  score: number;
};

/**
 * Standardized mock implementation for BaseSearchService
 * Implements the Component Interface Standardization pattern
 */
export class MockBaseSearchService {
  /** Singleton instance */
  private static instance: MockBaseSearchService | null = null;

  /**
   * Get the singleton instance
   */
  public static getInstance(): MockBaseSearchService {
    if (!MockBaseSearchService.instance) {
      MockBaseSearchService.instance = new MockBaseSearchService();
    }
    return MockBaseSearchService.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockBaseSearchService.instance = null;
  }

  /**
   * Create a fresh instance
   */
  public static createFresh(): MockBaseSearchService {
    return new MockBaseSearchService();
  }

  /**
   * Default full-text search implementation
   */
  async fullTextSearch<T extends Record<string, unknown>>(
    query: string, 
    entities: T[], 
    options?: SearchOptions,
  ): Promise<SearchResult<T>[]> {
    if (!query || entities.length === 0) {
      return [];
    }
    
    // Mock implementation that always returns the first few entities with a mock score
    const limit = options?.limit || 10;
    const results = entities.slice(0, limit).map((entity, index) => {
      return {
        item: entity,
        score: 1 - (index * 0.1),  // Mock decreasing scores
      };
    });
    
    return results;
  }

  /**
   * Default vector search implementation
   */
  async vectorSearch<T extends Record<string, unknown>>(
    embedding: number[], 
    entities: Array<T & { embedding?: number[] }>, 
    options?: SearchOptions,
  ): Promise<SearchResult<T>[]> {
    if (!embedding || entities.length === 0) {
      return [];
    }
    
    // Mock implementation that always returns the first few entities with a mock score
    const limit = options?.limit || 10;
    const results = entities.slice(0, limit).map((entity, index) => {
      return {
        item: entity,
        score: 0.9 - (index * 0.1),  // Mock decreasing scores
      };
    });
    
    return results;
  }

  /**
   * Default hybrid search implementation
   */
  async hybridSearch<T extends Record<string, unknown>>(
    query: string,
    embedding: number[],
    entities: Array<T & { embedding?: number[] }>,
    options?: SearchOptions,
  ): Promise<SearchResult<T>[]> {
    if ((!query && !embedding) || entities.length === 0) {
      return [];
    }
    
    // Mock implementation that always returns the first few entities with a mock score
    const limit = options?.limit || 10;
    const results = entities.slice(0, limit).map((entity, index) => {
      return {
        item: entity,
        score: 0.95 - (index * 0.1),  // Mock decreasing scores
      };
    });
    
    return results;
  }
}