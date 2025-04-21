/**
 * Core Context Interfaces
 * 
 * This module defines the streamlined interface hierarchy for all context components,
 * with a clear separation between core functionality and MCP-specific concerns.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Status object for context components
 */
export interface ContextStatus {
  /** Context identifier/name */
  name: string;
  /** Version information */
  version: string;
  /** Whether the context is ready for use */
  ready: boolean;
  /** Additional status fields */
  [key: string]: unknown;
}

/**
 * Resource definition for MCP resources and tools
 */
export interface ResourceDefinition {
  /** Resource protocol */
  protocol: string;
  /** Resource path */
  path: string;
  /** Resource handler function */
  handler: (params: Record<string, unknown>, query?: Record<string, unknown>) => Promise<unknown>;
  /** Resource name */
  name?: string;
  /** Resource description */
  description?: string;
  /** Additional resource properties */
  [key: string]: unknown;
}

/**
 * Capabilities provided by a context
 */
export interface ContextCapabilities {
  /** Available API resources */
  resources: ResourceDefinition[];
  /** Available tools */
  tools: ResourceDefinition[];
  /** Supported feature identifiers */
  features: string[];
}

/**
 * Core context interface - fundamental functionality for all contexts
 */
export interface CoreContextInterface {
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
   * Clean up resources when context is no longer needed
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
}

/**
 * MCP-specific context interface - extends core with MCP functionality
 */
export interface McpContextInterface extends CoreContextInterface {
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
   * Get all capabilities provided by this context
   * @returns Context capabilities object
   */
  getCapabilities(): ContextCapabilities;
}