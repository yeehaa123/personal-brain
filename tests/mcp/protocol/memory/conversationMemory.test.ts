/**
 * Tests for the ConversationContext which replaces ConversationMemory
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { nanoid } from 'nanoid';

import { conversationConfig } from '@/config';
import { ConversationContext } from '@/mcp/contexts/conversations/conversationContext';
import { ConversationFormatter } from '@/mcp/contexts/conversations/conversationFormatter';
import type { ConversationStorage } from '@/mcp/contexts/conversations/conversationStorage';
import { InMemoryStorage } from '@/mcp/contexts/conversations/inMemoryStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';
import { mockLogger, restoreLogger } from '@test/utils/loggerUtils';

describe('ConversationContext', () => {
  let context: ConversationContext;
  let mockStorage: ConversationStorage;
  let originalLogger: Record<string, unknown>;

  // Helper to create a mock conversation
  const createMockConversation = (
    id: string = `conv-${nanoid()}`,
    _turns: number = 0, // Using underscore prefix for allowed unused args
    interfaceType: 'cli' | 'matrix' = 'cli',
    roomId: string = conversationConfig.defaultCliRoomId, // Default room ID for CLI
  ): Conversation => {
    const now = new Date();

    return {
      id,
      createdAt: now,
      updatedAt: now,
      interfaceType,
      roomId,
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    };
  };

  beforeEach(() => {
    // Mock logger to reduce test output
    originalLogger = mockLogger(logger);

    // Set up mock storage interface
    mockStorage = {
      createConversation: mock(async (conversation) => {
        return conversation.id;
      }),
      getConversation: mock(async (id: string) => {
        if (id === 'mock-id' || id === 'existing-id') {
          return createMockConversation(id, 3, 'cli'); // 3 turns by default
        }
        return null;
      }),
      getConversationByRoom: mock(async (roomId: string) => {
        if (roomId === 'room-id') {
          return 'room-conv-id';
        }
        return null;
      }),
      updateConversation: mock(async () => true),
      deleteConversation: mock(async (id: string) => {
        return id === 'mock-id' || id === 'existing-id';
      }),
      addTurn: mock(async (_id: string, turn) => {
        return turn.id || `turn-${nanoid()}`;
      }),
      getTurns: mock(async (_id: string, limit = 10) => {
        const mockTurns: ConversationTurn[] = [];
        for (let i = 0; i < Math.min(3, limit); i++) {
          mockTurns.push({
            id: `turn-${i}`,
            timestamp: new Date(),
            query: `Mock query ${i}`,
            response: `Mock response ${i}`,
            userId: i % 2 === 0 ? 'user-1' : 'user-2', // Alternate users
            userName: i % 2 === 0 ? 'User One' : 'User Two',
          });
        }
        return mockTurns;
      }),
      updateTurn: mock(async () => true),
      addSummary: mock(async (_id, summary) => {
        return summary.id || `summary-${nanoid()}`;
      }),
      getSummaries: mock(async () => []),
      findConversations: mock(async (criteria) => {
        const now = new Date();
        const conversations = [
          {
            id: 'conv-1',
            interfaceType: 'cli' as const,
            roomId: conversationConfig.defaultCliRoomId,
            startedAt: now,
            updatedAt: now,
            turnCount: 2,
          },
          {
            id: 'conv-2',
            interfaceType: 'matrix' as const,
            roomId: 'room-1',
            startedAt: now,
            updatedAt: now,
            turnCount: 1,
          },
          {
            id: 'conv-3',
            interfaceType: 'cli' as const,
            roomId: conversationConfig.defaultCliRoomId,
            startedAt: now,
            updatedAt: now,
            turnCount: 3,
          },
        ];

        let filtered = conversations;

        // Filter by interface type if specified
        if (criteria?.interfaceType) {
          filtered = filtered.filter(conv => conv.interfaceType === criteria.interfaceType);
        }

        // Apply limit if specified
        return criteria?.limit ? filtered.slice(0, criteria.limit) : filtered;
      }),
      getRecentConversations: mock(async (limit, interfaceType) => {
        const now = new Date();
        const conversations = [
          {
            id: 'conv-1',
            interfaceType: 'cli' as const,
            roomId: conversationConfig.defaultCliRoomId,
            startedAt: now,
            updatedAt: now,
            turnCount: 2,
          },
          {
            id: 'conv-2',
            interfaceType: 'matrix' as const,
            roomId: 'room-1',
            startedAt: now,
            updatedAt: now,
            turnCount: 1,
          },
          {
            id: 'conv-3',
            interfaceType: 'cli' as const,
            roomId: conversationConfig.defaultCliRoomId,
            startedAt: now,
            updatedAt: now,
            turnCount: 3,
          },
        ];

        // Filter by interface type if specified
        const filtered = interfaceType
          ? conversations.filter(conv => conv.interfaceType === interfaceType)
          : conversations;

        // Apply limit if specified
        return limit ? filtered.slice(0, limit) : filtered;
      }),
      updateMetadata: mock(async () => true),
      getMetadata: mock(async () => ({ topic: 'Test Topic' })),
    };

    // Create ConversationContext with mock storage
    context = ConversationContext.createFresh({
      storage: mockStorage,
      anchorName: 'Host',
      anchorId: 'anchor-id',
      defaultUserName: 'User',
      defaultUserId: 'default-user-id',
    });
  });

  afterEach(() => {
    // Restore logger
    restoreLogger(logger, originalLogger);
  });

  test('should create a new conversation', async () => {
    const roomId = conversationConfig.defaultCliRoomId;
    const id = await context.createConversation('cli', roomId);

    expect(id).toBeDefined();

    expect(mockStorage.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      interfaceType: 'cli',
      roomId,
    }));
  });

  test('should get or create conversation for room', async () => {
    // First test with existing room
    const existingRoomId = 'room-id';
    const id = await context.getOrCreateConversationForRoom(existingRoomId, 'cli');

    expect(id).toBe('room-conv-id');
    expect(mockStorage.getConversationByRoom).toHaveBeenCalledWith(existingRoomId, 'cli');

    // Now test with a new room
    const newRoomId = 'new-room';
    mockStorage.getConversationByRoom = mock(async () => null);
    const newId = await context.getOrCreateConversationForRoom(newRoomId, 'cli');

    expect(newId).toBeDefined();
    expect(mockStorage.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      interfaceType: 'cli',
      roomId: newRoomId,
    }));
  });

  test('should add a turn to a conversation', async () => {
    // We need to modify our mock to handle this test better
    // First mock getConversation to return a conversation
    mockStorage.getConversation = mock(async (id) => {
      return createMockConversation(id);
    });

    // Create a conversation - this uses our mock createConversation
    const conversationId = 'test-conversation-id';

    // Add a turn with specific user information
    const turnId = await context.addTurn(
      conversationId,
      'Test query',
      'Test response',
      {
        userId: 'specific-user',
        userName: 'Specific User',
        metadata: { source: 'user' },
      },
    );

    expect(turnId).toBeDefined();
    expect(mockStorage.addTurn).toHaveBeenCalledWith(conversationId, expect.objectContaining({
      query: 'Test query',
      response: 'Test response',
      userId: 'specific-user',
      userName: 'Specific User',
      metadata: expect.objectContaining({
        source: 'user',
        isActive: true,
      }),
    }));
  });

  test('should add a turn with default user values', async () => {
    // Use the same approach as the previous test
    // First mock getConversation to return a conversation
    mockStorage.getConversation = mock(async (id) => {
      return createMockConversation(id);
    });

    // Use a fixed conversation ID
    const conversationId = 'test-conversation-id';

    // Add a turn without specifying user info
    const turnId = await context.addTurn(conversationId, 'Default query', 'Default response');

    expect(turnId).toBeDefined();
    expect(mockStorage.addTurn).toHaveBeenCalledWith(conversationId, expect.objectContaining({
      query: 'Default query',
      response: 'Default response',
      userId: 'default-user-id',
      userName: 'User',
    }));
  });

  test('should throw when adding a turn with non-existent conversation', async () => {
    // Try with a non-existent conversation
    mockStorage.getConversation = mock(async () => null);

    await expect(context.addTurn('non-existent-id', 'Test query', 'Test response')).rejects.toThrow();
  });

  test('should get conversation turns', async () => {
    // Create a conversation first
    const conversationId = await context.createConversation('cli', conversationConfig.defaultCliRoomId);

    // Get turns
    const turns = await context.getTurns(conversationId);

    expect(turns).toHaveLength(3); // Default mock returns 3 turns
    expect(mockStorage.getTurns).toHaveBeenCalledWith(conversationId, undefined, undefined);
  });

  test('should limit turns when retrieving', async () => {
    // Create a conversation first
    const conversationId = await context.createConversation('cli', conversationConfig.defaultCliRoomId);

    // Get turns with a limit
    await context.getTurns(conversationId, 2);

    expect(mockStorage.getTurns).toHaveBeenCalledWith(conversationId, 2, undefined);
  });

  test('should format conversation history for prompts', async () => {
    // Change our test to use a simpler approach - just check the formatter handles
    // different user types with a direct call to the formatter method
    const formatter = new ConversationFormatter();

    const turns = [
      {
        id: 'turn-1',
        timestamp: new Date(),
        query: 'Anchor query',
        response: 'Anchor response',
        userId: 'anchor-id', // This matches our context's anchorId
        userName: 'Anchor User',
      },
      {
        id: 'turn-2',
        timestamp: new Date(),
        query: 'Regular query',
        response: 'Regular response',
        userId: 'regular-id',
        userName: 'Regular User',
      },
    ];

    // Format turns directly
    const formattingOptions = {
      format: 'text' as const,
      anchorName: 'Host',
      anchorId: 'anchor-id',
      highlightAnchor: true,
    };

    const formatted = formatter.formatTurns(turns, formattingOptions);

    // Format is different in the new implementation
    expect(formatted).toContain('Anchor User');
    expect(formatted).toContain('Anchor query');
    expect(formatted).toContain('Regular User');
    expect(formatted).toContain('Regular query');
  });

  test('should get recent conversations', async () => {
    const result = await context.getRecentConversations(2, 'cli');

    expect(result).toBeDefined();
    expect(mockStorage.getRecentConversations).toHaveBeenCalledWith(2, 'cli');
  });

  test('should find conversations by criteria', async () => {
    const result = await context.findConversations({
      interfaceType: 'cli',
      limit: 2,
    });

    expect(result).toBeDefined();
    expect(mockStorage.findConversations).toHaveBeenCalledWith({
      interfaceType: 'cli',
      limit: 2,
    });
  });

  test('should update conversation metadata', async () => {
    // Create a conversation first
    const conversationId = await context.createConversation('cli', conversationConfig.defaultCliRoomId);

    // Update metadata
    const success = await context.updateMetadata(conversationId, { topic: 'Test Topic' });

    expect(success).toBe(true);
    expect(mockStorage.updateMetadata).toHaveBeenCalledWith(conversationId, { topic: 'Test Topic' });
  });

  test('should delete conversation', async () => {
    // Mock the deleteConversation to return true
    mockStorage.deleteConversation = mock(async () => true);

    // Use a fixed conversation ID
    const conversationId = 'test-conversation-id';

    // Delete it
    const result = await context.deleteConversation(conversationId);

    expect(result).toBe(true);
    expect(mockStorage.deleteConversation).toHaveBeenCalledWith(conversationId);
  });

  test('should check if a user is the anchor user', () => {
    // Test with the anchor ID
    const isAnchor1 = context.isAnchor('anchor-id');
    expect(isAnchor1).toBe(true);

    // Test with a non-anchor ID
    const isAnchor2 = context.isAnchor('non-anchor-id');
    expect(isAnchor2).toBe(false);
  });

  test('should handle real InMemoryStorage', async () => {
    // Create ConversationContext with a real isolated InMemoryStorage instance
    const isolatedStorage = InMemoryStorage.createFresh();
    const realContext = ConversationContext.createFresh({
      storage: isolatedStorage,
    });

    // Test full lifecycle
    const id = await realContext.createConversation('cli', conversationConfig.defaultCliRoomId);
    expect(id).toBeDefined();

    await realContext.addTurn(id, 'What is quantum computing?', 'Quantum computing uses quantum bits to perform calculations.');
    await realContext.addTurn(id, 'How does that differ from classical computing?', 'Classical computing uses binary bits that are either 0 or 1, while quantum bits can be in superposition.');

    const turns = await realContext.getTurns(id);
    expect(turns.length).toBe(2);

    const formatted = await realContext.formatHistoryForPrompt(id);
    expect(formatted).toContain('User: What is quantum computing?');
    expect(formatted).toContain('Assistant: Quantum computing uses quantum bits to perform calculations.');

    await realContext.updateMetadata(id, { topic: 'Quantum Computing' });

    const deleted = await realContext.deleteConversation(id);
    expect(deleted).toBe(true);
  });
});
