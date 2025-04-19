/**
 * Mock ConversationStorage
 * 
 * This file provides a standardized mock implementation of ConversationStorage for testing.
 * It implements the singleton pattern and provides all methods required by the interface.
 */

import { nanoid } from 'nanoid';

import type { 
  ConversationInfo,
  ConversationStorage, 
  ConversationSummary, 
  NewConversation, 
  SearchCriteria,
} from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';

/**
 * Standardized mock implementation of ConversationStorage
 */
export class MockConversationStorage implements ConversationStorage {
  private static instance: MockConversationStorage | null = null;
  
  // Storage containers
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
  public static getInstance(): MockConversationStorage {
    if (!MockConversationStorage.instance) {
      MockConversationStorage.instance = new MockConversationStorage();
    }
    return MockConversationStorage.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockConversationStorage.instance = null;
  }

  /**
   * Create a fresh instance for isolated testing
   */
  public static createFresh(): MockConversationStorage {
    const instance = new MockConversationStorage();
    // Explicitly initialize empty data structures
    instance.conversations = new Map();
    instance.turns = new Map();
    instance.summaries = new Map();
    instance.roomIndex = new Map();
    
    // Reset singleton for test isolation
    MockConversationStorage.instance = null;
    
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
    interfaceType?: 'cli' | 'matrix',
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
    updates: Partial<Conversation>,
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
        updates.interfaceType || conversation.interfaceType,
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
    offset?: number,
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
  async findConversations(criteria: SearchCriteria): Promise<ConversationInfo[]> {
    const results: ConversationInfo[] = [];
    
    for (const conversation of this.conversations.values()) {
      // Apply filters if specified
      if (criteria.interfaceType && conversation.interfaceType !== criteria.interfaceType) {
        continue;
      }
      
      if (criteria.roomId && conversation.roomId !== criteria.roomId) {
        continue;
      }
      
      if (criteria.startDate && new Date(conversation.createdAt) < new Date(criteria.startDate)) {
        continue;
      }
      
      if (criteria.endDate && new Date(conversation.createdAt) > new Date(criteria.endDate)) {
        continue;
      }
      
      // Basic query text search implementation for mock
      if (criteria.query) {
        const turns = this.turns.get(conversation.id) || [];
        const matchingTurn = turns.some(turn => {
          const lowerQuery = criteria.query!.toLowerCase();
          return (
            (turn.query?.toLowerCase() || '').includes(lowerQuery) ||
            (turn.response?.toLowerCase() || '').includes(lowerQuery)
          );
        });
        
        if (!matchingTurn) {
          continue;
        }
      }
      
      // Get turn count
      const turnCount = (this.turns.get(conversation.id) || []).length;
      
      // Add to results
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
    
    // Sort by most recently updated
    results.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    
    // Apply pagination
    if (criteria.offset !== undefined || criteria.limit !== undefined) {
      const start = criteria.offset || 0;
      const end = criteria.limit ? start + criteria.limit : undefined;
      return results.slice(start, end);
    }
    
    return results;
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(
    limit?: number,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    // Get all conversations
    const results = await this.findConversations({
      interfaceType,
      offset: 0,
    });
    
    // Sort by updated time (newest first)
    results.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    
    // Apply limit if provided
    if (limit !== undefined) {
      return results.slice(0, limit);
    }
    
    return results;
  }

  /**
   * Update metadata for a conversation
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
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
    
    MockConversationStorage.instance = null;
  }
}

// Export for easier testing
export const mockConversationStorage = MockConversationStorage;