/**
 * Messaging-Enabled Conversation Context
 * 
 * This module extends the ConversationContext with messaging capabilities,
 * allowing it to participate in cross-context communication.
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';
import type { ContextMediator } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { ConversationContext } from '../core/conversationContext';

import { ConversationMessageHandler } from './conversationMessageHandler';
import { ConversationNotifier } from './conversationNotifier';

/**
 * Messaging-enabled extension of ConversationContext
 */
export class ConversationContextMessaging {
  private logger = Logger.getInstance();
  private notifier: ConversationNotifier;
  
  /**
   * Create a messaging-enabled wrapper for a ConversationContext
   * 
   * @param conversationContext The conversation context to extend
   * @param mediator The context mediator for messaging
   */
  constructor(
    private conversationContext: ConversationContext,
    mediator: ContextMediator,
  ) {
    // Create notifier
    this.notifier = new ConversationNotifier(mediator);
    
    // Register message handler
    const handler = ConversationMessageHandler.createHandler(conversationContext);
    mediator.registerHandler(ContextId.CONVERSATION, handler);
    
    this.logger.debug('ConversationContextMessaging initialized');
  }
  
  /**
   * Get the underlying conversation context
   * @returns The conversation context
   */
  getContext(): ConversationContext {
    return this.conversationContext;
  }
  
  /**
   * Create a conversation with messaging support
   * 
   * @param interfaceType Interface type (cli or matrix)
   * @param roomId Room ID for the conversation
   * @returns The conversation ID
   */
  async createConversation(
    interfaceType: 'cli' | 'matrix', 
    roomId: string,
  ): Promise<string> {
    // Delegate to the original context
    const conversationId = await this.conversationContext.createConversation(
      interfaceType,
      roomId,
    );
    
    // Notify other contexts if the conversation was initialized successfully
    if (conversationId) {
      // Get the full conversation data
      const conversation = await this.conversationContext.getConversation(conversationId);
      if (conversation) {
        await this.notifier.notifyConversationStarted(conversation);
      }
    }
    
    return conversationId;
  }
  
  /**
   * Delete a conversation with messaging support
   *
   * @param conversationId ID of the conversation to delete
   * @returns Whether the operation was successful
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    // Delegate to the original context
    const success = await this.conversationContext.deleteConversation(conversationId);
    
    // Notify other contexts if the conversation was deleted successfully
    if (success) {
      await this.notifier.notifyConversationCleared(conversationId);
    }
    
    return success;
  }
  
  /**
   * Add a turn to the conversation with messaging support
   * 
   * @param conversationId The conversation ID
   * @param query The user query
   * @param response Optional assistant response
   * @param options Optional turn options
   * @returns ID of the created turn
   */
  async addTurn(
    conversationId: string,
    query: string,
    response?: string,
    options?: object,
  ): Promise<string> {
    // Delegate to the original context
    const turnId = await this.conversationContext.addTurn(
      conversationId,
      query,
      response,
      options,
    );
    
    // Get the full turn for the notification
    const turns = await this.conversationContext.getTurns(conversationId, 1);
    const turn = turns.length > 0 ? turns[0] : null;
    
    // Notify other contexts if the turn was added successfully
    if (turnId && turn) {
      await this.notifier.notifyConversationTurnAdded(conversationId, turn);
    }
    
    return turnId;
  }
  
  /**
   * Delegate remaining methods to the original context
   */
  
  getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversationContext.getConversation(conversationId);
  }
  
  getTurns(conversationId: string): Promise<ConversationTurn[]> {
    return this.conversationContext.getTurns(conversationId);
  }
  
  getConversationIdByRoom(roomId: string): Promise<string | null> {
    return this.conversationContext.getConversationIdByRoom(roomId);
  }
  
  getConversationHistory(conversationId: string): Promise<string> {
    return this.conversationContext.getConversationHistory(conversationId);
  }
  
  formatHistoryForPrompt(conversationId: string, maxTokens?: number): Promise<string> {
    return this.conversationContext.formatHistoryForPrompt(conversationId, maxTokens);
  }
  
  updateMetadata(conversationId: string, metadata: Record<string, unknown>): Promise<boolean> {
    return this.conversationContext.updateMetadata(conversationId, metadata);
  }
}