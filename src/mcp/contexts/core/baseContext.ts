/**
 * BaseContext abstract class
 * 
 * Provides a standard implementation that all contexts should extend.
 * This ensures consistent behavior across different context types.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance 
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { Logger } from '@/utils/logger';

import type { 
  ContextInterface, 
  ContextStatus, 
  ResourceDefinition, 
} from './contextInterface';

/**
 * Configuration options for BaseContext
 */
export interface BaseContextConfig {
  [key: string]: unknown;
}

/**
 * Abstract base class that implements ContextInterface
 * All specific contexts should extend this class
 */
export abstract class BaseContext implements ContextInterface {
  // Note: Each derived class should implement their own instance property
  // Using private in the derived class: private static instance: DerivedClass | null = null;
  
  /** Logger instance */
  protected logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /** McpServer instance */
  protected mcpServer: McpServer;
  
  /** Resources and tools collections */
  protected resources: ResourceDefinition[] = [];
  protected tools: ResourceDefinition[] = [];
  
  /** Ready state flag */
  protected readyState: boolean = false;
  
  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   * @param config Configuration object for the context
   */
  protected constructor(protected config: Record<string, unknown> = {}) {
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
   * Get the singleton instance
   * This is an abstract method that derived classes must implement
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance of the derived class
   */
  static getInstance(_options?: Record<string, unknown>): BaseContext {
    throw new Error('getInstance must be implemented by derived classes');
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This is an abstract method that derived classes must implement
   * 
   * This clears the instance and any resources it holds
   */
  static resetInstance(): void {
    throw new Error('resetInstance must be implemented by derived classes');
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This is an abstract method that derived classes must implement
   * 
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options for the context
   * @returns A new instance of the derived class
   */
  static createFresh(_options?: Record<string, unknown>): BaseContext {
    throw new Error('createFresh must be implemented by derived classes');
  }
  
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
      this.logger.error(`Error initializing ${this.getContextName()}`, { error, context: 'BaseContext' });
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
      this.logger.error(`Error registering ${this.getContextName()} on server`, { error, context: 'BaseContext' });
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
}