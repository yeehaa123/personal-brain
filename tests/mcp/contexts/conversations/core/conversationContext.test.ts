/**
 * Tests for the refactored ConversationContext using BaseContext architecture
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import { ConversationContext } from '@/mcp/contexts/conversations/core/conversationContext';
import { BaseContext } from '@/mcp/contexts/core/baseContext';
import logger from '@/utils/logger';
import { mockLogger, restoreLogger } from '@test/utils/loggerUtils';

// Import the mock implementation from our mocks directory
import { MockInMemoryStorage } from '../__mocks__/mockInMemoryStorage';

// Mock InMemoryStorage using our mock implementation
mock.module('@/mcp/contexts/conversations/storage/inMemoryStorage', () => {
  return {
    InMemoryStorage: MockInMemoryStorage,
  };
});

// We'll mock a Claude service for testing
mock.module('@/mcp/model/claude', () => {
  return {
    ClaudeService: {
      getInstance: () => ({
        generateCompletion: () => Promise.resolve({ completion: 'Test summary' }),
      }),
    },
  };
});

describe('ConversationContext (BaseContext implementation)', () => {
  let context: ConversationContext;
  let adapter: ConversationStorageAdapter;
  let storage: MockInMemoryStorage;
  let originalLogger: Record<string, unknown>;

  beforeAll(() => {
    // Silence logger
    originalLogger = mockLogger(logger);
  });

  afterAll(() => {
    // Restore logger
    restoreLogger(logger, originalLogger);
  });

  beforeEach(() => {
    // Create a fresh storage for each test
    storage = MockInMemoryStorage.createFresh();
    adapter = new ConversationStorageAdapter(storage);

    // Create a fresh context with our test adapter
    context = ConversationContext.createFresh({
      storage: adapter,
      anchorName: 'TestHost',
      defaultUserName: 'TestUser',
    });
  });

  afterEach(() => {
    // Clean up singleton
    ConversationContext.resetInstance();
    // Clear storage
    storage.clear();
  });

  describe('BaseContext implementation', () => {
    test('extends BaseContext', () => {
      expect(context).toBeInstanceOf(BaseContext);
    });

    test('implements getContextName() correctly', () => {
      expect(context.getContextName()).toBe('ConversationBrain');

      // Create with custom name
      const namedContext = ConversationContext.createFresh({
        name: 'CustomName',
      });

      expect(namedContext.getContextName()).toBe('CustomName');
    });

    test('implements getContextVersion() correctly', () => {
      expect(context.getContextVersion()).toBe('1.0.0');

      // Create with custom version
      const versionedContext = ConversationContext.createFresh({
        version: '2.0.0',
      });

      expect(versionedContext.getContextVersion()).toBe('2.0.0');
    });

    test('initializes MCP components correctly', () => {
      const resources = context.getResources();
      const tools = context.getTools();

      expect(resources.length).toBeGreaterThan(0);
      expect(tools.length).toBeGreaterThan(0);

      // Check resource paths
      const resourcePaths = resources.map(r => r.path);
      expect(resourcePaths).toContain('list');
      expect(resourcePaths).toContain('search');
      expect(resourcePaths).toContain('get/:id');

      // Check tool names
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create_conversation');
      expect(toolNames).toContain('add_turn');
      expect(toolNames).toContain('get_conversation_history');
    });

    test('registerOnServer() registers on an MCP server', () => {
      // Create a mock MCP server
      const resourceFn = mock(() => { });
      const toolFn = mock(() => { });

      const mockServer = {
        name: 'TestServer',
        version: '1.0',
        resource: resourceFn,
        tool: toolFn,
      } as unknown as McpServer;

      // Register the context
      const result = context.registerOnServer(mockServer);

      expect(result).toBe(true);
      expect(resourceFn).toHaveBeenCalled();
      expect(toolFn).toHaveBeenCalled();
    });
  });

  describe('Singleton pattern', () => {
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
  });

  describe('Core functionality', () => {
    test('createConversation() creates a conversation', async () => {
      spyOn(adapter, 'create');

      await context.createConversation('cli', 'test-room');

      expect(adapter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          interfaceType: 'cli',
          roomId: 'test-room',
        }),
      );
    });

    test('addTurn() adds a turn to a conversation', async () => {
      // Create a conversation
      const id = await context.createConversation('cli', 'test-room');
      spyOn(adapter, 'addTurn');

      await context.addTurn(id, 'Hello', 'Hi there!');

      expect(adapter.addTurn).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          query: 'Hello',
          response: 'Hi there!',
        }),
      );
    });

    test('getConversationHistory() retrieves formatted conversation history', async () => {
      // Create a conversation
      const id = await context.createConversation('cli', 'test-room');

      // Add turns
      await context.addTurn(id, 'Hello', 'Hi there!');
      await context.addTurn(id, 'How are you?', 'I am fine, thanks!');

      // Get history
      const history = await context.getConversationHistory(id);

      expect(history).toContain('Hello');
      expect(history).toContain('Hi there!');
      expect(history).toContain('How are you?');
      expect(history).toContain('I am fine, thanks!');
    });

    test('getStorage() returns the storage adapter', () => {
      const storageAdapter = context.getStorage();
      expect(storageAdapter).toBe(adapter);
    });

    test('setStorage() updates the storage adapter', () => {
      const newAdapter = new ConversationStorageAdapter(MockInMemoryStorage.createFresh());
      context.setStorage(newAdapter);

      expect(context.getStorage()).toBe(newAdapter);
    });
  });

  describe('Extended functionality', () => {
    test('getOrCreateConversationForRoom() returns existing conversation ID', async () => {
      // Create a conversation
      const id = await context.createConversation('cli', 'test-room');

      // Get the conversation again
      const retrievedId = await context.getOrCreateConversationForRoom('test-room', 'cli');

      expect(retrievedId).toBe(id);
    });

    test('getOrCreateConversationForRoom() creates a new conversation if none exists', async () => {
      const id = await context.getOrCreateConversationForRoom('new-room', 'cli');

      expect(id).toBeDefined();

      // Verify it was created
      const conversation = await adapter.read(id);
      expect(conversation?.roomId).toBe('new-room');
    });

    // Skip in full test suite due to isolation issues, works when run individually
    test('findConversations() correctly passes search criteria to adapter', async () => {
      // Create a spy on the storage adapter's findConversations method
      const findSpy = spyOn(adapter, 'findConversations');
      
      // Set up return value for spy
      findSpy.mockImplementation(() => Promise.resolve([]));
      
      // Search criteria
      const criteria = { 
        interfaceType: 'cli' as const, 
        query: 'test query',
        limit: 10,
        offset: 5,
      };
      
      // Call findConversations
      await context.findConversations(criteria);
      
      // Verify the adapter method was called with the correct criteria
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining(criteria),
      );
    });

    // Skip in full test suite due to isolation issues, works when run individually
    test('getConversationsByRoom() correctly calls storageAdapter.findConversations', async () => {
      // Create a spy on the storage adapter's findConversations method
      const findSpy = spyOn(adapter, 'findConversations');
      
      // Set up return value for spy
      findSpy.mockImplementation(() => Promise.resolve([]));
      
      // Unique room ID
      const uniqueRoomId = 'test-room-id';
      
      // Call the method with just roomId
      await context.getConversationsByRoom(uniqueRoomId);
      
      // Verify it was called with the correct parameters
      expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({
        roomId: uniqueRoomId,
      }));
      
      // Reset the spy
      findSpy.mockClear();
      
      // Call the method with roomId and interfaceType
      await context.getConversationsByRoom(uniqueRoomId, 'cli');
      
      // Verify it was called with both parameters
      expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({
        roomId: uniqueRoomId,
        interfaceType: 'cli',
      }));
    });

    // Skip in full test suite due to isolation issues, works when run individually
    test('getRecentConversations() correctly calls storageAdapter.getRecentConversations', async () => {
      // Create a spy on the storage adapter's getRecentConversations method
      const recentSpy = spyOn(adapter, 'getRecentConversations');
      
      // Set up return value for spy
      recentSpy.mockImplementation(() => Promise.resolve([]));
      
      // Call without parameters
      await context.getRecentConversations();
      
      // Verify it was called once with no parameters
      expect(recentSpy).toHaveBeenCalledTimes(1);
      
      // Reset the spy
      recentSpy.mockClear();
      
      // Call with limit
      const limit = 10;
      await context.getRecentConversations(limit);
      
      // Verify it was called with limit
      expect(recentSpy).toHaveBeenCalledWith(limit, undefined);
      
      // Reset the spy
      recentSpy.mockClear();
      
      // Call with limit and interface type
      await context.getRecentConversations(limit, 'cli');
      
      // Verify it was called with both parameters
      expect(recentSpy).toHaveBeenCalledWith(limit, 'cli');
    });
  });
});
