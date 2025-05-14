/**
 * Mock ContextMediator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { ContextMediator, MessageHandler } from '@/protocol/messaging/contextMediator';
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
  /** Configuration for testing error scenarios */
  errorMode?: {
    dataRequests?: boolean;
    notifications?: boolean;
  };
}

/**
 * Mock implementation of ContextMediator
 */
export class MockContextMediator {
  private static instance: MockContextMediator | null = null;

  // Mock state
  private handlers: Map<string, MessageHandler> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private errorMode: {
    dataRequests: boolean;
    notifications: boolean;
  };
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
  static getInstance(options?: MockContextMediatorOptions): ContextMediator {
    if (!MockContextMediator.instance) {
      MockContextMediator.instance = new MockContextMediator(options);
    }
    return MockContextMediator.instance as unknown as ContextMediator;
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
  static createFresh(options?: MockContextMediatorOptions): ContextMediator {
    return new MockContextMediator(options) as unknown as ContextMediator;
  }

  /**
   * Constructor
   */
  constructor(options?: MockContextMediatorOptions) {
    // Set up mock state
    this.errorMode = {
      dataRequests: options?.errorMode?.dataRequests ?? ((options?.shouldRequestSucceed === false) || false),
      notifications: options?.errorMode?.notifications ?? false,
    };
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
      if (!this.errorMode.dataRequests) {
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
      // Check if we should simulate an error for notifications
      if (this.errorMode.notifications) {
        throw new Error('Mock notification error');
      }
      
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
      return Array.from(this.registeredContexts);
    });

    this.getSubscribers = mock((notificationType: string) => {
      const subscribers = this.subscriptions.get(notificationType);
      return subscribers ? Array.from(subscribers) : [];
    });
  }

  /**
   * Configure this mock for testing - this method can be called 
   * through type casting when needed for tests
   */
  _configure(options: { 
    errorMode?: { dataRequests?: boolean; notifications?: boolean };
    responseData?: Record<string, unknown>;
    profileData?: Record<string, unknown>;
  }): void {
    if (options.errorMode) {
      if (options.errorMode.dataRequests !== undefined) {
        this.errorMode.dataRequests = options.errorMode.dataRequests;
      }
      if (options.errorMode.notifications !== undefined) {
        this.errorMode.notifications = options.errorMode.notifications;
      }
    }
    
    if (options.responseData) {
      this.mockResponseData = options.responseData;
    }
    
    // For profile data requests
    if (options.profileData) {
      this.mockResponseData = options.profileData;
    }
  }
}
