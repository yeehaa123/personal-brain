/**
 * Profile Context Message Handler
 * 
 * This module provides message handling capabilities for the ProfileContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import { DataRequestType, MessageFactory, NotificationType } from '@/protocol/messaging';
import type { ContextCommunicationMessage, DataRequestMessage, NotificationMessage } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { ProfileContext } from '../profileContext';

/**
 * Handler for profile context messages
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates an instance with explicit dependencies
 * - createHandler(): Creates a message handler function (original functionality)
 */
export class ProfileMessageHandler {
  /**
   * Singleton instance of ProfileMessageHandler
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ProfileMessageHandler | null = null;
  
  /**
   * Logger instance for this class
   */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of the handler
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param profileContext The profile context to handle messages for
   * @returns The shared ProfileMessageHandler instance
   */
  public static getInstance(profileContext?: ProfileContext): ProfileMessageHandler {
    if (!ProfileMessageHandler.instance && profileContext) {
      ProfileMessageHandler.instance = new ProfileMessageHandler(profileContext);
      
      const logger = Logger.getInstance();
      logger.debug('ProfileMessageHandler singleton instance created');
    } else if (!ProfileMessageHandler.instance) {
      throw new Error('ProfileMessageHandler.getInstance() called without required profileContext');
    } else if (profileContext) {
      // Log a warning if trying to get instance with different dependencies
      const logger = Logger.getInstance();
      logger.warn('getInstance called with context but instance already exists. Context ignored.');
    }
    
    return ProfileMessageHandler.instance;
  }
  
  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // No specific cleanup needed for this handler
      if (ProfileMessageHandler.instance) {
        // Resource cleanup if needed
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during ProfileMessageHandler instance reset:', error);
    } finally {
      ProfileMessageHandler.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('ProfileMessageHandler singleton instance reset');
    }
  }
  
  /**
   * Create a fresh handler instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param profileContext The profile context to handle messages for
   * @returns A new ProfileMessageHandler instance
   */
  public static createFresh(profileContext: ProfileContext): ProfileMessageHandler {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ProfileMessageHandler instance');
    
    return new ProfileMessageHandler(profileContext);
  }
  
  /**
   * Create a new handler instance with explicit dependencies
   * 
   * Part of the Component Interface Standardization pattern.
   * Uses the configOrDependencies pattern for flexible dependency injection.
   * 
   * @param configOrDependencies Configuration or explicit dependencies
   * @returns A new ProfileMessageHandler instance with the provided dependencies
   */
  public static createWithDependencies(
    configOrDependencies: Record<string, unknown> = {},
  ): ProfileMessageHandler {
    const logger = Logger.getInstance();
    logger.debug('Creating ProfileMessageHandler with dependencies');
    
    // Handle the case where dependencies are explicitly provided
    if ('profileContext' in configOrDependencies) {
      const profileContext = configOrDependencies['profileContext'] as ProfileContext;
      return new ProfileMessageHandler(profileContext);
    }
    
    // Cannot create without a profile context
    throw new Error('ProfileMessageHandler requires a profileContext dependency');
  }
  
  /**
   * Create a message handler for the profile context
   * 
   * This is the original functionality, maintained for backward compatibility.
   * 
   * @param profileContext The profile context to handle messages for
   * @returns Message handler function
   */
  static createHandler(profileContext: ProfileContext) {
    return async (message: ContextCommunicationMessage) => {
      const handler = new ProfileMessageHandler(profileContext);
      
      if (message.category === 'request' && 'dataType' in message) {
        return handler.handleRequest(message);
      } else if (message.category === 'notification' && 'notificationType' in message) {
        await handler.handleNotification(message);
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.PROFILE,
          message.sourceContext,
          message.id,
          'processed',
        );
      }
      
      // Default return value for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.PROFILE,
        message.sourceContext,
        message.id,
        'INVALID_MESSAGE_FORMAT',
        'Message format not recognized',
      );
    };
  }
  
  /**
   * Private constructor to enforce using factory methods
   * 
   * @param profileContext The profile context to handle messages for
   */
  private constructor(private profileContext: ProfileContext) {}
  
  /**
   * Handle data request messages
   * This exposed public method is used by the ContextMessaging wrapper
   * 
   * @param request Data request message
   * @returns Response message
   */
  public async handleRequest(request: DataRequestMessage) {
    const dataType = request.dataType;
    
    switch (dataType) {
    case DataRequestType.PROFILE_DATA:
      return this.handleProfileData(request);
        
    default:
      return MessageFactory.createErrorResponse(
        ContextId.PROFILE,
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
  public async handleNotification(notification: NotificationMessage) {
    const notificationType = notification.notificationType;
    
    switch (notificationType) {
    case NotificationType.NOTE_CREATED:
      this.logger.debug('Profile context received note creation notification');
      // Could update profile with new note information
      break;
        
    case NotificationType.NOTE_UPDATED:
      this.logger.debug('Profile context received note update notification');
      // Could update profile interests based on note updates
      break;
        
    default:
      this.logger.debug(`Profile context received unhandled notification type: ${notificationType}`);
      break;
    }
  }
  
  /**
   * Handle profile data request
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleProfileData(request: DataRequestMessage) {
    try {
      const profile = await this.profileContext.getProfile();
      
      if (!profile) {
        return MessageFactory.createErrorResponse(
          ContextId.PROFILE,
          request.sourceContext,
          request.id,
          'PROFILE_NOT_FOUND',
          'No profile data available',
        );
      }
      
      return MessageFactory.createSuccessResponse(
        ContextId.PROFILE,
        request.sourceContext,
        request.id,
        { profile },
      );
    } catch (error) {
      return MessageFactory.createErrorResponse(
        ContextId.PROFILE,
        request.sourceContext,
        request.id,
        'PROFILE_ERROR',
        `Error retrieving profile: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}