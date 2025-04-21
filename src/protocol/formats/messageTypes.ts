/**
 * Unified Message Type System
 * 
 * This module defines a hierarchical set of message interfaces to be used
 * throughout the protocol and messaging systems. It consolidates previously
 * separate message formats into a unified, inheritance-based system with
 * no backward compatibility layers.
 */

/**
 * Base message interface for all protocol messages
 */
export interface BaseMessage {
  /** Unique message identifier */
  id: string;
  /** Timestamp of message creation */
  timestamp: Date;
  /** Message type identifier */
  type: string;
  /** Source component/context identifier */
  source: string;
  /** Optional target component/context identifier */
  target?: string;
}

/**
 * Base request message for all request types
 */
export interface RequestMessage extends BaseMessage {
  /** Common fields for all requests */
  requestType: 'query' | 'command' | 'data';
  /** Optional parameters for the request */
  parameters?: Record<string, unknown>;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Base response message for all response types
 */
export interface ResponseMessage extends BaseMessage {
  /** ID of the message being responded to */
  correlationId: string;
  /** Response status */
  status: 'success' | 'error' | 'partial';
  /** Response data (if successful) */
  data?: Record<string, unknown>;
  /** Error information (if status is 'error') */
  error?: ErrorInfo;
}

/**
 * Base notification message for all events and notifications
 */
export interface NotificationMessage extends BaseMessage {
  /** Type of notification */
  eventType: string;
  /** Data related to the notification */
  payload: Record<string, unknown>;
  /** Whether this notification requires acknowledgment */
  requiresAck?: boolean;
}

/**
 * Standard error information structure
 */
export interface ErrorInfo {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional error details */
  details?: Record<string, unknown>;
}

/**
 * Query-specific request message
 */
export interface QueryRequestMessage extends RequestMessage {
  requestType: 'query';
  /** The query text/content */
  content: string;
  /** Optional context for the query */
  context?: Record<string, unknown>;
}

/**
 * Command-specific request message
 */
export interface CommandRequestMessage extends RequestMessage {
  requestType: 'command';
  /** Command name/identifier */
  command: string;
  /** Optional command arguments */
  args?: Record<string, unknown>;
  /** Optional command metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Data-specific request message
 */
export interface DataRequestMessage extends RequestMessage {
  requestType: 'data';
  /** Type of data being requested */
  dataType: string;
}

/**
 * Acknowledgment-specific response message
 */
export interface AcknowledgmentMessage extends ResponseMessage {
  /** ID of the notification being acknowledged */
  notificationId: string;
  /** Specific acknowledgment status */
  ackStatus: 'received' | 'processed' | 'rejected';
  /** Optional message */
  message?: string;
}

/**
 * Context-specific request message (for cross-context communication)
 */
export interface ContextRequestMessage extends RequestMessage {
  /** Source context identifier */
  sourceContext: string;
  /** Target context identifier */
  targetContext: string;
}

/**
 * Context-specific response message (for cross-context communication)
 */
export interface ContextResponseMessage extends ResponseMessage {
  /** Source context identifier */
  sourceContext: string;
  /** Target context identifier */
  targetContext: string;
}

/**
 * Context-specific notification (for cross-context communication)
 */
export interface ContextNotificationMessage extends NotificationMessage {
  /** Source context identifier */
  sourceContext: string;
  /** Target context identifier */
  targetContext: string;
  /** More specific notification type */
  notificationType: string;
}

/**
 * Data request types
 */
export enum DataRequestType {
  NOTES_SEARCH = 'notes.search',
  NOTE_BY_ID = 'notes.byId',
  PROFILE_DATA = 'profile.data',
  CONVERSATION_HISTORY = 'conversation.history',
  EXTERNAL_SOURCES = 'externalSources.search',
  WEBSITE_STATUS = 'website.status',
}

/**
 * Notification types
 */
export enum NotificationType {
  NOTE_CREATED = 'notes.created',
  NOTE_UPDATED = 'notes.updated',
  NOTE_DELETED = 'notes.deleted',
  PROFILE_UPDATED = 'profile.updated',
  CONVERSATION_STARTED = 'conversation.started',
  CONVERSATION_CLEARED = 'conversation.cleared',
  CONVERSATION_TURN_ADDED = 'conversation.turnAdded',
  EXTERNAL_SOURCES_STATUS = 'externalSources.statusChanged',
  WEBSITE_GENERATED = 'website.generated',
  WEBSITE_DEPLOYED = 'website.deployed',
}

/**
 * Union type for all message types
 */
export type ProtocolMessage = 
  | RequestMessage
  | ResponseMessage
  | NotificationMessage
  | QueryRequestMessage
  | CommandRequestMessage
  | DataRequestMessage
  | AcknowledgmentMessage
  | ContextRequestMessage
  | ContextResponseMessage
  | ContextNotificationMessage;