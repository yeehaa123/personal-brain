/**
 * Context Mediator
 * 
 * The Context Mediator centralizes communication between different contexts,
 * decoupling them from direct dependencies on each other. It serves as an
 * intermediary that routes messages, handles dispatching, and manages callbacks.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { Logger } from '@/utils/logger';

import { MessageFactory } from './messageFactory';
import type { 
  AcknowledgmentMessage, 
  ContextCommunicationMessage, 
  DataRequestMessage, 
  DataResponseMessage, 
  NotificationMessage,
} from './messageTypes';

/**
 * Handler for context messages
 */
export type MessageHandler = (message: ContextCommunicationMessage) => Promise<ContextCommunicationMessage | void>;

/**
 * Options for configuring the ContextMediator
 */
export interface ContextMediatorOptions {
  /** Initial message handlers */
  handlers?: Record<string, MessageHandler>;
}

/**
 * Pending request for waiting for a response
 */
interface PendingRequest {
  /** When the request was sent */
  timestamp: Date;
  /** How long to wait (ms) */
  timeout: number;
  /** Resolve function for the promise */
  resolve: (response: DataResponseMessage) => void;
  /** Reject function for the promise */
  reject: (error: Error) => void;
}

/**
 * Mediator for context-to-context communication
 */
export class ContextMediator {
  private static instance: ContextMediator | null = null;
  
  /** Map of context identifiers to message handlers */
  private handlers: Map<string, MessageHandler> = new Map();
  
  /** Map of request IDs to pending requests */
  private pendingRequests: Map<string, PendingRequest> = new Map();
  
  /** Map of notification types to interested contexts */
  private subscriptions: Map<string, Set<string>> = new Map();
  
  /** Logger instance */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of ContextMediator
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options: ContextMediatorOptions = {}): ContextMediator {
    if (!ContextMediator.instance) {
      ContextMediator.instance = new ContextMediator(options);
      
      const logger = Logger.getInstance();
      logger.debug('ContextMediator singleton instance created');
    }
    
    return ContextMediator.instance;
  }
  
  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   */
  public static resetInstance(): void {
    ContextMediator.instance = null;
    
    const logger = Logger.getInstance();
    logger.debug('ContextMediator singleton instance reset');
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options: ContextMediatorOptions = {}): ContextMediator {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ContextMediator instance');
    
    return new ContextMediator(options);
  }
  
  /**
   * Private constructor to enforce getInstance() usage
   * 
   * @param options Configuration options
   */
  private constructor(options: ContextMediatorOptions = {}) {
    // Register initial handlers
    if (options.handlers) {
      for (const [contextId, handler] of Object.entries(options.handlers)) {
        this.registerHandler(contextId, handler);
      }
    }
    
    this.logger.debug('ContextMediator initialized');
  }
  
  /**
   * Register a message handler for a context
   * 
   * @param contextId Context identifier
   * @param handler Message handler function
   */
  registerHandler(contextId: string, handler: MessageHandler): void {
    this.handlers.set(contextId, handler);
    this.logger.debug(`Registered handler for context: ${contextId}`);
  }
  
  /**
   * Unregister a message handler for a context
   * 
   * @param contextId Context identifier
   * @returns Whether a handler was removed
   */
  unregisterHandler(contextId: string): boolean {
    const result = this.handlers.delete(contextId);
    
    if (result) {
      this.logger.debug(`Unregistered handler for context: ${contextId}`);
      
      // Clean up any subscriptions for this context
      for (const [notificationType, subscribers] of this.subscriptions.entries()) {
        if (subscribers.has(contextId)) {
          subscribers.delete(contextId);
          this.logger.debug(`Removed subscription for ${contextId} to ${notificationType}`);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Subscribe a context to a notification type
   * 
   * @param contextId Context identifier
   * @param notificationType Notification type to subscribe to
   */
  subscribe(contextId: string, notificationType: string): void {
    if (!this.subscriptions.has(notificationType)) {
      this.subscriptions.set(notificationType, new Set());
    }
    
    this.subscriptions.get(notificationType)!.add(contextId);
    this.logger.debug(`Context ${contextId} subscribed to ${notificationType}`);
  }
  
  /**
   * Unsubscribe a context from a notification type
   * 
   * @param contextId Context identifier
   * @param notificationType Notification type to unsubscribe from
   * @returns Whether the subscription was removed
   */
  unsubscribe(contextId: string, notificationType: string): boolean {
    const subscribers = this.subscriptions.get(notificationType);
    
    if (subscribers && subscribers.has(contextId)) {
      subscribers.delete(contextId);
      this.logger.debug(`Context ${contextId} unsubscribed from ${notificationType}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Send a data request message and wait for a response
   * 
   * @param request Data request message
   * @returns Promise that resolves with the response
   */
  async sendRequest(request: DataRequestMessage): Promise<DataResponseMessage> {
    const targetHandler = this.handlers.get(request.targetContext);
    
    if (!targetHandler) {
      this.logger.warn(`No handler registered for target context: ${request.targetContext}`);
      
      return MessageFactory.createErrorResponse(
        request.targetContext,
        request.sourceContext,
        request.id,
        'CONTEXT_NOT_FOUND',
        `No handler registered for context: ${request.targetContext}`,
      );
    }
    
    // Create a promise that will resolve when the response is received
    const responsePromise = new Promise<DataResponseMessage>((resolve, reject) => {
      const timeout = request.timeout || 30000; // Default 30 second timeout
      
      // Store the pending request
      this.pendingRequests.set(request.id, {
        timestamp: new Date(),
        timeout,
        resolve,
        reject,
      });
      
      // Set a timeout to reject the promise if no response is received
      globalThis.setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          
          // Create error response for logging but use reject directly
          reject(new Error(`Request timed out: ${request.id}`));
          this.logger.warn(`Request to ${request.targetContext} timed out: ${request.id}`);
        }
      }, timeout);
    });
    
    try {
      // Forward the request to the target handler
      this.logger.debug(`Forwarding request to ${request.targetContext}: ${request.dataType}`);
      
      const response = await targetHandler(request);
      
      // If the handler returned a response directly, resolve the promise
      if (response && 'requestId' in response) {
        this.handleResponse(response as DataResponseMessage);
      }
      
      return responsePromise;
    } catch (error) {
      // If the handler threw an error, create an error response
      this.logger.error(`Error handling request to ${request.targetContext}:`, error);
      
      const errorResponse = MessageFactory.createErrorResponse(
        request.targetContext,
        request.sourceContext,
        request.id,
        'HANDLER_ERROR',
        `Error handling request: ${(error as Error).message}`,
      );
      
      // Clean up the pending request
      this.pendingRequests.delete(request.id);
      
      return errorResponse;
    }
  }
  
  /**
   * Handle a data response message
   * 
   * @param response Data response message
   * @returns Whether the response was handled
   */
  handleResponse(response: DataResponseMessage): boolean {
    const pendingRequest = this.pendingRequests.get(response.requestId);
    
    if (!pendingRequest) {
      this.logger.warn(`No pending request found for response: ${response.requestId}`);
      return false;
    }
    
    // Resolve or reject the promise based on the response status
    if (response.status === 'success') {
      pendingRequest.resolve(response);
    } else {
      pendingRequest.reject(new Error(response.error?.message || 'Unknown error'));
    }
    
    // Clean up the pending request
    this.pendingRequests.delete(response.requestId);
    
    return true;
  }
  
  /**
   * Send a notification to interested contexts
   * 
   * @param notification Notification message
   * @returns Array of contexts that received the notification
   */
  async sendNotification(notification: NotificationMessage): Promise<string[]> {
    const notificationType = notification.notificationType;
    const subscribers = this.subscriptions.get(notificationType) || new Set();
    
    // If this is a broadcast notification, send to all handlers
    const targetContexts = notification.targetContext === '*'
      ? Array.from(this.handlers.keys())
      : subscribers.has(notification.targetContext)
        ? [notification.targetContext]
        : [];
    
    if (targetContexts.length === 0) {
      this.logger.debug(`No subscribers for notification: ${notificationType}`);
      return [];
    }
    
    const receivedBy: string[] = [];
    
    // Send the notification to each subscriber
    for (const contextId of targetContexts) {
      const handler = this.handlers.get(contextId);
      
      if (handler) {
        try {
          this.logger.debug(`Sending ${notificationType} notification to ${contextId}`);
          
          // Clone the notification and set the specific target
          const contextNotification = {
            ...notification,
            targetContext: contextId,
          };
          
          await handler(contextNotification);
          receivedBy.push(contextId);
          
          // If acknowledgment is required, wait for it (not implemented yet)
          if (notification.requiresAck) {
            // TODO: Implement acknowledgment tracking
            this.logger.debug(`Acknowledgment required for notification to ${contextId}`);
          }
        } catch (error) {
          this.logger.error(`Error sending notification to ${contextId}:`, error);
        }
      }
    }
    
    return receivedBy;
  }
  
  /**
   * Handle an acknowledgment message
   * 
   * @param acknowledgment Acknowledgment message
   * @returns Whether the acknowledgment was handled
   */
  handleAcknowledgment(acknowledgment: AcknowledgmentMessage): boolean {
    // TODO: Implement acknowledgment handling
    this.logger.debug(`Received ${acknowledgment.status} acknowledgment for ${acknowledgment.notificationId}`);
    return true;
  }
  
  /**
   * Get all registered context IDs
   * 
   * @returns Array of context identifiers
   */
  getRegisteredContexts(): string[] {
    return Array.from(this.handlers.keys());
  }
  
  /**
   * Get contexts subscribed to a notification type
   * 
   * @param notificationType Notification type
   * @returns Array of subscribed context identifiers
   */
  getSubscribers(notificationType: string): string[] {
    const subscribers = this.subscriptions.get(notificationType);
    return subscribers ? Array.from(subscribers) : [];
  }
  
  /**
   * Clean up timed-out requests
   */
  cleanupTimedOutRequests(): void {
    const now = new Date();
    
    for (const [requestId, request] of this.pendingRequests.entries()) {
      const elapsed = now.getTime() - request.timestamp.getTime();
      
      if (elapsed > request.timeout) {
        this.logger.warn(`Request ${requestId} timed out after ${elapsed}ms`);
        
        request.reject(new Error(`Request timed out after ${elapsed}ms`));
        this.pendingRequests.delete(requestId);
      }
    }
  }
}