/**
 * Tests for the ContextInterface
 * 
 * Validates the core interface contract focusing only on essential behavior
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, test } from 'bun:test';

import type { 
  ContextCapabilities,
  ContextDependencies,
  ContextInterface,
  ContextStatus,
} from '@/contexts/contextInterface';
import type { FormattingOptions } from '@/contexts/formatterInterface';
import type { ConversationTurn } from '@/protocol/schemas/conversationSchemas';
import { MockConversationFormatter } from '@test/__mocks__/contexts/conversationFormatter';
import { MockStorageInterface } from '@test/__mocks__/storage/baseStorageInterface';
import { MockRegistry } from '@test/__mocks__/utils/registry';

// Simple test data type
interface MockData {
  id: string;
  [key: string]: unknown;
}

// Simple mock service
class MockService {
  getServiceName(): string {
    return 'MockService';
  }
}

// Minimal implementation of ContextInterface
class MockContext implements ContextInterface<
  MockStorageInterface<MockData>,
  MockConversationFormatter,
  ConversationTurn[],
  string
> {
  private static instance: MockContext | null = null;
  
  private ready = false;
  private storage: MockStorageInterface<MockData>;
  private formatter: MockConversationFormatter;
  private registry: MockRegistry;
  private hasService: boolean;

  private constructor(options: Record<string, unknown> = {}) {
    this.storage = MockStorageInterface.createFresh<MockData>();
    this.formatter = MockConversationFormatter.createFresh();
    this.registry = MockRegistry.createFresh();
    this.hasService = !!options['registerMockService'];
    
    if (this.hasService) {
      this.registry.register('MockService', () => new MockService());
    }
  }

  static getInstance(options: Record<string, unknown> = {}): MockContext {
    if (!MockContext.instance) {
      MockContext.instance = new MockContext(options);
    }
    return MockContext.instance;
  }
  
  static resetInstance(): void {
    MockContext.instance = null;
  }
  
  static createFresh(options: Record<string, unknown> = {}): MockContext {
    return new MockContext(options);
  }
  
  static createWithDependencies(
    dependencies: ContextDependencies<MockStorageInterface<MockData>, MockConversationFormatter>,
  ): MockContext {
    const context = new MockContext();
    context.storage = dependencies.storage || context.storage;
    context.formatter = dependencies.formatter || context.formatter;
    return context;
  }

  async initialize(): Promise<boolean> {
    this.ready = true;
    return true;
  }

  isReady(): boolean {
    return this.ready;
  }

  getStatus(): ContextStatus {
    return {
      name: 'MockContext',
      version: '1.0.0',
      ready: this.ready,
      resourceCount: 1,
      toolCount: 1,
    };
  }

  registerOnServer(_server: McpServer): boolean {
    return true;
  }

  getMcpServer(): McpServer {
    return {} as McpServer;
  }

  getCapabilities(): ContextCapabilities {
    return {
      resources: [{
        protocol: 'test',
        path: 'resource',
        handler: async () => ({ success: true }),
        name: 'Test Resource',
      }],
      tools: [{
        protocol: 'test',
        path: 'tool',
        handler: async () => ({ success: true }),
        name: 'Test Tool',
      }],
      features: [],
    };
  }
  
  getStorage(): MockStorageInterface<MockData> {
    return this.storage;
  }
  
  getFormatter(): MockConversationFormatter {
    return this.formatter;
  }
  
  format(data: ConversationTurn[], options?: FormattingOptions): string {
    return this.formatter.format(data, options);
  }
  
  getService<T>(serviceType: new () => T): T {
    if (!this.hasService) {
      throw new Error('Service not registered');
    }
    return new serviceType() as T;
  }
  
  getInstance(): MockContext {
    return MockContext.getInstance();
  }
  
  resetInstance(): void {
    MockContext.resetInstance();
  }
  
  createFresh(options?: Record<string, unknown>): MockContext {
    return MockContext.createFresh(options);
  }
  
  createWithDependencies(
    dependencies: ContextDependencies<MockStorageInterface<MockData>, MockConversationFormatter>,
  ): MockContext {
    return MockContext.createWithDependencies(dependencies);
  }
  
  async cleanup(): Promise<void> {
    this.ready = false;
  }
}

describe('ContextInterface', () => {
  beforeEach(() => {
    MockContext.resetInstance();
  });
  
  test('initialization and status reporting', async () => {
    // Create and initialize context
    const context = MockContext.getInstance();
    
    // Capture initial state
    const initialReady = context.isReady();
    
    // Perform initialization
    const initResult = await context.initialize();
    
    // Capture post-initialization state
    const afterInitReady = context.isReady();
    const status = context.getStatus();
    
    // Check for required status properties
    const hasRequiredStatusProps = 
      'name' in status && 
      'version' in status && 
      'ready' in status && 
      'resourceCount' in status && 
      'toolCount' in status;
    
    // Consolidated assertion for initialization behavior
    expect({
      initialState: {
        ready: initialReady,
      },
      initialization: {
        result: initResult,
        readyAfterInit: afterInitReady,
      },
      status: {
        name: status.name,
        version: status.version,
        hasRequiredProps: hasRequiredStatusProps,
        readyValue: status.ready,
      },
    }).toMatchObject({
      initialState: {
        ready: false,
      },
      initialization: {
        result: true,
        readyAfterInit: true,
      },
      status: {
        name: 'MockContext',
        version: '1.0.0',
        hasRequiredProps: true,
        readyValue: true,
      },
    });
  });
  
  test('server operations and capabilities', () => {
    const context = MockContext.getInstance();
    
    // Test server registration
    const registerResult = context.registerOnServer({} as McpServer);
    
    // Test server access
    const server = context.getMcpServer();
    const hasServer = !!server;
    
    // Test capabilities
    const capabilities = context.getCapabilities();
    const hasResources = Array.isArray(capabilities.resources) && capabilities.resources.length > 0;
    const hasTools = Array.isArray(capabilities.tools) && capabilities.tools.length > 0;
    const hasFeatures = Array.isArray(capabilities.features);
    
    // Resource and tool properties
    const firstResource = capabilities.resources[0];
    const firstTool = capabilities.tools[0];
    
    // Consolidated assertion for server and capabilities
    expect({
      server: {
        registerResult,
        hasServer,
      },
      capabilities: {
        hasResources,
        hasTools,
        hasFeatures,
        resourceProps: firstResource ? {
          hasName: 'name' in firstResource,
          hasPath: 'path' in firstResource,
          hasHandler: typeof firstResource.handler === 'function',
        } : null,
        toolProps: firstTool ? {
          hasName: 'name' in firstTool,
          hasPath: 'path' in firstTool,
          hasHandler: typeof firstTool.handler === 'function',
        } : null,
      },
    }).toMatchObject({
      server: {
        registerResult: true,
        hasServer: true,
      },
      capabilities: {
        hasResources: true,
        hasTools: true,
        hasFeatures: true,
        resourceProps: {
          hasName: true,
          hasPath: true,
          hasHandler: true,
        },
        toolProps: {
          hasName: true,
          hasPath: true,
          hasHandler: true,
        },
      },
    });
  });
  
  test('component interface standardization pattern', () => {
    // Test getInstance singleton behavior
    const instance1 = MockContext.getInstance();
    const instance2 = MockContext.getInstance();
    const sameInstances = instance1 === instance2;
    
    // Test resetInstance behavior
    MockContext.resetInstance();
    const instance3 = MockContext.getInstance();
    const resetWorked = instance1 !== instance3;
    
    // Test createFresh behavior
    const singleton = MockContext.getInstance();
    const freshInstance = MockContext.createFresh();
    const freshIsDifferent = singleton !== freshInstance;
    
    // Dependency injection
    const customStorage = MockStorageInterface.createFresh<MockData>();
    const dependencyContext = MockContext.createWithDependencies({ 
      storage: customStorage, 
    });
    const injectionWorked = dependencyContext.getStorage() === customStorage;
    
    // Consolidated assertion for instance management pattern
    expect({
      singleton: {
        multipleGetInstanceSame: sameInstances,
        resetWorks: resetWorked,
      },
      freshInstances: {
        differentFromSingleton: freshIsDifferent,
      },
      dependencyInjection: {
        injectionWorked,
      },
    }).toMatchObject({
      singleton: {
        multipleGetInstanceSame: true,
        resetWorks: true,
      },
      freshInstances: {
        differentFromSingleton: true,
      },
      dependencyInjection: {
        injectionWorked: true,
      },
    });
  });
  
  test('storage and formatter access', async () => {
    const context = MockContext.getInstance();
    
    // Test storage access and operations
    const storage = context.getStorage();
    const isStorageInstance = storage instanceof MockStorageInterface;
    
    // Test basic storage operations
    const testData = { id: 'test-id', value: 'test-value' };
    await storage.create(testData);
    const retrieved = await storage.read('test-id');
    const storageOperationWorks = retrieved && retrieved.id === testData.id;
    
    // Test formatter access and operations
    const formatter = context.getFormatter();
    const isFormatterInstance = formatter instanceof MockConversationFormatter;
    
    // Test format method
    const emptyTurns: ConversationTurn[] = [];
    const formatted = context.format(emptyTurns);
    const formatMethodWorks = formatted === 'Formatted turns';
    
    // Consolidated assertion for storage and formatter
    expect({
      storage: {
        isCorrectInstance: isStorageInstance,
        operationSucceeded: storageOperationWorks,
      },
      formatter: {
        isCorrectInstance: isFormatterInstance,
        formatMethodWorks,
      },
    }).toMatchObject({
      storage: {
        isCorrectInstance: true,
        operationSucceeded: true,
      },
      formatter: {
        isCorrectInstance: true,
        formatMethodWorks: true,
      },
    });
  });
  
  test('service access success and failure', () => {
    // Test service access - success case
    const contextWithService = MockContext.createFresh({ registerMockService: true });
    let serviceWorks = false;
    let serviceName = '';
    
    try {
      const service = contextWithService.getService(MockService);
      serviceWorks = service instanceof MockService;
      serviceName = service.getServiceName();
    } catch (_error) {
      serviceWorks = false;
    }
    
    // Test service access - failure case
    const contextWithoutService = MockContext.createFresh({ registerMockService: false });
    let serviceThrows = false;
    
    try {
      contextWithoutService.getService(MockService);
      serviceThrows = false;
    } catch (_error) {
      serviceThrows = true;
    }
    
    // Consolidated assertion for service access
    expect({
      success: {
        serviceWorks,
        serviceName,
      },
      failure: {
        throwsWhenNotRegistered: serviceThrows,
      },
    }).toMatchObject({
      success: {
        serviceWorks: true,
        serviceName: 'MockService',
      },
      failure: {
        throwsWhenNotRegistered: true,
      },
    });
  });
});