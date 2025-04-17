/**
 * Mock implementation of NewsApiSource
 * Following the Component Interface Standardization pattern
 */
import type { ExternalSearchOptions, ExternalSourceInterface, ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';

export class MockNewsApiSource implements ExternalSourceInterface {
  private static instance: MockNewsApiSource | null = null;
  
  /**
   * Get the singleton instance of MockNewsApiSource
   * @returns The shared instance
   */
  public static getInstance(): MockNewsApiSource {
    if (!MockNewsApiSource.instance) {
      MockNewsApiSource.instance = new MockNewsApiSource();
    }
    return MockNewsApiSource.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockNewsApiSource.instance = null;
  }

  /**
   * Create a fresh instance (primarily for testing)
   * @returns A new instance
   */
  public static createFresh(): MockNewsApiSource {
    return new MockNewsApiSource();
  }
  
  name = 'NewsAPI';
  
  /**
   * Search NewsAPI for content related to the query
   * @param options Search options
   * @returns Mock search results
   */
  async search(_options?: ExternalSearchOptions): Promise<ExternalSourceResult[]> {
    return [
      {
        title: 'Mock News Article',
        content: 'Mock content from NewsAPI source for testing. This content simulates what would be returned from the News API.',
        url: 'https://example.com/news/1',
        source: 'NewsAPI',
        sourceType: 'news',
        timestamp: new Date(),
        confidence: 0.8,
      },
    ];
  }
  
  /**
   * Check if the NewsAPI source is available
   * @returns Always returns true for mock
   */
  async checkAvailability(): Promise<boolean> {
    return true;
  }
  
  /**
   * Get metadata about the NewsAPI source
   * @returns Mock metadata
   */
  async getSourceMetadata(): Promise<Record<string, unknown>> {
    return { 
      name: 'NewsAPI', 
      type: 'news',
      requiresApiKey: true,
      maxResults: 100,
    };
  }
}
