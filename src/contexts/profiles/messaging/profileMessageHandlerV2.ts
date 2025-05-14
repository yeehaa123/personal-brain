/**
 * Profile Message Handler V2
 * 
 * Handles incoming messages for ProfileContextV2 from other contexts.
 */

import type { ProfileContextV2 } from '@/contexts/profiles/profileContextV2';
import type { Profile } from '@/models/profile';
import { MessageFactory } from '@/protocol/messaging/messageFactory';
import { 
  type ContextCommunicationMessage, 
  type DataRequestMessage, 
  DataRequestType,
  type DataResponseMessage,
  type NotificationMessage,
} from '@/protocol/messaging/messageTypes';
import { Logger } from '@/utils/logger';

/**
 * Options for ProfileMessageHandlerV2
 */
export interface ProfileMessageHandlerV2Options {
  profileContext?: ProfileContextV2;
}

/**
 * Handles incoming messages for ProfileContextV2
 */
export class ProfileMessageHandlerV2 {
  private static instance: ProfileMessageHandlerV2 | null = null;
  
  /** Profile context */
  private profileContext: ProfileContextV2;
  
  /** Logger instance */
  private logger: Logger;
  
  /**
   * Private constructor to enforce getInstance() usage
   */
  private constructor(
    profileContext: ProfileContextV2,
  ) {
    this.profileContext = profileContext;
    this.logger = Logger.getInstance();
    
    this.logger.debug('ProfileMessageHandlerV2 initialized', { context: 'ProfileMessageHandlerV2' });
  }
  
  /**
   * Get the singleton instance
   * 
   * @param profileContext Profile context
   * @returns The singleton instance
   */
  public static getInstance(
    profileContext: ProfileContextV2,
  ): ProfileMessageHandlerV2 {
    if (!ProfileMessageHandlerV2.instance) {
      ProfileMessageHandlerV2.instance = new ProfileMessageHandlerV2(
        profileContext,
      );
    }
    return ProfileMessageHandlerV2.instance;
  }
  
  /**
   * Reset the singleton instance
   * This is primarily used for testing
   */
  public static resetInstance(): void {
    ProfileMessageHandlerV2.instance = null;
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options: ProfileMessageHandlerV2Options): ProfileMessageHandlerV2 {
    if (!options.profileContext) {
      throw new Error('Profile context is required');
    }
    
    return new ProfileMessageHandlerV2(
      options.profileContext,
    );
  }
  
  /**
   * Handle an incoming message
   * 
   * @param message The message to handle
   * @returns Response message or void
   */
  public async handleMessage(message: ContextCommunicationMessage): Promise<ContextCommunicationMessage | void> {
    if (message.category === 'request') {
      return await this.handleRequest(message as DataRequestMessage);
    } else if (message.category === 'notification') {
      await this.handleNotification(message);
      return;
    }
    return;
  }

  /**
   * Handle a data request message
   * 
   * @param message Data request message
   * @returns Response message
   */
  private async handleRequest(message: DataRequestMessage): Promise<DataResponseMessage> {
    try {
      this.logger.debug('Handling profile context request', { 
        requestType: message.dataType,
        context: 'ProfileMessageHandlerV2', 
      });
      
      // Check if this is a valid data request
      if (!message.dataType) {
        this.logger.error('Invalid data request message', { message, context: 'ProfileMessageHandlerV2' });
        return MessageFactory.createErrorResponse(
          message.id,
          message.sourceContext,
          message.targetContext,
          'Invalid data request message',
        );
      }
      
      // Handle different request types
      switch (message.dataType) {
      case DataRequestType.PROFILE_DATA:
        return await this.handleGetProfile(message);
        
      default:
        this.logger.warn('Unhandled request type', { 
          requestType: message.dataType,
          context: 'ProfileMessageHandlerV2', 
        });
        return MessageFactory.createErrorResponse(
          message.id,
          message.sourceContext,
          message.targetContext,
          `Unsupported request type: ${message.dataType}`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling profile context request', { error, context: 'ProfileMessageHandlerV2' });
      
      return MessageFactory.createErrorResponse(
        message.id,
        message.sourceContext,
        message.targetContext,
        'Error handling request',
      );
    }
  }
  
  /**
   * Handle a notification message
   * 
   * @param message Notification message
   */
  private async handleNotification(message: ContextCommunicationMessage): Promise<void> {
    try {
      if (message.category !== 'notification') {
        this.logger.error('Invalid notification message category', { message, context: 'ProfileMessageHandlerV2' });
        return;
      }
      
      const notificationMessage = message as NotificationMessage;
      
      this.logger.debug('Handling profile context notification', { 
        notificationType: notificationMessage.notificationType,
        context: 'ProfileMessageHandlerV2', 
      });
      
      // Check if this is a valid notification
      if (!notificationMessage.notificationType) {
        this.logger.error('Invalid notification message', { message, context: 'ProfileMessageHandlerV2' });
        return;
      }
      
      // Handle different notification types
      switch (notificationMessage.notificationType) {
      // Add specific notification handlers if needed
      default:
        this.logger.debug('Ignoring notification type', { 
          notificationType: notificationMessage.notificationType,
          context: 'ProfileMessageHandlerV2', 
        });
        break;
      }
    } catch (error) {
      this.logger.error('Error handling profile context notification', { error, context: 'ProfileMessageHandlerV2' });
    }
  }
  
  /**
   * Handle a get profile request
   * 
   * @param message Get profile request message
   * @returns Response with profile data
   */
  private async handleGetProfile(message: DataRequestMessage): Promise<DataResponseMessage> {
    try {
      const profile = await this.profileContext.getProfile();
      
      return MessageFactory.createDataResponse<Profile | null>(
        message.id,
        message.sourceContext,
        message.targetContext,
        DataRequestType.PROFILE_DATA,
        profile,
      );
    } catch (error) {
      this.logger.error('Error handling get profile request', { error, context: 'ProfileMessageHandlerV2' });
      return MessageFactory.createErrorResponse(
        message.id,
        message.sourceContext,
        message.targetContext,
        'Error retrieving profile',
      );
    }
  }
}