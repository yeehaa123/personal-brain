/**
 * Website Context Message Handler
 * 
 * This module provides message handling capabilities for the WebsiteContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates an instance with explicit dependencies
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import { 
  DataRequestType,
  NotificationType, 
} from '@/protocol/messaging';
import type { 
  DataRequestMessage, 
  NotificationMessage,
} from '@/protocol/messaging';
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
 * Options for creating a WebsiteMessageHandler
 */
export interface WebsiteMessageHandlerOptions {
  websiteContext: WebsiteContext;
}

/**
 * Handler for website context messages
 */
export class WebsiteMessageHandler {
  /**
   * Singleton instance of WebsiteMessageHandler
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: WebsiteMessageHandler | null = null;
  
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of the message handler
   * 
   * @param options Handler configuration options
   * @returns The singleton instance
   */
  public static getInstance(options?: WebsiteMessageHandlerOptions): WebsiteMessageHandler {
    if (!WebsiteMessageHandler.instance) {
      if (!options?.websiteContext) {
        throw new Error('WebsiteContext is required to initialize WebsiteMessageHandler');
      }
      WebsiteMessageHandler.instance = new WebsiteMessageHandler(options.websiteContext);
    }
    return WebsiteMessageHandler.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    WebsiteMessageHandler.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Handler configuration options
   * @returns A new instance
   */
  public static createFresh(options: WebsiteMessageHandlerOptions): WebsiteMessageHandler {
    if (!options?.websiteContext) {
      throw new Error('WebsiteContext is required to initialize WebsiteMessageHandler');
    }
    return new WebsiteMessageHandler(options.websiteContext);
  }
  
  /**
   * Create an instance with explicit dependencies (primarily for testing/DI)
   * 
   * @param _config Optional configuration object (unused but kept for pattern consistency)
   * @param dependencies Dependencies object with required websiteContext
   * @returns A new instance with the specified dependencies
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    dependencies: { websiteContext: WebsiteContext },
  ): WebsiteMessageHandler {
    if (!dependencies.websiteContext) {
      throw new Error('WebsiteContext is required to initialize WebsiteMessageHandler');
    }
    
    return new WebsiteMessageHandler(dependencies.websiteContext);
  }
  
  /**
   * Private constructor to enforce using factory methods
   * 
   * @param websiteContext The website context to handle messages for
   */
  private constructor(private websiteContext: WebsiteContext) {}
  
  /**
   * Get a message handler function for registering with a mediator
   * 
   * @returns A function that can handle context messages
   */
  public getMessageHandlerFunction() {
    return async (message: BaseContextMessage) => {
      if (message.category === 'request' && 'dataType' in message) {
        return this.handleRequest(message as DataRequestMessage);
      } else if (message.category === 'notification' && 'notificationType' in message) {
        await this.handleNotification(message as NotificationMessage);
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