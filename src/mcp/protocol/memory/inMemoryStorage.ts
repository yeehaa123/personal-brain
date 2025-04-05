/**
 * In-memory implementation of the ConversationMemoryStorage interface
 */
import { nanoid } from 'nanoid';

import type { ConversationMemoryStorage } from '../schemas/conversationMemoryStorage';
import { 
  ConversationSchema, 
  ConversationSummarySchema,
  ConversationTurnSchema,
} from '../schemas/conversationSchemas';
import type {
  Conversation,
  ConversationSummary,
  ConversationTurn,
} from '../schemas/conversationSchemas';

/**
 * In-memory storage adapter for tiered conversation memory
 * This implementation stores all data in memory and will be lost when the process ends
 * 
 * Uses the singleton pattern to ensure all components access the same conversation store
 */
export class InMemoryStorage implements ConversationMemoryStorage {
  private conversations: Map<string, Conversation>;
  private roomIdIndex: Map<string, string>; // Maps roomId -> conversationId
  
  // Singleton instance
  private static instance: InMemoryStorage;
  
  constructor() {
    // Initialize maps in constructor to ensure each instance has its own maps
    this.conversations = new Map();
    this.roomIdIndex = new Map();
  }
  
  /**
   * Get the singleton instance of InMemoryStorage
   */
  public static getInstance(): InMemoryStorage {
    if (!InMemoryStorage.instance) {
      InMemoryStorage.instance = new InMemoryStorage();
    }
    return InMemoryStorage.instance;
  }
  
  /**
   * Reset the storage state (for testing)
   */
  reset(): void {
    this.conversations.clear();
    this.roomIdIndex.clear();
  }
  
  /**
   * Static method to create a fresh instance (for testing)
   * Ensures a completely isolated instance with no shared state
   * 
   * This method creates a completely isolated instance of InMemoryStorage
   * with its own Maps, ensuring it won't share any state with the singleton
   * or with other instances created via createFresh().
   * 
   * Each instance also gets a unique identifier to help with debugging.
   * 
   * IMPORTANT: This method should always be used in tests to ensure proper isolation.
   * Tests should NEVER use getInstance() except for tests specifically testing the singleton pattern.
   */
  static createFresh(): InMemoryStorage {
    // Create a new class to ensure 100% isolated prototype across all tests
    class IsolatedInMemoryStorage extends InMemoryStorage {
      constructor() {
        super();
        this.reset();
      }
    }
    
    // Create a completely new instance that doesn't use the singleton
    const freshInstance = new IsolatedInMemoryStorage();
    
    // Assign a unique instance ID to help with debugging
    // Using a property accessor to avoid TypeScript 'any' type warning
    Object.defineProperty(freshInstance, '_instanceId', {
      value: `fresh-${nanoid()}`,
      writable: false,
      enumerable: false,
      configurable: false,
    });
    
    return freshInstance;
  }

  /**
   * Create a new conversation with generated ID and timestamps
   */
  async createConversation(options: {
    interfaceType: 'cli' | 'matrix';
    roomId: string; // Now required
  }): Promise<Conversation> {
    const now = new Date();
    // Use nanoid with prefix for clarity and consistent length (21 chars)
    const conversationId = `conv-${nanoid()}`;
    
    const conversation: Conversation = {
      id: conversationId,
      createdAt: now,
      updatedAt: now,
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      interfaceType: options.interfaceType,
      roomId: options.roomId,
    };

    // Validate the conversation using Zod schema
    ConversationSchema.parse(conversation);

    // Store the conversation
    this.conversations.set(conversationId, conversation);
    
    // Always index by roomId for faster lookup (roomId is now required)
    this.roomIdIndex.set(options.roomId, conversationId);
    
    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  /**
   * Get a conversation by room ID
   */
  async getConversationByRoomId(roomId: string): Promise<Conversation | null> {
    const conversationId = this.roomIdIndex.get(roomId);
    if (!conversationId) {
      return null;
    }
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Add a new turn to an existing conversation (active tier)
   */
  async addTurn(
    conversationId: string,
    turn: Omit<ConversationTurn, 'id'>,
  ): Promise<Conversation> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    const completeTurn: ConversationTurn = {
      ...turn,
      id: `turn-${nanoid()}`,
    };

    // Validate the turn using Zod schema
    ConversationTurnSchema.parse(completeTurn);

    // Update the conversation with the new turn in the active tier
    const updatedConversation: Conversation = {
      ...conversation,
      updatedAt: new Date(),
      activeTurns: [...conversation.activeTurns, completeTurn],
    };

    // Validate the updated conversation
    ConversationSchema.parse(updatedConversation);

    this.conversations.set(conversationId, updatedConversation);
    return updatedConversation;
  }

  /**
   * Add a summary to the conversation (summary tier)
   */
  async addSummary(
    conversationId: string,
    summary: Omit<ConversationSummary, 'id'>,
  ): Promise<Conversation> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    const completeSummary: ConversationSummary = {
      ...summary,
      id: `summ-${nanoid()}`,
    };

    // Validate the summary using Zod schema
    ConversationSummarySchema.parse(completeSummary);

    // Update the conversation with the new summary
    const updatedConversation: Conversation = {
      ...conversation,
      updatedAt: new Date(),
      summaries: [...conversation.summaries, completeSummary],
    };

    // Validate the updated conversation
    ConversationSchema.parse(updatedConversation);

    this.conversations.set(conversationId, updatedConversation);
    return updatedConversation;
  }

  /**
   * Move turns from active to archive
   */
  async moveTurnsToArchive(
    conversationId: string,
    turnIndices: number[],
  ): Promise<Conversation> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Sort indices in descending order to avoid issues when removing items
    const sortedIndices = [...turnIndices].sort((a, b) => b - a);
    
    // Create a copy of the active turns
    const activeTurns = [...conversation.activeTurns];
    const turnsToArchive: ConversationTurn[] = [];
    
    // Remove turns from active and add to archive
    for (const index of sortedIndices) {
      if (index >= 0 && index < activeTurns.length) {
        const [turn] = activeTurns.splice(index, 1);
        turnsToArchive.push(turn);
      }
    }
    
    // Update the conversation
    const updatedConversation: Conversation = {
      ...conversation,
      updatedAt: new Date(),
      activeTurns,
      archivedTurns: [...conversation.archivedTurns, ...turnsToArchive.reverse()],
    };

    // Validate the updated conversation
    ConversationSchema.parse(updatedConversation);

    this.conversations.set(conversationId, updatedConversation);
    return updatedConversation;
  }

  /**
   * Get recent conversations, sorted by updatedAt (newest first)
   * Optionally filtered by interface type
   */
  async getRecentConversations(options?: {
    limit?: number;
    interfaceType?: 'cli' | 'matrix';
  }): Promise<Conversation[]> {
    let allConversations = Array.from(this.conversations.values());
    
    // Filter by interface type if specified
    if (options?.interfaceType) {
      allConversations = allConversations.filter(
        conv => conv.interfaceType === options.interfaceType,
      );
    }
    
    // Sort by updatedAt (newest first)
    const sortedConversations = allConversations.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    // Apply limit if specified
    return options?.limit ? sortedConversations.slice(0, options.limit) : sortedConversations;
  }

  /**
   * Delete a conversation by ID
   */
  async deleteConversation(id: string): Promise<boolean> {
    const conversation = this.conversations.get(id);
    
    if (conversation && conversation.roomId) {
      // Also remove from roomId index
      this.roomIdIndex.delete(conversation.roomId);
    }
    
    return this.conversations.delete(id);
  }

  /**
   * Update conversation metadata
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }

    // Merge the existing metadata with the new metadata
    const updatedConversation: Conversation = {
      ...conversation,
      updatedAt: new Date(),
      metadata: {
        ...conversation.metadata,
        ...metadata,
      },
    };

    // Validate the updated conversation
    ConversationSchema.parse(updatedConversation);

    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
}