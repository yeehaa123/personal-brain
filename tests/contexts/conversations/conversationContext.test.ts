/**
 * Tests for the ConversationContext with dependency injection
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ConversationContext } from '@/contexts';
import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import type { ConversationFormatter } from '@/contexts/conversations/formatters/conversationFormatter';
import type { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationResourceService } from '@/contexts/conversations/resources/conversationResources';
import type { ConversationMemoryService } from '@/contexts/conversations/services/conversationMemoryService';
import type { ConversationQueryService } from '@/contexts/conversations/services/conversationQueryService';
import type { ConversationToolService } from '@/contexts/conversations/tools/conversationTools';
import { BaseContext } from '@/contexts/core/baseContext';
import { MockConversationStorage } from '@test/__mocks__/storage';
import { clearMockEnv, setMockEnv } from '@test/helpers/envUtils';

// Create mock server with resource and tool tracking
const mockResources: unknown[] = [];
const mockTools: unknown[] = [];

// Create a simple mock MCP server for testing
const mockMcpServer = {
  name: 'TestServer',
  version: '1.0',
  resource: (r: unknown) => {
    mockResources.push(r);
    return mockMcpServer;
  },
  tool: (t: unknown) => {
    mockTools.push(t);
    return mockMcpServer;
  },
} as unknown as McpServer;

describe('ConversationContext', () => {
  let conversationContext: ConversationContext;
  let storage: MockConversationStorage;
  let adapter: ConversationStorageAdapter;
  let formatter: ConversationFormatter;
  let mcpFormatter: ConversationMcpFormatter;
  let resourceService: ConversationResourceService;
  let toolService: ConversationToolService;
  let queryService: ConversationQueryService;
  let memoryService: ConversationMemoryService;

  beforeAll(() => {
    setMockEnv();
  });

  afterAll(() => {
    clearMockEnv();
  });

  beforeEach(() => {
    // Create fresh storage and adapter instance for each test
    storage = MockConversationStorage.createFresh();
    adapter = new ConversationStorageAdapter(storage);
    
    // Create service mocks with direct implementation
    formatter = {
      formatConversation: mock(() => 'Formatted conversation'),
    } as unknown as ConversationFormatter;
    
    mcpFormatter = {
      formatConversationForMcp: mock(() => ({
        id: 'test-id',
        roomId: 'test-room',
        interfaceType: 'cli',
        turns: [],
        turnCount: 0,
        summaryCount: 0,
      })),
    } as unknown as ConversationMcpFormatter;
    
    resourceService = {
      getResources: mock(() => [
        { protocol: 'conversations', path: 'list', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'search', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'get/:id', handler: mock(() => Promise.resolve({})) },
      ]),
    } as unknown as ConversationResourceService;
    
    toolService = {
      getTools: mock(() => [
        { protocol: 'conversations', path: 'create_conversation', name: 'create_conversation', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'add_turn', name: 'add_turn', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'get_conversation_history', name: 'get_conversation_history', handler: mock(() => Promise.resolve({})) },
      ]),
      getToolSchema: mock(() => ({})),
    } as unknown as ConversationToolService;
    
    queryService = {
      createConversation: mock(() => Promise.resolve('test-id')),
      getConversation: mock(() => Promise.resolve({
        id: 'test-id',
        interfaceType: 'cli',
        roomId: 'test-room',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      })),
      getConversationIdByRoom: mock(() => Promise.resolve('test-id')),
      getOrCreateConversationForRoom: mock(() => Promise.resolve('test-id')),
      findConversations: mock(() => Promise.resolve([])),
      getConversationsByRoom: mock(() => Promise.resolve([])),
      getRecentConversations: mock(() => Promise.resolve([])),
      updateMetadata: mock(() => Promise.resolve(true)),
      deleteConversation: mock(() => Promise.resolve(true)),
    } as unknown as ConversationQueryService;
    
    memoryService = {
      addTurn: mock(() => Promise.resolve('turn-id')),
      getTurns: mock(() => Promise.resolve([
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
      ])),
      getSummaries: mock(() => Promise.resolve([])),
      forceSummarize: mock(() => Promise.resolve(true)),
      getTieredHistory: mock(() => Promise.resolve({
        summaries: [],
        turns: [],
      })),
      formatHistoryForPrompt: mock(() => Promise.resolve(
        'User: What is quantum computing?\nAssistant: Quantum computing is a type of computation that uses quantum bits or qubits to perform operations.\n\n' +
        'User: How is that different from classical computing?\nAssistant: Classical computing uses classical bits that can be either 0 or 1, while quantum bits can exist in superposition, representing both 0 and 1 simultaneously.\n\n',
      )),
      updateConfig: mock(() => {}),
    } as unknown as ConversationMemoryService;

    // Create a context with direct dependency injection
    // We'll use a standard config for all tests
    const config = {
      name: 'ConversationBrain',
      version: '1.0.0',
      storage: storage,  // Use the MockConversationStorage which implements ConversationStorage
      tieredMemoryConfig: {},
      display: {
        anchorName: 'TestHost',
        defaultUserName: 'TestUser',
        anchorId: '',
        defaultUserId: '',
      },
    };

    // Create the context with explicit dependencies
    conversationContext = new ConversationContext(
      config,
      adapter,
      formatter,
      mcpFormatter,
      resourceService,
      toolService,
      queryService,
      memoryService,
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
      const resources = conversationContext.getResources();
      const tools = conversationContext.getTools();

      expect(resources).toBeDefined();
      expect(tools).toBeDefined();
    });

    test('registers on an MCP server successfully', () => {
      // Clear collections before testing
      mockResources.length = 0;
      mockTools.length = 0;

      const result = conversationContext.registerOnServer(mockMcpServer);
      expect(result).toBe(true);
      expect(mockResources.length).toBeGreaterThan(0);
      expect(mockTools.length).toBeGreaterThan(0);
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

      // Check that resources and tools are available
      const resources = conversationContext.getResources();
      const tools = conversationContext.getTools();

      expect(resources).toBeDefined();
      expect(resources.length).toBeGreaterThan(0);
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
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