/**
 * Type definitions for MCP SDK integration
 */

// Re-export the McpServer type from the MCP SDK
import type { McpServer as OriginalMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

// Extend the McpServer type with the missing methods
export interface McpServer extends OriginalMcpServer {
  // Add the queryResourceUrl method that's used in the tests
  queryResourceUrl(url: URL): Promise<ReadResourceResult>;
}
