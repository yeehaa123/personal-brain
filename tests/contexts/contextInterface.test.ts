/**
 * Tests for the ContextInterface
 * 
 * These tests validate that the interface can be implemented correctly
 * and that implementations behave as expected.
 * 
 * This test file has been updated to include tests for the new standardized interfaces:
 * - StorageAccess
 * - FormatterAccess
 * - ServiceAccess
 * - ExtendedContextInterface
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, test } from 'bun:test';

import type { 
  ContextCapabilities,
  ContextDependencies,
  ContextInterface,
  ContextStatus,
  ResourceDefinition,
} from '@/contexts/contextInterface';
import type { FormattingOptions } from '@/contexts/formatterInterface';
import type { ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';
// Imports for testing
import type { Registry, RegistryOptions } from '@/utils/registry';
import { MockConversationFormatter } from '@test/__mocks__/contexts/conversationFormatter';
import { MockStorageInterface } from '@test/__mocks__/storage/baseStorageInterface';
import { MockRegistry } from '@test/__mocks__/utils/registry';

// Define MockData interface for type safety
interface MockData {
  id: string;
  [key: string]: unknown;
}

// Mock implementation of a service for testing
class MockService {
  getServiceName(): string {
    return 'MockService';
  }
}

// Mock implementation of ContextInterface for testing
class MockContext implements ContextInterface<
  MockStorageInterface<MockData>,
  MockConversationFormatter,
  ConversationTurn[],
  string
> {
  private static instance: MockContext | null = null;
  
  private readyState = false;
  private mockServer: McpServer;
  private mockResources: ResourceDefinition[] = [];
  private mockTools: ResourceDefinition[] = [];
  private mockStorage: MockStorageInterface<MockData>;
  private mockFormatter: MockConversationFormatter;
  private mockRegistry: MockRegistry | Registry<RegistryOptions>;
  private options: Record<string, unknown>;

  private constructor(
    options: Record<string, unknown> = {}, 
    dependencies?: ContextDependencies<MockStorageInterface<MockData>, MockConversationFormatter>,
  ) {
    // Store options for use in other methods
    this.options = options;
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
    
    // Initialize dependencies from explicit dependencies or create new ones
    this.mockStorage = dependencies?.storage || MockStorageInterface.createFresh<MockData>();
    this.mockFormatter = dependencies?.formatter || MockConversationFormatter.createFresh();
    
    // We'll use the standard MockRegistry from our mocks
    this.mockRegistry = dependencies?.registry || MockRegistry.createFresh();
    
    // Register a test service
    if (options['registerMockService']) {
      this.mockRegistry.register('MockService', () => new MockService());
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(options: Record<string, unknown> = {}): MockContext {
    if (!MockContext.instance) {
      MockContext.instance = new MockContext(options);
    }
    return MockContext.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContext.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options: Record<string, unknown> = {}): MockContext {
    return new MockContext(options);
  }
  
  /**
   * Create an instance with dependencies
   */
  static createWithDependencies(
    dependencies: ContextDependencies<MockStorageInterface<MockData>, MockConversationFormatter>,
  ): MockContext {
    return new MockContext({}, dependencies);
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
  
  getStorage(): MockStorageInterface<MockData> {
    return this.mockStorage;
  }
  
  getFormatter(): MockConversationFormatter {
    return this.mockFormatter;
  }
  
  format(data: ConversationTurn[], options?: FormattingOptions): string {
    // Use the formatter to format the data
    return this.mockFormatter.format(data, options);
  }
  
  getService<T>(serviceType: new () => T): T {
    // Always check if we've registered the service
    const serviceName = 'MockService';
    
    // We need to explicitly check if the service was registered with the mock registry
    if (this.options['registerMockService'] !== true) {
      throw new Error(`Service ${serviceType.name} is not registered in the container`);
    }
    
    // For the success case, we return the service
    if (serviceType === MockService && this.mockRegistry.has(serviceName)) {
      return this.mockRegistry.resolve<T>(serviceName);
    }
    
    // Any other case should throw
    throw new Error(`Service ${serviceType.name} is not registered in the container`);
  }
  
  // Methods required by ExtendedContextInterface
  createWithDependencies(dependencies: ContextDependencies<MockStorageInterface<MockData>, MockConversationFormatter>): MockContext {
    return MockContext.createWithDependencies(dependencies);
  }
  
  // Methods required by ContextInterface
  getInstance(): MockContext {
    return MockContext.getInstance();
  }
  
  resetInstance(): void {
    MockContext.resetInstance();
  }
  
  createFresh(options?: Record<string, unknown>): MockContext {
    return MockContext.createFresh(options);
  }
  
  async cleanup(): Promise<void> {
    // Simulate cleanup in the mock
    this.readyState = false;
    this.mockResources = [];
    this.mockTools = [];
  }
}

describe('ContextInterface', () => {
  // Reset the singleton before each test
  beforeEach(() => {
    MockContext.resetInstance();
  });
  
  describe('Core Interface', () => {
    test('should initialize successfully', async () => {
      const context = MockContext.getInstance();
      const result = await context.initialize();
      expect(result).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('getStatus should return valid status object', () => {
      const context = MockContext.getInstance();
      const status = context.getStatus();
      expect(status).toHaveProperty('name', 'MockContext');
      expect(status).toHaveProperty('version', '1.0.0');
      expect(status).toHaveProperty('ready');
      expect(status).toHaveProperty('resourceCount');
      expect(status).toHaveProperty('toolCount');
    });

    test('registerOnServer should return true for successful registration', () => {
      const context = MockContext.getInstance();
      const mockServer = {} as McpServer;
      // Pass the mock server to registerOnServer
      const result = context.registerOnServer(mockServer);
      expect(result).toBe(true);
    });

    test('getMcpServer should return an MCP server instance', () => {
      const context = MockContext.getInstance();
      const serverInstance = context.getMcpServer();
      expect(serverInstance).toBeDefined();
    });

    test('getCapabilities should return resources, tools, and features', () => {
      const context = MockContext.getInstance();
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

  describe('Component Interface Standardization Pattern', () => {
    test('getInstance should return a singleton instance', () => {
      const instance1 = MockContext.getInstance();
      const instance2 = MockContext.getInstance();
      expect(instance1).toBe(instance2);
    });
    
    test('resetInstance should clear the singleton', () => {
      const instance1 = MockContext.getInstance();
      MockContext.resetInstance();
      const instance2 = MockContext.getInstance();
      expect(instance1).not.toBe(instance2);
    });
    
    test('createFresh should return a new instance', () => {
      const singleton = MockContext.getInstance();
      const freshInstance = MockContext.createFresh();
      expect(singleton).not.toBe(freshInstance);
    });
    
    test('createWithDependencies should use provided dependencies', () => {
      // Create mock dependencies
      const customStorage = MockStorageInterface.createFresh<MockData>();
      const customFormatter = MockConversationFormatter.createFresh();
      const customRegistry = MockRegistry.createFresh();
      
      // Create instance with dependencies
      const instance = MockContext.createWithDependencies({
        storage: customStorage,
        formatter: customFormatter,
        registry: customRegistry,
      });
      
      // Verify dependencies were used
      expect(instance.getStorage()).toBe(customStorage);
      expect(instance.getFormatter()).toBe(customFormatter);
    });
  });
  
  describe('StorageAccess Interface', () => {
    test('getStorage should return a storage implementation', () => {
      const context = MockContext.getInstance();
      const storage = context.getStorage();
      expect(storage).toBeInstanceOf(MockStorageInterface);
    });
    
    test('storage should be functional', async () => {
      const context = MockContext.getInstance();
      const storage = context.getStorage();
      
      // Test basic storage operations
      const testData = { id: 'test-id', value: 'test-value' };
      await storage.create(testData);
      const retrieved = await storage.read('test-id');
      
      expect(retrieved).toEqual(testData);
    });
  });
  
  describe('FormatterAccess Interface', () => {
    test('getFormatter should return a formatter implementation', () => {
      const context = MockContext.getInstance();
      const formatter = context.getFormatter();
      expect(formatter).toBeInstanceOf(MockConversationFormatter);
    });
    
    test('format should apply formatting to data', () => {
      const context = MockContext.getInstance();
      const testTurns: ConversationTurn[] = [
        {
          query: 'Test query',
          response: 'Test response',
          timestamp: new Date(),
        },
        {
          query: 'Follow-up question',
          response: 'Follow-up answer',
          timestamp: new Date(),
        },
      ];
      
      const formatted = context.format(testTurns);
      
      // The mock formatter returns a preset string
      expect(formatted).toBe('Formatted turns');
    });
  });
  
  describe('ServiceAccess Interface', () => {
    test('getService should retrieve a registered service', () => {
      // Create a context with the mockService option
      const context = MockContext.createFresh({ registerMockService: true });
      const service = context.getService(MockService);
      
      expect(service).toBeInstanceOf(MockService);
      expect(service.getServiceName()).toBe('MockService');
    });
    
    test('getService should throw when service is not registered', () => {
      // Create a fresh instance without registering any services
      const context = MockContext.createFresh({
        // Explicitly set registerMockService to false to ensure no services are registered
        registerMockService: false,
      });
      
      // This should throw because the service is not registered
      expect(() => context.getService(MockService)).toThrow();
    });
  });
});