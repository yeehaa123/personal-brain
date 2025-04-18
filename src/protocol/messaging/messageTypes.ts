/**
 * Message Types for Cross-Context Communication
 * 
 * This module defines specialized message types for communication
 * between different contexts in the system. These messages build upon
 * the base protocol message format but are specific to context interactions.
 */

import type { BaseMessage } from '../formats/messageFormats';

/**
 * Base interface for context-to-context messages
 */
export interface ContextMessage extends BaseMessage {
  /** Source context identifier */
  sourceContext: string;
  /** Target context identifier */
  targetContext: string;
  /** Message category */
  category: 'request' | 'response' | 'notification';
}

/**
 * Message for requesting data from another context
 */
export interface DataRequestMessage extends ContextMessage {
  category: 'request';
  /** Type of data being requested */
  dataType: string;
  /** Optional query parameters */
  parameters?: Record<string, unknown>;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Message for responding to a data request
 */
export interface DataResponseMessage extends ContextMessage {
  category: 'response';
  /** ID of the request message this is responding to */
  requestId: string;
  /** Status of the response */
  status: 'success' | 'error' | 'partial';
  /** The requested data (if successful) */
  data?: Record<string, unknown>;
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Message for notifying other contexts of events
 */
export interface NotificationMessage extends ContextMessage {
  category: 'notification';
  /** Type of notification */
  notificationType: string;
  /** Data related to the notification */
  payload: Record<string, unknown>;
  /** Whether this notification requires acknowledgment */
  requiresAck?: boolean;
}

/**
 * Message for acknowledging notifications
 */
export interface AcknowledgmentMessage extends ContextMessage {
  category: 'response';
  /** ID of the notification being acknowledged */
  notificationId: string;
  /** Status of the acknowledgment */
  status: 'received' | 'processed' | 'rejected';
  /** Optional message */
  message?: string;
}

/**
 * Context data request types
 */
export enum DataRequestType {
  /** Request for notes by search criteria */
  NOTES_SEARCH = 'notes.search',
  /** Request for a specific note by ID */
  NOTE_BY_ID = 'notes.byId',
  /** Request for profile data */
  PROFILE_DATA = 'profile.data',
  /** Request for conversation history */
  CONVERSATION_HISTORY = 'conversation.history',
  /** Request for external sources data */
  EXTERNAL_SOURCES = 'externalSources.search',
  /** Request for website generation status */
  WEBSITE_STATUS = 'website.status',
}

/**
 * Context notification types
 */
export enum NotificationType {
  /** Notification that a note was created */
  NOTE_CREATED = 'notes.created',
  /** Notification that a note was updated */
  NOTE_UPDATED = 'notes.updated',
  /** Notification that a note was deleted */
  NOTE_DELETED = 'notes.deleted',
  /** Notification that a profile was updated */
  PROFILE_UPDATED = 'profile.updated',
  /** Notification that a conversation was started */
  CONVERSATION_STARTED = 'conversation.started',
  /** Notification that a conversation was cleared */
  CONVERSATION_CLEARED = 'conversation.cleared',
  /** Notification that a turn was added to a conversation */
  CONVERSATION_TURN_ADDED = 'conversation.turnAdded',
  /** Notification that external sources were enabled/disabled */
  EXTERNAL_SOURCES_STATUS = 'externalSources.statusChanged',
  /** Notification that a website was generated */
  WEBSITE_GENERATED = 'website.generated',
  /** Notification that a website was deployed */
  WEBSITE_DEPLOYED = 'website.deployed',
}

/**
 * Union type for all context message types
 */
export type ContextCommunicationMessage = 
  | DataRequestMessage 
  | DataResponseMessage 
  | NotificationMessage 
  | AcknowledgmentMessage;