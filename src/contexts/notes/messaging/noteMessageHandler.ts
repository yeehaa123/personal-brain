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
 */
export class NoteMessageHandler {
  private logger = Logger.getInstance();
  
  /**
   * Create a message handler for the note context
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
   * Private constructor to enforce using createHandler
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