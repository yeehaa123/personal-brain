/**
 * Mock ConversationManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { ConversationContext } from '@/contexts';
import type { Conversation } from '@/protocol/schemas/conversationSchemas';
import type { IConversationManager } from '@/protocol/types';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';

export class MockConversationManager implements IConversationManager {
  private static instance: MockConversationManager | null = null;
  private conversationContext: ConversationContext;
  private hasActive = true;
  private currentConversationId = 'mock-conversation-1';
  private conversationHistory = 'User: Test query\nAssistant: Test response';

  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockConversationManager {
    if (!MockConversationManager.instance) {
      MockConversationManager.instance = new MockConversationManager(options);
    }
    return MockConversationManager.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockConversationManager.instance = null;
  }

  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockConversationManager {
    return new MockConversationManager(options);
  }

  private constructor(options?: Record<string, unknown>) {
    // Use provided context or create fresh one
    const providedContext = options && options['conversationContext'] as ConversationContext;
    this.conversationContext = providedContext ||
      (MockConversationContext.createFresh() as unknown as ConversationContext);

    // Set up with options if provided
    if (options && options['hasActiveConversation'] === false) {
      this.hasActive = false;
    }

    // Removed currentRoomId handling

    if (options && typeof options['currentConversationId'] === 'string') {
      this.currentConversationId = options['currentConversationId'] as string;
    }

    if (options && typeof options['conversationHistory'] === 'string') {
      this.conversationHistory = options['conversationHistory'] as string;
    }
  }

  getConversationContext(): ConversationContext {
    return this.conversationContext;
  }

  async setCurrentRoom(roomId: string): Promise<void> {
    // Just update the conversation ID based on room
    this.currentConversationId = `mock-conversation-${roomId}`;
  }

  initializeConversation = mock(async () => {
    this.hasActive = true;
  });

  hasActiveConversation(): boolean {
    return this.hasActive;
  }

  /**
   * For testing - set the hasActive state
   */
  setHasActiveConversation(value: boolean): void {
    this.hasActive = value;
  }

  getCurrentConversationId(): string | null {
    return this.hasActive ? this.currentConversationId : null;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const id = conversationId || this.currentConversationId;
    return {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      roomId: 'mock-room',
      interfaceType: 'cli',
    };
  }

  async saveTurn(_query: string, _response: string): Promise<void> {
    // Mock implementation - do nothing
  }

  async getConversationHistory(): Promise<string> {
    return this.conversationHistory;
  }
}
