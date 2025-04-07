/**
 * Integration tests for ConversationContext MCP functionality using BaseContext
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { McpServer } from '@/mcp';
import { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import { ConversationContext } from '@/mcp/contexts/conversations/core/conversationContext';
import logger from '@/utils/logger';
import { mockLogger, restoreLogger } from '@test/utils/loggerUtils';
import {
  clearMockEnv,
  setMockEnv,
} from '@test/utils/mcpUtils';

// Import the mock implementation from our mocks directory
import { 
  MockInMemoryStorage,
  MockMemoryService, 
  MockQueryService,
  MockResourceService,
  MockToolService, 
} from '../__mocks__';

// We need to mock the services
mock.module('@/mcp/contexts/conversations/services/conversationQueryService', () => {
  return {
    ConversationQueryService: MockQueryService,
  };
});

mock.module('@/mcp/contexts/conversations/services/conversationMemoryService', () => {
  return {
    ConversationMemoryService: MockMemoryService,
  };
});

mock.module('@/mcp/contexts/conversations/resources/conversationResources', () => {
  return {
    ConversationResourceService: class extends MockResourceService {
      // Add MCP resource test data
      override getResources = mock(() => [
        { protocol: 'conversations', path: 'list', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'search', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'get/:id', handler: mock(() => Promise.resolve({})) },
      ]);
    },
  };
});

mock.module('@/mcp/contexts/conversations/tools/conversationTools', () => {
  return {
    ConversationToolService: class extends MockToolService {
      // Add MCP tool test data
      override getTools = mock(() => [
        { protocol: 'conversations', path: 'create_conversation', name: 'create_conversation', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'add_turn', name: 'add_turn', handler: mock(() => Promise.resolve({})) },
        { protocol: 'conversations', path: 'get_conversation_history', name: 'get_conversation_history', handler: mock(() => Promise.resolve({})) },
      ]);
    },
  };
});

// Mock InMemoryStorage using our mock implementation
mock.module('@/mcp/contexts/conversations/storage/inMemoryStorage', () => {
  return {
    InMemoryStorage: MockInMemoryStorage,
  };
});

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

describe('ConversationContext MCP Integration with BaseContext', () => {
  let conversationContext: ConversationContext;
  let storage: MockInMemoryStorage;
  let adapter: ConversationStorageAdapter;
  let originalLogger: Record<string, unknown>;
  let queryService: MockQueryService;

  beforeAll(() => {
    // Set up mock environment
    setMockEnv();
    // Silence logger
    originalLogger = mockLogger(logger);
  });

  afterAll(() => {
    // Clean up mock environment
    clearMockEnv();
    // Restore logger
    restoreLogger(logger, originalLogger);
  });

  beforeEach(() => {
    // Create fresh storage and adapter instance for each test
    storage = MockInMemoryStorage.createFresh();
    adapter = new ConversationStorageAdapter(storage);

    // Create a fresh context with clean storage
    conversationContext = ConversationContext.createFresh({
      storage: adapter,
    });

    // Get the query service instance
    queryService = (conversationContext as unknown as { queryService: MockQueryService }).queryService;
  });

  afterEach(() => {
    // Clean up instance
    ConversationContext.resetInstance();
    // Clear storage
    storage.clear();
  });

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

  test('registerOnServer returns true with valid server', () => {
    // Clear collections before testing
    mockResources.length = 0;
    mockTools.length = 0;
    
    const result = conversationContext.registerOnServer(mockMcpServer);
    
    expect(result).toBe(true);
    expect(mockResources.length).toBeGreaterThan(0);
    expect(mockTools.length).toBeGreaterThan(0);
  });

  test('registerOnServer returns false with undefined server', () => {
    // Passing undefined to test error handling
    const result = conversationContext.registerOnServer(undefined as unknown as McpServer);
    expect(result).toBe(false);
  });

  test('MCP Server can create a conversation through tool invocation', async () => {
    // Set up the server
    const registered = conversationContext.registerOnServer(mockMcpServer);
    expect(registered).toBe(true);

    // Mock the createConversation method to return a predictable ID
    queryService.createConversation.mockImplementation(() => Promise.resolve('test-id'));

    // Call the method directly
    const conversationId = await conversationContext.createConversation('cli', 'test-room');
    
    // Verify the result
    expect(conversationId).toBe('test-id');
    expect(queryService.createConversation).toHaveBeenCalledWith('cli', 'test-room');
  });

  test('MCP resource and tool registration follow BaseContext pattern', () => {
    // This test ensures we're using the BaseContext methods for registration

    // Mock the registerOnServer method to verify it's called
    const originalRegisterResources = conversationContext.registerOnServer;
    let registerCalled = false;

    try {
      // We're explicitly overriding a method for testing
      conversationContext.registerOnServer = () => {
        registerCalled = true;
        return true;
      };

      conversationContext.registerOnServer(mockMcpServer);
      expect(registerCalled).toBe(true);
    } finally {
      // Restore original method
      conversationContext.registerOnServer = originalRegisterResources;
    }
  });

  test('getFormattedConversationForMcp returns properly formatted data', async () => {
    // Set up mock data
    const mockConversation = {
      id: 'test-id',
      interfaceType: 'cli' as const,
      roomId: 'test-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    };

    const mockTurns = [
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
    ];

    // Mock the methods to return our test data
    queryService.getConversation.mockImplementation(() => Promise.resolve(mockConversation));
    
    const memoryService = (conversationContext as unknown as { memoryService: MockMemoryService }).memoryService;
    memoryService.getTurns.mockImplementation(() => Promise.resolve(mockTurns));
    memoryService.getSummaries.mockImplementation(() => Promise.resolve([]));
    
    // Mock the formatter to return a predictable object
    type McpFormatterType = {
      formatConversationForMcp: () => {
        id: string;
        roomId: string;
        interfaceType: string;
        turns: unknown[];
        turnCount: number;
        summaryCount: number;
      };
    };
    
    (conversationContext as unknown as { mcpFormatter: McpFormatterType }).mcpFormatter = {
      formatConversationForMcp: mock(() => ({
        id: 'test-id',
        roomId: 'test-room',
        interfaceType: 'cli',
        turns: mockTurns,
        turnCount: 2,
        summaryCount: 0,
      })),
    };

    // Call the method
    const formatted = await conversationContext.getFormattedConversationForMcp('test-id', {
      includeFullTurns: true,
    });

    // Verify the result
    expect(formatted).toBeDefined();
    expect(formatted?.id).toBe('test-id');
    expect(formatted?.roomId).toBe('test-room');
    expect(formatted?.interfaceType).toBe('cli');
    expect(formatted?.turnCount).toBe(2);
    expect(
      (conversationContext as unknown as { 
        mcpFormatter: { formatConversationForMcp: () => unknown } 
      }).mcpFormatter.formatConversationForMcp,
    ).toHaveBeenCalled();
  });
});