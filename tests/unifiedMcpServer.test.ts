import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';

import { createUnifiedMcpServer, type McpServerConfig } from '@/mcpServer';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';
import { clearTestEnv, setTestEnv } from '@test/helpers/envUtils';


// Mock the Anthropic client
mock.module('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        // Mock constructor
      }

      messages = {
        create: async () => ({
          id: 'mock-msg-id',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Mock response' }],
          model: 'claude-3-haiku-20240307',
          stop_reason: 'end_turn',
        }),
      };
    },
  };
});

// Override EmbeddingService methods for testing
mock.module('@/resources/ai/embedding', () => {
  return {
    EmbeddingService: MockEmbeddingService,
  };
});

describe('Unified MCP Server', () => {
  beforeAll(() => {
    // Set up mock environment
    setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
    setTestEnv('NEWSAPI_KEY', 'mock-news-api-key');
  });

  afterAll(() => {
    // Clean up mock environment
    clearTestEnv('ANTHROPIC_API_KEY');
    clearTestEnv('NEWSAPI_KEY');
  });

  test('creates a unified MCP server with defaults', () => {
    // Create the unified MCP server with default options
    const unifiedServer = createUnifiedMcpServer();

    // Check that the server was created
    expect(unifiedServer).toBeDefined();
  });

  test('creates a unified MCP server with custom configuration', () => {
    // Create the unified MCP server with custom configuration
    const config: McpServerConfig = {
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-news-api-key',
      name: 'CustomBrain',
      version: '0.0.1-test',
      enableExternalSources: true,
    };

    const unifiedServer = createUnifiedMcpServer(config);

    // Check that the server was created
    expect(unifiedServer).toBeDefined();
  });

  // TODO: Add tests for registering resources and tools from all contexts
  // This will depend on how we implement the unified server

  test('handles resource registration from all contexts', () => {
    // Create the unified MCP server
    const unifiedServer = createUnifiedMcpServer({
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-news-api-key',
    });

    // Mock to check resource registration
    // Ideally, we would test if specific resources are registered, but
    // McpServer doesn't expose a way to check registered resources directly
    expect(unifiedServer).toBeDefined();

    // In a real test, we would check if specific resources are available
    // by calling them and checking the response
  });

  test('handles tool registration from all contexts', () => {
    // Create the unified MCP server
    const unifiedServer = createUnifiedMcpServer({
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-news-api-key',
    });

    // Mock to check tool registration
    // Ideally, we would test if specific tools are registered, but
    // McpServer doesn't expose a way to check registered tools directly
    expect(unifiedServer).toBeDefined();

    // In a real test, we would check if specific tools are available
    // by calling them and checking the response
  });

  test('creates a functional unified server with all features', () => {
    // Create the unified MCP server with all features enabled
    const unifiedServer = createUnifiedMcpServer({
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-news-api-key',
      name: 'TestBrain',
      version: '0.0.1-test',
      enableExternalSources: true,
    });

    // Check that the server was created
    expect(unifiedServer).toBeDefined();
  });
});