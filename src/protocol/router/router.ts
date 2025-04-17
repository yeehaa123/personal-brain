/**
 * Protocol Message Router
 * 
 * This module implements a router for protocol messages, handling
 * routing between different components and contexts according to
 * message type and content.
 */

import { nanoid } from 'nanoid';

import type { 
  BaseMessage, 
  CommandMessage, 
  EventMessage, 
  ProtocolMessage, 
  QueryMessage, 
  ResponseMessage, 
} from '@/protocol/formats/messageFormats';
import logger from '@/utils/logger';

/**
 * Handler function type for message handlers
 */
export type MessageHandler = (message: ProtocolMessage) => Promise<ResponseMessage | void>;

/**
 * Router for protocol messages
 */
export class ProtocolRouter {
  private static instance: ProtocolRouter | null = null;
  
  // Message type handlers
  private queryHandlers: Map<string, MessageHandler> = new Map();
  private commandHandlers: Map<string, MessageHandler> = new Map();
  private eventHandlers: Map<string, MessageHandler> = new Map();
  
  // Component specific handlers
  private componentHandlers: Map<string, MessageHandler> = new Map();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    logger.debug('Protocol Router initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProtocolRouter {
    if (!ProtocolRouter.instance) {
      ProtocolRouter.instance = new ProtocolRouter();
    }
    return ProtocolRouter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    ProtocolRouter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  public static createFresh(): ProtocolRouter {
    return new ProtocolRouter();
  }
  
  /**
   * Register a handler for query messages
   * 
   * @param source Source context/component to handle
   * @param handler The handler function
   */
  public registerQueryHandler(source: string, handler: MessageHandler): void {
    this.queryHandlers.set(source, handler);
    logger.debug(`Registered query handler for source: ${source}`);
  }
  
  /**
   * Register a handler for command messages
   * 
   * @param command Command name to handle
   * @param handler The handler function
   */
  public registerCommandHandler(command: string, handler: MessageHandler): void {
    this.commandHandlers.set(command, handler);
    logger.debug(`Registered command handler for command: ${command}`);
  }
  
  /**
   * Register a handler for event messages
   * 
   * @param event Event name to handle
   * @param handler The handler function
   */
  public registerEventHandler(event: string, handler: MessageHandler): void {
    this.eventHandlers.set(event, handler);
    logger.debug(`Registered event handler for event: ${event}`);
  }
  
  /**
   * Register a handler for a specific component
   * 
   * @param component Component name to handle
   * @param handler The handler function
   */
  public registerComponentHandler(component: string, handler: MessageHandler): void {
    this.componentHandlers.set(component, handler);
    logger.debug(`Registered component handler for component: ${component}`);
  }
  
  /**
   * Route a message to the appropriate handler
   * 
   * @param message The message to route
   * @returns The response message or void if no response
   */
  public async routeMessage(message: ProtocolMessage): Promise<ResponseMessage | void> {
    logger.debug(`Routing message of type ${message.type} from ${message.source}`);
    
    // Check if there's a specific handler for the target component
    if (message.target && this.componentHandlers.has(message.target)) {
      return this.componentHandlers.get(message.target)!(message);
    }
    
    // Route based on message type
    switch (message.type) {
    case 'query':
      return this.routeQueryMessage(message as QueryMessage);
    case 'command':
      return this.routeCommandMessage(message as CommandMessage);
    case 'event':
      return this.routeEventMessage(message as EventMessage);
    case 'response':
      // Responses are typically handled by the original sender
      logger.debug('Received response message, but no handler registered');
      return;
    default:
      logger.warn(`Unknown message type: ${(message as BaseMessage).type}`);
      return this.createErrorResponse(message, 'unknown_message_type', 'Unknown message type');
    }
  }
  
  /**
   * Route a query message
   * 
   * @param message The query message
   * @returns The response message or void if no response
   */
  private async routeQueryMessage(message: QueryMessage): Promise<ResponseMessage | void> {
    // Find a handler for the source
    const handler = this.queryHandlers.get(message.source);
    if (handler) {
      return handler(message);
    }
    
    logger.warn(`No handler registered for query from source: ${message.source}`);
    return this.createErrorResponse(
      message, 
      'unknown_query_source', 
      `No handler registered for query from source: ${message.source}`,
    );
  }
  
  /**
   * Route a command message
   * 
   * @param message The command message
   * @returns The response message or void if no response
   */
  private async routeCommandMessage(message: CommandMessage): Promise<ResponseMessage | void> {
    // Find a handler for the command
    const handler = this.commandHandlers.get(message.command);
    if (handler) {
      return handler(message);
    }
    
    logger.warn(`No handler registered for command: ${message.command}`);
    return this.createErrorResponse(
      message, 
      'unknown_command', 
      `No handler registered for command: ${message.command}`,
    );
  }
  
  /**
   * Route an event message
   * 
   * @param message The event message
   */
  private async routeEventMessage(message: EventMessage): Promise<void> {
    // Find handlers for the event
    const handler = this.eventHandlers.get(message.event);
    if (handler) {
      await handler(message);
    } else {
      logger.debug(`No handler registered for event: ${message.event}`);
    }
    
    // Events don't typically have responses
    return;
  }
  
  /**
   * Create an error response message
   * 
   * @param originalMessage The message that triggered the error
   * @param code Error code
   * @param message Error message
   * @returns The error response message
   */
  private createErrorResponse(
    originalMessage: ProtocolMessage,
    code: string,
    message: string,
  ): ResponseMessage {
    return {
      id: nanoid(),
      timestamp: new Date(),
      type: 'response',
      source: 'router',
      target: originalMessage.source,
      correlationId: originalMessage.id,
      status: 'error',
      data: {},
      error: {
        code,
        message,
      },
    };
  }
}