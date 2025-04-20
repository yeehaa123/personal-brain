/**
 * MockConversationStorageAdapter
 * 
 * Standard mock for ConversationStorageAdapter that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';
import { nanoid } from 'nanoid';

// Import types directly
import type { ListOptions, SearchCriteria, StorageInterface } from '@/contexts/core/storageInterface';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';
import type { 
  ConversationSummary, 
  ConversationInfo, 
  ConversationStorage,
} from '@/contexts/conversations/storage/conversationStorage';

/**
 * Mock implementation of ConversationStorageAdapter
 */
export class MockConversationStorageAdapter implements StorageInterface<Conversation> {
  private static instance: MockConversationStorageAdapter | null = null;
  
  // Mock storage
  private conversations: Map<string, Conversation> = new Map();
  private turns: Map<string, ConversationTurn[]> = new Map();
  private summaries: Map<string, ConversationSummary[]> = new Map();
  private roomMapping: Map<string, string> = new Map(); // roomId+interfaceType -> conversationId
  
  // Mock underlying storage implementation
  private mockStorage: ConversationStorage = {
    createConversation: mock((conv) => Promise.resolve(conv.id || `conv-${nanoid()}`)),
    getConversation: mock((id) => Promise.resolve(this.conversations.get(id) || null)),
    getConversationByRoom: mock((roomId, interfaceType) => {
      const key = `${roomId}:${interfaceType || 'cli'}`;
      return Promise.resolve(this.roomMapping.get(key) || null);
    }),
    updateConversation: mock(() => Promise.resolve(true)),
    deleteConversation: mock(() => Promise.resolve(true)),
    addTurn: mock(() => Promise.resolve(`turn-${nanoid()}`)),
    getTurns: mock(() => Promise.resolve([])),
    updateTurn: mock(() => Promise.resolve(true)),
    addSummary: mock(() => Promise.resolve(`summary-${nanoid()}`)),
    getSummaries: mock(() => Promise.resolve([])),
    findConversations: mock(() => Promise.resolve([])),
    getRecentConversations: mock(() => Promise.resolve([])),
    updateMetadata: mock(() => Promise.resolve(true)),
    getMetadata: mock(() => Promise.resolve({})),
  };

  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationStorageAdapter {
    if (!MockConversationStorageAdapter.instance) {
      MockConversationStorageAdapter.instance = new MockConversationStorageAdapter();
    }
    return MockConversationStorageAdapter.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationStorageAdapter.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationStorageAdapter {
    return new MockConversationStorageAdapter();
  }
  
  /**
   * Implement StorageInterface methods
   */
  async create(item: Partial<Conversation>): Promise<string> {
    const id = item.id || `conv-${nanoid()}`;
    
    const conversation: Conversation = {
      id,
      interfaceType: item.interfaceType || 'cli',
      roomId: item.roomId || 'default-room',
      createdAt: item.createdAt || new Date(),
      updatedAt: item.updatedAt || new Date(),
      metadata: item.metadata || {},
      // Default properties that may be required by the application
      activeTurns: [],
      archivedTurns: [],
      summaries: [],
    };
    
    this.conversations.set(id, conversation);
    this.turns.set(id, []);
    this.summaries.set(id, []);
    
    // Map room ID to conversation ID
    const roomKey = `${conversation.roomId}:${conversation.interfaceType}`;
    this.roomMapping.set(roomKey, id);
    
    return id;
  }
  
  async read(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }
  
  async update(id: string, updates: Partial<Conversation>): Promise<boolean> {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;
    
    this.conversations.set(id, {
      ...conversation,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: updates.updatedAt || new Date(),
    });
    
    return true;
  }
  
  async delete(id: string): Promise<boolean> {
    if (!this.conversations.has(id)) return false;
    
    this.conversations.delete(id);
    this.turns.delete(id);
    this.summaries.delete(id);
    
    // Clean up room mappings
    for (const [key, convId] of this.roomMapping.entries()) {
      if (convId === id) {
        this.roomMapping.delete(key);
      }
    }
    
    return true;
  }
  
  async search(_criteria: SearchCriteria): Promise<Conversation[]> {
    // Simple implementation that returns all conversations
    return Array.from(this.conversations.values());
  }
  
  async list(_options?: ListOptions): Promise<Conversation[]> {
    // Simple implementation that returns all conversations
    return Array.from(this.conversations.values());
  }
  
  async count(_criteria?: SearchCriteria): Promise<number> {
    return this.conversations.size;
  }
  
  /**
   * Extended methods for conversation-specific operations
   */
  async getConversationByRoom(
    roomId: string,
    interfaceType: 'cli' | 'matrix' = 'cli',
  ): Promise<string | null> {
    const key = `${roomId}:${interfaceType}`;
    return this.roomMapping.get(key) || null;
  }
  
  async getOrCreateConversation(
    roomId: string,
    interfaceType: 'cli' | 'matrix',
  ): Promise<string> {
    const existingId = await this.getConversationByRoom(roomId, interfaceType);
    if (existingId) {
      return existingId;
    }
    
    return this.create({
      roomId,
      interfaceType,
    });
  }
  
  async addTurn(
    conversationId: string,
    turn: Partial<ConversationTurn>,
  ): Promise<string> {
    const conversation = await this.read(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    const id = turn.id || `turn-${nanoid()}`;
    const fullTurn: ConversationTurn = {
      id,
      timestamp: turn.timestamp || new Date(),
      query: turn.query || '',
      response: turn.response || '',
      userId: turn.userId || '',
      userName: turn.userName || '',
      metadata: turn.metadata || {},
    };
    
    // Update turns list
    const turns = this.turns.get(conversationId) || [];
    turns.push(fullTurn);
    this.turns.set(conversationId, turns);
    
    // Also add to conversation's activeTurns
    if (conversation.activeTurns) {
      conversation.activeTurns.push(fullTurn);
      await this.update(conversationId, { 
        activeTurns: conversation.activeTurns,
        updatedAt: new Date()
      });
    }
    
    return id;
  }
  
  async getTurns(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<ConversationTurn[]> {
    const turns = this.turns.get(conversationId) || [];
    
    // Apply pagination if needed
    if (limit !== undefined) {
      const start = offset || 0;
      const end = start + limit;
      return turns.slice(start, end);
    }
    
    return turns;
  }
  
  async addSummary(
    conversationId: string,
    summary: ConversationSummary,
  ): Promise<string> {
    const conversation = await this.read(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    const id = summary.id || `summary-${nanoid()}`;
    const fullSummary: ConversationSummary = {
      ...summary,
      id,
      conversationId,
      createdAt: summary.createdAt || new Date(),
    };
    
    // Update summaries list
    const summaries = this.summaries.get(conversationId) || [];
    summaries.push(fullSummary);
    this.summaries.set(conversationId, summaries);
    
    // Also add to conversation's summaries
    if (conversation.summaries) {
      conversation.summaries.push(fullSummary);
      await this.update(conversationId, { 
        summaries: conversation.summaries,
        updatedAt: new Date()
      });
    }
    
    return id;
  }
  
  async getSummaries(conversationId: string): Promise<ConversationSummary[]> {
    return this.summaries.get(conversationId) || [];
  }
  
  async findConversations(_criteria: Record<string, unknown>): Promise<ConversationInfo[]> {
    // Simple implementation that converts all conversations to ConversationInfo
    return Array.from(this.conversations.entries()).map(([id, conv]) => ({
      id,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      startedAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      turnCount: (this.turns.get(id) || []).length,
      metadata: conv.metadata || {},
    }));
  }
  
  async getRecentConversations(
    limit = 10,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    // Get all conversations and filter if needed
    let conversations = Array.from(this.conversations.values());
    
    if (interfaceType) {
      conversations = conversations.filter(c => c.interfaceType === interfaceType);
    }
    
    // Sort by updated date, newest first
    conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // Apply limit
    conversations = conversations.slice(0, limit);
    
    // Convert to ConversationInfo
    return conversations.map(conv => ({
      id: conv.id,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      startedAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      turnCount: (this.turns.get(conv.id) || []).length,
      metadata: conv.metadata || {},
    }));
  }
  
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    
    // Merge metadata
    const updatedMetadata = {
      ...conversation.metadata,
      ...metadata,
    };
    
    // Update conversation
    return this.update(conversationId, {
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });
  }
  
  /**
   * Get the underlying storage implementation
   */
  getStorageImplementation(): ConversationStorage {
    return this.mockStorage;
  }
}