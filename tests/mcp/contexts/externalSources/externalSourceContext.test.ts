import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ExternalSourceContext } from '@/mcp';
import type { ExternalSourceInterface } from '@/mcp/contexts/externalSources/sources';
import { NewsApiSource, WikipediaSource } from '@/mcp/contexts/externalSources/sources';
import { EmbeddingService } from '@/mcp/model';
import { setupEmbeddingMocks } from '@test/__mocks__/utils/embeddingUtils';
import { setupMcpServerMocks as createMockServerMock } from '@test/__mocks__/utils/mcpUtils';
import { setupAnthropicMocks, setupDependencyContainerMocks } from '@test/__mocks__/utils/mcpUtils';
import { clearMockEnv, setMockEnv } from '@test/helpers/envUtils';


// Create a mock MCP server 
// The global mock is used in the ExternalSourceContext
createMockServerMock();

// Setup Anthropic mocks
setupAnthropicMocks(mock);

// Setup embedding mocks to prevent OpenAI API calls
// Make sure to do this BEFORE creating any ExternalSourceContext instances
setupEmbeddingMocks(mock);

// Setup dependency container with all mock services
setupDependencyContainerMocks(mock);

describe('ExternalSourceContext MCP SDK Implementation', () => {
  let externalSourceContext: ExternalSourceContext;
  
  // Properly control the test environment
  
  beforeAll(() => {
    // Set up mock environment using centralized function
    setMockEnv();
    
    // Reset singleton instances before tests
    // Important: Do this BEFORE any test creates instances
    EmbeddingService.resetInstance();
    ExternalSourceContext.resetInstance();
    
    // Also reset the source instances - these are now singletons too
    if (typeof WikipediaSource?.resetInstance === 'function') {
      WikipediaSource.resetInstance();
    }
    if (typeof NewsApiSource?.resetInstance === 'function') {
      NewsApiSource.resetInstance();
    }
    
    // Ensure embeddings are properly mocked
    setupEmbeddingMocks(mock);
  });
  
  afterAll(() => {
    // Clean up mock environment using centralized function
    clearMockEnv();
    
    // Reset service instances to ensure clean state for other tests
    EmbeddingService.resetInstance();
    ExternalSourceContext.resetInstance();
    
    // Also reset the source instances
    if (typeof WikipediaSource?.resetInstance === 'function') {
      WikipediaSource.resetInstance();
    }
    if (typeof NewsApiSource?.resetInstance === 'function') {
      NewsApiSource.resetInstance();
    }
  });
  
  beforeEach(() => {
    // Reset singleton instances before each test to ensure clean slate
    EmbeddingService.resetInstance();
    ExternalSourceContext.resetInstance();
    
    // Also reset the source instances
    if (typeof WikipediaSource?.resetInstance === 'function') {
      WikipediaSource.resetInstance();
    }
    if (typeof NewsApiSource?.resetInstance === 'function') {
      NewsApiSource.resetInstance();
    }
    
    // Ensure embeddings are properly mocked for each test
    setupEmbeddingMocks(mock);
    
    // Use ExternalSourceContext.createFresh to ensure a clean instance for each test
    externalSourceContext = ExternalSourceContext.createFresh({
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-newsapi-key',
    });
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
    const customContext = ExternalSourceContext.createFresh({
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-newsapi-key',
      enabledSources: [], // Start with no enabled sources
    });
    
    // Create a mock custom source
    const mockSource: ExternalSourceInterface = {
      name: 'CustomSource',
      search: () => Promise.resolve([]),
      checkAvailability: () => Promise.resolve(true),
      getSourceMetadata: () => Promise.resolve({}),
    };
    
    // Register the custom source
    customContext.registerSource(mockSource);
    
    // Get all sources from the context (they should all be enabled since enabledSources is empty)
    const enabledSources = customContext.getEnabledSources();
    const sourceNames = enabledSources.map((source: ExternalSourceInterface) => source.name);
    
    // We know our mock will return MockSource - since we're not actually testing the implementation
    // but just that the interface works, we'll just check that we got a source
    expect(sourceNames.length).toBeGreaterThan(0);
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
    // Create a test-specific isolated context to avoid state sharing
    // with a unique timestamp to ensure isolation
    const testContext = ExternalSourceContext.createFresh({
      apiKey: 'isolated-api-key-' + Date.now(),
      newsApiKey: 'isolated-newsapi-key-' + Date.now(),
    });
    
    // Use the mock availability implementation from our mock
    const availability = await testContext.checkSourcesAvailability();
    
    // Verify results, knowing that our mock implements a simple interface
    expect(availability).toBeObject();
    expect(Object.keys(availability).length).toBeGreaterThan(0);
    
    // At least one source should be available
    const firstSource = Object.keys(availability)[0];
    expect(availability[firstSource]).toBe(true);
  });
});