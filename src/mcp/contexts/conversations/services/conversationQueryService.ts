/**
 * Conversation Query Service
 * 
 * Handles conversation searches and retrieval operations.
 */

import { nanoid } from 'nanoid';

import type { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import type { ConversationInfo, SearchCriteria } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

/**
 * Service for handling conversation queries and retrieval
 */
export class ConversationQueryService {
  /**
   * Constructor
   * 
   * @param storageAdapter The storage adapter to use
   */
  constructor(private storageAdapter: ConversationStorageAdapter) {
    logger.debug('ConversationQueryService initialized', { context: 'ConversationQueryService' });
  }

  /**
   * Create a new conversation
   * 
   * @param interfaceType The interface type (cli or matrix)
   * @param roomId The room ID
   * @returns The ID of the created conversation
   */
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    return this.storageAdapter.create({
      id: `conv-${nanoid()}`,
      interfaceType,
      roomId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    });
  }

  /**
   * Get a conversation by ID
   * 
   * @param conversationId The conversation ID
   * @returns The conversation or null if not found
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.storageAdapter.read(conversationId);
  }

  /**
   * Get a conversation ID by room ID
   * 
   * @param roomId The room ID
   * @param interfaceType Optional interface type filter
   * @returns Conversation ID or null if not found
   */
  async getConversationIdByRoom(
    roomId: string,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<string | null> {
    return this.storageAdapter.getConversationByRoom(roomId, interfaceType);
  }

  /**
   * Get or create a conversation for a room
   * 
   * @param roomId The room ID
   * @param interfaceType The interface type
   * @returns The conversation ID
   */
  async getOrCreateConversationForRoom(
    roomId: string,
    interfaceType: 'cli' | 'matrix',
  ): Promise<string> {
    return this.storageAdapter.getOrCreateConversation(roomId, interfaceType);
  }

  /**
   * Find conversations matching search criteria
   * 
   * @param criteria Search criteria
   * @returns Array of matching conversations
   */
  async findConversations(criteria: SearchCriteria): Promise<ConversationInfo[]> {
    // Convert the specific SearchCriteria to a generic Record<string, unknown>
    const genericCriteria: Record<string, unknown> = {};
    Object.entries(criteria).forEach(([key, value]) => {
      genericCriteria[key] = value;
    });

    return this.storageAdapter.findConversations(genericCriteria);
  }

  /**
   * Get conversations for a specific room
   * 
   * @param roomId The room ID
   * @param interfaceType Optional interface type filter
   * @returns Array of conversation info objects
   */
  async getConversationsByRoom(
    roomId: string,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    return this.storageAdapter.findConversations({
      roomId,
      interfaceType,
    });
  }

  /**
   * Get recent conversations
   * 
   * @param limit Maximum number of conversations to return
   * @param interfaceType Optional interface type filter
   * @returns Array of conversation info objects
   */
  async getRecentConversations(
    limit?: number,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    return this.storageAdapter.getRecentConversations(limit, interfaceType);
  }

  /**
   * Update conversation metadata
   * 
   * @param conversationId The conversation ID
   * @param metadata The metadata to update
   * @returns True if updated successfully
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    return this.storageAdapter.updateMetadata(conversationId, metadata);
  }

  /**
   * Delete a conversation
   * 
   * @param conversationId The conversation ID
   * @returns True if deleted successfully
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.storageAdapter.delete(conversationId);
  }
}