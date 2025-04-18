/**
 * Profile Context Message Handler
 * 
 * This module provides message handling capabilities for the ProfileContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 */

import { ContextId } from '@/protocol/core/contextOrchestratorExtended';
import { DataRequestType, MessageFactory, NotificationType } from '@/protocol/messaging';
import type { ContextCommunicationMessage, DataRequestMessage, NotificationMessage } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { ProfileContext } from '../core/profileContext';

/**
 * Handler for profile context messages
 */
export class ProfileMessageHandler {
  private logger = Logger.getInstance();
  
  /**
   * Create a message handler for the profile context
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
   * Private constructor to enforce using createHandler
   * 
   * @param profileContext The profile context to handle messages for
   */
  private constructor(private profileContext: ProfileContext) {}
  
  /**
   * Handle data request messages
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleRequest(request: DataRequestMessage) {
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
  private async handleNotification(notification: NotificationMessage) {
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