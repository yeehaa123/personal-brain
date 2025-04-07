/**
 * Conversation Manager for BrainProtocol
 * Manages conversation history and persistence
 */
import { ConversationContext, InMemoryStorage } from '@/mcp/contexts/conversations';
import type { ConversationStorage } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import type { IConversationManager, TurnOptions } from '../types';

/**
 * Manages conversation history and persistence
 */
export class ConversationManager implements IConversationManager {
  private conversationContext: ConversationContext;
  private currentRoomId?: string;
  private currentConversationId?: string;

  /**
   * Create a new conversation manager
   * @param config Configuration for the brain protocol
   */
  constructor(config: BrainProtocolConfig) {
    // Use injected storage if provided, otherwise use singleton getInstance()
    const storage = 
      (config.memoryStorage as ConversationStorage) || 
      InMemoryStorage.getInstance();
    
    // Initialize conversation context with the proper configuration
    this.conversationContext = ConversationContext.createFresh({
      storage: storage,
      anchorName: config.anchorName || 'Host',
      defaultUserName: config.defaultUserName || 'User',
    });
    
    // Set initial room ID
    this.currentRoomId = config.roomId;
    
    // Initialize conversation
    this.initializeConversation();
    
    logger.debug('Conversation manager initialized with BaseContext architecture');
  }

  /**
   * Get the conversation context instance
   * @returns The conversation context
   */
  getConversationContext(): ConversationContext {
    return this.conversationContext;
  }

  /**
   * Set the current room ID and switch to its conversation
   * @param roomId Room ID to set
   */
  async setCurrentRoom(roomId: string): Promise<void> {
    this.currentRoomId = roomId;
    this.currentConversationId = await this.conversationContext.getOrCreateConversationForRoom(
      roomId,
      'cli',
    );
    
    logger.debug(`Switched to room: ${roomId} with conversation: ${this.currentConversationId}`);
  }

  /**
   * Initialize the conversation with the current room ID
   */
  async initializeConversation(): Promise<void> {
    try {
      if (this.currentRoomId) {
        this.currentConversationId = await this.conversationContext.getOrCreateConversationForRoom(
          this.currentRoomId,
          'cli',
        );
        
        logger.debug(`Initialized conversation ${this.currentConversationId} for room: ${this.currentRoomId}`);
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
    return Boolean(this.currentConversationId);
  }

  /**
   * Get the current conversation ID
   * @returns The current conversation ID or null
   */
  getCurrentConversationId(): string | null {
    return this.currentConversationId || null;
  }

  /**
   * Get a conversation by ID
   * @param conversationId Conversation ID to get
   * @returns The conversation or null
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await this.conversationContext.getConversation(conversationId);
  }

  /**
   * Save a turn to the conversation
   * @param query User query
   * @param response System response
   * @param options Turn options
   */
  async saveTurn(query: string, response: string, options?: TurnOptions): Promise<void> {
    try {
      if (!this.currentConversationId) {
        await this.initializeConversation();
        if (!this.currentConversationId) {
          throw new Error('No active conversation to save turn to');
        }
      }
      
      await this.conversationContext.addTurn(
        this.currentConversationId,
        query,
        response,
        options,
      );
      
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
      if (!this.currentConversationId) {
        return '';
      }
      
      return await this.conversationContext.formatHistoryForPrompt(this.currentConversationId);
    } catch (error) {
      logger.warn('Failed to get conversation history:', error);
      return '';
    }
  }
}