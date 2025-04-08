/**
 * Conversation Manager for BrainProtocol
 * Manages conversation history and persistence
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import { ConversationContext, InMemoryStorage } from '@/mcp/contexts/conversations';
import type { ConversationStorage } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import { Logger } from '@/utils/logger';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import type { IConversationManager, TurnOptions } from '../types';

/**
 * Configuration options for ConversationManager
 */
export interface ConversationManagerConfig {
  /** BrainProtocol configuration */
  config: BrainProtocolConfig;
}

/**
 * Manages conversation history and persistence
 */
export class ConversationManager implements IConversationManager {
  /**
   * Singleton instance of ConversationManager
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ConversationManager | null = null;
  
  /**
   * Logger instance for this class
   */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  private conversationContext: ConversationContext;
  private currentRoomId?: string;
  private currentConversationId?: string;

  /**
   * Get the singleton instance of ConversationManager
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  public static getInstance(options: ConversationManagerConfig): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager(options.config);
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ConversationManager singleton instance created');
    } else if (options) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }
    
    return ConversationManager.instance;
  }

  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (ConversationManager.instance) {
        // No cleanup needed currently
      }
    } catch (error) {
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.error('Error during ConversationManager instance reset:', error);
    } finally {
      ConversationManager.instance = null;
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ConversationManager singleton instance reset');
    }
  }

  /**
   * Create a fresh instance without affecting the singleton
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to create isolated instances.
   * 
   * @param options Configuration options
   * @returns A new ConversationManager instance
   */
  public static createFresh(options: ConversationManagerConfig): ConversationManager {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ConversationManager instance');
    
    return new ConversationManager(options.config);
  }

  /**
   * Private constructor to enforce factory method usage
   * 
   * Part of the Component Interface Standardization pattern.
   * Users should call getInstance() or createFresh() instead.
   * 
   * @param config Configuration for the brain protocol
   */
  private constructor(config: BrainProtocolConfig) {
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
    
    this.logger.debug('Conversation manager initialized with BaseContext architecture');
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
    
    this.logger.debug(`Switched to room: ${roomId} with conversation: ${this.currentConversationId}`);
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
        
        this.logger.debug(`Initialized conversation ${this.currentConversationId} for room: ${this.currentRoomId}`);
      } else {
        this.logger.warn('No room ID provided, cannot initialize conversation');
      }
    } catch (error) {
      this.logger.error('Failed to initialize conversation:', error);
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
      
      this.logger.debug(`Saved turn with userId: ${options?.userId || 'unknown'}`);
    } catch (error) {
      this.logger.warn('Failed to save conversation turn:', error);
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
      this.logger.warn('Failed to get conversation history:', error);
      return '';
    }
  }
}