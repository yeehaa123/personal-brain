import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { nanoid } from 'nanoid';

import { ConversationMemory } from '@/mcp/protocol/memory/conversationMemory';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { ConversationMemoryStorage } from '@/mcp/protocol/schemas/conversationMemoryStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

describe('ConversationMemory', () => {
  let memory: ConversationMemory;
  let mockStorage: ConversationMemoryStorage;

  // Helper to create a mock conversation
  const createMockConversation = (
    id: string = `conv-${nanoid()}`, 
    turns: number = 0,
    interfaceType: 'cli' | 'matrix' = 'cli',
    roomId?: string,
  ): Conversation => {
    const now = new Date();
    const mockTurns: ConversationTurn[] = [];
    
    for (let i = 0; i < turns; i++) {
      mockTurns.push({
        id: `turn-${i}`,
        timestamp: new Date(now.getTime() - (turns - i) * 1000), // Order by time
        query: `Mock query ${i}`,
        response: `Mock response ${i}`,
        userId: i % 2 === 0 ? 'user-1' : 'user-2', // Alternate users
        userName: i % 2 === 0 ? 'User One' : 'User Two',
      });
    }
    
    return {
      id,
      createdAt: now,
      updatedAt: now,
      activeTurns: mockTurns,
      summaries: [],
      archivedTurns: [],
      interfaceType,
      roomId,
    };
  };

  beforeEach(() => {
    // Set up mock storage interface
    mockStorage = {
      createConversation: mock(async (options) => {
        return createMockConversation('mock-id', 0, options.interfaceType, options.roomId);
      }),
      getConversation: mock(async (id: string) => {
        if (id === 'mock-id' || id === 'existing-id') {
          return createMockConversation(id, 3, 'cli'); // 3 turns by default
        }
        return null;
      }),
      getConversationByRoomId: mock(async (roomId: string) => {
        if (roomId === 'room-id') {
          return createMockConversation('room-conv-id', 2, 'matrix', roomId);
        }
        return null;
      }),
      addTurn: mock(async (conversationId: string, turn) => {
        const conversation = await mockStorage.getConversation(conversationId);
        if (!conversation) {
          throw new Error(`Conversation with ID ${conversationId} not found`);
        }
        
        const newTurn = {
          ...turn,
          id: `turn-${nanoid()}`,
        };
        
        return {
          ...conversation,
          updatedAt: new Date(),
          activeTurns: [...conversation.activeTurns, newTurn],
        };
      }),
      addSummary: mock(async (conversationId: string, summary) => {
        const conversation = await mockStorage.getConversation(conversationId);
        if (!conversation) {
          throw new Error(`Conversation with ID ${conversationId} not found`);
        }
        
        return {
          ...conversation,
          updatedAt: new Date(),
          summaries: [...conversation.summaries, summary],
        };
      }),
      moveTurnsToArchive: mock(async (conversationId: string, _turnIndices) => {
        const conversation = await mockStorage.getConversation(conversationId);
        if (!conversation) {
          throw new Error(`Conversation with ID ${conversationId} not found`);
        }
        
        return {
          ...conversation,
          updatedAt: new Date(),
        };
      }),
      getRecentConversations: mock(async (options) => {
        const conversations = [
          createMockConversation('conv-1', 2, 'cli'),
          createMockConversation('conv-2', 1, 'matrix', 'room-1'),
          createMockConversation('conv-3', 3, 'cli'),
        ];
        
        let filtered = conversations;
        
        // Filter by interface type if specified
        if (options?.interfaceType) {
          filtered = filtered.filter(conv => conv.interfaceType === options.interfaceType);
        }
        
        // Apply limit if specified
        return options?.limit ? filtered.slice(0, options.limit) : filtered;
      }),
      deleteConversation: mock(async (id: string) => {
        return id === 'mock-id' || id === 'existing-id';
      }),
      updateMetadata: mock(async (id: string, metadata) => {
        const conversation = await mockStorage.getConversation(id);
        if (!conversation) {
          throw new Error(`Conversation with ID ${id} not found`);
        }
        
        return {
          ...conversation,
          updatedAt: new Date(),
          metadata,
        };
      }),
    };
    
    // Create ConversationMemory with mock storage
    memory = new ConversationMemory({
      interfaceType: 'cli',
      storage: mockStorage,
    });
  });

  test('should use provided storage and options', () => {
    const customOptions = {
      maxTurns: 5,
      maxTokens: 1000,
      includeSystemMessages: true,
    };
    
    const customMemory = new ConversationMemory({
      interfaceType: 'cli',
      storage: mockStorage,
      options: customOptions,
    });
    
    // Can't directly test private fields, but we can test behavior
    expect(customMemory).toBeInstanceOf(ConversationMemory);
  });

  test('should use InMemoryStorage singleton by default in production', () => {
    // Save the original getInstance method
    const originalGetInstance = InMemoryStorage.getInstance;
    
    // Mock getInstance to track if it was called
    let getInstanceCalled = false;
    InMemoryStorage.getInstance = () => {
      getInstanceCalled = true;
      return originalGetInstance();
    };
    
    try {
      // Create memory without providing storage
      const defaultMemory = new ConversationMemory({
        interfaceType: 'cli',
      });
      
      // Verify behavior
      expect(defaultMemory).toBeInstanceOf(ConversationMemory);
      expect(getInstanceCalled).toBe(true);
    } finally {
      // Restore original method
      InMemoryStorage.getInstance = originalGetInstance;
    }
  });

  test('should start a new conversation', async () => {
    const id = await memory.startConversation();
    
    expect(id).toBe('mock-id');
    expect(memory.currentConversation).toBe('mock-id');
    expect(mockStorage.createConversation).toHaveBeenCalledWith({
      interfaceType: 'cli',
      roomId: undefined,
    });
  });
  
  test('should start a new conversation with room ID', async () => {
    const roomId = 'test-room';
    const id = await memory.startConversation(roomId);
    
    expect(id).toBe('mock-id');
    expect(memory.currentConversation).toBe('mock-id');
    expect(mockStorage.createConversation).toHaveBeenCalledWith({
      interfaceType: 'cli',
      roomId,
    });
  });
  
  test('should get or create conversation for room', async () => {
    // First test with existing room
    const existingRoomId = 'room-id';
    const id = await memory.getOrCreateConversationForRoom(existingRoomId);
    
    expect(id).toBe('room-conv-id');
    expect(memory.currentConversation).toBe('room-conv-id');
    expect(mockStorage.getConversationByRoomId).toHaveBeenCalledWith(existingRoomId);
    
    // Now test with a new room
    const newRoomId = 'new-room';
    mockStorage.getConversationByRoomId = mock(async () => null);
    await memory.getOrCreateConversationForRoom(newRoomId);
    
    expect(mockStorage.createConversation).toHaveBeenCalledWith({
      interfaceType: 'cli',
      roomId: newRoomId,
    });
  });

  test('should switch to an existing conversation', async () => {
    // Switch to an existing conversation
    await memory.switchConversation('existing-id');
    
    expect(memory.currentConversation).toBe('existing-id');
    expect(mockStorage.getConversation).toHaveBeenCalledWith('existing-id');
  });

  test('should throw when switching to a non-existent conversation', async () => {
    await expect(memory.switchConversation('non-existent-id')).rejects.toThrow();
  });

  test('should add a turn to the current conversation with user attribution', async () => {
    // Start a conversation first
    await memory.startConversation();
    
    // Add a turn with specific user information
    await memory.addTurn('Test query', 'Test response', {
      userId: 'specific-user',
      userName: 'Specific User',
      metadata: { source: 'user' },
    });
    
    expect(mockStorage.addTurn).toHaveBeenCalledWith('mock-id', expect.objectContaining({
      query: 'Test query',
      response: 'Test response',
      userId: 'specific-user',
      userName: 'Specific User',
      metadata: { source: 'user' },
    }));
  });
  
  test('should add a turn with default user values', async () => {
    // Start a conversation first
    await memory.startConversation();
    
    // Add a turn without specifying user info
    await memory.addTurn('Default query', 'Default response');
    
    expect(mockStorage.addTurn).toHaveBeenCalledWith('mock-id', expect.objectContaining({
      query: 'Default query',
      response: 'Default response',
      userId: expect.any(String),
      userName: expect.any(String),
    }));
    // isAnchor is no longer part of the turn, it's computed dynamically
  });

  test('should throw when adding a turn with no active conversation', async () => {
    // Don't start a conversation
    await expect(memory.addTurn('Test query', 'Test response')).rejects.toThrow();
  });

  test('should get conversation history', async () => {
    // Start a conversation first
    await memory.startConversation();
    
    // Get history
    const history = await memory.getHistory();
    
    expect(history).toHaveLength(3); // Default mock conversation has 3 turns
  });

  test('should limit history by maxTurns', async () => {
    // Start a conversation first
    await memory.startConversation();
    
    // Get history with custom limit
    const history = await memory.getHistory(2);
    
    expect(history).toHaveLength(2); // Limited to 2 turns
  });

  test('should throw when getting history with no active conversation', async () => {
    // Don't start a conversation
    await expect(memory.getHistory()).rejects.toThrow();
  });

  test('should format history for prompt with user attribution', async () => {
    // Create our own custom mock storage for this test to ensure user IDs
    const customMockStorage: ConversationMemoryStorage = {
      createConversation: mock(async (options) => ({ 
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        interfaceType: options.interfaceType,
        roomId: options.roomId,
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      })),
      getConversation: mock(async (id) => ({
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        interfaceType: 'cli' as const,
        activeTurns: [
          {
            id: 'turn-1',
            timestamp: new Date(),
            query: 'Anchor query',
            response: 'Anchor response',
            userId: 'anchor-id',
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
        ],
        summaries: [],
        archivedTurns: [],
      })),
      getConversationByRoomId: mock(async (roomId) => roomId === 'test-room' ? {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        interfaceType: 'matrix' as const,
        roomId,
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      } : null),
      addTurn: mock(async (conversationId, turn) => ({ 
        id: conversationId, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        interfaceType: 'cli' as const, 
        activeTurns: [{...turn, id: 'new-turn-id'}],
        summaries: [],
        archivedTurns: [],
      })),
      addSummary: mock(async () => ({ id: 'test', createdAt: new Date(), updatedAt: new Date(), activeTurns: [], summaries: [], archivedTurns: [], interfaceType: 'cli' as const })),
      moveTurnsToArchive: mock(async () => ({ id: 'test', createdAt: new Date(), updatedAt: new Date(), activeTurns: [], summaries: [], archivedTurns: [], interfaceType: 'cli' as const })),
      getRecentConversations: mock(async () => []),
      deleteConversation: mock(async () => true),
      updateMetadata: mock(async (id, metadata) => ({ 
        id, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        interfaceType: 'cli' as const, 
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
        metadata,
      })),
    };
    
    // First, set up memory with our anchor ID
    const formatMemory = new ConversationMemory({
      interfaceType: 'cli',
      storage: customMockStorage,
      options: {
        anchorId: 'anchor-id',
        anchorName: 'Anchor',
      },
    });
    
    // Start a conversation
    await formatMemory.startConversation();
    
    const formatted = await formatMemory.formatHistoryForPrompt();
    
    // Should format each turn with proper user attribution
    expect(formatted).toContain('Assistant: Anchor response');
    expect(formatted).toContain('Assistant: Regular response');
    
    // Should format anchor users with the "Anchor" prefix
    expect(formatted).toContain('Anchor (Anchor User): Anchor query');
    
    // Should format regular users with just their name
    expect(formatted).toContain('Regular User: Regular query');
    
    // Turns should be separated by double newlines
    expect(formatted).toContain('\n\n');
    
    // Should end with a double newline
    expect(formatted.endsWith('\n\n')).toBe(true);
  });

  test('should return empty string when formatting history with no turns', async () => {
    // Override mockStorage to return empty turns
    mockStorage.getConversation = mock(async () => createMockConversation('empty-id', 0));
    
    // Start a conversation
    await memory.startConversation();
    
    // Format history
    const formatted = await memory.formatHistoryForPrompt();
    
    expect(formatted).toBe('');
  });

  test('should get recent conversations with interface filtering', async () => {
    // Override mockStorage.getRecentConversations to return expected results
    mockStorage.getRecentConversations = mock(async () => [
      createMockConversation('conv-1', 1, 'cli'),
      createMockConversation('conv-2', 1, 'cli'),
    ]);
    
    const result = await memory.getRecentConversations();
    
    expect(result).toHaveLength(2);
    expect(mockStorage.getRecentConversations).toHaveBeenCalledWith({ 
      interfaceType: 'cli',
    });
  });

  test('should get limited recent conversations', async () => {
    const conversations = await memory.getRecentConversations(2);
    
    expect(conversations).toHaveLength(2);
    expect(mockStorage.getRecentConversations).toHaveBeenCalledWith({ 
      limit: 2,
      interfaceType: 'cli',
    });
  });
  
  test('should get conversations with specific interface type', async () => {
    await memory.getRecentConversations(undefined, 'matrix');
    
    expect(mockStorage.getRecentConversations).toHaveBeenCalledWith({ 
      interfaceType: 'matrix',
    });
  });

  test('should update metadata for current conversation', async () => {
    // Start a conversation first
    await memory.startConversation();
    
    // Update metadata
    await memory.updateMetadata({ topic: 'Test Topic' });
    
    expect(mockStorage.updateMetadata).toHaveBeenCalledWith('mock-id', { topic: 'Test Topic' });
  });

  test('should throw when updating metadata with no active conversation', async () => {
    // Don't start a conversation
    await expect(memory.updateMetadata({ topic: 'Test Topic' })).rejects.toThrow();
  });

  test('should end current conversation', () => {
    // Start a conversation first
    memory.startConversation();
    
    // End it
    memory.endCurrentConversation();
    
    expect(memory.currentConversation).toBeNull();
  });

  test('should delete current conversation', async () => {
    // Start a conversation first
    await memory.startConversation();
    
    // Delete it
    const result = await memory.deleteConversation();
    
    expect(result).toBe(true);
    expect(mockStorage.deleteConversation).toHaveBeenCalledWith('mock-id');
    expect(memory.currentConversation).toBeNull();
  });

  test('should delete specified conversation', async () => {
    // Delete a specific conversation
    const result = await memory.deleteConversation('existing-id');
    
    expect(result).toBe(true);
    expect(mockStorage.deleteConversation).toHaveBeenCalledWith('existing-id');
  });

  test('should throw when deleting with no conversation ID', async () => {
    // Don't start a conversation
    await expect(memory.deleteConversation()).rejects.toThrow();
  });

  test('should correctly identify anchor users dynamically', async () => {
    // Create storage and mock specifically for this test
    const anchorMockStorage: ConversationMemoryStorage = {
      createConversation: mock(async (options) => ({ 
        id: 'anchor-test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        interfaceType: options.interfaceType,
        roomId: options.roomId,
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      })),
      getConversation: mock(async (id) => ({
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        interfaceType: 'cli' as const,
        activeTurns: [
          {
            id: 'turn-1',
            timestamp: new Date(),
            query: 'Anchor query',
            response: 'Anchor response',
            userId: 'anchor-user-id',
            userName: 'Anchor User',
          },
          {
            id: 'turn-2',
            timestamp: new Date(),
            query: 'Regular query',
            response: 'Regular response',
            userId: 'regular-user-id',
            userName: 'Regular User',
          },
        ],
        summaries: [],
        archivedTurns: [],
      })),
      getConversationByRoomId: mock(async (roomId) => roomId === 'test-room' ? {
        id: 'anchor-test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        interfaceType: 'matrix' as const,
        roomId,
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      } : null),
      addTurn: mock(async () => ({ id: 'test', createdAt: new Date(), updatedAt: new Date(), activeTurns: [], summaries: [], archivedTurns: [], interfaceType: 'cli' as const })),
      addSummary: mock(async () => ({ id: 'test', createdAt: new Date(), updatedAt: new Date(), activeTurns: [], summaries: [], archivedTurns: [], interfaceType: 'cli' as const })),
      moveTurnsToArchive: mock(async () => ({ id: 'test', createdAt: new Date(), updatedAt: new Date(), activeTurns: [], summaries: [], archivedTurns: [], interfaceType: 'cli' as const })),
      getRecentConversations: mock(async () => []),
      deleteConversation: mock(async () => true),
      updateMetadata: mock(async (id, metadata) => ({ 
        id, 
        createdAt: new Date(), 
        updatedAt: new Date(), 
        interfaceType: 'cli' as const, 
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
        metadata,
      })),
    };
    
    // Reset the memory with specific options for this test
    const options = {
      anchorId: 'anchor-user-id',
      anchorName: 'TestAnchor',
    };
    
    // Create a memory object with our custom options and storage
    const anchorTestMemory = new ConversationMemory({
      interfaceType: 'cli',
      storage: anchorMockStorage,
      options,
    });
    
    // Start a conversation to get its history
    await anchorTestMemory.startConversation();
    
    // Simple check for anchor recognition
    expect(anchorTestMemory.isAnchor('anchor-user-id')).toBe(true);
    expect(anchorTestMemory.isAnchor('regular-user-id')).toBe(false);
    
    // Format history and check for proper anchor formatting
    const formatted = await anchorTestMemory.formatHistoryForPrompt();
    
    // Anchor user should be formatted with special prefix
    expect(formatted).toContain('TestAnchor (Anchor User): Anchor query');
    // Regular user should just have their name
    expect(formatted).toContain('Regular User: Regular query');
  });

  test('should handle real InMemoryStorage', async () => {
    // Create ConversationMemory with a completely isolated InMemoryStorage instance
    // This ensures no state is shared with other tests, even in parallel execution
    const isolatedStorage = InMemoryStorage.createFresh();
    const realMemory = new ConversationMemory({
      interfaceType: 'cli',
      storage: isolatedStorage,
    });
    
    // Test full lifecycle
    const id = await realMemory.startConversation();
    expect(id).toBeDefined();
    
    await realMemory.addTurn('What is quantum computing?', 'Quantum computing uses quantum bits to perform calculations.');
    await realMemory.addTurn('How does that differ from classical computing?', 'Classical computing uses binary bits that are either 0 or 1, while quantum bits can be in superposition.');
    
    const history = await realMemory.getHistory();
    expect(history).toHaveLength(2);
    
    const formatted = await realMemory.formatHistoryForPrompt();
    expect(formatted).toContain('User: What is quantum computing?');
    expect(formatted).toContain('Assistant: Quantum computing uses quantum bits to perform calculations.');
    
    await realMemory.updateMetadata({ topic: 'Quantum Computing' });
    
    const recentConversations = await realMemory.getRecentConversations();
    expect(recentConversations).toHaveLength(1);
    expect(recentConversations[0].id).toBe(id);
    expect(recentConversations[0].metadata).toEqual({ topic: 'Quantum Computing' });
    
    const deleted = await realMemory.deleteConversation();
    expect(deleted).toBe(true);
    expect(realMemory.currentConversation).toBeNull();
  });
});