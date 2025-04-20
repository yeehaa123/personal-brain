/**
 * Mock implementation of WikipediaSource
 * Following the Component Interface Standardization pattern
 */
import type { ExternalSearchOptions, ExternalSourceInterface, ExternalSourceResult } from '@/contexts/externalSources/sources';

export class MockWikipediaSource implements ExternalSourceInterface {
  private static instance: MockWikipediaSource | null = null;
  
  /**
   * Get the singleton instance of MockWikipediaSource
   * @returns The shared instance
   */
  public static getInstance(): MockWikipediaSource {
    if (!MockWikipediaSource.instance) {
      MockWikipediaSource.instance = new MockWikipediaSource();
    }
    return MockWikipediaSource.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockWikipediaSource.instance = null;
  }

  /**
   * Create a fresh instance (primarily for testing)
   * @returns A new instance
   */
  public static createFresh(): MockWikipediaSource {
    return new MockWikipediaSource();
  }
  
  name = 'Wikipedia';
  
  /**
   * Search Wikipedia for content related to the query
   * @param options Search options
   * @returns Mock search results
   */
  async search(_options?: ExternalSearchOptions): Promise<ExternalSourceResult[]> {
    return [
      {
        title: 'Mock Wikipedia Article',
        content: 'Mock content from Wikipedia source for testing. This content simulates what would be returned from the Wikipedia API.',
        url: 'https://wikipedia.org/wiki/Mock',
        source: 'Wikipedia',
        sourceType: 'encyclopedia',
        timestamp: new Date(),
        confidence: 0.9,
      },
    ];
  }
  
  /**
   * Check if the Wikipedia source is available
   * @returns Always returns true for mock
   */
  async checkAvailability(): Promise<boolean> {
    return true;
  }
  
  /**
   * Get metadata about the Wikipedia source
   * @returns Mock metadata
   */
  async getSourceMetadata(): Promise<Record<string, unknown>> {
    return { 
      name: 'Wikipedia', 
      type: 'encyclopedia',
      requiresApiKey: false,
      maxResults: 10,
    };
  }
}
