/**
 * MCP Server and Context Mocks
 */
import type { McpServer } from '@/mcp';
import { setupMcpServerMocks as setupMcpMocks } from '@test/utils/mcpUtils';

// Mock MCP server and BrainProtocol
export function setupMcpServerMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  const mockMcpServer = setupMcpMocks();
  
  mockFn.module('@/mcp/protocol/brainProtocol', () => {
    // Track external sources state for the mock
    let useExternalSources = false;
    
    return {
      createMcpServer: () => mockMcpServer,
      BrainProtocol: class MockBrainProtocol {
        static instance: MockBrainProtocol | null = null;
        
        constructor() {
          // Default constructor
          console.log('Mock BrainProtocol constructor called');
        }
        
        static getInstance(_options?: Record<string, unknown>, forceNew = false) {
          if (!MockBrainProtocol.instance || forceNew) {
            MockBrainProtocol.instance = new MockBrainProtocol();
          }
          return MockBrainProtocol.instance;
        }
        
        static resetInstance() {
          MockBrainProtocol.instance = null;
          useExternalSources = false;
        }
        
        getMcpServer() {
          return mockMcpServer;
        }
        
        getNoteContext() {
          return {
            searchNotes: async () => [],
            getNoteById: async () => null,
            getRecentNotes: async () => [],
          };
        }
        
        getProfileContext() {
          return {
            getProfile: async () => null,
          };
        }
        
        getExternalSourceContext() {
          return {
            search: async () => [],
            semanticSearch: async () => [],
          };
        }
        
        setUseExternalSources(enabled: boolean) {
          useExternalSources = enabled;
        }
        
        getUseExternalSources() {
          return useExternalSources;
        }
        
        processQuery() {
          return Promise.resolve({
            answer: 'This is a mock answer from BrainProtocol.',
            citations: [],
            relatedNotes: [],
          });
        }
      },
    };
  });
}

// Create a proper mock getMcpServer implementation
export function createMockMcpServer(): McpServer {
  return setupMcpMocks();
}

// Mock Anthropic API
export function setupAnthropicMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  mockFn.module('@/mcp/model/claude', () => {
    return {
      completeWithClaude: async () => ({ 
        content: 'This is a mock response from Claude.',
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
      extractJSON: async () => ({ result: 'mock data' }),
    };
  });
}