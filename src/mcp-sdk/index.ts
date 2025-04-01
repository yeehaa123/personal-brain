/**
 * MCP SDK implementation for Personal Brain
 * Main entry point for the MCP SDK integration
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Export all the context implementations from their respective directories
export { NoteContext } from './contexts/notes';
export { ProfileContext } from './contexts/profiles';
export { ExternalSourceContext } from './contexts/externalSources';

// Export our type definitions
export * from './types';

/**
 * Configuration options for the unified MCP server
 */
export interface UnifiedMcpServerConfig {
  /** API key for Claude and other API services */
  apiKey?: string;
  /** NewsAPI key for external sources */
  newsApiKey?: string;
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Enable external sources */
  enableExternalSources?: boolean;
}

/**
 * Creates a unified MCP server with all context resources and tools registered
 * This is a placeholder implementation that will be expanded in the next migration step
 * 
 * @param config Configuration options for the unified MCP server
 * @returns A configured McpServer instance with all resources and tools
 */
export function createUnifiedMcpServer(config: UnifiedMcpServerConfig = {}): McpServer {
  // Create the unified MCP server with defaults
  const mcpServer = new McpServer({
    name: config.name || 'PersonalBrain',
    version: config.version || '1.0.0',
  });
  
  // TODO: Implement unified MCP server by:
  // 1. Creating the context instances
  // 2. Modifying context classes to support registering resources on an external server
  // 3. Implementing a method to register all resources from all contexts
  
  return mcpServer;
}