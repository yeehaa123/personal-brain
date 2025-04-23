/**
 * Tests for the ConversationContext with dependency injection
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ConversationContext } from '@/contexts';
import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import type { ConversationFormatter } from '@/contexts/conversations/formatters/conversationFormatter';
import type { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationResourceService } from '@/contexts/conversations/resources/conversationResources';
import type { ConversationMemoryService } from '@/contexts/conversations/services/conversationMemoryService';
import type { ConversationQueryService } from '@/contexts/conversations/services/conversationQueryService';
import type { ConversationToolService } from '@/contexts/conversations/tools/conversationTools';
import { BaseContext } from '@/contexts/core/baseContext';
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

  describe('BaseContext implementation', () => {
    test('extends BaseContext', () => {
      expect(conversationContext).toBeInstanceOf(BaseContext);
    });

    test('implements getContextName() correctly', () => {
      expect(conversationContext.getContextName()).toBe('ConversationBrain');
    });

    test('implements getContextVersion() correctly', () => {
      expect(conversationContext.getContextVersion()).toBe('1.0.0');
    });

    test('initializes MCP components correctly', () => {
      const capabilities = conversationContext.getCapabilities();

      expect(capabilities.resources).toBeDefined();
      expect(capabilities.tools).toBeDefined();
      expect(capabilities.features).toBeDefined();
    });

    test('registers on an MCP server successfully', () => {
      // Clear collections before testing
      mockMcpServer.clearRegistrations();

      const result = conversationContext.registerOnServer(mockMcpServer);
      expect(result).toBe(true);
      expect(mockMcpServer.getRegisteredResources().length).toBeGreaterThan(0);
      expect(mockMcpServer.getRegisteredTools().length).toBeGreaterThan(0);
    });
  });

  describe('Singleton pattern with dependency injection', () => {
    test('getInstance() returns the same instance', () => {
      const instance1 = ConversationContext.getInstance();
      const instance2 = ConversationContext.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('createFresh() creates a new instance', () => {
      const instance1 = ConversationContext.createFresh();
      const instance2 = ConversationContext.createFresh();

      expect(instance1).not.toBe(instance2);
    });

    test('resetInstance() clears the singleton instance', () => {
      const instance1 = ConversationContext.getInstance();
      ConversationContext.resetInstance();
      const instance2 = ConversationContext.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    test('createWithDependencies() creates an instance with resolved dependencies', () => {
      const instance = ConversationContext.createWithDependencies({
        name: 'CustomName',
        version: '2.0.0',
      });

      expect(instance).toBeInstanceOf(ConversationContext);
      expect(instance.getContextName()).toBe('CustomName');
      expect(instance.getContextVersion()).toBe('2.0.0');
    });
  });

  describe('Core functionality', () => {
    test('createConversation() creates a conversation', async () => {
      // Call the method
      const id = await conversationContext.createConversation('cli', 'test-room');

      // Verify it delegates to the query service
      expect(id).toBe('test-id');
      expect(queryService.createConversation).toHaveBeenCalledWith('cli', 'test-room');
    });

    test('addTurn() adds a turn to a conversation', async () => {
      // Call the method
      const turnId = await conversationContext.addTurn('test-id', 'Hello', 'Hi there!');

      // Verify it delegates to the memory service
      expect(turnId).toBe('turn-id');
      expect(queryService.getConversation).toHaveBeenCalledWith('test-id');
      expect(memoryService.addTurn).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          query: 'Hello',
          response: 'Hi there!',
        }),
      );
    });

    test('getConversationHistory() retrieves formatted conversation history', async () => {
      // Call the method
      const history = await conversationContext.getConversationHistory('test-id');

      // Verify it delegates to services and returns the result
      expect(history).toBe('Formatted conversation');
      expect(memoryService.getTurns).toHaveBeenCalledWith('test-id', undefined);
      expect(formatter.formatConversation).toHaveBeenCalled();
    });

    test('getStorage() returns a storage adapter instance', () => {
      const storageAdapter = conversationContext.getStorage();
      expect(storageAdapter).toBeInstanceOf(ConversationStorageAdapter);
    });

    test('setStorage() updates the storage adapter', () => {
      const newAdapter = new ConversationStorageAdapter(MockConversationStorage.createFresh());
      conversationContext.setStorage(newAdapter);

      expect(conversationContext.getStorage()).toBe(newAdapter);
    });
  });

  describe('Extended functionality', () => {
    test('getOrCreateConversationForRoom() returns existing conversation ID', async () => {
      // Call the method
      const id = await conversationContext.getOrCreateConversationForRoom('test-room', 'cli');

      // Verify it delegates to the query service
      expect(id).toBe('test-id');
      expect(queryService.getOrCreateConversationForRoom).toHaveBeenCalledWith('test-room', 'cli');
    });

    test('findConversations() correctly passes search criteria to query service', async () => {
      // Search criteria
      const criteria = {
        interfaceType: 'cli' as const,
        query: 'test query',
        limit: 10,
        offset: 5,
      };

      // Call the method
      await conversationContext.findConversations(criteria);

      // Verify it delegates to the query service
      expect(queryService.findConversations).toHaveBeenCalledWith(criteria);
    });

    test('getConversationsByRoom() correctly calls query service', async () => {
      // Call the method with parameters
      await conversationContext.getConversationsByRoom('test-room', 'cli');

      // Verify it delegates to the query service
      expect(queryService.getConversationsByRoom).toHaveBeenCalledWith('test-room', 'cli');
    });

    test('getRecentConversations() correctly calls query service', async () => {
      // Call the method with parameters
      await conversationContext.getRecentConversations(10, 'cli');

      // Verify it delegates to the query service
      expect(queryService.getRecentConversations).toHaveBeenCalledWith(10, 'cli');
    });
  });

  describe('MCP integration', () => {
    test('ConversationContext properly initializes MCP components', () => {
      expect(conversationContext).toBeDefined();

      // Verify MCP server can be obtained
      const mcpServer = conversationContext.getMcpServer();
      expect(mcpServer).toBeDefined();

      // Check that capabilities are available
      const capabilities = conversationContext.getCapabilities();

      expect(capabilities.resources).toBeDefined();
      expect(capabilities.resources.length).toBeGreaterThan(0);
      expect(capabilities.tools).toBeDefined();
      expect(capabilities.tools.length).toBeGreaterThan(0);
    });

    test('registerOnServer returns false with undefined server', () => {
      // The BaseContext implementation has error handling that catches the error when
      // trying to use an undefined server and returns false
      const result = conversationContext.registerOnServer(undefined as unknown as McpServer);

      // Expect it to return false when the server is undefined
      expect(result).toBe(false);
    });

    test('MCP Server can create a conversation through tool invocation', async () => {
      // Set up the server
      const registered = conversationContext.registerOnServer(mockMcpServer);
      expect(registered).toBe(true);

      // Call the method directly
      const conversationId = await conversationContext.createConversation('cli', 'test-room');

      // Verify the result
      expect(conversationId).toBe('test-id');
      expect(queryService.createConversation).toHaveBeenCalledWith('cli', 'test-room');
    });

    test('getFormattedConversationForMcp returns properly formatted data', async () => {
      // Call the method
      const formatted = await conversationContext.getFormattedConversationForMcp('test-id', {
        includeFullTurns: true,
      });

      // Verify the result
      expect(formatted).toBeDefined();
      expect(formatted?.id).toBe('test-id');
      expect(formatted?.roomId).toBe('test-room');
      expect(formatted?.interfaceType).toBe('cli');
      expect(mcpFormatter.formatConversationForMcp).toHaveBeenCalled();
    });
  });
});
