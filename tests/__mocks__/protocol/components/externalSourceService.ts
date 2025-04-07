/**
 * External Source Service Mocks
 * 
 * This file provides mock implementations for the External Source Service components
 * following the standardized singleton pattern with getInstance(), resetInstance(), and createFresh().
 */

import { mock } from 'bun:test';

import { createMockEmbedding } from '@test/__mocks__/utils/embeddingUtils';

// External source result type
export interface ExternalSourceResult {
  title: string;
  content: string;
  url: string;
  source: string;
  embedding?: number[] | null;
}

// Mock response types that match Wikipedia and NewsAPI response structure
interface MockWikipediaResponse {
  query: {
    search: Array<{
      pageid: number;
      title: string;
      snippet: string;
    }>;
  };
}

interface MockNewsApiResponse {
  status: string;
  articles: Array<{
    title: string;
    description: string;
    content: string;
    url: string;
  }>;
}

/**
 * Setup fetch mock for external sources
 */
export function setupMockFetch(_unused?: unknown): typeof fetch {
  return (async (url: URL | string, _options?: RequestInit) => {
    if (typeof url === 'string' && url.includes('wikipedia')) {
      // Wikipedia API response
      const responseData: MockWikipediaResponse = {
        query: {
          search: [
            {
              pageid: 12345,
              title: 'Mock Wikipedia Result',
              snippet: 'This is a mock Wikipedia result',
            },
          ],
        },
      };
      return new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    } else if (typeof url === 'string' && url.includes('newsapi')) {
      // NewsAPI response
      const responseData: MockNewsApiResponse = {
        status: 'ok',
        articles: [
          {
            title: 'Mock News Result',
            description: 'News description',
            content: 'This is a mock news result',
            url: 'https://news.example.com/article/1',
          },
        ],
      };
      return new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    } else {
      // Default response
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    }
  }) as unknown as typeof fetch;
}

/**
 * Mock Wikipedia Source class
 */
export class MockWikipediaSource {
  private static instance: MockWikipediaSource | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockWikipediaSource {
    if (!MockWikipediaSource.instance) {
      MockWikipediaSource.instance = new MockWikipediaSource();
    }
    return MockWikipediaSource.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockWikipediaSource.instance = null;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static createFresh(): MockWikipediaSource {
    return new MockWikipediaSource();
  }
  
  name = 'Wikipedia';
  search = mock(() => Promise.resolve([{
    title: 'Mock Wikipedia Result',
    content: 'This is a mock Wikipedia result',
    url: 'https://en.wikipedia.org/wiki/Mock',
    source: 'Wikipedia',
    embedding: createMockEmbedding('Wikipedia test'),
  }]));
  checkAvailability = mock(() => Promise.resolve(true));
  getSourceMetadata = mock(() => Promise.resolve({ name: 'Wikipedia', description: 'Mock Wikipedia Source' }));
}

/**
 * Mock News API Source class
 */
export class MockNewsApiSource {
  private static instance: MockNewsApiSource | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockNewsApiSource {
    if (!MockNewsApiSource.instance) {
      MockNewsApiSource.instance = new MockNewsApiSource();
    }
    return MockNewsApiSource.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockNewsApiSource.instance = null;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static createFresh(): MockNewsApiSource {
    return new MockNewsApiSource();
  }
  
  name = 'NewsAPI';
  search = mock(() => Promise.resolve([{
    title: 'Mock News Result',
    content: 'This is a mock news result',
    url: 'https://news.example.com/article/1',
    source: 'NewsAPI',
    embedding: createMockEmbedding('NewsAPI test'),
  }]));
  checkAvailability = mock(() => Promise.resolve(true));
  getSourceMetadata = mock(() => Promise.resolve({ name: 'NewsAPI', description: 'Mock News API Source' }));
}

/**
 * Mock External Source Service
 */
export class MockExternalSourceService {
  private static instance: MockExternalSourceService | null = null;
  private sources: Array<{
    name: string;
    search: (query: string, options?: Record<string, unknown>) => Promise<ExternalSourceResult[]>;
    checkAvailability: () => Promise<boolean>;
    isAvailable: boolean;
  }>;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockExternalSourceService {
    if (!MockExternalSourceService.instance) {
      MockExternalSourceService.instance = new MockExternalSourceService();
    }
    return MockExternalSourceService.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockExternalSourceService.instance = null;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static createFresh(): MockExternalSourceService {
    return new MockExternalSourceService();
  }
  
  constructor() {
    const wikipediaSource = MockWikipediaSource.getInstance();
    const newsApiSource = MockNewsApiSource.getInstance();
    
    this.sources = [
      {
        name: wikipediaSource.name,
        search: wikipediaSource.search,
        checkAvailability: wikipediaSource.checkAvailability,
        isAvailable: true,
      },
      {
        name: newsApiSource.name,
        search: newsApiSource.search,
        checkAvailability: newsApiSource.checkAvailability,
        isAvailable: true,
      },
    ];
  }
  
  /**
   * Search all sources
   */
  search = mock<(query: string, options?: Record<string, unknown>) => Promise<ExternalSourceResult[]>>(
    async (query: string, options: Record<string, unknown> = {}) => {
      // Combine results from all available sources
      const results: ExternalSourceResult[] = [];
      
      for (const source of this.sources) {
        if (source.isAvailable) {
          const sourceResults = await source.search(query, options);
          results.push(...sourceResults);
        }
      }
      
      return results;
    },
  );
  
  /**
   * Check if any sources are available
   */
  checkSourcesAvailability = mock<() => Promise<boolean>>(async () => {
    let anyAvailable = false;
    
    for (const source of this.sources) {
      const isAvailable = await source.checkAvailability();
      source.isAvailable = isAvailable;
      if (isAvailable) {
        anyAvailable = true;
      }
    }
    
    return anyAvailable;
  });
  
  /**
   * Get all available sources
   */
  getAvailableSources = mock<() => string[]>(() => {
    return this.sources
      .filter(source => source.isAvailable)
      .map(source => source.name);
  });
  
  /**
   * Set mock sources for testing
   */
  setMockSources(sources: typeof this.sources): void {
    this.sources = sources;
  }
  
  /**
   * Add a mock source for testing
   */
  addMockSource(source: typeof this.sources[0]): void {
    this.sources.push(source);
  }
}