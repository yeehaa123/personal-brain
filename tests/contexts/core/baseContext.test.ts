/**
 * Tests for the BaseContext abstract class
 * 
 * These tests validate that the base abstract class works correctly
 * and can be extended by concrete context implementations.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, test } from 'bun:test';

import { BaseContext } from '@/contexts/core/baseContext';
import type { ResourceDefinition } from '@/contexts/core/contextInterface';

class TestContext extends BaseContext {
  private static instance: TestContext | null = null;

  // Test-specific properties
  public initializeCalled = false;
  public initializeComponentsCalled = false;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    // Since super() constructor already calls initializeMcpComponents
    // we reset the flag here so the test can verify it correctly
    this.initializeComponentsCalled = false;
  }

  // Implement required abstract methods
  getContextName(): string {
    return 'TestContext';
  }

  getContextVersion(): string {
    return '1.0.0';
  }

  // Override methods for testing
  protected override initializeMcpComponents(): void {
    this.initializeComponentsCalled = true;

    // Add test resources and tools with required name and description fields
    this.resources = [
      {
        protocol: 'test',
        path: 'resource',
        handler: async () => ({ success: true }),
        name: 'Test Resource',
        description: 'A test resource for unit testing',
      },
    ];

    this.tools = [
      {
        protocol: 'test',
        path: 'tool',
        handler: async () => ({ success: true }),
        name: 'Test Tool',
        description: 'A test tool for unit testing',
      },
    ];
  }
  
  // Add getResources and getTools methods
  override getResources(): ResourceDefinition[] {
    return [...this.resources];
  }
  
  override getTools(): ResourceDefinition[] {
    return [...this.tools];
  }
  
  // Add getCapabilities method
  override getCapabilities(): { resources: ResourceDefinition[]; tools: ResourceDefinition[]; features: string[] } {
    return {
      resources: [...this.resources],
      tools: [...this.tools],
      features: [],
    };
  }

  // Override initialize for testing
  override async initialize(): Promise<boolean> {
    this.initializeCalled = true;
    return await super.initialize();
  }

  // Implement static methods required by BaseContext
  static override getInstance(options?: Record<string, unknown>): TestContext {
    if (!TestContext.instance) {
      TestContext.instance = new TestContext(options);
    }
    return TestContext.instance;
  }

  static override createFresh(options?: Record<string, unknown>): TestContext {
    return new TestContext(options);
  }

  static override resetInstance(): void {
    TestContext.instance = null;
  }
}

describe('BaseContext', () => {
  // Note: In Bun, we need to manually reset in each test

  test('constructor should set config and initialize MCP server', () => {
    // Reset for this test
    TestContext.resetInstance();

    // Track if initializeMcpComponents is called by creating a custom implementation
    let componentInitialized = false;

    // Create a special test context for this test
    class SpecialTestContext extends BaseContext {
      constructor(config: Record<string, unknown>) {
        super(config);
      }

      getContextName(): string {
        return 'SpecialTest';
      }

      getContextVersion(): string {
        return '1.0.0';
      }

      protected override initializeMcpComponents(): void {
        componentInitialized = true;

        // Set resources and tools
        this.resources = [];
        this.tools = [];
      }
      
      // Add getResources and getTools methods
      override getResources(): ResourceDefinition[] {
        return [...this.resources];
      }
      
      override getTools(): ResourceDefinition[] {
        return [...this.tools];
      }
      
      // Add getCapabilities method
      override getCapabilities(): { resources: ResourceDefinition[]; tools: ResourceDefinition[]; features: string[] } {
        return {
          resources: [...this.resources],
          tools: [...this.tools],
          features: [],
        };
      }

      static override getInstance(): SpecialTestContext {
        return new SpecialTestContext({});
      }

      static override resetInstance(): void {
        // No-op for this test
      }
      
      static override createFresh(config: Record<string, unknown> = {}): SpecialTestContext {
        return new SpecialTestContext(config);
      }
    }

    // Create a context with our test config
    const context = new SpecialTestContext({ testOption: 'value' });

    // Check that config was set
    expect(context['config']).toEqual({ testOption: 'value' });

    // Check that MCP server was created
    expect(context['mcpServer']).toBeDefined();

    // Check that initializeMcpComponents was called
    expect(componentInitialized).toBe(true);
  });

  test('initialize should set readyState to true', async () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();

    // Initial state should be not ready
    expect(context.isReady()).toBe(false);

    // Initialize should succeed
    const result = await context.initialize();
    expect(result).toBe(true);

    // Context should now be ready
    expect(context.isReady()).toBe(true);
  });

  test('getStatus should return correct status object', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();

    const status = context.getStatus();
    expect(status).toEqual({
      name: 'TestContext',
      version: '1.0.0',
      ready: false,
      resourceCount: 1,
      toolCount: 1,
    });
  });

  test('registerOnServer should register resources and tools on the server', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();

    // Create a mock server with tracking capabilities
    type ResourceHandler = (uri: URL, extra: Record<string, unknown>) => Promise<unknown>;
    type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;
    
    interface RegisteredResource {
      name: string;
      path: string;
      metadata: Record<string, unknown>;
      handler: ResourceHandler;
    }
    
    interface RegisteredTool {
      name: string;
      description: string;
      handler: ToolHandler;
    }
    
    const registeredResources: RegisteredResource[] = [];
    const registeredTools: RegisteredTool[] = [];
    
    const mockServer = {
      resource: (name: string, path: string, metadata: Record<string, unknown>, handler: ResourceHandler) => {
        registeredResources.push({ name, path, metadata, handler });
        return mockServer;
      },
      tool: (name: string, description: string, handler: ToolHandler) => {
        registeredTools.push({ name, description, handler });
        return mockServer;
      },
    } as unknown as McpServer;

    // Register on the server
    const result = context.registerOnServer(mockServer);

    // Check the result
    expect(result).toBe(true);

    // Check that resources and tools were registered
    expect(registeredResources.length).toBe(1);
    expect(registeredTools.length).toBe(1);
    
    // Verify the registered resources match what's in the context
    const capabilities = context.getCapabilities();
    expect(registeredResources[0].name).toBe('Test Resource');
    expect(registeredResources[0].path).toBe(capabilities.resources[0].path);
    expect(registeredTools[0].name).toBe('Test Tool');
  });

  test('getMcpServer should return the MCP server', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();
    const server = context.getMcpServer();
    expect(server).toBe(context['mcpServer']);
  });

  test('getCapabilities should return copies of resources and tools', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();
    const capabilities = context.getCapabilities();

    // Check the resources
    expect(capabilities.resources).toEqual(context['resources']);
    expect(capabilities.tools).toEqual(context['tools']);

    // Check that they're copies, not the original arrays
    expect(capabilities.resources).not.toBe(context['resources']);
    expect(capabilities.tools).not.toBe(context['tools']);
    
    // Should also include features
    expect(capabilities).toHaveProperty('features');
  });

  test('singleton pattern should work correctly', () => {
    // Reset for this test
    TestContext.resetInstance();
    // Get the first instance
    const instance1 = TestContext.getInstance();

    // Get another instance
    const instance2 = TestContext.getInstance();

    // Both instances should be the same object
    expect(instance1).toBe(instance2);

    // Reset the instance
    TestContext.resetInstance();

    // Get a new instance
    const instance3 = TestContext.getInstance();

    // The new instance should be different
    expect(instance3).not.toBe(instance1);
  });

  test('createFresh should always return a new instance', () => {
    // Reset for this test
    TestContext.resetInstance();
    // Get an instance with getInstance
    const instance1 = TestContext.getInstance();

    // Create a fresh instance
    const instance2 = TestContext.createFresh();

    // The fresh instance should be different
    expect(instance2).not.toBe(instance1);

    // Create another fresh instance
    const instance3 = TestContext.createFresh();

    // The new fresh instance should also be different
    expect(instance3).not.toBe(instance2);
  });
});
