/**
 * Profile Context Notifier
 * 
 * This module provides notification capabilities for the ProfileContext,
 * allowing it to send notifications to other contexts when profiles are
 * updated or changed.
 */

import type { Profile } from '@/models/profile';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { ContextMediator } from '@/protocol/messaging';
import { MessageFactory, NotificationType } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';


/**
 * Notifier for profile-related events
 */
export class ProfileNotifier {
  private logger = Logger.getInstance();
  
  /**
   * Create a new profile notifier
   * 
   * @param mediator Context mediator for sending notifications
   */
  constructor(private mediator: ContextMediator) {}
  
  /**
   * Notify other contexts that a profile was updated
   * 
   * @param profile The profile that was updated
   */
  async notifyProfileUpdated(profile: Profile): Promise<void> {
    try {
      // Send notification about profile update
      // We include minimal non-sensitive information in the notification
      const notification = MessageFactory.createNotification(
        ContextId.PROFILE,
        '*', // Broadcast to all interested contexts
        NotificationType.PROFILE_UPDATED,
        {
          // Include only basic metadata
          id: profile.id,
          summary: profile.summary,
          updatedAt: profile.updatedAt,
          // Do not include sensitive information
        },
      );
      
      const recipients = await this.mediator.sendNotification(notification);
      if (recipients && recipients.length) {
        this.logger.debug(`Profile updated notification sent to ${recipients.length} contexts`);
      } else {
        this.logger.debug('No subscribers received profile updated notification');
      }
    } catch (error) {
      this.logger.error('Error sending profile updated notification:', error);
    }
  }
}