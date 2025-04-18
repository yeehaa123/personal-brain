/**
 * Protocol Router
 * 
 * Routes incoming protocol messages to the appropriate handlers based on
 * message type, content, and routing rules.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { v4 as uuidv4 } from 'uuid';

import { Logger } from '@/utils/logger';

import type { CommandMessage, EventMessage, ProtocolMessage, QueryMessage, ResponseMessage } from '../formats/messageFormats';

/**
 * Handler function for protocol messages
 */
export type MessageHandler = (message: ProtocolMessage) => Promise<ResponseMessage>;

/**
 * Route definition for a message pattern
 */
export interface Route {
  /** Pattern for matching messages (command name, query regex, etc.) */
  pattern: string | RegExp;
  /** Message types this route applies to */
  types: Array<'query' | 'command' | 'event'>;
  /** Handler function for matched messages */
  handler: MessageHandler;
  /** Priority order (higher number = higher priority) */
  priority: number;
}

/**
 * Configuration options for ProtocolRouter
 */
export interface ProtocolRouterOptions {
  /** Initial routes to register */
  routes?: Route[];
}

/**
 * Routes protocol messages to appropriate handlers
 */
export class ProtocolRouter {
  private static instance: ProtocolRouter | null = null;
  
  /** Registered routes */
  private routes: Route[] = [];
  
  /** Logger instance */
  private logger = Logger.getInstance();
  
  /**
   * Get the singleton instance of ProtocolRouter
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options: ProtocolRouterOptions = {}): ProtocolRouter {
    if (!ProtocolRouter.instance) {
      ProtocolRouter.instance = new ProtocolRouter(options);
      
      const logger = Logger.getInstance();
      logger.debug('ProtocolRouter singleton instance created');
    }
    
    return ProtocolRouter.instance;
  }
  
  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   */
  public static resetInstance(): void {
    ProtocolRouter.instance = null;
    
    const logger = Logger.getInstance();
    logger.debug('ProtocolRouter singleton instance reset');
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options: ProtocolRouterOptions = {}): ProtocolRouter {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ProtocolRouter instance');
    
    return new ProtocolRouter(options);
  }
  
  /**
   * Private constructor to enforce getInstance() usage
   * 
   * @param options Configuration options
   */
  private constructor(options: ProtocolRouterOptions) {
    // Register initial routes if provided
    if (options.routes) {
      this.routes = [...options.routes];
    }
    
    this.logger.debug(`ProtocolRouter initialized with ${this.routes.length} routes`);
  }
  
  /**
   * Register a new route
   * 
   * @param route Route definition
   */
  registerRoute(route: Route): void {
    this.routes.push(route);
    
    // Sort routes by priority (descending)
    this.routes.sort((a, b) => b.priority - a.priority);
    
    this.logger.debug(`Registered route with pattern ${route.pattern} for ${route.types.join(', ')}`);
  }
  
  /**
   * Remove a route by pattern and types
   * 
   * @param pattern Pattern to match
   * @param types Message types
   * @returns Whether a route was removed
   */
  removeRoute(pattern: string | RegExp, types: Array<'query' | 'command' | 'event'>): boolean {
    const initialCount = this.routes.length;
    
    // Filter out routes that match the pattern and types
    this.routes = this.routes.filter(route => {
      // If the patterns don't match, keep the route
      if (route.pattern !== pattern) {
        return true;
      }
      
      // If any of the types don't match, keep the route
      for (const type of types) {
        if (!route.types.includes(type)) {
          return true;
        }
      }
      
      // If we're here, the route matches both pattern and types, so remove it
      return false;
    });
    
    const removed = initialCount > this.routes.length;
    if (removed) {
      this.logger.debug(`Removed route with pattern ${pattern} for ${types.join(', ')}`);
    }
    
    return removed;
  }
  
  /**
   * Get all registered routes
   * 
   * @returns Array of routes
   */
  getRoutes(): Route[] {
    return [...this.routes];
  }
  
  /**
   * Find a matching route for a message
   * 
   * @param message Protocol message
   * @returns Matching route or null if no match
   */
  findRoute(message: ProtocolMessage): Route | null {
    // Find the first matching route based on message type and pattern
    for (const route of this.routes) {
      // Check if the route handles this message type
      if (!route.types.includes(message.type as 'query' | 'command' | 'event')) {
        continue;
      }
      
      // For command messages, match by exact command name
      if (message.type === 'command') {
        const cmdMessage = message as CommandMessage;
        if (route.pattern === cmdMessage.command) {
          return route;
        }
      }
      
      // For query messages, match by regex pattern if the pattern is a RegExp
      if (message.type === 'query' && route.pattern instanceof RegExp) {
        const queryMessage = message as QueryMessage;
        if (route.pattern.test(queryMessage.content)) {
          return route;
        }
      }
      
      // For event messages, match by exact event name if pattern is a string
      if (message.type === 'event' && typeof route.pattern === 'string') {
        const eventMessage = message as EventMessage;
        if (route.pattern === eventMessage.event) {
          return route;
        }
      }
    }
    
    // No matching route found
    return null;
  }
  
  /**
   * Route a message to the appropriate handler
   * 
   * @param message Protocol message to route
   * @returns Response message from the handler
   */
  async routeMessage(message: ProtocolMessage): Promise<ResponseMessage> {
    this.logger.debug(`Routing ${message.type} message from ${message.source}`);
    
    // Find a matching route
    const route = this.findRoute(message);
    
    if (route) {
      // Use the matched route's handler
      this.logger.debug(`Found matching route for ${message.type} message`);
      return route.handler(message);
    } else {
      // No matching route, create an error response
      this.logger.warn(`No matching route for ${message.type} message from ${message.source}`);
      
      const now = new Date();
      const errorResponse: ResponseMessage = {
        id: uuidv4(),
        timestamp: now,
        type: 'response',
        source: 'router',
        target: message.source,
        correlationId: message.id,
        status: 'error',
        data: {},
        error: {
          code: 'NO_MATCHING_ROUTE',
          message: `No matching route found for ${message.type} message`,
        },
      };
      
      return errorResponse;
    }
  }
}
