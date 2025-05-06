/**
 * Tests for the ConversationContext with dependency injection
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ConversationContext } from '@/contexts';
import { BaseContext } from '@/contexts/baseContext';
import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import type { ConversationFormatter } from '@/contexts/conversations/formatters/conversationFormatter';
import type { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationResourceService } from '@/contexts/conversations/resources/conversationResources';
import type { ConversationMemoryService } from '@/contexts/conversations/services/conversationMemoryService';
import type { ConversationQueryService } from '@/contexts/conversations/services/conversationQueryService';
import type { ConversationToolService } from '@/contexts/conversations/tools/conversationTools';
import { MockConversationFormatter } from '@test/__mocks__/contexts/conversationFormatter';
import { MockConversationMcpFormatter } from '@test/__mocks__/contexts/conversationMcpFormatter';
import { MockConversationMemoryService } from '@test/__mocks__/contexts/conversationMemoryService';
import { MockConversationQueryService } from '@test/__mocks__/contexts/conversationQueryService';
import { MockConversationResourceService } from '@test/__mocks__/contexts/conversationResourceService';
import { MockConversationToolService } from '@test/__mocks__/contexts/conversationToolService';
import { createMockMcpServer } from '@test/__mocks__/core/MockMcpServer';
import { MockConversationStorage } from '@test/__mocks__/storage/conversationStorage';

// Create a standardized mock server for testing
const mockMcpServer = createMockMcpServer('TestServer', '1.0');

describe('ConversationContext', () => {
  let conversationContext: ConversationContext;
  let storage: MockConversationStorage;
  let adapter: ConversationStorageAdapter;
  let formatter: MockConversationFormatter;
  let mcpFormatter: MockConversationMcpFormatter;
  let resourceService: MockConversationResourceService;
  let toolService: MockConversationToolService;
  let queryService: MockConversationQueryService;
  let memoryService: MockConversationMemoryService;

  beforeEach(() => {
    // Reset all mock instances
    MockConversationFormatter.resetInstance();
    MockConversationMcpFormatter.resetInstance();
    MockConversationResourceService.resetInstance();
    MockConversationToolService.resetInstance();
    MockConversationQueryService.resetInstance();
    MockConversationMemoryService.resetInstance();

    // Create fresh storage and adapter instance for each test
    storage = MockConversationStorage.createFresh();
    adapter = new ConversationStorageAdapter(storage);

    // Create standardized service mocks using the Component Interface Standardization pattern
    formatter = MockConversationFormatter.createFresh();
    mcpFormatter = MockConversationMcpFormatter.createFresh();
    resourceService = MockConversationResourceService.createFresh();
    toolService = MockConversationToolService.createFresh();
    queryService = MockConversationQueryService.createFresh();
    memoryService = MockConversationMemoryService.createFresh();

    // Set up mock responses for specific methods
    formatter.formatConversation = mock(() => 'Formatted conversation');

    mcpFormatter.formatConversationForMcp = mock(
      async (_conversation, _turns, _summaries, _options) => ({
        id: 'test-id',
        roomId: 'test-room',
        interfaceType: 'cli' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        turns: [],
        turnCount: 0,
        summaryCount: 0,
        statistics: {},
      }),
    );

    // Set up query service mocks
    queryService.createConversation = mock(() => Promise.resolve('test-id'));
    queryService.getConversation = mock(() => Promise.resolve({
      id: 'test-id',
      interfaceType: 'cli',
      roomId: 'test-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    }));
    queryService.getConversationIdByRoom = mock(() => Promise.resolve('test-id'));
    queryService.getOrCreateConversationForRoom = mock(() => Promise.resolve('test-id'));
    queryService.findConversations = mock(() => Promise.resolve([]));
    queryService.getConversationsByRoom = mock(() => Promise.resolve([]));
    queryService.getRecentConversations = mock(() => Promise.resolve([]));

    // Set up memory service mocks
    memoryService.addTurn = mock(() => Promise.resolve('turn-id'));
    memoryService.getTurns = mock(() => Promise.resolve([
      {
        id: 'turn-1',
        timestamp: new Date(),
        query: 'Hello',
        response: 'Hi there!',
        userId: 'user-1',
        userName: 'TestUser',
      },
      {
        id: 'turn-2',
        timestamp: new Date(),
        query: 'How are you?',
        response: 'I am fine, thanks!',
        userId: 'user-1',
        userName: 'TestUser',
      },
    ]));
    memoryService.formatHistoryForPrompt = mock(() => Promise.resolve(
      'User: What is quantum computing?\nAssistant: Quantum computing is a type of computation that uses quantum bits or qubits to perform operations.\n\n' +
      'User: How is that different from classical computing?\nAssistant: Classical computing uses classical bits that can be either 0 or 1, while quantum bits can exist in superposition, representing both 0 and 1 simultaneously.\n\n',
    ));

    // Create a context with direct dependency injection
    // We'll use a standard config for all tests
    const config = {
      name: 'ConversationBrain',
      version: '1.0.0',
      storage: adapter,  // Use ConversationStorageAdapter instead of MockConversationStorage directly
      tieredMemoryConfig: {},
      display: {
        anchorName: 'TestHost',
        defaultUserName: 'TestUser',
        anchorId: '',
        defaultUserId: '',
      },
    };

    // Create the context with explicit dependencies using the new object-based approach
    // Use type assertion for the mock implementations
    conversationContext = new ConversationContext(
      config,
      {
        storageAdapter: adapter,
        formatter: formatter as unknown as ConversationFormatter,
        mcpFormatter: mcpFormatter as unknown as ConversationMcpFormatter,
        resourceService: resourceService as unknown as ConversationResourceService,
        toolService: toolService as unknown as ConversationToolService,
        queryService: queryService as unknown as ConversationQueryService,
        memoryService: memoryService as unknown as ConversationMemoryService,
      },
    );
  });

  afterEach(() => {
    // Clean up singleton
    ConversationContext.resetInstance();
    // Clear storage
    storage.clear();
  });

  describe('Component Interface Standardization pattern implementation', () => {
    test('should implement static getInstance returning a singleton instance', () => {
      const instance1 = ConversationContext.getInstance();
      const instance2 = ConversationContext.getInstance();
      expect(instance1).toBe(instance2);
      
      // Also test class instance methods
      const instanceFromMethod = conversationContext.getInstance();
      expect(instanceFromMethod).toBe(ConversationContext.getInstance());
    });

    test('should implement static resetInstance clearing the singleton', () => {
      const instance1 = ConversationContext.getInstance();
      ConversationContext.resetInstance();
      const instance2 = ConversationContext.getInstance();
      expect(instance1).not.toBe(instance2);
      
      // Also test class instance methods
      const instance3 = ConversationContext.getInstance();
      conversationContext.resetInstance();
      const instance4 = ConversationContext.getInstance();
      expect(instance3).not.toBe(instance4);
    });

    test('should implement static createFresh with config and dependencies', () => {
      // Test creating with just config
      const configInstance = ConversationContext.createFresh({
        name: 'CustomName',
        version: '2.0.0',
      });
      expect(configInstance).toBeInstanceOf(ConversationContext);
      expect(configInstance.getContextName()).toBe('CustomName');
      expect(configInstance.getContextVersion()).toBe('2.0.0');
      
      // Test creating with config and dependencies
      const customFormatter = MockConversationFormatter.createFresh();
      const customAdapter = new ConversationStorageAdapter(MockConversationStorage.createFresh());
      
      const fullInstance = ConversationContext.createFresh(
        {
          name: 'FullConfig',
          version: '3.0.0',
          storage: customAdapter,  // Need to set storage in config
        },
        {
          storageAdapter: customAdapter,
          formatter: customFormatter as unknown as ConversationFormatter,
        },
      );
      
      expect(fullInstance).toBeInstanceOf(ConversationContext);
      expect(fullInstance.getContextName()).toBe('FullConfig');
      expect(fullInstance.getContextVersion()).toBe('3.0.0');
      
      // Storage will come from the config.storage
      expect(fullInstance.getStorage()).not.toBeUndefined();
      
      // Also test class instance method
      const instanceFromMethod = conversationContext.createFresh({
        name: 'InstanceMethod',
        version: '4.0.0',
      });
      expect(instanceFromMethod.getContextName()).toBe('InstanceMethod');
      expect(instanceFromMethod).not.toBe(conversationContext);
    });
  });

  describe('BaseContext implementation', () => {
    test('should extend BaseContext with correct inheritance', () => {
      expect(conversationContext).toBeInstanceOf(BaseContext);
    });
    
    test('should implement contextName and version correctly', () => {
      expect(conversationContext.getContextName()).toBe('ConversationBrain');
      expect(conversationContext.getContextVersion()).toBe('1.0.0');
    });
    
    test('should initialize MCP capabilities', () => {
      const capabilities = conversationContext.getCapabilities();
      expect(capabilities.resources).toBeDefined();
      expect(capabilities.tools).toBeDefined();
      expect(capabilities.features).toBeDefined();
    });
    
    test('should register on MCP server successfully', () => {
      // Clear collections before testing
      mockMcpServer.clearRegistrations();
      
      const result = conversationContext.registerOnServer(mockMcpServer);
      
      expect(result).toBe(true);
      expect(mockMcpServer.getRegisteredResources().length).toBeGreaterThan(0);
      expect(mockMcpServer.getRegisteredTools().length).toBeGreaterThan(0);
    });
    
    test('should handle undefined server gracefully', () => {
      const result = conversationContext.registerOnServer(undefined as unknown as McpServer);
      expect(result).toBe(false);
    });
  });

  describe('Conversation management operations', () => {
    // Group the operations by functionality in a table-driven approach
    test('query operations', async () => {
      const queryOperationCases = [
        {
          name: 'createConversation creates a conversation',
          test: async () => {
            const id = await conversationContext.createConversation('cli', 'test-room');
            expect(id).toBe('test-id');
            expect(queryService.createConversation).toHaveBeenCalledWith('cli', 'test-room');
          },
        },
        {
          name: 'getOrCreateConversationForRoom returns existing conversation ID',
          test: async () => {
            const id = await conversationContext.getOrCreateConversationForRoom('test-room', 'cli');
            expect(id).toBe('test-id');
            expect(queryService.getOrCreateConversationForRoom).toHaveBeenCalledWith('test-room', 'cli');
          },
        },
        {
          name: 'findConversations correctly passes search criteria',
          test: async () => {
            const criteria = {
              interfaceType: 'cli' as const,
              query: 'test query',
              limit: 10,
              offset: 5,
            };
            await conversationContext.findConversations(criteria);
            expect(queryService.findConversations).toHaveBeenCalledWith(criteria);
          },
        },
        {
          name: 'getConversationsByRoom correctly calls query service',
          test: async () => {
            await conversationContext.getConversationsByRoom('test-room', 'cli');
            expect(queryService.getConversationsByRoom).toHaveBeenCalledWith('test-room', 'cli');
          },
        },
        {
          name: 'getRecentConversations correctly calls query service',
          test: async () => {
            await conversationContext.getRecentConversations(10, 'cli');
            expect(queryService.getRecentConversations).toHaveBeenCalledWith(10, 'cli');
          },
        },
      ];

      // Run all query operation tests
      for (const { test: testFn } of queryOperationCases) {
        await testFn();
      }
    });
    
    test('memory operations', async () => {
      const memoryOperationCases = [
        {
          name: 'addTurn adds a turn to a conversation',
          test: async () => {
            const turnId = await conversationContext.addTurn('test-id', 'Hello', 'Hi there!');
            expect(turnId).toBe('turn-id');
            expect(queryService.getConversation).toHaveBeenCalledWith('test-id');
            expect(memoryService.addTurn).toHaveBeenCalledWith(
              'test-id',
              expect.objectContaining({
                query: 'Hello',
                response: 'Hi there!',
              }),
            );
          },
        },
        {
          name: 'getConversationHistory retrieves formatted conversation history',
          test: async () => {
            const history = await conversationContext.getConversationHistory('test-id');
            expect(history).toBe('Formatted conversation');
            expect(memoryService.getTurns).toHaveBeenCalledWith('test-id', undefined);
            expect(formatter.formatConversation).toHaveBeenCalled();
          },
        },
        {
          name: 'getFormattedConversationForMcp returns properly formatted data',
          test: async () => {
            const formatted = await conversationContext.getFormattedConversationForMcp('test-id', {
              includeFullTurns: true,
            });
            expect(formatted).toBeDefined();
            expect(formatted?.id).toBe('test-id');
            expect(formatted?.roomId).toBe('test-room');
            expect(formatted?.interfaceType).toBe('cli');
            expect(mcpFormatter.formatConversationForMcp).toHaveBeenCalled();
          },
        },
      ];

      // Run all memory operation tests
      for (const { test: testFn } of memoryOperationCases) {
        await testFn();
      }
    });
  });

  describe('Storage operations', () => {
    test('should handle storage operations correctly', () => {
      // Test cases for synchronous storage operations
      const storageCases = [
        {
          name: 'getStorage returns a storage adapter instance',
          test: () => {
            const storageAdapter = conversationContext.getStorage();
            expect(storageAdapter).toBeInstanceOf(ConversationStorageAdapter);
          },
        },
        {
          name: 'setStorage updates the storage adapter',
          test: () => {
            const newAdapter = new ConversationStorageAdapter(MockConversationStorage.createFresh());
            conversationContext.setStorage(newAdapter);
            expect(conversationContext.getStorage()).toBe(newAdapter);
          },
        },
      ];

      // Run all storage operation tests
      storageCases.forEach(({ test: testFn }) => {
        testFn();
      });
    });
  });
});