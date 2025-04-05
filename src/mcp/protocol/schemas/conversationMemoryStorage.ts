/**
 * Storage interface for tiered conversation memory
 */
import type { Conversation, ConversationSummary, ConversationTurn } from './conversationSchemas';

/**
 * Default CLI room ID constant
 * This ensures we have a consistent "room" for CLI conversations
 */
export const DEFAULT_CLI_ROOM_ID = 'cli-default-room';

/**
 * Interface for conversation storage adapters
 * Implementations must provide these methods for storing and retrieving conversations
 */
export interface ConversationMemoryStorage {
  /**
   * Create a new conversation
   * @param options Required properties for the new conversation
   * @returns The created conversation object with generated ID
   */
  createConversation(options: {
    interfaceType: 'cli' | 'matrix';
    roomId: string; // roomId is now required for all interfaces
  }): Promise<Conversation>;

  /**
   * Get a conversation by ID
   * @param id The conversation ID
   * @returns The conversation or null if not found
   */
  getConversation(id: string): Promise<Conversation | null>;

  /**
   * Get a conversation by room ID
   * @param roomId The room ID
   * @returns The conversation or null if not found
   */
  getConversationByRoomId(roomId: string): Promise<Conversation | null>;

  /**
   * Add a new turn to an existing conversation's active tier
   * @param conversationId The conversation ID
   * @param turn The new conversation turn to add
   * @returns The updated conversation
   * @throws Error if conversation not found
   */
  addTurn(conversationId: string, turn: Omit<ConversationTurn, 'id'>): Promise<Conversation>;

  /**
   * Add a summary to an existing conversation's summary tier
   * @param conversationId The conversation ID
   * @param summary The new summary to add
   * @returns The updated conversation
   * @throws Error if conversation not found
   */
  addSummary(conversationId: string, summary: Omit<ConversationSummary, 'id'>): Promise<Conversation>;

  /**
   * Move turns from active tier to archive tier
   * @param conversationId The conversation ID
   * @param turnIndices The indices of turns to move from active to archive
   * @returns The updated conversation
   * @throws Error if conversation not found
   */
  moveTurnsToArchive(conversationId: string, turnIndices: number[]): Promise<Conversation>;

  /**
   * Get the most recent conversations, optionally limited by count and filtered by interface type
   * @param options Optional filtering and limiting options
   * @returns Array of conversations, sorted by updatedAt (newest first)
   */
  getRecentConversations(options?: {
    limit?: number;
    interfaceType?: 'cli' | 'matrix';
  }): Promise<Conversation[]>;

  /**
   * Delete a conversation
   * @param id The conversation ID to delete
   * @returns true if deleted, false if not found
   */
  deleteConversation(id: string): Promise<boolean>;

  /**
   * Update conversation metadata
   * @param id The conversation ID
   * @param metadata Object containing metadata to update
   * @returns The updated conversation
   * @throws Error if conversation not found
   */
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<Conversation>;
}