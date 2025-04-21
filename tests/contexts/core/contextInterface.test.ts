/**
 * Tests for the ContextInterface
 * 
 * These tests validate that the interface can be implemented correctly
 * and that implementations behave as expected.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, test } from 'bun:test';

import type { 
  ContextCapabilities,
  ContextStatus,
  McpContextInterface,
  ResourceDefinition,
} from '@/contexts/core/contextInterface';

// Mock implementation of McpContextInterface for testing
class MockContext implements McpContextInterface {
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

  getCapabilities(): ContextCapabilities {
    return {
      resources: [...this.mockResources],
      tools: [...this.mockTools],
      features: [],
    };
  }
  
  async cleanup(): Promise<void> {
    // Simulate cleanup in the mock
    this.readyState = false;
    this.mockResources = [];
    this.mockTools = [];
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

  test('getCapabilities should return resources, tools, and features', () => {
    const capabilities = context.getCapabilities();
    
    // Check resources
    expect(Array.isArray(capabilities.resources)).toBe(true);
    expect(capabilities.resources.length).toBe(1);
    expect(capabilities.resources[0]).toHaveProperty('protocol', 'test');
    expect(capabilities.resources[0]).toHaveProperty('path', 'resource');
    expect(capabilities.resources[0]).toHaveProperty('handler');
    expect(capabilities.resources[0]).toHaveProperty('name', 'Test Resource');
    
    // Check tools
    expect(Array.isArray(capabilities.tools)).toBe(true);
    expect(capabilities.tools.length).toBe(1);
    expect(capabilities.tools[0]).toHaveProperty('protocol', 'test');
    expect(capabilities.tools[0]).toHaveProperty('path', 'tool');
    expect(capabilities.tools[0]).toHaveProperty('handler');
    expect(capabilities.tools[0]).toHaveProperty('name', 'Test Tool');
    
    // Check features
    expect(Array.isArray(capabilities.features)).toBe(true);
  });
});