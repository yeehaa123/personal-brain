/**
 * Mock implementation of McpServer
 * 
 * Provides a standardized mock that follows the current McpServer API.
 * All tests should use this mock for consistency.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Resource/tool registration record for tracking
 */
interface Registration {
  path: string;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
  options?: Record<string, unknown>;
}

/**
 * Creates a standardized mock McpServer with tracking for registered resources and tools
 */
export function createMockMcpServer(name = 'MockServer', version = '1.0.0'): MockMcpServer {
  // Track resources and tools for testing
  const resources: Registration[] = [];
  const tools: Registration[] = [];
  
  // Create the mock server implementation
  const server = {
    name,
    version,
    // MCP SDK API methods
    resource: function(
      _name: string,
      _path: string, 
      _metadata: Record<string, unknown>,
      _handler: (params: Record<string, unknown>) => Promise<unknown>,
    ) {
      resources.push({ path: _path, handler: _handler, options: { name: _name, ..._metadata } });
      return server;
    },
    tool: function(
      _name: string,
      _description: string,
      _handler: (params: Record<string, unknown>) => Promise<unknown>,
    ) {
      tools.push({ path: _name, handler: _handler, options: { description: _description } });
      return server;
    },
    // Testing utilities
    getRegisteredResources() {
      return [...resources];
    },
    getRegisteredTools() {
      return [...tools];
    },
    clearRegistrations() {
      resources.length = 0;
      tools.length = 0;
    },
  };
  
  return server as unknown as MockMcpServer;
}

/**
 * Extended McpServer interface with testing utilities
 */
export interface MockMcpServer extends McpServer {
  // Testing utilities
  getRegisteredResources(): Registration[];
  getRegisteredTools(): Registration[];
  clearRegistrations(): void;
}