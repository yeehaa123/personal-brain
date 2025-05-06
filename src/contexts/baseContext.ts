/**
 * BaseContext abstract class
 * 
 * Provides a standard implementation that all contexts should extend.
 * This ensures consistent behavior across different context types.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance 
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(config, dependencies): Creates a new instance without affecting the singleton
 * 
 * Implements standardized interfaces:
 * - CoreContextInterface: Core context functionality
 * - StorageAccess: Standardized storage access
 * - FormatterAccess: Standardized formatter access
 * - ServiceAccess: Standardized service resolution
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { Logger } from '@/utils/logger';
import type { Registry } from '@/utils/registry';

import type { 
  ContextDependencies, 
  ContextStatus, 
  CoreContextInterface,
  FormatterAccess,
  McpContextInterface,
  ResourceDefinition,
  ServiceAccess,
  StorageAccess,
} from './contextInterface';
import type { FormattingOptions } from './formatterInterface';
import type { FormatterInterface } from './formatterInterface';
import type { StorageInterface } from './storageInterface';

/**
 * Configuration options for BaseContext
 */
export interface BaseContextConfig {
  [key: string]: unknown;
}

/**
 * Abstract base class that implements the standardized context interfaces
 * All specific contexts should extend this class
 * 
 * Generic type parameters:
 * @template TStorage - The specific StorageInterface implementation
 * @template TFormatter - The specific FormatterInterface implementation
 * @template TInputData - The input data type for formatting
 * @template TOutputData - The output data type for formatting
 */
export abstract class BaseContext<
  TStorage extends StorageInterface<unknown, unknown> = StorageInterface<unknown, unknown>,
  TFormatter extends FormatterInterface<unknown, unknown> = FormatterInterface<unknown, unknown>,
  TInputData = unknown,
  TOutputData = unknown
> implements 
  CoreContextInterface,
  McpContextInterface,
  StorageAccess<TStorage>,
  FormatterAccess<TFormatter>,
  ServiceAccess
{
  // Note: Each derived class should implement their own instance property
  // Using private in the derived class: private static instance: DerivedClass | null = null;
  
  /** Logger instance */
  protected logger = Logger.getInstance();
  
  /** McpServer instance */
  protected mcpServer: McpServer;
  
  /** Resources and tools collections */
  protected resources: ResourceDefinition[] = [];
  protected tools: ResourceDefinition[] = [];
  
  /** Ready state flag */
  protected readyState: boolean = false;
  
  /** Registry for service resolution */
  protected registry: Registry | null;
  
  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   * @param config Configuration object for the context
   * @param dependencies Explicit dependencies for the context
   */
  protected constructor(
    protected config: Record<string, unknown> = {},
    protected dependencies?: ContextDependencies<TStorage, TFormatter>,
  ) {
    // Initialize registry from dependencies or use ServiceRegistry
    this.registry = dependencies?.registry || null; // Don't try to instantiate Registry directly
    
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
   * Abstract methods for standardized storage access
   */
  abstract getStorage(): TStorage;
  
  /**
   * Abstract methods for standardized formatter access
   */
  abstract getFormatter(): TFormatter;
  
  /**
   * Format data using the context's formatter
   * @param data Data to format
   * @param options Optional formatting options
   * @returns Formatted data
   */
  format(data: TInputData, options?: FormattingOptions): TOutputData {
    return this.getFormatter().format(data, options) as TOutputData;
  }
  
  /**
   * Get a service by type from the registry
   * @param serviceType Type of service to retrieve
   * @returns Service instance
   * @throws Error if no registry is available
   */
  getService<T>(serviceType: new () => T): T {
    if (!this.registry) {
      throw new Error(`Cannot resolve service ${serviceType.name}: No registry available`);
    }
    // Use the service constructor name as the registry key
    return this.registry.resolve<T>(serviceType.name);
  }
  
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
   * @param config Configuration options for the context
   * @param dependencies Optional dependencies for the context
   * @returns A new instance of the derived class
   */
  static createFresh(
    _config?: Record<string, unknown>,
    _dependencies?: Record<string, unknown>,
  ): BaseContext {
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
    // Skip if no resources
    if (!this.resources || this.resources.length === 0) {
      return;
    }
    
    // Check if the server has the resource method (MCP SDK uses 'resource' not 'registerResource')
    if (typeof server.resource !== 'function') {
      this.logger.warn(`Server does not have resource method for ${this.getContextName()}`);
      return;
    }
    
    for (const resource of this.resources) {
      try {
        // Use the actual resource method with name, path, options, and handler
        const name = resource.name || `${this.getContextName()}_${resource.path}`;
        const description = resource.description || `Resource for ${resource.path}`;
        
        // Create a wrapper function to adapt our handler to the expected URL format
        const handlerWrapper = (uri: URL, _extra: Record<string, unknown>) => {
          // Extract query parameters from URL if needed
          const queryParams: Record<string, unknown> = {};
          if (uri.search) {
            uri.searchParams.forEach((value, key) => {
              queryParams[key] = value;
            });
          }
          
          // Call our handler with the right format and adapt the response to the expected format
          return resource.handler({}, queryParams).then(result => {
            // Format the result as a ReadResourceResult
            return {
              contents: [
                {
                  text: JSON.stringify(result),
                  uri: uri.toString(),
                },
              ],
            };
          });
        };
        
        // Register the resource with proper parameters
        server.resource(
          name,
          resource.path,
          { description }, // Metadata object with description
          handlerWrapper,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Error registering resource ${resource.path} in ${this.getContextName()}: ${errorMessage}`, { 
          error, 
          resource: resource.path,
          context: 'BaseContext', 
        });
        // Continue with other resources even if one fails
      }
    }
  }
  
  /**
   * Register MCP tools on a server
   * @param server MCP server to register tools on
   */
  protected registerMcpTools(server: McpServer): void {
    // Skip if no tools
    if (!this.tools || this.tools.length === 0) {
      return;
    }
    
    // Check if the server has the tool method (MCP SDK uses 'tool' not 'registerTool')
    if (typeof server.tool !== 'function') {
      this.logger.warn(`Server does not have tool method for ${this.getContextName()}`);
      return;
    }
    
    for (const toolDef of this.tools) {
      try {
        // Use the actual tool method with name, description, and handler
        const name = toolDef.name || `${this.getContextName()}_${toolDef.path}`;
        const description = toolDef.description || `Tool for ${toolDef.path}`;
        
        // Create a wrapper function to adapt our handler to the expected format
        const handlerWrapper = (extra: Record<string, unknown>) => {
          // The extra contains 'params' which are the tool arguments
          const params = extra['params'] || {};
          const query = extra['query'] || {};
          
          // Call our handler with the right format and adapt the response to the expected format
          return toolDef.handler(params as Record<string, unknown>, query as Record<string, unknown>)
            .then(result => {
              // Format the result as a CallToolResult
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: typeof result === 'string' ? result : JSON.stringify(result),
                  },
                ],
              };
            });
        };
        
        server.tool(
          name,
          description,
          handlerWrapper,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.debug(`Error registering tool ${toolDef.path} in ${this.getContextName()}: ${errorMessage}`, { 
          error, 
          tool: toolDef.path,
          context: 'BaseContext', 
        });
        // Continue with other tools even if one fails
      }
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
   * Get all capabilities provided by this context
   * @returns Context capabilities object
   */
  getCapabilities(): { resources: ResourceDefinition[]; tools: ResourceDefinition[]; features: string[] } {
    return {
      resources: this.getResources(),
      tools: this.getTools(),
      features: [],
    };
  }
  
  /**
   * Clean up resources when context is no longer needed
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    // Base implementation does nothing
    // Derived classes should override this method if they need specific cleanup
    this.logger.debug(`Cleaning up ${this.getContextName()} context`, { context: 'BaseContext' });
  }
}