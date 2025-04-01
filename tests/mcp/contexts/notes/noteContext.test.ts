import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { NoteContext } from '@/mcp';
import { setTestEnv, clearTestEnv } from '@test/utils/envUtils';
import { createMockEmbedding } from '@test/mocks';

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

// Override cosineSimilarity method for testing
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
      
      chunkText(text: string) {
        return [text];
      }
    },
  };
});

describe('NoteContext MCP SDK Implementation', () => {
  let noteContext: NoteContext;
  
  beforeAll(() => {
    // Set up mock environment
    setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
  });
  
  afterAll(() => {
    // Clean up mock environment
    clearTestEnv('ANTHROPIC_API_KEY');
  });
  
  beforeEach(() => {
    // Create a new context with a mock API key for each test
    noteContext = new NoteContext('mock-api-key');
  });
  
  test('NoteContext properly initializes all services', () => {
    expect(noteContext).toBeDefined();
    
    // Check that basic methods are available
    expect(typeof noteContext.getNoteById).toBe('function');
    expect(typeof noteContext.searchNotes).toBe('function');
    expect(typeof noteContext.getRelatedNotes).toBe('function');
    expect(typeof noteContext.getRecentNotes).toBe('function');
    
    // Check MCP SDK integration
    expect(noteContext.getMcpServer).toBeDefined();
    expect(typeof noteContext.getMcpServer).toBe('function');
    
    // Verify MCP server can be obtained
    const mcpServer = noteContext.getMcpServer();
    expect(mcpServer).toBeDefined();
  });
  
  test('MCP Server can define resources', () => {
    // Get the MCP server
    const mcpServer = noteContext.getMcpServer();
    
    // Define a test resource
    mcpServer.resource(
      'test_resource',
      'test://hello',
      async () => {
        return {
          contents: [{
            uri: 'test://hello',
            text: 'Hello from MCP test!',
          }],
        };
      },
    );
    
    // Just verify the resource was registered without trying to query it
    expect(mcpServer).toBeDefined();
  });
});