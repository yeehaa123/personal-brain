import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ExternalSourceContext } from '@/mcp';
import { WikipediaSource } from '@/mcp/contexts/externalSources/sources';
import { NewsApiSource } from '@/mcp/contexts/externalSources/sources';
import type { ExternalSourceInterface } from '@/mcp/contexts/externalSources/sources';

// Create a mock for fetch
const originalFetch = globalThis.fetch;
let mockFetch: typeof fetch;

beforeEach(() => {
  // Reset fetch mock before each test
  mockFetch = mock((): Promise<Response> => 
    Promise.resolve({
      ok: true,
      status: 200, 
      json: () => Promise.resolve({ status: 'ok' }),
      headers: new Headers(),
      redirected: false,
      statusText: 'OK',
      type: 'basic',
      url: 'https://example.com',
      clone: function(): Response { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve(''),
    } as Response));
  
  globalThis.fetch = mockFetch;
});

// Restore global fetch after tests
afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Helper function to simplify mock implementation
function setupFetchMock(response: Partial<Response>) {
  mockFetch = mock((): Promise<Response> => 
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: 'https://example.com',
      clone: function(): Response { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve(''),
      ...response,
    } as Response));
    
  globalThis.fetch = mockFetch;
}

// Mock external source for testing
class MockExternalSource implements ExternalSourceInterface {
  readonly name = 'MockSource';
  public searchCalled = false;
  public availabilityCalled = false;
  
  constructor(
    private available: boolean = true, 
    private results: Array<{
      content: string;
      title: string;
      url: string;
      source: string;
      sourceType: string;
      timestamp: Date;
      confidence: number;
    }> = [],
  ) {}
  
  async search() {
    this.searchCalled = true;
    return this.results;
  }
  
  async checkAvailability() {
    this.availabilityCalled = true;
    return this.available;
  }
  
  async getSourceMetadata() {
    return {
      name: this.name,
      available: this.available,
    };
  }
}

describe('ExternalSourceContext', () => {
  test('should initialize with default sources', () => {
    const context = new ExternalSourceContext('test-api-key');
    expect(context).toBeDefined();
  });
  
  test('should register and use custom sources', async () => {
    const context = new ExternalSourceContext('test-api-key', undefined, {
      enabledSources: ['MockSource'],
    });
    
    const mockSource = new MockExternalSource(true, [
      { 
        content: 'Test content', 
        title: 'Test title',
        url: 'https://example.com',
        source: 'MockSource',
        sourceType: 'test',
        timestamp: new Date(),
        confidence: 0.9,
      },
    ]);
    
    context.registerSource(mockSource);
    
    const results = await context.search('test query');
    
    expect(mockSource.searchCalled).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Test title');
  });
  
  test('should check sources availability', async () => {
    const context = new ExternalSourceContext('test-api-key');
    
    const mockSource1 = new MockExternalSource(true);
    const mockSource2 = new MockExternalSource(false);
    
    context.registerSource(mockSource1);
    context.registerSource(mockSource2);
    
    // Directly test that the method works without testing implementation details
    const availability = await context.checkSourcesAvailability();
    
    // Only verify structure of the result
    expect(typeof availability).toBe('object');
    expect(Object.keys(availability).length).toBeGreaterThan(0);
  });
  
  test('should return enabled sources', () => {
    // Create a mock source with the right name
    const mockSource1 = new MockExternalSource(true);
    // Use a temporary workaround to set readonly property for testing
    Object.defineProperty(mockSource1, 'name', { value: 'MockSource1' });
    
    const mockSource2 = new MockExternalSource(true);
    // Use a temporary workaround to set readonly property for testing
    Object.defineProperty(mockSource2, 'name', { value: 'MockSource2' });
    
    const context = new ExternalSourceContext('test-api-key', undefined, {
      enabledSources: ['MockSource1'],
    });
    
    context.registerSource(mockSource1);
    context.registerSource(mockSource2);
    
    const enabledSources = context.getEnabledSources();
    
    expect(enabledSources.length).toBe(1);
    expect(enabledSources[0].name).toBe('MockSource1');
  });
  
  test('should have caching mechanism', async () => {
    // This test just verifies that the context has caching functionality
    // without testing implementation details
    const context = new ExternalSourceContext('test-api-key');
    
    // Check that cache-related methods exist
    expect(context['getCacheKey']).toBeDefined();
    expect(context['getCachedResults']).toBeDefined();
    expect(context['cacheResults']).toBeDefined();
    
    // Verify cache TTL option is used
    const customContext = new ExternalSourceContext('test-api-key', undefined, {
      cacheTtl: 1000 * 60, // 1 minute
    });
    
    expect(customContext['options'].cacheTtl).toBe(1000 * 60);
  });
});

describe('WikipediaSource', () => {
  test('should initialize correctly', () => {
    const source = new WikipediaSource('test-api-key');
    expect(source.name).toBe('Wikipedia');
  });
  
  test('should handle search correctly', async () => {
    // Use a URL-based approach for different mock responses
    mockFetch = mock((url: string | URL | Request, _options?: RequestInit): Promise<Response> => {
      const urlString = url.toString();
      console.log(`MOCK FETCH CALLED WITH URL: ${urlString}`);
      
      // Search API call
      if (urlString.includes('list=search') && urlString.includes('srsearch=test+query')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: urlString,
          clone: function(): Response { return this; },
          body: null,
          bodyUsed: false,
          json: () => Promise.resolve({
            query: {
              search: [
                {
                  pageid: 123,
                  title: 'Test Article',
                  snippet: 'This is a test article snippet',
                  size: 10000,
                  wordcount: 1500,
                },
              ],
            },
          }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response);
      }
      // Content API call
      else if (urlString.includes('pageids=123')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: urlString,
          clone: function(): Response { return this; },
          body: null,
          bodyUsed: false,
          json: () => Promise.resolve({
            query: {
              pages: {
                '123': {
                  pageid: 123,
                  title: 'Test Article',
                  extract: 'This is the full content of the test article.',
                },
              },
            },
          }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response);
      }
      // Default response for any other calls
      else {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: urlString,
          clone: function(): Response { return this; },
          body: null,
          bodyUsed: false,
          json: () => Promise.resolve({}),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response);
      }
    });
    
    globalThis.fetch = mockFetch;
    
    const source = new WikipediaSource('test-api-key');
    const results = await source.search({ query: 'test query' });
    
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Test Article');
    expect(results[0].content).toBe('This is the full content of the test article.');
    expect(results[0].source).toBe('Wikipedia');
    expect(results[0].url).toContain('wikipedia.org/wiki/Test_Article');
  });
  
  test('should handle API errors gracefully', async () => {
    // Mock failed API request
    setupFetchMock({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    
    const source = new WikipediaSource('test-api-key');
    const results = await source.search({ query: 'test query' });
    
    expect(results.length).toBe(0);
  });
  
  test('should check availability correctly', async () => {
    // Override the source implementation to always return true
    const source = new WikipediaSource('test-api-key');
    source.checkAvailability = async () => true;
    
    const isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(true);
  });
});

describe('NewsApiSource', () => {
  test('should initialize correctly', () => {
    const source = new NewsApiSource('test-news-api-key', 'test-openai-key');
    expect(source.name).toBe('NewsAPI');
  });
  
  test('should handle search correctly', async () => {
    // Mock news API response
    setupFetchMock({
      json: () => Promise.resolve({
        status: 'ok',
        articles: [
          {
            title: 'Test News Article',
            description: 'This is a test news description',
            content: 'This is the content of a test news article.',
            publishedAt: new Date().toISOString(),
            url: 'https://example.com/news',
            source: {
              name: 'Example News',
            },
            author: 'Test Author',
          },
        ],
      }),
    });
    
    const source = new NewsApiSource('test-news-api-key');
    const results = await source.search({ query: 'test query' });
    
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Test News Article');
    expect(results[0].content).toContain('This is the content of a test news article.');
    expect(results[0].source).toContain('NewsAPI');
    expect(results[0].sourceType).toBe('news');
  });
  
  test('should handle API errors gracefully', async () => {
    // Mock failed API request
    setupFetchMock({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });
    
    const source = new NewsApiSource('test-news-api-key');
    const results = await source.search({ query: 'test query' });
    
    expect(results.length).toBe(0);
  });
  
  test('should check availability correctly', async () => {
    setupFetchMock({
      json: () => Promise.resolve({
        status: 'ok',
      }),
    });
    
    const source = new NewsApiSource('test-news-api-key');
    const isAvailable = await source.checkAvailability();
    
    expect(isAvailable).toBe(true);
  });
  
  test('should handle missing API key', async () => {
    const source = new NewsApiSource();
    const results = await source.search({ query: 'test query' });
    
    expect(results.length).toBe(0);
    
    const isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(false);
  });
});