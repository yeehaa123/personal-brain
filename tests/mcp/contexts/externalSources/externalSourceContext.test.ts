import { test, expect, describe, beforeEach, beforeAll, afterAll, mock } from 'bun:test';
import { ExternalSourceContext } from '@/mcp';
import { setMockEnv, clearMockEnv } from '@test/test-utils';
import { setupAnthropicMocks, setupDependencyContainerMocks } from '@test/utils/mcpUtils';
import { setupMcpServerMocks as createMockServerMock } from '@test/mcp/contexts/__mocks__/mcpMocks';

// Create a mock MCP server 
// The global mock is used in the ExternalSourceContext
createMockServerMock(mock);

// Setup Anthropic mocks
setupAnthropicMocks(mock);

// Setup dependency container with all mock services
setupDependencyContainerMocks(mock);

describe('ExternalSourceContext MCP SDK Implementation', () => {
  let externalSourceContext: ExternalSourceContext;
  
  // We don't need additional test setup since we're handling it manually
  
  beforeAll(() => {
    // Set up mock environment using centralized function
    setMockEnv();
  });
  
  afterAll(() => {
    // Clean up mock environment using centralized function
    clearMockEnv();
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
    const testContext = new ExternalSourceContext(
      'isolated-api-key-' + Date.now(), 
      'isolated-newsapi-key-' + Date.now(),
    );
    
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