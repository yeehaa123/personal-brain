/**
 * Mock InMemoryStorage
 * 
 * This file provides a mock implementation of InMemoryStorage for testing.
 * It allows tests to use a fully controlled mock instead of the real implementation.
 * 
 * Usage:
 * ```typescript
 * // In your test file
 * import { mockInMemoryStorage } from '@test/mcp/contexts/conversations/__mocks__';
 * 
 * // Mock the module before importing the components that use it
 * mock.module('@/mcp/contexts/conversations/storage/inMemoryStorage', () => ({
 *   InMemoryStorage: mockInMemoryStorage
 * }));
 * ```
 */

import { nanoid } from 'nanoid';
import type { 
  ConversationInfo,
  ConversationStorage, 
  ConversationSummary, 
  NewConversation, 
  SearchCriteria 
} from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

/**
 * Implementation of a mocked InMemoryStorage for testing
 */
export class MockInMemoryStorage implements ConversationStorage {
  private static instance: MockInMemoryStorage | null = null;
  
  // Mock storage containers
  private conversations: Map<string, Conversation> = new Map();
  private turns: Map<string, ConversationTurn[]> = new Map();
  private summaries: Map<string, ConversationSummary[]> = new Map();
  private roomIndex: Map<string, string> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize empty storage
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MockInMemoryStorage {
    if (!MockInMemoryStorage.instance) {
      MockInMemoryStorage.instance = new MockInMemoryStorage();
    }
    return MockInMemoryStorage.instance;
  }

  /**
   * Create a fresh instance for isolated testing
   */
  public static createFresh(): MockInMemoryStorage {
    const instance = new MockInMemoryStorage();
    instance.conversations = new Map();
    instance.turns = new Map();
    instance.summaries = new Map();
    instance.roomIndex = new Map();
    
    // Reset singleton for test isolation
    MockInMemoryStorage.instance = null;
    
    return instance;
  }

  /**
   * Create a conversation
   */
  async createConversation(conversation: NewConversation): Promise<string> {
    const id = conversation.id || `conv-${nanoid()}`;
    
    const newConversation: Conversation = {
      id,
      interfaceType: conversation.interfaceType,
      roomId: conversation.roomId,
      createdAt: conversation.startedAt || new Date(),
      updatedAt: conversation.updatedAt || new Date(),
      metadata: conversation.metadata || {},
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    };
    
    this.conversations.set(id, newConversation);
    this.turns.set(id, []);
    this.summaries.set(id, []);
    
    const roomKey = this.getRoomKey(conversation.roomId, conversation.interfaceType);
    this.roomIndex.set(roomKey, id);
    
    return id;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }
    return { ...conversation };
  }

  /**
   * Find conversation by room ID
   */
  async getConversationByRoom(
    roomId: string, 
    interfaceType?: 'cli' | 'matrix'
  ): Promise<string | null> {
    if (!interfaceType) {
      const matrixKey = this.getRoomKey(roomId, 'matrix');
      const cliKey = this.getRoomKey(roomId, 'cli');
      
      const matrixId = this.roomIndex.get(matrixKey);
      if (matrixId) {
        return matrixId;
      }
      
      return this.roomIndex.get(cliKey) || null;
    }
    
    const roomKey = this.getRoomKey(roomId, interfaceType);
    return this.roomIndex.get(roomKey) || null;
  }

  /**
   * Update a conversation
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return false;
    }
    
    const updatedConversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.conversations.set(conversationId, updatedConversation);
    
    if (updates.roomId && updates.roomId !== conversation.roomId) {
      const oldRoomKey = this.getRoomKey(conversation.roomId, conversation.interfaceType);
      this.roomIndex.delete(oldRoomKey);
      
      const newRoomKey = this.getRoomKey(
        updates.roomId, 
        updates.interfaceType || conversation.interfaceType
      );
      this.roomIndex.set(newRoomKey, conversationId);
    }
    
    return true;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return false;
    }
    
    const roomKey = this.getRoomKey(conversation.roomId, conversation.interfaceType);
    this.roomIndex.delete(roomKey);
    
    this.conversations.delete(conversationId);
    this.turns.delete(conversationId);
    this.summaries.delete(conversationId);
    
    return true;
  }

  /**
   * Add a turn to a conversation
   */
  async addTurn(conversationId: string, turn: ConversationTurn): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    const turnId = turn.id || `turn-${nanoid()}`;
    
    const newTurn: ConversationTurn = {
      ...turn,
      id: turnId,
      timestamp: turn.timestamp || new Date(),
      metadata: turn.metadata || {},
    };
    
    const conversationTurns = this.turns.get(conversationId) || [];
    conversationTurns.push(newTurn);
    this.turns.set(conversationId, conversationTurns);
    
    this.conversations.set(conversationId, {
      ...conversation,
      updatedAt: new Date(),
    });
    
    return turnId;
  }

  /**
   * Get turns for a conversation
   */
  async getTurns(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<ConversationTurn[]> {
    const turns = this.turns.get(conversationId) || [];
    
    const sortedTurns = [...turns].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });
    
    if (offset !== undefined || limit !== undefined) {
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      return sortedTurns.slice(start, end);
    }
    
    return sortedTurns;
  }

  /**
   * Update a turn
   */
  async updateTurn(turnId: string, updates: Partial<ConversationTurn>): Promise<boolean> {
    for (const [conversationId, turns] of this.turns.entries()) {
      const turnIndex = turns.findIndex(t => t.id === turnId);
      
      if (turnIndex !== -1) {
        const updatedTurn = {
          ...turns[turnIndex],
          ...updates,
        };
        
        turns[turnIndex] = updatedTurn;
        this.turns.set(conversationId, turns);
        
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
          this.conversations.set(conversationId, {
            ...conversation,
            updatedAt: new Date(),
          });
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Add a summary to a conversation
   */
  async addSummary(conversationId: string, summary: ConversationSummary): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    const summaryId = summary.id || `summ-${nanoid()}`;
    
    const newSummary: ConversationSummary = {
      ...summary,
      id: summaryId,
      conversationId,
      createdAt: summary.createdAt || new Date(),
      metadata: summary.metadata || {},
    };
    
    const conversationSummaries = this.summaries.get(conversationId) || [];
    conversationSummaries.push(newSummary);
    this.summaries.set(conversationId, conversationSummaries);
    
    return summaryId;
  }

  /**
   * Get summaries for a conversation
   */
  async getSummaries(conversationId: string): Promise<ConversationSummary[]> {
    return this.summaries.get(conversationId) || [];
  }

  /**
   * Find conversations matching search criteria
   */
  async findConversations(_criteria: SearchCriteria): Promise<ConversationInfo[]> {
    // For the mock, always return all conversations to simplify testing
    // This helps fix test issues because actual filtering logic is too complex for mocks
    const results: ConversationInfo[] = [];
    
    for (const conversation of this.conversations.values()) {
      const turnCount = (this.turns.get(conversation.id) || []).length;
      
      results.push({
        id: conversation.id,
        interfaceType: conversation.interfaceType,
        roomId: conversation.roomId,
        startedAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        turnCount,
        metadata: conversation.metadata,
      });
    }
    
    return results;
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(
    _limit?: number,
    interfaceType?: 'cli' | 'matrix'
  ): Promise<ConversationInfo[]> {
    // For mock, just return all conversations
    const results = await this.findConversations({});
    
    // But still filter by interface type if specified
    if (interfaceType) {
      return results.filter(conv => conv.interfaceType === interfaceType);
    }
    
    return results;
  }

  /**
   * Update metadata for a conversation
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return false;
    }
    
    const updatedMetadata = {
      ...conversation.metadata,
      ...metadata,
    };
    
    this.conversations.set(conversationId, {
      ...conversation,
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });
    
    return true;
  }

  /**
   * Get metadata for a conversation
   */
  async getMetadata(conversationId: string): Promise<Record<string, unknown> | null> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return null;
    }
    
    return { ...conversation.metadata };
  }

  /**
   * Create a room key for indexing
   */
  private getRoomKey(roomId: string, interfaceType: 'cli' | 'matrix'): string {
    return `${interfaceType}:${roomId}`;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.conversations.clear();
    this.turns.clear();
    this.summaries.clear();
    this.roomIndex.clear();
    
    MockInMemoryStorage.instance = null;
  }
}

// Export a reference to the mock class for easier testing
export const mockInMemoryStorage = MockInMemoryStorage;