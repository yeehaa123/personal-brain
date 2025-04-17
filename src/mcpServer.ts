/**
 * MCP Server
 * 
 * Creates a unified MCP server with all contexts registered.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ConversationContext } from '@/contexts/conversations';
import { ExternalSourceContext } from '@/contexts/externalSources';
import { NoteContext } from '@/contexts/notes';
import { ProfileContext } from '@/contexts/profiles';
import { WebsiteContext } from '@/contexts/website';

// Export the McpServer type directly
export type { McpServer };

// Export the context types directly
export type { ConversationContext, ExternalSourceContext, NoteContext, ProfileContext, WebsiteContext };

/**
 * Configuration options for the MCP server
 */
export interface McpServerConfig {
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
export function createUnifiedMcpServer(config: McpServerConfig = {}): McpServer {
  // Create the unified MCP server with defaults
  const mcpServer = new McpServer({
    name: config.name || 'PersonalBrain',
    version: config.version || '1.0.0',
  });
  
  // Use singleton instances of all contexts
  const noteContext = NoteContext.getInstance(config.apiKey);
  const profileContext = ProfileContext.getInstance({ apiKey: config.apiKey });
  const externalSourceContext = ExternalSourceContext.getInstance({ 
    apiKey: config.apiKey, 
    newsApiKey: config.newsApiKey,
    // Initialize external sources as enabled or disabled based on config
    enabledSources: config.enableExternalSources === false ? [] : undefined,
  });
  const conversationContext = ConversationContext.getInstance();
  const websiteContext = WebsiteContext.getInstance();
  
  // Register all contexts on the unified server
  noteContext.registerOnServer(mcpServer);
  profileContext.registerOnServer(mcpServer);
  externalSourceContext.registerOnServer(mcpServer);
  conversationContext.registerOnServer(mcpServer);
  websiteContext.registerOnServer(mcpServer);
  
  return mcpServer;
}