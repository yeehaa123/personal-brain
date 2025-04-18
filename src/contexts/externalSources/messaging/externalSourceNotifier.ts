/**
 * External Source Context Notifier
 * 
 * This module provides notification capabilities for the ExternalSourceContext,
 * allowing it to send notifications to other contexts when external source
 * operations occur.
 */

import type { ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';
import { ContextId } from '@/protocol/core/contextOrchestratorExtended';
import type { ContextMediator } from '@/protocol/messaging';
import { MessageFactory, NotificationType } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

/**
 * Notifier for external source-related events
 */
export class ExternalSourceNotifier {
  private logger = Logger.getInstance();
  
  /**
   * Create a new external source notifier
   * 
   * @param mediator Context mediator for sending notifications
   */
  constructor(private mediator: ContextMediator) {}
  
  /**
   * Notify other contexts that external sources were searched
   * 
   * @param query The search query
   * @param results The search results
   */
  async notifyExternalSourceSearched(
    query: string, 
    results: ExternalSourceResult[],
  ): Promise<void> {
    try {
      // Only send if we have results to avoid unnecessary notifications
      if (results.length === 0) {
        this.logger.debug('No external search results to notify about');
        return;
      }
      
      const notification = MessageFactory.createNotification(
        ContextId.EXTERNAL_SOURCES,
        '*', // Broadcast to all interested contexts
        NotificationType.EXTERNAL_SOURCES_STATUS, // Use existing notification type as best match
        {
          action: 'search_completed',
          query,
          resultCount: results.length,
          sources: [...new Set(results.map(r => r.sourceType))],
          // Don't include full results to keep notification size reasonable
          topResults: results.slice(0, 3).map(r => ({
            title: r.title,
            source: r.source,
            sourceType: r.sourceType,
            timestamp: r.timestamp,
          })),
        },
      );
      
      const recipients = await this.mediator.sendNotification(notification);
      if (recipients && recipients.length) {
        this.logger.debug(`External search notification sent to ${recipients.length} contexts`);
      } else {
        this.logger.debug('No subscribers received external search notification');
      }
    } catch (error) {
      this.logger.error('Error sending external search notification:', error);
    }
  }
  
  /**
   * Notify other contexts that source availability has changed
   * 
   * @param availability Record mapping source names to availability status
   */
  async notifySourceAvailabilityChanged(
    availability: Record<string, boolean>,
  ): Promise<void> {
    try {
      const notification = MessageFactory.createNotification(
        ContextId.EXTERNAL_SOURCES,
        '*', // Broadcast to all interested contexts
        NotificationType.EXTERNAL_SOURCES_STATUS, // Use existing notification type
        {
          action: 'availability_changed',
          sourceAvailability: availability,
          timestamp: new Date().toISOString(),
        },
      );
      
      const recipients = await this.mediator.sendNotification(notification);
      if (recipients && recipients.length) {
        this.logger.debug(`Source availability notification sent to ${recipients.length} contexts`);
      } else {
        this.logger.debug('No subscribers received source availability notification');
      }
    } catch (error) {
      this.logger.error('Error sending source availability notification:', error);
    }
  }
}