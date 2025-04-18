/**
 * Mock ContextMediator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { MessageHandler } from '@/protocol/messaging/contextMediator';
import type { 
  DataRequestMessage, 
  DataResponseMessage, 
  NotificationMessage, 
} from '@/protocol/messaging/messageTypes';

/**
 * Options for the mock context mediator
 */
export interface MockContextMediatorOptions {
  /** Whether sendRequest should succeed */
  shouldRequestSucceed?: boolean;
  /** Mock response data */
  mockResponseData?: Record<string, unknown>;
  /** Contexts that have been registered */
  registeredContexts?: string[];
}

/**
 * Mock implementation of ContextMediator
 */
export class MockContextMediator {
  private static instance: MockContextMediator | null = null;
  
  // Mock state
  private handlers: Map<string, MessageHandler> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private shouldRequestSucceed: boolean;
  private mockResponseData: Record<string, unknown>;
  private registeredContexts: string[];
  
  // Mock functions
  public registerHandler: (contextId: string, handler: MessageHandler) => void;
  public unregisterHandler: (contextId: string) => boolean;
  public sendRequest: (request: DataRequestMessage) => Promise<DataResponseMessage>;
  public sendNotification: (notification: NotificationMessage) => Promise<string[]>;
  public subscribe: (contextId: string, notificationType: string) => void;
  public unsubscribe: (contextId: string, notificationType: string) => boolean;
  public getRegisteredContexts: () => string[];
  public getSubscribers: (notificationType: string) => string[];
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: MockContextMediatorOptions): MockContextMediator {
    if (!MockContextMediator.instance) {
      MockContextMediator.instance = new MockContextMediator(options);
    }
    return MockContextMediator.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContextMediator.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: MockContextMediatorOptions): MockContextMediator {
    return new MockContextMediator(options);
  }
  
  /**
   * Constructor
   */
  constructor(options?: MockContextMediatorOptions) {
    // Set up mock state
    this.shouldRequestSucceed = options?.shouldRequestSucceed ?? true;
    this.mockResponseData = options?.mockResponseData ?? { acknowledged: true };
    this.registeredContexts = options?.registeredContexts ?? ['notes-context', 'profile-context', 'conversation-context'];
    
    // Mock functions
    this.registerHandler = mock((contextId: string, handler: MessageHandler) => {
      this.handlers.set(contextId, handler);
    });
    
    this.unregisterHandler = mock((contextId: string) => {
      return this.handlers.delete(contextId);
    });
    
    const mockSendRequest = async (request: DataRequestMessage): Promise<DataResponseMessage> => {
      // Create a successful or error response based on configuration
      if (this.shouldRequestSucceed) {
        return {
          id: `response-${request.id}`,
          sourceContext: request.targetContext,
          targetContext: request.sourceContext,
          category: 'response',
          requestId: request.id,
          status: 'success',
          timestamp: new Date(),
          type: 'data',
          source: 'mock',
          data: this.mockResponseData,
        } as DataResponseMessage;
      } else {
        return {
          id: `response-${request.id}`,
          sourceContext: request.targetContext,
          targetContext: request.sourceContext,
          category: 'response',
          requestId: request.id,
          status: 'error',
          timestamp: new Date(),
          type: 'data',
          source: 'mock',
          error: {
            code: 'MOCK_ERROR',
            message: 'Mock error response',
          },
        } as DataResponseMessage;
      }
    };
    
    this.sendRequest = mock(mockSendRequest);
    
    this.sendNotification = mock(async (notification: NotificationMessage) => {
      // Return a list of context IDs that would have received the notification
      const subscribers = this.subscriptions.get(notification.notificationType) || new Set();
      
      if (notification.targetContext === '*') {
        return this.registeredContexts;
      } else if (subscribers.has(notification.targetContext)) {
        return [notification.targetContext];
      }
      
      return [];
    });
    
    this.subscribe = mock((contextId: string, notificationType: string) => {
      if (!this.subscriptions.has(notificationType)) {
        this.subscriptions.set(notificationType, new Set());
      }
      
      this.subscriptions.get(notificationType)!.add(contextId);
    });
    
    this.unsubscribe = mock((contextId: string, notificationType: string) => {
      const subscribers = this.subscriptions.get(notificationType);
      
      if (subscribers && subscribers.has(contextId)) {
        subscribers.delete(contextId);
        return true;
      }
      
      return false;
    });
    
    this.getRegisteredContexts = mock(() => {
      return this.registeredContexts;
    });
    
    this.getSubscribers = mock((notificationType: string) => {
      const subscribers = this.subscriptions.get(notificationType);
      return subscribers ? Array.from(subscribers) : [];
    });
  }
  
  /**
   * Set whether requests should succeed
   */
  setShouldRequestSucceed(succeed: boolean): void {
    this.shouldRequestSucceed = succeed;
  }
  
  /**
   * Set mock response data
   */
  setMockResponseData(data: Record<string, unknown>): void {
    this.mockResponseData = data;
  }
}