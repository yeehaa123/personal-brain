/**
 * Website Context Message Handler
 * 
 * This module provides message handling capabilities for the WebsiteContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import { 
  type DataRequestMessage, 
  DataRequestType,
  type NotificationMessage, 
  NotificationType, 
} from '@/protocol/messaging/messageTypes';
import { MessageFactory } from '@/protocol/messaging/messageFactory';
import { Logger } from '@/utils/logger';

import type { WebsiteContext } from '../websiteContext';

/**
 * Interface for message with common properties
 */
interface BaseContextMessage {
  category: string;
  sourceContext?: string;
  id?: string;
}

/**
 * Handler for website context messages
 */
export class WebsiteMessageHandler {
  private logger = Logger.getInstance();
  
  /**
   * Create a message handler for the website context
   * 
   * @param websiteContext The website context to handle messages for
   * @returns Message handler function
   */
  static createHandler(websiteContext: WebsiteContext) {
    return async (message: BaseContextMessage) => {
      const handler = new WebsiteMessageHandler(websiteContext);
      
      if (message.category === 'request' && 'dataType' in message) {
        return handler.handleRequest(message as DataRequestMessage);
      } else if (message.category === 'notification' && 'notificationType' in message) {
        await handler.handleNotification(message as NotificationMessage);
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.WEBSITE,
          message.sourceContext || '*',
          message.id || 'unknown',
          'processed',
        );
      }
      
      // Return error for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.WEBSITE,
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
   * @param websiteContext The website context to handle messages for
   */
  private constructor(private websiteContext: WebsiteContext) {}
  
  /**
   * Handle data request messages
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleRequest(request: DataRequestMessage) {
    const dataType = request.dataType as DataRequestType;
    
    switch (dataType) {
    case DataRequestType.WEBSITE_STATUS:
      return this.handleWebsiteStatus(request);
        
    default:
      return MessageFactory.createErrorResponse(
        ContextId.WEBSITE,
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
    case NotificationType.PROFILE_UPDATED:
      this.logger.debug('Website context received profile update notification');
      // Could update website content based on profile changes
      break;
        
    default:
      this.logger.debug(`Website context received unhandled notification type: ${notificationType}`);
      break;
    }
  }
  
  /**
   * Handle website status request
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleWebsiteStatus(request: DataRequestMessage) {
    try {
      const status = await this.websiteContext.handleWebsiteStatus();
      
      return MessageFactory.createSuccessResponse(
        ContextId.WEBSITE,
        request.sourceContext,
        request.id,
        { status: status.data || {} },
      );
    } catch (error) {
      return MessageFactory.createErrorResponse(
        ContextId.WEBSITE,
        request.sourceContext,
        request.id,
        'STATUS_ERROR',
        `Error retrieving website status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}