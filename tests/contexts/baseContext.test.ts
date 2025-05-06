/**
 * Tests for the BaseContext abstract class
 * 
 * These tests validate that the base abstract class works correctly
 * and can be extended by concrete context implementations.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, afterEach, describe, expect, test } from 'bun:test';

import { BaseContext } from '@/contexts/baseContext';
import { Registry, type RegistryConfig, type RegistryDependencies } from '@/utils/registry';
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
  Registry.getInstance = function(
    _config?: Partial<RegistryConfig>, 
    _dependencies?: Partial<RegistryDependencies>,
  ) {
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

  test('constructor initializes correctly with configuration', () => {
    // Reset for this test
    TestContext.resetInstance();

    // Track if initializeMcpComponents is called
    let componentInitialized = false;

    // Create a class that extends BaseContext for this test
    class TestContextWithTracking extends BaseContext<
      MockStorageInterface<unknown, unknown>,
      MockConversationFormatter
    > {
      public configWasSet = false;
      public configValue: string | undefined;
      public mcpServerCreated = false;
      
      protected override readonly resources: LocalResourceDefinition[] = [];
      protected override readonly tools: LocalResourceDefinition[] = [];
      
      constructor(cfg: Record<string, unknown>) {
        super(cfg);
        
        // Use public properties to track state instead of accessing private properties
        this.configWasSet = !!this.config && typeof this.config === 'object';
        this.configValue = this.config?.['testOption'] as string;
        this.mcpServerCreated = !!this.mcpServer;
      }
      
      // Required BaseContext implementations
      override getStorage() {
        return MockStorageInterface.createFresh<unknown, unknown>();
      }
      
      override getFormatter() {
        return MockConversationFormatter.createFresh();
      }
      
      override getContextName() {
        return 'SpecialTest';
      }
      
      override getContextVersion() {
        return '1.0.0';
      }
      
      // Track component initialization through a public method
      protected override initializeMcpComponents(): void {
        componentInitialized = true;
      }
      
      // Implementation of required methods
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
      
      // Static methods required by BaseContext
      static override getInstance() {
        return new TestContextWithTracking({});
      }
      
      static override resetInstance() {
        // No-op for tests
      }
      
      static override createFresh(options = {}) {
        return new TestContextWithTracking(options);
      }
    }
    
    // Create a context instance with our test config
    const context = new TestContextWithTracking({ testOption: 'value' });
    
    // Consolidated assertion using public properties and avoiding implementation details
    expect({
      config: {
        wasSet: context.configWasSet,
        testOptionValue: context.configValue,
      },
      server: {
        wasCreated: context.mcpServerCreated,
      },
      initialization: {
        componentsInitialized: componentInitialized,
      },
    }).toMatchObject({
      config: {
        wasSet: true,
        testOptionValue: 'value',
      },
      server: {
        wasCreated: true,
      },
      initialization: {
        componentsInitialized: true,
      },
    });
  });

  test('initialization changes ready state and updates status', async () => {
    // Reset for this test
    TestContext.resetInstance();
    const context = TestContext.createFresh();

    // Test initial state before initialization
    const initialReady = context.isReady();
    const initialStatus = context.getStatus();
    
    // Validate initial status properties
    const initialStatusHasCorrectName = initialStatus.name === 'TestContext';
    const initialStatusHasCorrectVersion = initialStatus.version === '1.0.0';
    const initialStatusHasCorrectReadyState = initialStatus.ready === false;
    const initialStatusHasResourceCount = initialStatus['resourceCount'] === 1;
    const initialStatusHasToolCount = initialStatus['toolCount'] === 1;
    
    // Perform initialization
    const initResult = await context.initialize();
    
    // Test state after initialization
    const afterInitReady = context.isReady();
    const afterInitStatus = context.getStatus();
    
    // Check that status reflects the updated ready state
    const afterInitStatusReady = afterInitStatus.ready;
    
    // Clear consolidated assertion with named variables
    expect({
      initialState: {
        ready: initialReady,
        status: {
          hasCorrectName: initialStatusHasCorrectName,
          hasCorrectVersion: initialStatusHasCorrectVersion,
          showsNotReady: initialStatusHasCorrectReadyState,
          hasResourceCount: initialStatusHasResourceCount,
          hasToolCount: initialStatusHasToolCount,
        },
      },
      afterInitialization: {
        initReturnsSuccess: initResult,
        readyStateIsTrue: afterInitReady,
        statusShowsReady: afterInitStatusReady,
      },
    }).toMatchObject({
      initialState: {
        ready: false,
        status: {
          hasCorrectName: true,
          hasCorrectVersion: true,
          showsNotReady: true,
          hasResourceCount: true,
          hasToolCount: true,
        },
      },
      afterInitialization: {
        initReturnsSuccess: true,
        readyStateIsTrue: true,
        statusShowsReady: true,
      },
    });
  });

  test('server registration registers resources and tools correctly', () => {
    // Reset for this test
    TestContext.resetInstance();
    
    // Create a test context specifically for this test
    class ServerTestContext extends TestContext {
      // Store server reference for testing
      public capturedServer: McpServer | null = null;
      
      // Override getMcpServer to capture the server
      override getMcpServer(): McpServer {
        const server = super.getMcpServer();
        this.capturedServer = server;
        return server;
      }
    }
    
    const context = new ServerTestContext();

    // Get and store server reference
    const mcpServer = context.getMcpServer();
    const hasCapturedServer = context.capturedServer === mcpServer;

    // Create a tracking mock server
    type ResourceHandler = (uri: URL, extra: Record<string, unknown>) => Promise<unknown>;
    type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;
    
    const registeredResources: Array<{
      name: string;
      path: string;
      metadata: Record<string, unknown>;
    }> = [];
    
    const registeredTools: Array<{
      name: string;
      description: string;
    }> = [];
    
    // Create a mock server that tracks registration
    const mockServer = {
      resource: (name: string, path: string, metadata: Record<string, unknown>, _handler: ResourceHandler) => {
        registeredResources.push({ name, path, metadata });
        return mockServer;
      },
      tool: (name: string, description: string, _handler: ToolHandler) => {
        registeredTools.push({ name, description });
        return mockServer;
      },
    } as unknown as McpServer;

    // Register on the mock server
    const registerResult = context.registerOnServer(mockServer);
    
    // Get capabilities to check against registered items
    const capabilities = context.getCapabilities();
    
    // Check if registered resources match capabilities
    const expectedResourceCount = capabilities.resources.length;
    const actualResourceCount = registeredResources.length;
    const resourceCountMatches = expectedResourceCount === actualResourceCount;
    
    // Check if registered tools match capabilities
    const expectedToolCount = capabilities.tools.length;
    const actualToolCount = registeredTools.length;
    const toolCountMatches = expectedToolCount === actualToolCount;
    
    // Check first resource name and path
    const firstResourceNameMatches = 
      registeredResources.length > 0 && 
      capabilities.resources.length > 0 &&
      registeredResources[0].name === 'Test Resource';
      
    const firstResourcePathMatches = 
      registeredResources.length > 0 && 
      capabilities.resources.length > 0 &&
      registeredResources[0].path === capabilities.resources[0].path;
    
    // Check first tool name
    const firstToolNameMatches = 
      registeredTools.length > 0 && 
      capabilities.tools.length > 0 &&
      registeredTools[0].name === 'Test Tool';
    
    // Clear consolidated assertion with behavior focus
    expect({
      server: {
        serverIsAccessible: hasCapturedServer,
      },
      registration: {
        registrationSucceeded: registerResult,
        resourceRegistration: {
          countMatches: resourceCountMatches,
          nameMatches: firstResourceNameMatches,
          pathMatches: firstResourcePathMatches,
        },
        toolRegistration: {
          countMatches: toolCountMatches,
          nameMatches: firstToolNameMatches,
        },
      },
    }).toMatchObject({
      server: {
        serverIsAccessible: true,
      },
      registration: {
        registrationSucceeded: true,
        resourceRegistration: {
          countMatches: true,
          nameMatches: true,
          pathMatches: true,
        },
        toolRegistration: {
          countMatches: true,
          nameMatches: true,
        },
      },
    });
  });

  test('getCapabilities returns proper capabilities structure', () => {
    // Reset for this test
    TestContext.resetInstance();
    
    // Create a modified test context with additional tracking
    class TrackingTestContext extends TestContext {
      // Store original resources and tools for comparison
      readonly originalResources = this.getResources();
      readonly originalTools = this.getTools();
      
      // Public method to check if arrays are the same object reference
      public areArraysEqual(a: unknown[], b: unknown[]): boolean {
        return a === b;
      }
      
      // Public method to check if arrays have the same content
      public doArraysHaveSameContent(a: LocalResourceDefinition[], b: LocalResourceDefinition[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((item, index) => item.path === b[index].path && item.protocol === b[index].protocol);
      }
    }
    
    const trackingContext = new TrackingTestContext();
    const capabilities = trackingContext.getCapabilities();
    
    // Check that arrays are copied and content matches
    const resourcesAreSameReference = trackingContext.areArraysEqual(
      capabilities.resources, 
      trackingContext.originalResources,
    );
    
    const toolsAreSameReference = trackingContext.areArraysEqual(
      capabilities.tools, 
      trackingContext.originalTools,
    );
    
    const resourcesHaveSameContent = trackingContext.doArraysHaveSameContent(
      capabilities.resources,
      trackingContext.originalResources,
    );
    
    const toolsHaveSameContent = trackingContext.doArraysHaveSameContent(
      capabilities.tools,
      trackingContext.originalTools,
    );
    
    // Check if features property exists
    const hasFeatures = 'features' in capabilities;
    
    // Consolidated assertion focused on the contract, not implementation details
    expect({
      capabilities: {
        resourcesHaveSameContent,
        toolsHaveSameContent,
        hasFeatures,
      },
      defensiveCopying: {
        resourcesAreDifferentReferences: !resourcesAreSameReference,
        toolsAreDifferentReferences: !toolsAreSameReference,
      },
    }).toMatchObject({
      capabilities: {
        resourcesHaveSameContent: true,
        toolsHaveSameContent: true,
        hasFeatures: true,
      },
      defensiveCopying: {
        resourcesAreDifferentReferences: true,
        toolsAreDifferentReferences: true,
      },
    });
  });

  test('singleton pattern and instance management functions correctly', () => {
    // Reset state for this test
    TestContext.resetInstance();
    
    // Create a tracking context class
    class InstanceTrackingContext extends TestContext {
      static instanceCounter = 0;
      readonly instanceId: number;
      // Create our own static instance property
      private static _instance: InstanceTrackingContext | null = null;
      
      constructor() {
        super();
        this.instanceId = ++InstanceTrackingContext.instanceCounter;
      }
      
      // Add tracking methods
      static override getInstance(): InstanceTrackingContext {
        if (!this._instance) {
          this._instance = new InstanceTrackingContext();
        }
        return this._instance;
      }
      
      static override resetInstance(): void {
        this._instance = null;
      }
      
      static override createFresh(): InstanceTrackingContext {
        return new InstanceTrackingContext();
      }
    }
    
    // Test singleton behavior
    const instance1 = InstanceTrackingContext.getInstance();
    const instance2 = InstanceTrackingContext.getInstance();
    const singletonReturnsSameInstance = instance1 === instance2;
    const singletonReturnsSameId = instance1.instanceId === instance2.instanceId;
    
    // Test reset behavior
    InstanceTrackingContext.resetInstance();
    const instance3 = InstanceTrackingContext.getInstance();
    const resetCreatesNewInstance = instance1 !== instance3;
    const resetCreatesNewId = instance1.instanceId !== instance3.instanceId;
    
    // Test createFresh behavior
    const singleton = InstanceTrackingContext.getInstance();
    const fresh1 = InstanceTrackingContext.createFresh();
    const fresh2 = InstanceTrackingContext.createFresh();
    
    const freshDiffersFromSingleton = fresh1 !== singleton;
    const freshInstancesUnique = fresh1 !== fresh2;
    const freshIdsUnique = fresh1.instanceId !== fresh2.instanceId;
    
    // Consolidated assertion with clear naming
    expect({
      singleton: {
        returnsSameInstance: singletonReturnsSameInstance,
        returnsSameId: singletonReturnsSameId,
      },
      reset: {
        createsNewInstance: resetCreatesNewInstance,
        createsNewId: resetCreatesNewId,
      },
      createFresh: {
        differsFromSingleton: freshDiffersFromSingleton,
        createsFreshInstances: freshInstancesUnique,
        createsUniqueIds: freshIdsUnique,
      },
    }).toMatchObject({
      singleton: {
        returnsSameInstance: true,
        returnsSameId: true,
      },
      reset: {
        createsNewInstance: true,
        createsNewId: true,
      },
      createFresh: {
        differsFromSingleton: true,
        createsFreshInstances: true,
        createsUniqueIds: true,
      },
    });
  });
});
