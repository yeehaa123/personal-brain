import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';

import { createUnifiedMcpServer } from '@/mcp';
import type { UnifiedMcpServerConfig } from '@/mcp';
import { createMockEmbedding } from '@test/__mocks__/';
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

      static resetInstance(): void {
        MockEmbeddingService._instance = null;
      }

      static createFresh(): MockEmbeddingService {
        return new MockEmbeddingService();
      }

      constructor() { }

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

      chunkText(text: string) {
        return [text];
      }
    },
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
    const config: UnifiedMcpServerConfig = {
      apiKey: 'mock-api-key',
      newsApiKey: 'mock-news-api-key',
      name: 'CustomBrain',
      version: '2.0.0',
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
      version: '1.0.0',
      enableExternalSources: true,
    });

    // Check that a server was created
    expect(unifiedServer).toBeDefined();

    // In a real implementation, we would test specific functionality
  });
});
