/**
 * Conversation Manager for BrainProtocol
 * Manages conversation history and persistence
 */
import type { ConversationContext } from '@/mcp/contexts/conversations';
import { ConversationMemory } from '@/mcp/protocol/memory';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import type { IConversationManager, TurnOptions } from '../types';

/**
 * Manages conversation history and persistence
 */
export class ConversationManager implements IConversationManager {
  private conversationMemory: ConversationMemory;
  private currentRoomId?: string;

  /**
   * Create a new conversation manager
   * @param config Configuration for the brain protocol
   */
  constructor(config: BrainProtocolConfig) {
    // Use injected storage if provided, otherwise use singleton getInstance()
    // Note: memoryStorage is now stored directly in config rather than as a method
    const memoryStorage = 
      (config.memoryStorage as InMemoryStorage) || 
      InMemoryStorage.getInstance();
    
    // Initialize conversation memory with interface type
    this.conversationMemory = new ConversationMemory({
      interfaceType: config.interfaceType,
      storage: memoryStorage,
      apiKey: config.getApiKey(),
    });
    
    // Set initial room ID
    this.currentRoomId = config.roomId;
    
    // Initialize conversation
    this.initializeConversation();
    
    logger.debug('Conversation manager initialized');
  }

  /**
   * Get the conversation memory instance
   * @returns The conversation memory
   */
  getConversationMemory(): ConversationMemory {
    return this.conversationMemory;
  }
  
  /**
   * Get the conversation context (required by IConversationManager interface)
   * @returns The conversation context
   */
  getConversationContext(): ConversationContext {
    // This is a temporary stub until ConversationContext is fully integrated
    throw new Error('ConversationContext is not yet implemented in this implementation');
  }

  /**
   * Set the current room ID and switch to its conversation
   * @param roomId Room ID to set
   */
  async setCurrentRoom(roomId: string): Promise<void> {
    this.currentRoomId = roomId;
    await this.conversationMemory.getOrCreateConversationForRoom(roomId);
    
    logger.debug(`Switched to room: ${roomId}`);
  }

  /**
   * Initialize the conversation with the current room ID
   */
  async initializeConversation(): Promise<void> {
    try {
      if (this.currentRoomId) {
        await this.conversationMemory.getOrCreateConversationForRoom(this.currentRoomId);
        logger.debug(`Initialized conversation for room: ${this.currentRoomId}`);
      } else {
        logger.warn('No room ID provided, cannot initialize conversation');
      }
    } catch (error) {
      logger.error('Failed to initialize conversation:', error);
    }
  }

  /**
   * Check if there is an active conversation
   * @returns Whether there is an active conversation
   */
  hasActiveConversation(): boolean {
    return Boolean(this.conversationMemory.currentConversation);
  }

  /**
   * Get the current conversation ID
   * @returns The current conversation ID or null
   */
  getCurrentConversationId(): string | null {
    return this.conversationMemory.currentConversation;
  }

  /**
   * Get a conversation by ID
   * @param conversationId Conversation ID to get
   * @returns The conversation or null
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await this.conversationMemory.getConversationMemory().storage.getConversation(conversationId);
  }

  /**
   * Save a turn to the conversation
   * @param query User query
   * @param response System response
   * @param options Turn options
   */
  async saveTurn(query: string, response: string, options?: TurnOptions): Promise<void> {
    try {
      await this.conversationMemory.addTurn(query, response, options);
      logger.debug(`Saved turn with userId: ${options?.userId || 'unknown'}`);
    } catch (error) {
      logger.warn('Failed to save conversation turn:', error);
    }
  }

  /**
   * Get the conversation history formatted for prompts
   * @returns Formatted conversation history
   */
  async getConversationHistory(): Promise<string> {
    try {
      return await this.conversationMemory.formatHistoryForPrompt();
    } catch (error) {
      logger.warn('Failed to get conversation history:', error);
      return '';
    }
  }
}