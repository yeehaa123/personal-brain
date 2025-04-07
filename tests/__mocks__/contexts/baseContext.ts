/**
 * BaseContext mock implementation
 * 
 * Provides a standardized mock of the BaseContext class that can be
 * extended by specific context mocks.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ContextInterface, ContextStatus, ResourceDefinition } from '@/mcp/contexts/core/contextInterface';

/**
 * Mock implementation of BaseContext
 */
export class MockBaseContext implements ContextInterface {
  private static instances: Map<string, MockBaseContext> = new Map();
  
  protected mcpServer: McpServer;
  protected resources: ResourceDefinition[] = [];
  protected tools: ResourceDefinition[] = [];
  protected readyState: boolean = false;
  protected name: string;
  protected version: string;
  
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
      },
    ];
    
    this.tools = [
      {
        protocol: 'test',
        path: 'tool',
        handler: async () => ({ success: true }),
        name: 'Test Tool',
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
    // Cast the server to a simpler interface for mocking
    const mockedServer = server as unknown as {
      resource: (r: ResourceDefinition) => void;
      tool: (t: ResourceDefinition) => void;
    };
    
    // Register resources
    for (const resource of this.resources) {
      mockedServer.resource(resource);
    }
    
    // Register tools
    for (const tool of this.tools) {
      mockedServer.tool(tool);
    }
    
    return true;
  }
  
  /**
   * Get the MCP server
   * @returns The MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
  
  /**
   * Get all resources
   * @returns Array of resource definitions
   */
  getResources(): ResourceDefinition[] {
    return [...this.resources];
  }
  
  /**
   * Get all tools
   * @returns Array of tool definitions
   */
  getTools(): ResourceDefinition[] {
    return [...this.tools];
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
}