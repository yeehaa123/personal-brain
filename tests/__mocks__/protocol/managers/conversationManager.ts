/**
 * Mock ConversationManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { MCPConversationContext } from '@/contexts/conversations';
import type { Conversation } from '@/protocol/schemas/conversationSchemas';
import type { IConversationManager } from '@/protocol/types';
import { MockMCPConversationContext } from '@test/__mocks__/contexts/conversations/MCPConversationContext';

export class MockConversationManager implements IConversationManager {
  private static instance: MockConversationManager | null = null;
  private conversationContext: MockMCPConversationContext;
  private hasActive = true;
  private currentConversationId = 'mock-conversation-1';
  private currentRoomId = 'mock-room-1';
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
    // Create mock conversation context
    this.conversationContext = MockMCPConversationContext.createFresh();

    // Set up mock state with options
    if (options) {
      if (options['hasActiveConversation'] === false) {
        this.hasActive = false;
      }
      if (options['currentRoomId']) {
        this.currentRoomId = options['currentRoomId'] as string;
      }
      if (options['currentConversationId']) {
        this.currentConversationId = options['currentConversationId'] as string;
      }
      if (options['conversationHistory']) {
        this.conversationHistory = options['conversationHistory'] as string;
      }
    }
  }

  getConversationContext(): MCPConversationContext {
    return this.conversationContext as unknown as MCPConversationContext;
  }

  async setCurrentRoom(roomId: string): Promise<void> {
    // Set the room ID and update the conversation ID based on room
    this.currentRoomId = roomId;
    this.currentConversationId = `mock-conversation-${roomId}`;
  }
  
  getCurrentRoom(): string | null {
    return this.currentRoomId;
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
