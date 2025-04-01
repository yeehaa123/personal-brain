/**
 * In-memory implementation of the ConversationMemoryStorage interface
 */
import { v4 as uuidv4 } from 'uuid';
import type {
  Conversation,
  ConversationTurn,
} from '../schemas/conversationSchemas';
import { ConversationSchema, ConversationTurnSchema } from '../schemas/conversationSchemas';
import type { ConversationMemoryStorage } from '../schemas/conversationMemoryStorage';

/**
 * In-memory storage adapter for conversation memory
 * This implementation stores all data in memory and will be lost when the process ends
 */
export class InMemoryStorage implements ConversationMemoryStorage {
  private conversations: Map<string, Conversation> = new Map();
  private roomIdIndex: Map<string, string> = new Map(); // Maps roomId -> conversationId

  /**
   * Create a new conversation with generated ID and timestamps
   */
  async createConversation(options: {
    interfaceType: 'cli' | 'matrix';
    roomId?: string;
  }): Promise<Conversation> {
    const now = new Date();
    const conversationId = uuidv4();
    
    const conversation: Conversation = {
      id: conversationId,
      createdAt: now,
      updatedAt: now,
      turns: [],
      interfaceType: options.interfaceType,
      roomId: options.roomId,
    };

    // Validate the conversation using Zod schema
    ConversationSchema.parse(conversation);

    // Store the conversation
    this.conversations.set(conversationId, conversation);
    
    // If roomId is provided, index it for faster lookup
    if (options.roomId) {
      this.roomIdIndex.set(options.roomId, conversationId);
    }
    
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
   * Add a new turn to an existing conversation
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
      id: uuidv4(),
    };

    // Validate the turn using Zod schema
    ConversationTurnSchema.parse(completeTurn);

    // Update the conversation
    const updatedConversation: Conversation = {
      ...conversation,
      updatedAt: new Date(),
      turns: [...conversation.turns, completeTurn],
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