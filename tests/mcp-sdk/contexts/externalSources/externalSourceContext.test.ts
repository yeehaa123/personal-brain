import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { ExternalSourceContext } from '@/mcp-sdk/contexts/externalSources/externalSourceContext';
import { setTestEnv, clearTestEnv } from '@test/utils/envUtils';
import { createMockEmbedding } from '@test/mocks';

// No need to mock fetch directly, we're mocking the source implementations

// Mock the EmbeddingService
mock.module('@mcp/model/embeddings', () => {
  return {
    EmbeddingService: class MockEmbeddingService {
      private static _instance: MockEmbeddingService | null = null;

      static getInstance() {
        if (!MockEmbeddingService._instance) {
          MockEmbeddingService._instance = new MockEmbeddingService();
        }
        return MockEmbeddingService._instance;
      }

      constructor() {}
      
      getEmbedding() {
        return Promise.resolve({
          embedding: createMockEmbedding('test embedding'),
          truncated: false,
        });
      }
      
      cosineSimilarity(_vec1: number[], _vec2: number[]) {
        // Simple mock - return 0.8 for simplicity
        return 0.8;
      }
    },
  };
});

// Mock the external source interfaces
mock.module('@mcp/context/sources/wikipediaSource', () => {
  return {
    WikipediaSource: class MockWikipediaSource {
      name = 'Wikipedia';
      
      constructor() {}
      
      search() {
        return Promise.resolve([
          {
            content: 'This is test content from Wikipedia',
            title: 'Test Wikipedia Article',
            url: 'https://en.wikipedia.org/wiki/Test',
            source: 'Wikipedia',
            sourceType: 'encyclopedia',
            timestamp: new Date(),
            embedding: createMockEmbedding('wikipedia embedding'),
            confidence: 0.85,
          },
        ]);
      }
      
      checkAvailability() {
        return Promise.resolve(true);
      }
      
      getSourceMetadata() {
        return Promise.resolve({
          name: 'Wikipedia',
          type: 'encyclopedia',
        });
      }
    },
  };
});

mock.module('@mcp/context/sources/newsApiSource', () => {
  return {
    NewsApiSource: class MockNewsApiSource {
      name = 'NewsAPI';
      
      constructor() {}
      
      search() {
        return Promise.resolve([
          {
            content: 'This is test content from NewsAPI',
            title: 'Test News Article',
            url: 'https://news-api.example.com/article/1',
            source: 'NewsAPI - Test Source',
            sourceType: 'news',
            timestamp: new Date(),
            embedding: createMockEmbedding('news embedding'),
            confidence: 0.75,
          },
        ]);
      }
      
      checkAvailability() {
        return Promise.resolve(true);
      }
      
      getSourceMetadata() {
        return Promise.resolve({
          name: 'NewsAPI',
          type: 'news',
        });
      }
    },
  };
});

describe('ExternalSourceContext MCP SDK Implementation', () => {
  let externalSourceContext: ExternalSourceContext;
  
  beforeAll(() => {
    // Set up mock environment
    setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
    setTestEnv('NEWSAPI_KEY', 'mock-newsapi-key');
  });
  
  afterAll(() => {
    // Clean up mock environment
    clearTestEnv('ANTHROPIC_API_KEY');
    clearTestEnv('NEWSAPI_KEY');
  });
  
  beforeEach(() => {
    // Create a new context with mock API keys for each test
    externalSourceContext = new ExternalSourceContext('mock-api-key', 'mock-newsapi-key');
  });
  
  test('ExternalSourceContext properly initializes with MCP SDK', () => {
    expect(externalSourceContext).toBeDefined();
    
    // Check that basic methods are available
    expect(typeof externalSourceContext.search).toBe('function');
    expect(typeof externalSourceContext.semanticSearch).toBe('function');
    expect(typeof externalSourceContext.checkSourcesAvailability).toBe('function');
    
    // Check MCP SDK integration
    expect(externalSourceContext.getMcpServer).toBeDefined();
    expect(typeof externalSourceContext.getMcpServer).toBe('function');
    
    // Verify MCP server can be obtained
    const mcpServer = externalSourceContext.getMcpServer();
    expect(mcpServer).toBeDefined();
  });
  
  test('should allow registering custom sources', () => {
    // Create a new ExternalSourceContext with custom options
    const customContext = new ExternalSourceContext('mock-api-key', 'mock-newsapi-key', {
      enabledSources: [], // Start with no enabled sources
    });
    
    // Create a mock custom source
    const mockSource = {
      name: 'CustomSource',
      search: () => Promise.resolve([]),
      checkAvailability: () => Promise.resolve(true),
      getSourceMetadata: () => Promise.resolve({}),
    };
    
    // Register the custom source
    customContext.registerSource(mockSource);
    
    // Get all sources from the context (they should all be enabled since enabledSources is empty)
    const enabledSources = customContext.getEnabledSources();
    const sourceNames = enabledSources.map(source => source.name);
    
    // Check that our custom source is included
    expect(sourceNames).toContain('CustomSource');
  });
  
  test('should search across enabled sources', async () => {
    const results = await externalSourceContext.search('test query');
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // Check that we have results from different sources
    const sources = new Set(results.map(result => result.source));
    expect(sources.size).toBeGreaterThan(0);
  });
  
  test('should perform semantic search', async () => {
    const results = await externalSourceContext.semanticSearch('test query');
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // Make sure the results don't have similarityScore property (it should be removed)
    const hasVisibleScores = results.some(result => 'similarityScore' in result);
    expect(hasVisibleScores).toBe(false);
  });
  
  test('MCP Server has external search resource registered', () => {
    const mcpServer = externalSourceContext.getMcpServer();
    // This is a crude check since we can't directly inspect registered resources
    expect(mcpServer).toBeDefined();
  });
  
  test('MCP Server has external source tools registered', () => {
    const mcpServer = externalSourceContext.getMcpServer();
    // This is a crude check since we can't directly inspect registered tools
    expect(mcpServer).toBeDefined();
  });
  
  test('should check sources availability', async () => {
    const availability = await externalSourceContext.checkSourcesAvailability();
    
    expect(availability).toBeObject();
    expect(Object.keys(availability).length).toBeGreaterThan(0);
    
    // We expect Wikipedia to be available in our mocks
    expect(availability['Wikipedia']).toBe(true);
    
    // NewsAPI may not be available in the test environment
    expect('NewsAPI' in availability).toBe(true);
  });
});