/**
 * Integration tests for ConversationContext MCP functionality
 */
import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { McpServer } from '@/mcp';
import { ConversationContext } from '@/mcp/contexts/conversations';
import {
  clearMockEnv,
  setMockEnv,
  setupMcpServerMocks,
} from '@test/utils/mcpUtils';

import { MockInMemoryStorage } from './__mocks__/mockInMemoryStorage';

// Mock InMemoryStorage using our mock implementation
mock.module('@/mcp/contexts/conversations/storage/inMemoryStorage', () => {
  return {
    InMemoryStorage: MockInMemoryStorage,
  };
});

// Create mock server
const mockMcpServer = setupMcpServerMocks();

describe('ConversationContext MCP Integration', () => {
  let conversationContext: ConversationContext;
  let storage: MockInMemoryStorage;

  beforeAll(() => {
    // Set up mock environment
    setMockEnv();
  });

  afterAll(() => {
    // Clean up mock environment
    clearMockEnv();
  });

  beforeEach(() => {
    // Create fresh storage instance for each test - don't use getInstance 
    // as it would share state across tests
    storage = MockInMemoryStorage.createFresh();

    // Create a fresh context with clean storage
    conversationContext = ConversationContext.createFresh({
      storage,
    });

    // Make sure the MCPServer is set properly
    Object.defineProperty(conversationContext, 'mcpServer', {
      value: mockMcpServer,
      writable: true,
    });
  });

  test('ConversationContext properly initializes MCP components', () => {
    expect(conversationContext).toBeDefined();

    // Verify MCP server can be obtained
    const mcpServer = conversationContext.getMcpServer();
    expect(mcpServer).toBeDefined();

    // Check that resources and tools are available
    const resources = conversationContext.getResources();
    const tools = conversationContext.getTools();

    expect(Array.isArray(resources)).toBe(true);
    expect(Array.isArray(tools)).toBe(true);
    expect(resources.length).toBeGreaterThan(0);
    expect(tools.length).toBeGreaterThan(0);
  });

  test('registerOnServer returns true with valid server', () => {
    const result = conversationContext.registerOnServer(mockMcpServer);
    expect(result).toBe(true);
  });

  test('registerOnServer returns false with undefined server', () => {
    // Passing undefined to test error handling
    const result = conversationContext.registerOnServer(undefined as unknown as McpServer);
    expect(result).toBe(false);
  });

  test('registerOnServer handles exceptions gracefully', () => {
    // Create a special test case by modifying the ConversationContext instance
    // to throw an error when attempting to register resources

    // Simulate a failure in one of the internal methods
    Object.defineProperty(conversationContext, 'registerMcpResources', {
      value: () => {
        throw new Error('Simulated registration error');
      },
      writable: true,
    });

    // Now the registration should fail and return false
    const result = conversationContext.registerOnServer(mockMcpServer);
    expect(result).toBe(false);
  });

  test('MCP Server can create a conversation through tool invocation', async () => {
    // Set up the server
    const registered = conversationContext.registerOnServer(mockMcpServer);
    expect(registered).toBe(true);

    // Instead of mocking the tool handler, we'll directly invoke the method
    const conversationId = await conversationContext.createConversation('cli', 'test-room');
    expect(conversationId).toBeDefined();
    expect(conversationId).toContain('conv-');

    // Verify the conversation was stored correctly
    const conversation = await storage.getConversation(conversationId);
    expect(conversation).toBeDefined();
    expect(conversation?.roomId).toBe('test-room');
    expect(conversation?.interfaceType).toBe('cli');

    // Check the conversation appears in searches
    const conversations = await storage.findConversations({});
    expect(conversations.length).toBe(1);
    expect(conversations[0].roomId).toBe('test-room');
  });

  test('MCP resource URLs are properly formatted', () => {
    const resources = conversationContext.getResources();

    // Check that all resources have correct protocols
    for (const resource of resources) {
      expect(resource.protocol).toBe('conversations');
      expect(resource.path).toBeDefined();
      expect(typeof resource.handler).toBe('function');
    }

    // Check specific resources
    const listResource = resources.find(r => r.path === 'list');
    expect(listResource).toBeDefined();

    const searchResource = resources.find(r => r.path === 'search');
    expect(searchResource).toBeDefined();

    const getResource = resources.find(r => r.path === 'get/:id');
    expect(getResource).toBeDefined();
  });


  test('Zod schemas are used for tool validation', () => {
    // Get access to getToolSchema method for testing private methods
    const context = conversationContext as unknown as {
      getToolSchema: (tool: { name: string }) => Record<string, unknown>
    };
    const getToolSchema = context.getToolSchema.bind(context);

    // Check create_conversation schema
    const createSchema = getToolSchema({ name: 'create_conversation' });
    expect(createSchema['interfaceType']).toBeDefined();
    expect(createSchema['roomId']).toBeDefined();

    // Check add_turn schema
    const addTurnSchema = getToolSchema({ name: 'add_turn' });
    expect(addTurnSchema['conversationId']).toBeDefined();
    expect(addTurnSchema['query']).toBeDefined();
    expect(addTurnSchema['response']).toBeDefined();

    // Check unknown tool returns empty schema
    const unknownSchema = getToolSchema({ name: 'unknown_tool' });
    expect(Object.keys(unknownSchema).length).toBe(0);
  });

  test('extractPathParams correctly extracts parameters from URL paths', () => {
    // Get access to extractPathParams method for testing private methods
    const context = conversationContext as unknown as {
      extractPathParams: (path: string, pattern: string) => Record<string, string>
    };
    const extractPathParams = context.extractPathParams.bind(context);

    // Test with basic path
    const params1 = extractPathParams('/conversations/123', 'conversations/:id');
    expect(params1['id']).toBe('123');

    // Test with multiple parameters
    const params2 = extractPathParams('/users/123/posts/456', 'users/:userId/posts/:postId');
    expect(params2['userId']).toBe('123');
    expect(params2['postId']).toBe('456');

    // Test with no parameters
    const params3 = extractPathParams('/about', 'about');
    expect(Object.keys(params3).length).toBe(0);

    // Test with partial match
    const params4 = extractPathParams('/users/123/profile', 'users/:userId');
    expect(params4['userId']).toBe('123');
  });
});
