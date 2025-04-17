/**
 * Base interface for all context components in the MCP architecture
 * 
 * This interface defines the standard contract that all contexts must implement
 * to ensure consistent behavior across the system.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Status object for context components
 */
export interface ContextStatus {
  name: string;
  version: string;
  ready: boolean;
  resourceCount: number;
  toolCount: number;
  [key: string]: unknown;
}

/**
 * Resource definition for MCP resources
 */
export interface ResourceDefinition {
  protocol: string;
  path: string;
  handler: (params: Record<string, unknown>, query?: Record<string, unknown>) => Promise<unknown>;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Base interface for all context components
 */
export interface ContextInterface {
  /**
   * Initialize the context with any required setup
   * @returns Promise that resolves to true if initialization was successful
   */
  initialize(): Promise<boolean>;
  
  /**
   * Check if the context is ready for use
   * @returns Boolean indicating readiness state
   */
  isReady(): boolean;
  
  /**
   * Get the current status of the context
   * @returns Status object with context information
   */
  getStatus(): ContextStatus;
  
  /**
   * Register context resources and tools on an MCP server
   * @param server MCP server instance to register on
   * @returns Boolean indicating success of registration
   */
  registerOnServer(server: McpServer): boolean;
  
  /**
   * Get the internal MCP server instance
   * @returns Internal MCP server instance
   */
  getMcpServer(): McpServer;
  
  /**
   * Get all registered MCP resources
   * @returns Array of resource definitions
   */
  getResources(): ResourceDefinition[];
  
  /**
   * Get all registered MCP tools
   * @returns Array of tool definitions
   */
  getTools(): ResourceDefinition[];
}