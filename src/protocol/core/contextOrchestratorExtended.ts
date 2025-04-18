/**
 * Context Orchestrator with Messaging Support
 * 
 * Extended version of ContextOrchestrator that integrates with the
 * cross-context messaging system. This version adds messaging capabilities
 * to the standard orchestrator.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type {
  ConversationContext,
  ExternalSourceContext,
  NoteContext,
  ProfileContext,
  WebsiteContext,
} from '@/contexts';
import { Logger } from '@/utils/logger';

import type { BrainProtocolConfig } from '../config/brainProtocolConfig';
import type { ContextManager } from '../managers/contextManager';
import type { ContextMediator, MessageHandler } from '../messaging/contextMediator';
import { MessageFactory } from '../messaging/messageFactory';
import { DataRequestType, NotificationType } from '../messaging/messageTypes';

import type { ContextOrchestrator } from './contextOrchestrator';

/**
 * Configuration options for extending ContextOrchestrator
 */
export interface ContextOrchestratorExtendedOptions {
  /** Original context orchestrator instance */
  orchestrator: ContextOrchestrator;
  /** Context mediator for messaging */
  mediator: ContextMediator;
  /** Configuration for the orchestrator */
  config: BrainProtocolConfig;
}

/**
 * Context identifiers for registered contexts
 */
export enum ContextId {
  NOTES = 'notes-context',
  PROFILE = 'profile-context',
  CONVERSATION = 'conversation-context',
  EXTERNAL_SOURCES = 'external-sources-context',
  WEBSITE = 'website-context',
}

/**
 * Extended context orchestrator with messaging support
 */
export class ContextOrchestratorExtended {
  private static instance: ContextOrchestratorExtended | null = null;
  
  /** Original context orchestrator */
  private orchestrator: ContextOrchestrator;
  
  /** Context mediator for messaging */
  private mediator: ContextMediator;
  
  // Protocol configuration is passed to the orchestrator
  // We don't need to store it separately
  
  /** Logger instance */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of ContextOrchestratorExtended
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options: ContextOrchestratorExtendedOptions): ContextOrchestratorExtended {
    if (!ContextOrchestratorExtended.instance) {
      ContextOrchestratorExtended.instance = new ContextOrchestratorExtended(options);
      
      const logger = Logger.getInstance();
      logger.debug('ContextOrchestratorExtended singleton instance created');
    }
    
    return ContextOrchestratorExtended.instance;
  }
  
  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   */
  public static resetInstance(): void {
    ContextOrchestratorExtended.instance = null;
    
    const logger = Logger.getInstance();
    logger.debug('ContextOrchestratorExtended singleton instance reset');
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options: ContextOrchestratorExtendedOptions): ContextOrchestratorExtended {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ContextOrchestratorExtended instance');
    
    return new ContextOrchestratorExtended(options);
  }
  
  /**
   * Private constructor to enforce getInstance() usage
   * 
   * @param options Configuration options
   */
  private constructor(options: ContextOrchestratorExtendedOptions) {
    this.orchestrator = options.orchestrator;
    this.mediator = options.mediator;
    
    // Set up message handlers for each context
    this.registerContextHandlers();
    
    // Set up subscriptions for notifications
    this.registerSubscriptions();
    
    this.logger.debug('ContextOrchestratorExtended initialized');
  }
  
  /**
   * Register message handlers for each context
   */
  private registerContextHandlers(): void {
    // Register handler for each context
    this.mediator.registerHandler(ContextId.NOTES, this.createNoteContextHandler());
    this.mediator.registerHandler(ContextId.PROFILE, this.createProfileContextHandler());
    this.mediator.registerHandler(ContextId.CONVERSATION, this.createConversationContextHandler());
    this.mediator.registerHandler(ContextId.EXTERNAL_SOURCES, this.createExternalSourcesContextHandler());
    this.mediator.registerHandler(ContextId.WEBSITE, this.createWebsiteContextHandler());
    
    this.logger.debug('Registered message handlers for all contexts');
  }
  
  /**
   * Register subscriptions for notifications
   */
  private registerSubscriptions(): void {
    // Notes context subscriptions
    this.mediator.subscribe(ContextId.NOTES, NotificationType.PROFILE_UPDATED);
    this.mediator.subscribe(ContextId.NOTES, NotificationType.CONVERSATION_STARTED);
    
    // Profile context subscriptions
    this.mediator.subscribe(ContextId.PROFILE, NotificationType.NOTE_CREATED);
    this.mediator.subscribe(ContextId.PROFILE, NotificationType.NOTE_UPDATED);
    
    // Conversation context subscriptions
    this.mediator.subscribe(ContextId.CONVERSATION, NotificationType.NOTE_CREATED);
    this.mediator.subscribe(ContextId.CONVERSATION, NotificationType.PROFILE_UPDATED);
    this.mediator.subscribe(ContextId.CONVERSATION, NotificationType.EXTERNAL_SOURCES_STATUS);
    
    // External sources context subscriptions
    this.mediator.subscribe(ContextId.EXTERNAL_SOURCES, NotificationType.CONVERSATION_STARTED);
    
    // Website context subscriptions
    this.mediator.subscribe(ContextId.WEBSITE, NotificationType.PROFILE_UPDATED);
    
    this.logger.debug('Registered subscriptions for all contexts');
  }
  
  /**
   * Create message handler for the Notes context
   * 
   * @returns Message handler function
   */
  private createNoteContextHandler(): MessageHandler {
    const noteContext = this.orchestrator.getNoteContext();
    
    return async (message) => {
      if (message.category === 'request' && 'dataType' in message) {
        const request = message;
        
        // Handle different data request types
        switch (request.dataType) {
        case DataRequestType.NOTES_SEARCH: {
          try {
            const searchParams = request.parameters || {};
            // Create search options object instead of using positional parameters
            const searchOptions = {
              query: searchParams['query'] as string,
              limit: searchParams['limit'] as number,
              semanticSearch: true,
            };
            
            const notes = await noteContext.searchNotes(searchOptions);
              
            return MessageFactory.createSuccessResponse(
              ContextId.NOTES,
              request.sourceContext,
              request.id,
              { notes },
            );
          } catch (error) {
            return MessageFactory.createErrorResponse(
              ContextId.NOTES,
              request.sourceContext,
              request.id,
              'SEARCH_ERROR',
              `Error searching notes: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
            
        case DataRequestType.NOTE_BY_ID: {
          const noteId = request.parameters?.['id'] as string;
          if (!noteId) {
            return MessageFactory.createErrorResponse(
              ContextId.NOTES,
              request.sourceContext,
              request.id,
              'MISSING_PARAMETER',
              'Note ID is required',
            );
          }
            
          const note = await noteContext.getNoteById(noteId);
          if (!note) {
            return MessageFactory.createErrorResponse(
              ContextId.NOTES,
              request.sourceContext,
              request.id,
              'NOTE_NOT_FOUND',
              `Note with ID ${noteId} not found`,
            );
          }
            
          return MessageFactory.createSuccessResponse(
            ContextId.NOTES,
            request.sourceContext,
            request.id,
            { note },
          );
        }
            
        default:
          return MessageFactory.createErrorResponse(
            ContextId.NOTES,
            request.sourceContext,
            request.id,
            'UNSUPPORTED_DATA_TYPE',
            `Unsupported data type: ${request.dataType}`,
          );
        }
      } else if (message.category === 'notification' && 'notificationType' in message) {
        // Handle notifications
        const notification = message;
        
        switch (notification.notificationType) {
        case NotificationType.PROFILE_UPDATED: {
          this.logger.debug('Notes context received profile update notification');
          // Handle profile update if needed
          break;
        }
            
        case NotificationType.CONVERSATION_STARTED: {
          this.logger.debug('Notes context received conversation start notification');
          // Handle conversation start if needed
          break;
        }
            
        default:
          this.logger.debug(`Notes context received unhandled notification type: ${notification.notificationType}`);
          break;
        }
        
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.NOTES,
          notification.sourceContext || '*',
          notification.id || 'unknown',
          'processed',
        );
      }
      
      // Return error for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.NOTES,
        message.sourceContext || '*',
        message.id || 'unknown',
        'INVALID_MESSAGE_FORMAT',
        'Message format not recognized',
      );
    };
  }
  
  /**
   * Create message handler for the Profile context
   * 
   * @returns Message handler function
   */
  private createProfileContextHandler(): MessageHandler {
    const profileContext = this.orchestrator.getProfileContext();
    
    return async (message) => {
      if (message.category === 'request' && 'dataType' in message) {
        const request = message;
        
        // Handle different data request types
        switch (request.dataType) {
        case DataRequestType.PROFILE_DATA: {
          const profile = await profileContext.getProfile();
            
          return MessageFactory.createSuccessResponse(
            ContextId.PROFILE,
            request.sourceContext,
            request.id,
            { profile },
          );
        }
            
        default:
          return MessageFactory.createErrorResponse(
            ContextId.PROFILE,
            request.sourceContext,
            request.id,
            'UNSUPPORTED_DATA_TYPE',
            `Unsupported data type: ${request.dataType}`,
          );
        }
      } else if (message.category === 'notification' && 'notificationType' in message) {
        // Handle notifications
        const notification = message;
        
        switch (notification.notificationType) {
        case NotificationType.NOTE_CREATED:
        case NotificationType.NOTE_UPDATED: {
          this.logger.debug(`Profile context received ${notification.notificationType} notification`);
          // Handle note update if needed
          break;
        }
            
        default:
          this.logger.debug(`Profile context received unhandled notification type: ${notification.notificationType}`);
          break;
        }
        
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.PROFILE,
          notification.sourceContext || '*',
          notification.id || 'unknown',
          'processed',
        );
      }
      
      // Return error for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.PROFILE,
        message.sourceContext || '*',
        message.id || 'unknown',
        'INVALID_MESSAGE_FORMAT',
        'Message format not recognized',
      );
    };
  }
  
  /**
   * Create message handler for the Conversation context
   * 
   * @returns Message handler function
   */
  private createConversationContextHandler(): MessageHandler {
    const conversationContext = this.orchestrator.getConversationContext();
    
    return async (message) => {
      if (message.category === 'request' && 'dataType' in message) {
        const request = message;
        
        // Handle different data request types
        switch (request.dataType) {
        case DataRequestType.CONVERSATION_HISTORY: {
          const conversationId = request.parameters?.['conversationId'] as string;
          
          if (!conversationId) {
            return MessageFactory.createErrorResponse(
              ContextId.CONVERSATION,
              request.sourceContext,
              request.id,
              'MISSING_PARAMETER',
              'Conversation ID is required',
            );
          }
          
          // Use getConversationHistory instead of non-existent getConversationTextHistory
          const history = await conversationContext.getConversationHistory(conversationId);
            
          return MessageFactory.createSuccessResponse(
            ContextId.CONVERSATION,
            request.sourceContext,
            request.id,
            { history },
          );
        }
            
        default:
          return MessageFactory.createErrorResponse(
            ContextId.CONVERSATION,
            request.sourceContext,
            request.id,
            'UNSUPPORTED_DATA_TYPE',
            `Unsupported data type: ${request.dataType}`,
          );
        }
      } else if (message.category === 'notification' && 'notificationType' in message) {
        // Handle notifications
        const notification = message;
        
        switch (notification.notificationType) {
        case NotificationType.NOTE_CREATED: {
          this.logger.debug('Conversation context received note creation notification');
          // Handle new note if needed
          break;
        }
            
        case NotificationType.PROFILE_UPDATED: {
          this.logger.debug('Conversation context received profile update notification');
          // Handle profile update if needed
          break;
        }
            
        case NotificationType.EXTERNAL_SOURCES_STATUS: {
          this.logger.debug('Conversation context received external sources status notification');
          // No actual action needed here as the orchestrator handles this directly
          break;
        }
        }
        
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.CONVERSATION,
          notification.sourceContext || '*',
          notification.id || 'unknown',
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
   * Create message handler for the External Sources context
   * 
   * @returns Message handler function
   */
  private createExternalSourcesContextHandler(): MessageHandler {
    const externalSourceContext = this.orchestrator.getExternalSourceContext();
    
    return async (message) => {
      if (message.category === 'request' && 'dataType' in message) {
        const request = message;
        
        // Handle different data request types
        switch (request.dataType) {
        case DataRequestType.EXTERNAL_SOURCES: {
          const query = request.parameters?.['query'] as string;
          if (!query) {
            return MessageFactory.createErrorResponse(
              ContextId.EXTERNAL_SOURCES,
              request.sourceContext,
              request.id,
              'MISSING_PARAMETER',
              'Query is required for external sources search',
            );
          }
            
          if (!this.orchestrator.getExternalSourcesEnabled()) {
            return MessageFactory.createErrorResponse(
              ContextId.EXTERNAL_SOURCES,
              request.sourceContext,
              request.id,
              'EXTERNAL_SOURCES_DISABLED',
              'External sources are currently disabled',
            );
          }
            
          const results = await externalSourceContext.search(query);
            
          return MessageFactory.createSuccessResponse(
            ContextId.EXTERNAL_SOURCES,
            request.sourceContext,
            request.id,
            { results },
          );
        }
            
        default:
          return MessageFactory.createErrorResponse(
            ContextId.EXTERNAL_SOURCES,
            request.sourceContext,
            request.id,
            'UNSUPPORTED_DATA_TYPE',
            `Unsupported data type: ${request.dataType}`,
          );
        }
      } else if (message.category === 'notification' && 'notificationType' in message) {
        // Handle notifications
        const notification = message;
        
        switch (notification.notificationType) {
        case NotificationType.CONVERSATION_STARTED: {
          this.logger.debug('External sources context received conversation start notification');
          // Handle conversation start if needed
          break;
        }
          
        default:
          this.logger.debug(`External sources context received unhandled notification type: ${notification.notificationType}`);
          break;
        }
        
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.EXTERNAL_SOURCES,
          notification.sourceContext || '*',
          notification.id || 'unknown',
          'processed',
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
   * Create message handler for the Website context
   * 
   * @returns Message handler function
   */
  private createWebsiteContextHandler(): MessageHandler {
    const websiteContext = this.orchestrator.getWebsiteContext();
    
    return async (message) => {
      if (message.category === 'request' && 'dataType' in message) {
        const request = message;
        
        // Handle different data request types
        switch (request.dataType) {
        case DataRequestType.WEBSITE_STATUS: {
          try {
            // Get environment status instead of non-existent getDeploymentStatus
            const environment = request.parameters?.['environment'] as string || 'preview';
            
            // Use getEnvironmentStatus instead of getDeploymentStatus
            const deploymentManager = await websiteContext.getDeploymentManager();
            const status = await deploymentManager.getEnvironmentStatus(environment as 'preview' | 'production');
            
            return MessageFactory.createSuccessResponse(
              ContextId.WEBSITE,
              request.sourceContext,
              request.id,
              { status },
            );
          } catch (error) {
            return MessageFactory.createErrorResponse(
              ContextId.WEBSITE,
              request.sourceContext,
              request.id,
              'STATUS_ERROR',
              `Error getting website status: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
            
        default:
          return MessageFactory.createErrorResponse(
            ContextId.WEBSITE,
            request.sourceContext,
            request.id,
            'UNSUPPORTED_DATA_TYPE',
            `Unsupported data type: ${request.dataType}`,
          );
        }
      } else if (message.category === 'notification' && 'notificationType' in message) {
        // Handle notifications
        const notification = message;
        
        switch (notification.notificationType) {
        case NotificationType.PROFILE_UPDATED: {
          this.logger.debug('Website context received profile update notification');
          // Update website contents based on profile if needed
          break;
        }
          
        default:
          this.logger.debug(`Website context received unhandled notification type: ${notification.notificationType}`);
          break;
        }
        
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.WEBSITE,
          notification.sourceContext || '*',
          notification.id || 'unknown',
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
   * Send a notification about external sources status change
   * 
   * @param enabled Whether external sources are enabled
   */
  async notifyExternalSourcesStatusChange(enabled: boolean): Promise<void> {
    try {
      const notification = MessageFactory.createNotification(
        'system',
        '*', // Broadcast to all interested contexts
        NotificationType.EXTERNAL_SOURCES_STATUS,
        { enabled },
      );
      
      const receivedBy = await this.mediator.sendNotification(notification);
      if (receivedBy && receivedBy.length) {
        this.logger.debug(`External sources status notification sent to ${receivedBy.length} contexts`);
      } else {
        this.logger.debug('No subscribers received external sources status notification');
      }
    } catch (error) {
      this.logger.error('Error sending external sources status notification:', error);
    }
  }
  
  /**
   * Delegate methods to original orchestrator
   */
  
  getNoteContext(): NoteContext {
    return this.orchestrator.getNoteContext();
  }
  
  getProfileContext(): ProfileContext {
    return this.orchestrator.getProfileContext();
  }
  
  getConversationContext(): ConversationContext {
    return this.orchestrator.getConversationContext();
  }
  
  getExternalSourceContext(): ExternalSourceContext {
    return this.orchestrator.getExternalSourceContext();
  }
  
  getWebsiteContext(): WebsiteContext {
    return this.orchestrator.getWebsiteContext();
  }
  
  setExternalSourcesEnabled(enabled: boolean): void {
    this.orchestrator.setExternalSourcesEnabled(enabled);
    // We'll send the notification but don't await it to avoid test issues
    this.notifyExternalSourcesStatusChange(enabled).catch(error => {
      this.logger.error('Error in notification after setExternalSourcesEnabled:', error);
    });
  }
  
  getExternalSourcesEnabled(): boolean {
    return this.orchestrator.getExternalSourcesEnabled();
  }
  
  areContextsReady(): boolean {
    return this.orchestrator.areContextsReady();
  }
  
  getContextManager(): ContextManager {
    return this.orchestrator.getContextManager();
  }
  
  /**
   * Get the context mediator
   * @returns Context mediator
   */
  getMediator(): ContextMediator {
    return this.mediator;
  }
}