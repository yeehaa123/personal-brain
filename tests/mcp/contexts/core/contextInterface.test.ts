/**
 * Tests for the ContextInterface
 * 
 * These tests validate that the interface can be implemented correctly
 * and that implementations behave as expected.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, test } from 'bun:test';

import type { 
  ContextInterface,
  ContextStatus,
  ResourceDefinition,
} from '@/mcp/contexts/core/contextInterface';

// Mock implementation of ContextInterface for testing
class MockContext implements ContextInterface {
  private readyState = false;
  private mockServer: McpServer;
  private mockResources: ResourceDefinition[] = [];
  private mockTools: ResourceDefinition[] = [];

  constructor() {
    this.mockServer = {
      resource: () => {},
      tool: () => {},
    } as unknown as McpServer;

    // Add a sample resource and tool for testing
    this.mockResources = [
      {
        protocol: 'test',
        path: 'resource',
        handler: async () => ({ success: true }),
        name: 'Test Resource',
      },
    ];
    
    this.mockTools = [
      {
        protocol: 'test',
        path: 'tool',
        handler: async () => ({ success: true }),
        name: 'Test Tool',
      },
    ];
  }

  async initialize(): Promise<boolean> {
    // Simulate initialization
    this.readyState = true;
    return true;
  }

  // Mock implementation to satisfy ESLint
  _testServerUsage(_server: McpServer): void {
    // This method is only used to ensure the 'server' parameter
    // is recognized as used by the linter
    return;
  }

  isReady(): boolean {
    return this.readyState;
  }

  getStatus(): ContextStatus {
    return {
      name: 'MockContext',
      version: '1.0.0',
      ready: this.readyState,
      resourceCount: this.mockResources.length,
      toolCount: this.mockTools.length,
    };
  }

  registerOnServer(server: McpServer): boolean {
    try {
      // Simulate registering resources and tools
      this._testServerUsage(server);
      return true;
    } catch (_error) {
      return false;
    }
  }

  getMcpServer(): McpServer {
    return this.mockServer;
  }

  getResources(): ResourceDefinition[] {
    return [...this.mockResources];
  }

  getTools(): ResourceDefinition[] {
    return [...this.mockTools];
  }
}

describe('ContextInterface', () => {
  const context = new MockContext();

  test('should initialize successfully', async () => {
    const result = await context.initialize();
    expect(result).toBe(true);
    expect(context.isReady()).toBe(true);
  });

  test('getStatus should return valid status object', () => {
    const status = context.getStatus();
    expect(status).toHaveProperty('name', 'MockContext');
    expect(status).toHaveProperty('version', '1.0.0');
    expect(status).toHaveProperty('ready');
    expect(status).toHaveProperty('resourceCount');
    expect(status).toHaveProperty('toolCount');
  });

  test('registerOnServer should return true for successful registration', () => {
    const mockServer = {} as McpServer;
    // Pass the mock server to registerOnServer
    const result = context.registerOnServer(mockServer);
    expect(result).toBe(true);
  });

  test('getMcpServer should return an MCP server instance', () => {
    const serverInstance = context.getMcpServer();
    expect(serverInstance).toBeDefined();
  });

  test('getResources should return an array of resource definitions', () => {
    const resources = context.getResources();
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBe(1);
    expect(resources[0]).toHaveProperty('protocol', 'test');
    expect(resources[0]).toHaveProperty('path', 'resource');
    expect(resources[0]).toHaveProperty('handler');
    expect(resources[0]).toHaveProperty('name', 'Test Resource');
  });

  test('getTools should return an array of tool definitions', () => {
    const tools = context.getTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(1);
    expect(tools[0]).toHaveProperty('protocol', 'test');
    expect(tools[0]).toHaveProperty('path', 'tool');
    expect(tools[0]).toHaveProperty('handler');
    expect(tools[0]).toHaveProperty('name', 'Test Tool');
  });
});