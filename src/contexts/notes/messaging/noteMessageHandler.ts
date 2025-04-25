/**
 * Note Context Message Handler
 * 
 * This module provides message handling capabilities for the NoteContext,
 * allowing it to process request and notification messages from the
 * cross-context messaging system.
 */

import { ContextId } from '@/protocol/core/contextOrchestrator';
import { DataRequestType, MessageFactory, NotificationType } from '@/protocol/messaging';
import type { ContextCommunicationMessage, DataRequestMessage, NotificationMessage } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { NoteContext } from '../noteContext';

/**
 * Handler for note context messages
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates an instance with explicit dependencies
 * - createHandler(): Creates a message handler function (original functionality)
 */
export class NoteMessageHandler {
  /**
   * Singleton instance of NoteMessageHandler
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: NoteMessageHandler | null = null;
  
  /**
   * Logger instance for this class
   */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of the handler
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param noteContext The note context to handle messages for
   * @returns The shared NoteMessageHandler instance
   */
  public static getInstance(noteContext?: NoteContext): NoteMessageHandler {
    if (!NoteMessageHandler.instance && noteContext) {
      NoteMessageHandler.instance = new NoteMessageHandler(noteContext);
      
      const logger = Logger.getInstance();
      logger.debug('NoteMessageHandler singleton instance created');
    } else if (!NoteMessageHandler.instance) {
      throw new Error('NoteMessageHandler.getInstance() called without required noteContext');
    } else if (noteContext) {
      // Log a warning if trying to get instance with different dependencies
      const logger = Logger.getInstance();
      logger.warn('getInstance called with context but instance already exists. Context ignored.');
    }
    
    return NoteMessageHandler.instance;
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
      if (NoteMessageHandler.instance) {
        // Resource cleanup if needed
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during NoteMessageHandler instance reset:', error);
    } finally {
      NoteMessageHandler.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('NoteMessageHandler singleton instance reset');
    }
  }
  
  /**
   * Create a fresh handler instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param noteContext The note context to handle messages for
   * @returns A new NoteMessageHandler instance
   */
  public static createFresh(noteContext: NoteContext): NoteMessageHandler {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh NoteMessageHandler instance');
    
    return new NoteMessageHandler(noteContext);
  }
  
  /**
   * Create a new handler instance with explicit dependencies
   * 
   * Part of the Component Interface Standardization pattern.
   * Uses the configOrDependencies pattern for flexible dependency injection.
   * 
   * @param configOrDependencies Configuration or explicit dependencies
   * @returns A new NoteMessageHandler instance with the provided dependencies
   */
  public static createWithDependencies(
    configOrDependencies: Record<string, unknown> = {},
  ): NoteMessageHandler {
    const logger = Logger.getInstance();
    logger.debug('Creating NoteMessageHandler with dependencies');
    
    // Handle the case where dependencies are explicitly provided
    if ('noteContext' in configOrDependencies) {
      const noteContext = configOrDependencies['noteContext'] as NoteContext;
      return new NoteMessageHandler(noteContext);
    }
    
    // Cannot create without a note context
    throw new Error('NoteMessageHandler requires a noteContext dependency');
  }
  
  /**
   * Create a message handler for the note context
   * 
   * This is the original functionality, maintained for backward compatibility.
   * 
   * @param noteContext The note context to handle messages for
   * @returns Message handler function
   */
  static createHandler(noteContext: NoteContext) {
    return async (message: ContextCommunicationMessage) => {
      const handler = new NoteMessageHandler(noteContext);
      
      if (message.category === 'request' && 'dataType' in message) {
        return handler.handleRequest(message);
      } else if (message.category === 'notification' && 'notificationType' in message) {
        await handler.handleNotification(message);
        // Return acknowledgment for notifications
        return MessageFactory.createAcknowledgment(
          ContextId.NOTES,
          message.sourceContext,
          message.id,
          'processed',
        );
      }
      
      // Return error for unrecognized message format
      return MessageFactory.createErrorResponse(
        ContextId.NOTES,
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
   * @param noteContext The note context to handle messages for
   */
  private constructor(private noteContext: NoteContext) {}
  
  /**
   * Handle data request messages
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleRequest(request: DataRequestMessage) {
    const dataType = request.dataType;
    
    switch (dataType) {
    case DataRequestType.NOTES_SEARCH:
      return this.handleNotesSearch(request);
        
    case DataRequestType.NOTE_BY_ID:
      return this.handleNoteById(request);
        
    default:
      return MessageFactory.createErrorResponse(
        ContextId.NOTES,
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
    case NotificationType.PROFILE_UPDATED:
      this.logger.debug('Note context received profile update notification');
      // Could update note templates or default tags based on profile
      break;
        
    case NotificationType.CONVERSATION_STARTED:
      this.logger.debug('Note context received conversation start notification');
      // Could prepare note storage or context for conversation
      break;
        
    default:
      this.logger.debug(`Note context received unhandled notification type: ${notificationType}`);
      break;
    }
  }
  
  /**
   * Handle notes search request
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleNotesSearch(request: DataRequestMessage) {
    try {
      const query = request.parameters?.['query'] as string;
      const limit = request.parameters?.['limit'] as number;
      
      if (!query) {
        return MessageFactory.createErrorResponse(
          ContextId.NOTES,
          request.sourceContext,
          request.id,
          'MISSING_PARAMETER',
          'Query parameter is required for note search',
        );
      }
      
      // Create a search options object
      const searchOptions = {
        query,
        limit: limit || undefined,
        semanticSearch: true, 
      };
      
      // Search notes using the options object
      const notes = await this.noteContext.searchNotes(searchOptions);
      
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
  
  /**
   * Handle get note by ID request
   * 
   * @param request Data request message
   * @returns Response message
   */
  private async handleNoteById(request: DataRequestMessage) {
    try {
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
      
      const note = await this.noteContext.getNoteById(noteId);
      
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
    } catch (error) {
      return MessageFactory.createErrorResponse(
        ContextId.NOTES,
        request.sourceContext,
        request.id,
        'READ_ERROR',
        `Error retrieving note: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}