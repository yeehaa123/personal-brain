/**
 * Message Format Definitions
 * 
 * This module defines common message formats for protocol communication
 * between components in the system.
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
 * Query message for requesting information
 */
export interface QueryMessage extends BaseMessage {
  type: 'query';
  /** The query text/content */
  content: string;
  /** Optional context for the query */
  context?: Record<string, unknown>;
  /** Optional parameters for query processing */
  parameters?: Record<string, unknown>;
}

/**
 * Command message for requesting actions
 */
export interface CommandMessage extends BaseMessage {
  type: 'command';
  /** Command name/identifier */
  command: string;
  /** Optional command arguments */
  args?: Record<string, unknown>;
  /** Optional command metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Event message for notifications
 */
export interface EventMessage extends BaseMessage {
  type: 'event';
  /** Event name/identifier */
  event: string;
  /** Event payload */
  payload: Record<string, unknown>;
}

/**
 * Response message for query or command responses
 */
export interface ResponseMessage extends BaseMessage {
  type: 'response';
  /** ID of the message being responded to */
  correlationId: string;
  /** Response status */
  status: 'success' | 'error' | 'partial';
  /** Response data */
  data: Record<string, unknown>;
  /** Optional error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for all message types
 */
export type ProtocolMessage = 
  | QueryMessage 
  | CommandMessage 
  | EventMessage 
  | ResponseMessage;