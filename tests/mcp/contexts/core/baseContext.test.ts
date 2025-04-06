/**
 * Tests for the BaseContext abstract class
 * 
 * These tests validate that the base abstract class works correctly
 * and can be extended by concrete context implementations.
 */
import { describe, expect, test } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// No need to import ResourceDefinition as it's not used directly in tests

// We need to create a concrete implementation of BaseContext for testing
// This will be defined after we create the actual BaseContext class
import { BaseContext } from '@/mcp/contexts/core/baseContext';

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
    
    // Add test resources and tools
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
  
  static createFresh(options?: Record<string, unknown>): TestContext {
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
      
      static override getInstance(): SpecialTestContext {
        return new SpecialTestContext({});
      }
      
      static override resetInstance(): void {
        // No-op for this test
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
  
  test('registerOnServer should call resource and tool registration methods', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();
    
    // Create a mock server
    const mockServer = {
      resource: () => {},
      tool: () => {},
    } as unknown as McpServer;
    
    // Create simple mocks to track method calls
    let registerResourcesCalled = false;
    let registerToolsCalled = false;
    
    // Save original methods
    const originalRegisterResources = context['registerMcpResources'];
    const originalRegisterTools = context['registerMcpTools'];
    
    // Replace with mocks
    context['registerMcpResources'] = function(server: McpServer) {
      registerResourcesCalled = true;
      originalRegisterResources.call(this, server);
    };
    
    context['registerMcpTools'] = function(server: McpServer) {
      registerToolsCalled = true;
      originalRegisterTools.call(this, server);
    };
    
    // Register on the server
    const result = context.registerOnServer(mockServer);
    
    // Check the result
    expect(result).toBe(true);
    
    // Check that the protected methods were called
    expect(registerResourcesCalled).toBe(true);
    expect(registerToolsCalled).toBe(true);
  });
  
  test('getMcpServer should return the MCP server', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();
    const server = context.getMcpServer();
    expect(server).toBe(context['mcpServer']);
  });
  
  test('getResources should return a copy of resources', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();
    const resources = context.getResources();
    
    // Check the resources
    expect(resources).toEqual(context['resources']);
    
    // Check that it's a copy, not the original array
    expect(resources).not.toBe(context['resources']);
  });
  
  test('getTools should return a copy of tools', () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();
    const tools = context.getTools();
    
    // Check the tools
    expect(tools).toEqual(context['tools']);
    
    // Check that it's a copy, not the original array
    expect(tools).not.toBe(context['tools']);
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