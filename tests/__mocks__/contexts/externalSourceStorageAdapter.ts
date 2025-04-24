/**
 * Mock implementation of ExternalSourceStorageAdapter
 * 
 * This mock follows the Component Interface Standardization pattern
 * and provides a simplified implementation for testing.
 */

import type { ExternalSourceStorageConfig } from '@/contexts/externalSources/externalSourceStorageAdapter';
import type { ExternalSourceInterface, ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { ListOptions, SearchCriteria, StorageInterface } from '@/contexts/storageInterface';

/**
 * Mock adapter for external source storage
 */
export class MockExternalSourceStorageAdapter implements StorageInterface<ExternalSourceResult> {
  /** The singleton instance */
  private static instance: MockExternalSourceStorageAdapter | null = null;
  
  /** Registered external source instances */
  private sources: Map<string, ExternalSourceInterface> = new Map();
  
  /** Cache for storing search results */
  private mockResults: ExternalSourceResult[] = [];
  
  /**
   * Create a new MockExternalSourceStorageAdapter
   * @param _config Configuration options
   */
  private constructor(_config: ExternalSourceStorageConfig = {}) {
    // Add some default mock results
    this.mockResults = [
      {
        title: 'Mock External Source Result 1',
        content: 'This is a mock result for testing external sources.',
        source: 'Wikipedia',
        sourceType: 'article',
        url: 'https://en.wikipedia.org/wiki/Mock',
        timestamp: new Date(),
        confidence: 0.95,
      },
      {
        title: 'Mock External Source Result 2',
        content: 'This is another mock result for testing external sources.',
        source: 'NewsAPI',
        sourceType: 'news',
        url: 'https://example.com/news/article',
        timestamp: new Date(),
        confidence: 0.85,
      },
    ];
  }
  
  /**
   * Get the singleton instance of MockExternalSourceStorageAdapter
   * 
   * @param config Optional configuration for the adapter
   * @returns The shared MockExternalSourceStorageAdapter instance
   */
  public static getInstance(config?: ExternalSourceStorageConfig): MockExternalSourceStorageAdapter {
    if (!MockExternalSourceStorageAdapter.instance) {
      MockExternalSourceStorageAdapter.instance = new MockExternalSourceStorageAdapter(config);
    }
    return MockExternalSourceStorageAdapter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    MockExternalSourceStorageAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param config Optional configuration for the adapter
   * @returns A new MockExternalSourceStorageAdapter instance
   */
  public static createFresh(config?: ExternalSourceStorageConfig): MockExternalSourceStorageAdapter {
    return new MockExternalSourceStorageAdapter(config);
  }
  
  /**
   * Register a new external source
   * @param source The source to register
   */
  registerSource(source: ExternalSourceInterface): void {
    this.sources.set(source.name, source);
  }
  
  /**
   * Get the available sources
   * @returns Array of external sources
   */
  getEnabledSources(): ExternalSourceInterface[] {
    return Array.from(this.sources.values());
  }
  
  /**
   * Set mock results for testing
   * @param results Array of mock results
   */
  setMockResults(results: ExternalSourceResult[]): void {
    this.mockResults = [...results];
  }
  
  /**
   * Create method (not applicable for external sources)
   */
  async create(_item: Partial<ExternalSourceResult>): Promise<string> {
    return 'mock-id';
  }
  
  /**
   * Read a specific result by title (since external sources don't have IDs)
   */
  async read(id: string): Promise<ExternalSourceResult | null> {
    // Use title as the identifier since external sources don't have consistent IDs
    const result = this.mockResults.find(item => item.title === id);
    return result || null;
  }
  
  /**
   * Update is not supported for external sources
   */
  async update(_id: string, _updates: Partial<ExternalSourceResult>): Promise<boolean> {
    return false;
  }
  
  /**
   * Delete is not supported for external sources
   */
  async delete(_id: string): Promise<boolean> {
    return false;
  }
  
  /**
   * Mock search that returns pre-configured results
   */
  async search(criteria: SearchCriteria): Promise<ExternalSourceResult[]> {
    const query = criteria['query'] as string;
    if (!query) {
      return [];
    }
    
    // Filter results if query contains specific terms
    if (query && query.length > 0) {
      return this.mockResults.filter(
        result => result.title.toLowerCase().includes(query.toLowerCase()) || 
                 result.content.toLowerCase().includes(query.toLowerCase()),
      );
    }
    
    return this.mockResults;
  }
  
  /**
   * List external source results
   */
  async list(options?: ListOptions): Promise<ExternalSourceResult[]> {
    const limit = options?.limit || 10;
    return this.mockResults.slice(0, limit);
  }
  
  /**
   * Count external source results
   */
  async count(): Promise<number> {
    return this.mockResults.length;
  }
  
  /**
   * Check availability of all sources
   */
  async checkSourcesAvailability(): Promise<Record<string, boolean>> {
    const availabilityMap: Record<string, boolean> = {};
    
    for (const [name] of this.sources.entries()) {
      availabilityMap[name] = true;
    }
    
    return availabilityMap;
  }
}