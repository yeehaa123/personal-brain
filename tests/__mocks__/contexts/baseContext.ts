/**
 * BaseContext mock implementation
 * 
 * Provides a standardized mock of the BaseContext class that can be
 * extended by specific context mocks.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { 
  ContextStatus, 
  FullMcpContextInterface, 
  ResourceDefinition, 
} from '@/contexts/core/contextInterface';
import type { FormattingOptions } from '@/contexts/core/formatterInterface';
import type { FormatterInterface } from '@/contexts/core/formatterInterface';
import type { StorageInterface } from '@/contexts/core/storageInterface';
import { Registry } from '@/utils/registry';

/**
 * Mock implementation of BaseContext
 * 
 * Implements FullMcpContextInterface for compatibility with interface standardization.
 * The generic type parameters are set to any to allow flexibility in extending classes.
 */
export class MockBaseContext<
  TStorage extends StorageInterface<unknown, unknown> = StorageInterface<unknown, unknown>,
  TFormatter extends FormatterInterface<unknown, unknown> = FormatterInterface<unknown, unknown>,
  TInputData = unknown, 
  TOutputData = unknown
> implements FullMcpContextInterface<TStorage, TFormatter, TInputData, TOutputData> {
  private static instances: Map<string, MockBaseContext> = new Map();
  
  protected mcpServer: McpServer;
  protected resources: ResourceDefinition[] = [];
  protected tools: ResourceDefinition[] = [];
  protected readyState: boolean = false;
  protected name: string;
  protected version: string;
  
  /**
   * Storage implementation - initialized in constructor
   */
  protected storage!: TStorage;
  
  /**
   * Formatter implementation - initialized in constructor
   */
  protected formatter!: TFormatter;
  
  /**
   * Get singleton instance
   * @param key Optional key to retrieve a specific instance
   * @returns The singleton instance
   */
  public static getInstance(key = 'default'): MockBaseContext {
    if (!this.instances.has(key)) {
      this.instances.set(key, new this());
    }
    return this.instances.get(key) as MockBaseContext;
  }
  
  /**
   * Reset the singleton instance
   * @param key Optional key to reset a specific instance
   */
  public static resetInstance(key = 'default'): void {
    this.instances.delete(key);
  }
  
  /**
   * Create a fresh instance for testing
   * @param options Optional configuration
   * @returns A new instance
   */
  public static createFresh(options: Record<string, unknown> = {}): MockBaseContext {
    return new this(options);
  }
  
  /**
   * Create a mock BaseContext
   * @param config Configuration options
   */
  constructor(protected config: Record<string, unknown> = {}) {
    this.name = (config['name'] as string) || 'MockContext';
    this.version = (config['version'] as string) || '1.0.0';
    
    // Create mock MCP server
    this.mcpServer = {
      name: this.getContextName(),
      version: this.getContextVersion(),
      resource: () => this.mcpServer,
      tool: () => this.mcpServer,
    } as unknown as McpServer;
    
    // Set default resources and tools
    this.resources = [
      {
        protocol: 'test',
        path: 'resource',
        handler: async () => ({ success: true }),
        name: 'Test Resource',
        description: 'A test resource for mock implementation',
      },
    ];
    
    this.tools = [
      {
        protocol: 'test',
        path: 'tool',
        handler: async () => ({ success: true }),
        name: 'Test Tool',
        description: 'A test tool for mock implementation',
      },
    ];
  }
  
  /**
   * Initialize the context
   * @returns Promise resolving to initialization success
   */
  async initialize(): Promise<boolean> {
    this.readyState = true;
    return true;
  }
  
  /**
   * Check if the context is ready for use
   * @returns Boolean indicating readiness state
   */
  isReady(): boolean {
    return this.readyState;
  }
  
  /**
   * Get the context name
   * @returns The name of this context
   */
  getContextName(): string {
    return this.name;
  }
  
  /**
   * Get the context version
   * @returns The version of this context
   */
  getContextVersion(): string {
    return this.version;
  }
  
  /**
   * Get the context status
   * @returns Context status information
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
      const capabilities = this.getCapabilities();
      
      // Register resources using the MCP SDK API
      for (const resource of capabilities.resources) {
        // Create a wrapper function to adapt our handler to the expected URL format
        const handlerWrapper = (uri: URL, _extra: Record<string, unknown>) => {
          // Call our handler with a compatible format
          return resource.handler({}, {}).then(result => {
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

        server.resource(
          resource.name || `${this.name}_${resource.path}`,
          resource.path,
          { description: resource.description || `Resource for ${resource.path}` },
          handlerWrapper,
        );
      }
      
      // Register tools using the MCP SDK API
      for (const tool of capabilities.tools) {
        // Create a wrapper function to adapt our handler to the expected format
        const handlerWrapper = (_extra: Record<string, unknown>) => {
          // Call our handler with a compatible format
          return tool.handler({}, {}).then(result => {
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
          tool.name || `${this.name}_${tool.path}`,
          tool.description || `Tool for ${tool.path}`,
          handlerWrapper,
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error registering context on server:', error);
      return false;
    }
  }
  
  /**
   * Get the MCP server
   * @returns The MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
  
  /**
   * Get all capabilities
   * @returns Object with resources, tools, and features
   */
  getCapabilities(): { resources: ResourceDefinition[]; tools: ResourceDefinition[]; features: string[] } {
    return {
      resources: [...this.resources],
      tools: [...this.tools],
      features: [],
    };
  }
  
  /**
   * Add a resource
   * @param resource Resource to add
   */
  addResource(resource: ResourceDefinition): void {
    this.resources.push(resource);
  }
  
  /**
   * Add a tool
   * @param tool Tool to add
   */
  addTool(tool: ResourceDefinition): void {
    this.tools.push(tool);
  }
  
  /**
   * Clear all resources
   */
  clearResources(): void {
    this.resources = [];
  }
  
  /**
   * Clear all tools
   */
  clearTools(): void {
    this.tools = [];
  }
  
  /**
   * Set ready state
   * @param state New ready state
   */
  setReadyState(state: boolean): void {
    this.readyState = state;
  }
  
  /**
   * Clean up resources
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    // Base implementation cleans up internal state
    this.readyState = false;
    this.resources = [];
    this.tools = [];
  }
  
  /**
   * Get the storage implementation
   * @returns Storage implementation
   */
  getStorage(): TStorage {
    return this.storage;
  }
  
  /**
   * Get the formatter implementation
   * @returns Formatter implementation
   */
  getFormatter(): TFormatter {
    return this.formatter;
  }
  
  /**
   * Format data using the context's formatter
   * @param data Data to format
   * @param options Optional formatting options
   * @returns Formatted data
   */
  format(data: TInputData, options?: FormattingOptions): TOutputData {
    return this.formatter.format(data, options) as TOutputData;
  }
  
  /**
   * Get a service by type
   * @param serviceType Type of service to retrieve
   * @returns Service instance
   */
  getService<T>(serviceType: new () => T): T {
    // Use registry for service resolution
    return Registry.getInstance().resolve<T>(serviceType.name);
  }
  
  /**
   * Create a new instance with explicit dependencies
   * @param dependencies Dependencies for the context
   * @returns A new instance with the specified dependencies
   */
  createWithDependencies(dependencies: Record<string, unknown>): unknown {
    return (this.constructor as typeof MockBaseContext).createFresh(dependencies);
  }

  // Implementation of FullMcpContextInterface methods
  getInstance(): MockBaseContext<TStorage, TFormatter, TInputData, TOutputData> {
    return (this.constructor as typeof MockBaseContext).getInstance() as MockBaseContext<TStorage, TFormatter, TInputData, TOutputData>;
  }

  resetInstance(): void {
    (this.constructor as typeof MockBaseContext).resetInstance();
  }

  createFresh(options?: Record<string, unknown>): MockBaseContext<TStorage, TFormatter, TInputData, TOutputData> {
    return (this.constructor as typeof MockBaseContext).createFresh(options) as MockBaseContext<TStorage, TFormatter, TInputData, TOutputData>;
  }
}