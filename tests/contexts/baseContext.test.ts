/**
 * Tests for the BaseContext abstract class
 * 
 * These tests validate that the base abstract class works correctly
 * and can be extended by concrete context implementations.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, afterEach, describe, expect, test } from 'bun:test';

import { BaseContext } from '@/contexts/baseContext';
import { Registry, type RegistryOptions } from '@/utils/registry';
import { MockConversationFormatter } from '@test/__mocks__/contexts/conversationFormatter';
import { MockStorageInterface } from '@test/__mocks__/storage/baseStorageInterface';
import { MockRegistry } from '@test/__mocks__/utils/registry';

// Create a patch for the Registry class to use our mock

// Define ResourceDefinition locally to avoid import issues
type LocalResourceDefinition = {
  protocol: string;
  path: string;
  handler: (params: Record<string, unknown>, query?: Record<string, unknown>) => Promise<unknown>;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

// Create a method to apply the mock for testing
function applyRegistryMock() {
  // Create a mock registry instance for testing
  const mockRegistryInstance = MockRegistry.getInstance();
  
  // Patch the Registry's getInstance method during tests
  const originalGetInstance = Registry.getInstance;
  Registry.getInstance = function(_options?: RegistryOptions) {
    return mockRegistryInstance as unknown as Registry;
  };
  
  return {
    // Restore method to revert changes if needed
    restore: () => {
      Registry.getInstance = originalGetInstance;
    },
  };
}

// Apply the patch for all tests in this file
const registryPatch = applyRegistryMock();

// Create a standard BaseContext extension with proper typing
class TestContext extends BaseContext<
  MockStorageInterface<unknown, unknown>,
  MockConversationFormatter
> {
  private static instance: TestContext | null = null;

  // Test storage and formatter
  private mockStorage = MockStorageInterface.createFresh<unknown, unknown>();
  private mockFormatter = MockConversationFormatter.createFresh();
  
  // Explicitly declare resources and tools properties
  protected override resources: LocalResourceDefinition[] = [];
  protected override tools: LocalResourceDefinition[] = [];

  // Test-specific properties
  public initializeCalled = false;
  public initializeComponentsCalled = false;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    // Since super() constructor already calls initializeMcpComponents
    // we reset the flag here so the test can verify it correctly
    this.initializeComponentsCalled = false;
    
    // Initialize the resources and tools here to ensure they're available
    // immediately after construction (needed for the tests)
    this.initializeMcpComponents();
  }
  
  // Implementation of required methods for BaseContext
  override getStorage(): MockStorageInterface<unknown, unknown> {
    return this.mockStorage;
  }
  
  override getFormatter(): MockConversationFormatter {
    return this.mockFormatter;
  }

  // Implement required abstract methods
  override getContextName(): string {
    return 'TestContext';
  }

  override getContextVersion(): string {
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
  override getResources(): LocalResourceDefinition[] {
    return [...this.resources];
  }
  
  override getTools(): LocalResourceDefinition[] {
    return [...this.tools];
  }
  
  // Add getCapabilities method
  override getCapabilities(): { resources: LocalResourceDefinition[]; tools: LocalResourceDefinition[]; features: string[] } {
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
  
  // Clean up the Registry mock patch after all tests
  afterEach(() => {
    // Reset the mock Registry's singleton instance
    MockRegistry.resetInstance();
  });
  
  // Clean up after all tests
  afterAll(() => {
    // Restore the original Registry.getInstance method
    registryPatch.restore();
  });

  test('constructor should set config and initialize MCP server', () => {
    // Reset for this test
    TestContext.resetInstance();

    // Track if initializeMcpComponents is called by creating a custom implementation
    let componentInitialized = false;

    // Create a direct function that extends BaseContext for this test
    function createSpecialTestContext(config: Record<string, unknown>) {
      // Explicitly track if initializeMcpComponents is called 
      const mockStorage = MockStorageInterface.createFresh<unknown, unknown>();
      const mockFormatter = MockConversationFormatter.createFresh();
            
      // Create a context instance by extending BaseContext
      class BasicContext extends BaseContext<
        MockStorageInterface<unknown, unknown>,
        MockConversationFormatter
      > {
        protected override readonly resources: LocalResourceDefinition[] = [];
        protected override readonly tools: LocalResourceDefinition[] = [];
        
        constructor(cfg: Record<string, unknown>) {
          super(cfg);
        }
        
        override getStorage() {
          return mockStorage;
        }
        
        override getFormatter() {
          return mockFormatter;
        }
        
        override getContextName() {
          return 'SpecialTest';
        }
        
        override getContextVersion() {
          return '1.0.0';
        }
        
        protected override initializeMcpComponents(): void {
          componentInitialized = true;
          // We keep these as empty arrays since the test context doesn't need any
        }
        
        override getResources() {
          return [...this.resources];
        }
        
        override getTools() {
          return [...this.tools];
        }
        
        override getCapabilities() {
          return {
            resources: this.getResources(),
            tools: this.getTools(),
            features: [],
          };
        }
        
        static override getInstance() {
          return new BasicContext({});
        }
        
        static override resetInstance() {
          // No-op for tests
        }
        
        static override createFresh(options = {}) {
          return new BasicContext(options);
        }
      }
      
      // Return a new instance
      return new BasicContext(config);
    }

    // Create a context with our test config
    const context = createSpecialTestContext({ testOption: 'value' });

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
