/**
 * Tests for external sources with all network calls properly mocked
 */
import { describe, test, expect, mock, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { WikipediaSource } from '../src/mcp/context/sources/wikipediaSource';
import { NewsApiSource } from '../src/mcp/context/sources/newsApiSource';
import { ExternalSourceContext } from '../src/mcp/context/externalSourceContext';
import { EmbeddingService } from '../src/mcp/model/embeddings';

// Mock the EmbeddingService to prevent any actual API calls
mock.module('../src/mcp/model/embeddings', () => {
  return {
    EmbeddingService: class MockEmbeddingService {
      constructor() {
        // No actual API calls
      }
      
      async getEmbedding() {
        return {
          embedding: Array(1536).fill(0).map((_, i) => Math.sin(i)),
          truncated: false,
        };
      }
      
      async getBatchEmbeddings(texts) {
        return texts.map(() => ({
          embedding: Array(1536).fill(0).map((_, i) => Math.sin(i)),
          truncated: false,
        }));
      }
      
      cosineSimilarity(vec1, vec2) {
        return 0.5; // Mock similarity
      }
      
      chunkText(text, chunkSize, overlap) {
        return ['chunk1', 'chunk2'];
      }
    },
  };
});

// Silence logger
mock.module('../src/utils/logger', () => {
  return {
    default: {
      info: () => {},
      debug: () => {},
      error: () => {},
      warn: () => {},
    },
  };
});

// Store the original fetch function
const originalFetch = globalThis.fetch;
let mockFetch: typeof fetch;

describe('External Sources (Fully Mocked)', () => {
  // Set up the mock once for all tests
  beforeAll(() => {
    // Create and apply the mock fetch with detailed logging
    mockFetch = mock((url, options) => {
      console.log(`MOCK FETCH CALLED WITH: ${url}`);
      
      // Default response for unspecified URLs
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }),
      }) as Response;
    });
    
    globalThis.fetch = mockFetch;
  });
  
  // Always restore the original at the end
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });
  
  beforeEach(() => {
    // Clear mock history before each test
    mockFetch.mockClear();
  });
  
  // Keep the mock fetch throughout the entire test run
  // We'll restore it at the end of all tests
  // afterEach(() => {
  //   // Restore original fetch after each test
  //   globalThis.fetch = originalFetch;
  // });

  describe('WikipediaSource', () => {
    test('should initialize correctly', () => {
      const source = new WikipediaSource('test-api-key');
      expect(source.name).toBe('Wikipedia');
    });
    
    test('should handle search correctly', async () => {
      // Mock search response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            query: {
              search: [
                {
                  pageid: 123,
                  title: 'Quantum computing',
                  snippet: 'Test snippet about quantum computing',
                  size: 50000,
                  wordcount: 5000,
                },
              ],
            },
          }),
        }) as Response);
      
      // Mock article content response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            query: {
              pages: {
                '123': {
                  pageid: 123,
                  title: 'Quantum computing',
                  extract: 'A quantum computer is a computer that exploits quantum mechanical phenomena.',
                },
              },
            },
          }),
        }) as Response);
      
      const source = new WikipediaSource('test-api-key');
      const results = await source.search({ query: 'quantum computing' });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Quantum computing');
      expect(results[0].content).toBe('A quantum computer is a computer that exploits quantum mechanical phenomena.');
      expect(results[0].url).toContain('wikipedia.org/wiki/Quantum_computing');
    });
    
    test('should handle API errors gracefully', async () => {
      // Mock a failed API response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }) as Response);
      
      const source = new WikipediaSource('test-api-key');
      const results = await source.search({ query: 'test query' });
      
      expect(results.length).toBe(0);
    });
    
    test('should check availability with different response formats', async () => {
      // Create individual sources for each test to avoid state sharing
      
      // Test nested structure (query.general)
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            query: {
              general: {
                sitename: 'Wikipedia',
                mainpage: 'Main Page',
              },
            },
          }),
        }) as Response);
      
      const source1 = new WikipediaSource('test-api-key');
      const isAvailable1 = await source1.checkAvailability();
      expect(isAvailable1).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Reset mock
      mockFetch.mockClear();
      
      // Test flat structure (sitename)
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            sitename: 'Wikipedia',
            mainpage: 'Main Page',
          }),
        }) as Response);
      
      const source2 = new WikipediaSource('test-api-key');
      const isAvailable2 = await source2.checkAvailability();
      expect(isAvailable2).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Reset mock
      mockFetch.mockClear();
      
      // Test invalid response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            something: 'else',
          }),
        }) as Response);
      
      const source3 = new WikipediaSource('test-api-key');
      const isAvailable3 = await source3.checkAvailability();
      expect(isAvailable3).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('NewsApiSource', () => {
    test('should initialize correctly', () => {
      const source = new NewsApiSource('test-news-api-key', 'test-openai-key');
      expect(source.name).toBe('NewsAPI');
    });
    
    test('should handle search correctly', async () => {
      // Mock news API response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
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
        }) as Response);
      
      const source = new NewsApiSource('test-news-api-key');
      const results = await source.search({ query: 'test query' });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Test News Article');
      expect(results[0].content).toContain('This is the content of a test news article.');
      expect(results[0].source).toContain('NewsAPI');
    });
    
    test('should handle API errors gracefully', async () => {
      // Mock failed API request
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        }) as Response);
      
      const source = new NewsApiSource('test-news-api-key');
      const results = await source.search({ query: 'test query' });
      
      expect(results.length).toBe(0);
    });
    
    test('should handle missing API key', async () => {
      const source = new NewsApiSource(); // No API key
      
      // Should return empty results without making API call
      const results = await source.search({ query: 'test query' });
      expect(results.length).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
  
  describe('ExternalSourceContext', () => {
    test('should check sources availability properly', async () => {
      // Mock fetch to return success for availability checks
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            sitename: 'Wikipedia',
            status: 'ok',
          }),
        }) as Response);
      
      const context = new ExternalSourceContext('test-api-key');
      const availability = await context.checkSourcesAvailability();
      
      // Wikipedia should be available
      expect(typeof availability).toBe('object');
      expect(availability.Wikipedia).toBe(true);
    });
  });
});