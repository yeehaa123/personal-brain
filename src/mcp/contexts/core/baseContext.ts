/**
 * BaseContext abstract class
 * 
 * Provides a standard implementation that all contexts should extend.
 * This ensures consistent behavior across different context types.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import logger from '@/utils/logger';

import type { 
  ContextInterface, 
  ContextStatus, 
  ResourceDefinition, 
} from './contextInterface';

/**
 * Abstract base class that implements ContextInterface
 * All specific contexts should extend this class
 */
export abstract class BaseContext implements ContextInterface {
  protected mcpServer: McpServer;
  protected resources: ResourceDefinition[] = [];
  protected tools: ResourceDefinition[] = [];
  protected readyState: boolean = false;
  
  /**
   * Constructor for BaseContext
   * @param config Configuration object for the context
   */
  constructor(protected config: Record<string, unknown> = {}) {
    // Create MCP server with context info
    this.mcpServer = {
      name: this.getContextName(),
      version: this.getContextVersion(),
      // Properly type the resource and tool methods to match MCP API
      resource: function(
        _resource: ResourceDefinition | string, 
        _uriOrMetadata?: string | Record<string, unknown>,
        _callbackOrMetadata?: unknown,
      ) {},
      tool: function(
        _toolName: string,
        _descriptionOrParamsOrCallback?: string | Record<string, unknown> | (() => unknown),
        _paramsOrCallback?: Record<string, unknown> | (() => unknown),
      ) {},
    } as unknown as McpServer;
    
    // Initialize MCP components
    this.initializeMcpComponents();
  }
  
  /**
   * Abstract methods that must be implemented by derived classes
   */
  abstract getContextName(): string;
  abstract getContextVersion(): string;
  protected abstract initializeMcpComponents(): void;
  
  /**
   * Initialize the context
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(): Promise<boolean> {
    try {
      // Base initialization logic
      this.readyState = true;
      return true;
    } catch (error) {
      logger.error(`Error initializing ${this.getContextName()}`, { error, context: 'BaseContext' });
      this.readyState = false;
      return false;
    }
  }
  
  /**
   * Check if the context is ready for use
   * @returns Boolean indicating readiness state
   */
  isReady(): boolean {
    return this.readyState;
  }
  
  /**
   * Get the status of the context
   * @returns Status object with context information
   */
  getStatus(): ContextStatus {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      ready: this.readyState,
      resourceCount: this.resources.length,
      toolCount: this.tools.length,
    };
  }
  
  /**
   * Register the context on an MCP server
   * @param server MCP server to register on
   * @returns True if registration was successful
   */
  registerOnServer(server: McpServer): boolean {
    try {
      this.registerMcpResources(server);
      this.registerMcpTools(server);
      return true;
    } catch (error) {
      logger.error(`Error registering ${this.getContextName()} on server`, { error, context: 'BaseContext' });
      return false;
    }
  }
  
  /**
   * Register MCP resources on a server
   * @param server MCP server to register resources on
   */
  protected registerMcpResources(server: McpServer): void {
    // Use type assertion for the mock server
    const mockedServer = server as unknown as {
      resource: (r: ResourceDefinition) => void
    };
    
    for (const resource of this.resources) {
      // Use simplified method that accepts our ResourceDefinition directly
      mockedServer.resource(resource);
    }
  }
  
  /**
   * Register MCP tools on a server
   * @param server MCP server to register tools on
   */
  protected registerMcpTools(server: McpServer): void {
    // Use type assertion for the mock server
    const mockedServer = server as unknown as {
      tool: (t: ResourceDefinition) => void
    };
    
    for (const tool of this.tools) {
      // Use simplified method that accepts our ResourceDefinition directly
      mockedServer.tool(tool);
    }
  }
  
  /**
   * Get the MCP server instance
   * @returns MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
  
  /**
   * Get all registered resources
   * @returns Copy of resources array
   */
  getResources(): ResourceDefinition[] {
    return [...this.resources];
  }
  
  /**
   * Get all registered tools
   * @returns Copy of tools array
   */
  getTools(): ResourceDefinition[] {
    return [...this.tools];
  }
  
  /**
   * Create an index file for core components
   */
  static getInstance(_options?: Record<string, unknown>): BaseContext {
    throw new Error('getInstance must be implemented by derived classes');
  }
  
  static resetInstance(): void {
    throw new Error('resetInstance must be implemented by derived classes');
  }
}