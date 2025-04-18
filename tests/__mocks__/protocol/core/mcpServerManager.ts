/**
 * Mock McpServerManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */

/**
 * Mock McpServerManager for testing protocol layer
 */
export class MockMcpServerManager {
  private static instance: MockMcpServerManager | null = null;
  private server: Record<string, unknown> | null = { mockServer: true };
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockMcpServerManager {
    if (!MockMcpServerManager.instance) {
      MockMcpServerManager.instance = new MockMcpServerManager(options);
    }
    return MockMcpServerManager.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockMcpServerManager.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockMcpServerManager {
    return new MockMcpServerManager(options);
  }
  
  private constructor(options?: Record<string, unknown>) {
    // Set up with options if provided
    if (options && options['server'] !== undefined) {
      this.server = options['server'] as Record<string, unknown> | null;
    }
  }
  
  /**
   * Get the MCP server instance
   */
  getMcpServer(): Record<string, unknown> | null {
    return this.server;
  }
  
  /**
   * For testing - set the server instance
   */
  setServer(server: Record<string, unknown> | null): void {
    this.server = server;
  }
}