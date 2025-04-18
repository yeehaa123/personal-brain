/**
 * Conversation Context Message Handler
 * 
 * This module provides message handling capabilities for the ConversationContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 */

import { ContextId } from '@/protocol/core/contextOrchestratorExtended';
import { 
  type DataRequestMessage, 
  DataRequestType, 
  MessageFactory,
  type NotificationMessage,
  NotificationType, 
} from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { ConversationContext } from '../core/conversationContext';

/**
 * Interface for message with common properties
 */
interface BaseContextMessage {
  category: string;
  sourceContext?: string;
  id?: string;
}

/**
 * Handler for conversation context messages
 */
export class ConversationMessageHandler {
  private logger = Logger.getInstance();
  
  /**
   * Create a message handler for the conversation context
   * 
   * @param conversationContext The conversation context to handle messages for
   * @returns Message handler function
   */
  static createHandler(conversationContext: ConversationContext) {
    return async (message: BaseContextMessage) => {
      const handler = new ConversationMessageHandler(conversationContext);
      
      if (message.category === 'request' && 'dataType' in message) {
        return handler.handleRequest(message as DataRequestMessage);
      } else if (message.category === 'notification' && 'notificationType' in message) {
        await handler.handleNotification(message as NotificationMessage);
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.CONVERSATION,
          message.sourceContext || '*',
          message.id || 'unknown',
          'processed',
        );
      }
      
      // Return error for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.CONVERSATION,
        message.sourceContext || '*',
        message.id || 'unknown',
        'INVALID_MESSAGE_FORMAT',
        'Message format not recognized',
      );
    };
  }
  
  /**
   * Private constructor to enforce using createHandler
   * 
   * @param conversationContext The conversation context to handle messages for
   */
  private constructor(private conversationContext: ConversationContext) {}
  
  /**
   * Handle data request messages
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleRequest(request: DataRequestMessage) {
    const dataType = request.dataType as DataRequestType;
    
    switch (dataType) {
    case DataRequestType.CONVERSATION_HISTORY:
      return this.handleConversationHistory(request);
        
    default:
      return MessageFactory.createErrorResponse(
        ContextId.CONVERSATION,
        request.sourceContext,
        request.id,
        'UNSUPPORTED_DATA_TYPE',
        `Unsupported data type: ${request.dataType}`,
      );
    }
  }
  
  /**
   * Handle notification messages
   * 
   * @param notification Notification message
   */
  private async handleNotification(notification: NotificationMessage) {
    const notificationType = notification.notificationType as NotificationType;
    
    switch (notificationType) {
    case NotificationType.NOTE_CREATED:
      this.logger.debug('Conversation context received note created notification');
      // Process new note if needed
      break;
        
    default:
      this.logger.debug(`Conversation context received unhandled notification type: ${notificationType}`);
      break;
    }
  }
  
  /**
   * Handle conversation history request
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleConversationHistory(request: DataRequestMessage) {
    try {
      // Since this method doesn't exist, we need to adapt it to use what's available
      // const history = await this.conversationContext.getConversationTextHistory();
      
      const history = await this.conversationContext.getConversationHistory('');  // Pass required parameter
      
      return MessageFactory.createSuccessResponse(
        ContextId.CONVERSATION,
        request.sourceContext,
        request.id,
        { history },
      );
    } catch (error) {
      return MessageFactory.createErrorResponse(
        ContextId.CONVERSATION,
        request.sourceContext,
        request.id,
        'HISTORY_ERROR',
        `Error retrieving conversation history: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}