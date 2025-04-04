/**
 * Model Context Protocol (MCP) implementation for Personal Brain
 * Main entry point for the MCP integration
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ExternalSourceContext } from './contexts/externalSources';
import { NoteContext } from './contexts/notes';
import { ProfileContext } from './contexts/profiles';

// Export all the context implementations from their respective directories
export { NoteContext } from './contexts/notes';
export { ProfileContext } from './contexts/profiles';
export { ExternalSourceContext } from './contexts/externalSources';

// Export model implementations
export * from './model';

// Export protocol implementations
export * from './protocol';

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
  
  // Use singleton instances of all contexts
  const noteContext = NoteContext.getInstance(config.apiKey);
  const profileContext = ProfileContext.getInstance(config.apiKey);
  const externalSourceContext = ExternalSourceContext.getInstance(
    config.apiKey, 
    config.newsApiKey,
    { 
      // Initialize external sources as enabled or disabled based on config
      enabledSources: config.enableExternalSources === false ? [] : undefined,
    },
  );
  
  // Register all contexts on the unified server
  noteContext.registerOnServer(mcpServer);
  profileContext.registerOnServer(mcpServer);
  externalSourceContext.registerOnServer(mcpServer);
  
  return mcpServer;
}