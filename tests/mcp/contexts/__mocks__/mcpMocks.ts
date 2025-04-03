/**
 * MCP Server and Context Mocks
 */
import type { McpServer } from '@/mcp';
import { setupMcpServerMocks as setupMcpMocks } from '@test/utils/mcpUtils';

// Mock MCP server
export function setupMcpServerMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  const mockMcpServer = setupMcpMocks();
  
  mockFn.module('@/mcp/protocol/brainProtocol', () => {
    return {
      createMcpServer: () => mockMcpServer,
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