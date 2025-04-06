/**
 * InMemoryStorage adapter for ConversationMemoryStorage compatibility
 * 
 * This file provides a compatibility layer that adapts the current InMemoryStorage
 * from contexts/conversations to the older ConversationMemoryStorage interface.
 */
import type { ConversationSummary as ContextConversationSummary } from '@/mcp/contexts/conversations/conversationStorage';
import { InMemoryStorage as ContextInMemoryStorage } from '@/mcp/contexts/conversations/inMemoryStorage';

import type { ConversationMemoryStorage } from '../schemas/conversationMemoryStorage';
import type { Conversation, ConversationSummary, ConversationTurn } from '../schemas/conversationSchemas';

/**
 * Adapter class that wraps the new InMemoryStorage to implement the ConversationMemoryStorage interface
 */
export class InMemoryStorage implements ConversationMemoryStorage {
  private storage: ContextInMemoryStorage;
  private static instance: InMemoryStorage | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(storage?: ContextInMemoryStorage) {
    this.storage = storage || ContextInMemoryStorage.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): InMemoryStorage {
    if (!InMemoryStorage.instance) {
      InMemoryStorage.instance = new InMemoryStorage();
    }
    return InMemoryStorage.instance;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(): InMemoryStorage {
    return new InMemoryStorage(ContextInMemoryStorage.createFresh());
  }

  /**
   * Reset the storage state (for testing)
   */
  reset(): void {
    this.storage.clear();
  }

  /**
   * Create a new conversation
   */
  async createConversation(options: {
    interfaceType: 'cli' | 'matrix';
    roomId: string;
  }): Promise<Conversation> {
    const id = await this.storage.createConversation({
      interfaceType: options.interfaceType,
      roomId: options.roomId,
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    // Create a basic Conversation object compatible with ConversationMemoryStorage interface
    return {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      interfaceType: options.interfaceType,
      roomId: options.roomId,
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      metadata: {},
    };
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const conv = await this.storage.getConversation(id);
    if (!conv) return null;
    
    // Convert to the expected Conversation format
    return {
      id: conv.id,
      createdAt: conv.createdAt || new Date(),
      updatedAt: conv.updatedAt,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      activeTurns: [], // Will be populated if needed elsewhere
      summaries: [],   // Will be populated if needed elsewhere
      archivedTurns: [],
      metadata: conv.metadata || {},
    };
  }

  /**
   * Get a conversation by room ID
   */
  async getConversationByRoomId(roomId: string): Promise<Conversation | null> {
    const conversationId = await this.storage.getConversationByRoom(roomId);
    if (!conversationId) {
      return null;
    }
    return this.getConversation(conversationId);
  }

  /**
   * Add a turn to a conversation
   */
  async addTurn(
    conversationId: string,
    turn: Omit<ConversationTurn, 'id'>,
  ): Promise<Conversation> {
    // Cast to ConversationTurn as the storage expects the id property
    await this.storage.addTurn(conversationId, turn as ConversationTurn);
    
    // Get the updated conversation
    const conv = await this.storage.getConversation(conversationId);
    if (!conv) {
      throw new Error(`Conversation with ID ${conversationId} not found after adding turn`);
    }
    
    // Get the turns
    const turns = await this.storage.getTurns(conversationId);
    
    // Create a result compatible with the ConversationMemoryStorage interface
    return {
      id: conv.id,
      createdAt: conv.createdAt || new Date(),
      updatedAt: conv.updatedAt,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      activeTurns: turns,
      summaries: [],
      archivedTurns: [],
      metadata: conv.metadata || {},
    };
  }

  /**
   * Add a summary to a conversation
   */
  async addSummary(
    conversationId: string,
    summary: Omit<ConversationSummary, 'id'>,
  ): Promise<Conversation> {
    // Adapt the ConversationSummary to ContextConversationSummary
    const adaptedSummary: ContextConversationSummary = {
      id: `summary-${Date.now()}`,
      conversationId,
      content: summary.content,
      createdAt: new Date(),
      metadata: summary.metadata,
      turnCount: summary.turnCount,
    };
    
    await this.storage.addSummary(conversationId, adaptedSummary);
    
    // Get the updated conversation
    const conv = await this.storage.getConversation(conversationId);
    if (!conv) {
      throw new Error(`Conversation with ID ${conversationId} not found after adding summary`);
    }
    
    // Get turns and summaries
    const turns = await this.storage.getTurns(conversationId);
    const summaries = await this.storage.getSummaries(conversationId);
    
    // Create a result compatible with the ConversationMemoryStorage interface
    return {
      id: conv.id,
      createdAt: conv.createdAt || new Date(),
      updatedAt: conv.updatedAt,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      activeTurns: turns,
      summaries: summaries,
      archivedTurns: [],
      metadata: conv.metadata || {},
    };
  }

  /**
   * Move turns from active to archive
   */
  async moveTurnsToArchive(
    conversationId: string,
    turnIndices: number[],
  ): Promise<Conversation> {
    const turns = await this.storage.getTurns(conversationId);
    
    // Mark turns as archived using metadata
    for (const index of turnIndices) {
      if (index >= 0 && index < turns.length) {
        const turn = turns[index];
        if (turn.id) {
          await this.storage.updateTurn(turn.id, {
            metadata: {
              ...(turn.metadata || {}),
              isActive: false,
            },
          });
        }
      }
    }
    
    // Get the updated conversation
    const conv = await this.storage.getConversation(conversationId);
    if (!conv) {
      throw new Error(`Conversation with ID ${conversationId} not found after archiving turns`);
    }
    
    // Get the updated turns and summaries
    const updatedTurns = await this.storage.getTurns(conversationId);
    const summaries = await this.storage.getSummaries(conversationId);
    
    // Separate active and archived turns
    const activeTurns = updatedTurns.filter(t => !(t.metadata && t.metadata['isActive'] === false));
    const archivedTurns = updatedTurns.filter(t => t.metadata && t.metadata['isActive'] === false);
    
    // Create a result compatible with the ConversationMemoryStorage interface
    return {
      id: conv.id,
      createdAt: conv.createdAt || new Date(),
      updatedAt: conv.updatedAt,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      activeTurns: activeTurns,
      summaries: summaries,
      archivedTurns: archivedTurns,
      metadata: conv.metadata || {},
    };
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(options?: {
    limit?: number;
    interfaceType?: 'cli' | 'matrix';
  }): Promise<Conversation[]> {
    const limit = options?.limit;
    const interfaceType = options?.interfaceType;
    
    const infos = await this.storage.getRecentConversations(limit, interfaceType);
    
    // Convert to the expected Conversation format
    const result: Conversation[] = [];
    
    for (const info of infos) {
      result.push({
        id: info.id,
        createdAt: info.startedAt,
        updatedAt: info.updatedAt,
        interfaceType: info.interfaceType,
        roomId: info.roomId,
        activeTurns: [],  // Will be populated if needed elsewhere
        summaries: [],    // Will be populated if needed elsewhere
        archivedTurns: [],
        metadata: info.metadata || {},
      });
    }
    
    return result;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    return this.storage.deleteConversation(id);
  }

  /**
   * Update conversation metadata
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<Conversation> {
    const success = await this.storage.updateMetadata(id, metadata);
    if (!success) {
      throw new Error(`Failed to update metadata for conversation with ID ${id}`);
    }
    
    // Get the updated conversation
    const conv = await this.storage.getConversation(id);
    if (!conv) {
      throw new Error(`Conversation with ID ${id} not found after updating metadata`);
    }
    
    // Create a result compatible with the ConversationMemoryStorage interface
    return {
      id: conv.id,
      createdAt: conv.createdAt || new Date(),
      updatedAt: conv.updatedAt,
      interfaceType: conv.interfaceType,
      roomId: conv.roomId,
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      metadata: conv.metadata || {},
    };
  }
}