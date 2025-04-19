/**
 * External Source Context Message Handler
 * 
 * This module provides message handling capabilities for the ExternalSourceContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import { 
  DataRequestType, 
  MessageFactory, 
  NotificationType, 
} from '@/protocol/messaging';
import type { 
  ContextMessage,
  DataRequestMessage,
  DataResponseMessage,
  NotificationMessage,
} from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { ExternalSourceContext } from '../core/externalSourceContext';

/**
 * Handler for external source context messages
 */
export class ExternalSourceMessageHandler {
  private logger = Logger.getInstance();
  
  /**
   * Create a message handler for the external source context
   * 
   * @param externalSourceContext The external source context to handle messages for
   * @returns Message handler function
   */
  static createHandler(externalSourceContext: ExternalSourceContext) {
    return async (message: ContextMessage): Promise<DataResponseMessage> => {
      const handler = new ExternalSourceMessageHandler(externalSourceContext);
      
      if (message.category === 'request' && 'dataType' in message) {
        return handler.handleRequest(message as DataRequestMessage);
      } else if (message.category === 'notification' && 'notificationType' in message) {
        await handler.handleNotification(message as NotificationMessage);
        
        // Create a success response as an acknowledgment for the notification
        // This meets the DataResponseMessage interface requirements
        return MessageFactory.createSuccessResponse(
          ContextId.EXTERNAL_SOURCES,
          message.sourceContext || '*',
          message.id || 'unknown',
          {
            acknowledged: true,
            message: 'Notification processed',
          },
        );
      }
      
      // Return error for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.EXTERNAL_SOURCES,
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
   * @param externalSourceContext The external source context to handle messages for
   */
  private constructor(private externalSourceContext: ExternalSourceContext) {}
  
  /**
   * Handle data request messages
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleRequest(request: DataRequestMessage): Promise<DataResponseMessage> {
    const dataType = request.dataType;
    
    switch (dataType) {
    case DataRequestType.EXTERNAL_SOURCES:
      return this.handleExternalSourcesSearch(request);
        
    default:
      return MessageFactory.createErrorResponse(
        ContextId.EXTERNAL_SOURCES,
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
  private async handleNotification(notification: NotificationMessage): Promise<void> {
    const notificationType = notification.notificationType;
    
    switch (notificationType) {
    case NotificationType.CONVERSATION_STARTED:
      this.logger.debug('External sources context received conversation start notification');
      // Could prepare external source access for the conversation
      break;
        
    default:
      this.logger.debug(`External sources context received unhandled notification type: ${notificationType}`);
      break;
    }
  }
  
  /**
   * Handle external sources search request
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleExternalSourcesSearch(request: DataRequestMessage): Promise<DataResponseMessage> {
    try {
      const query = request.parameters?.['query'] as string;
      
      if (!query) {
        return MessageFactory.createErrorResponse(
          ContextId.EXTERNAL_SOURCES,
          request.sourceContext,
          request.id,
          'MISSING_PARAMETER',
          'Query parameter is required for external sources search',
        );
      }
      
      // Use the search method instead of the non-existent searchExternalSources
      const results = await this.externalSourceContext.search(query);
      
      return MessageFactory.createSuccessResponse(
        ContextId.EXTERNAL_SOURCES,
        request.sourceContext,
        request.id,
        { results },
      );
    } catch (error) {
      return MessageFactory.createErrorResponse(
        ContextId.EXTERNAL_SOURCES,
        request.sourceContext,
        request.id,
        'SEARCH_ERROR',
        `Error searching external sources: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}