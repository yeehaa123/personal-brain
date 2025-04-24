/**
 * MockConversationMemoryService
 * 
 * Standard mock for ConversationMemoryService that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';
import { nanoid } from 'nanoid';

import type { TieredHistory } from '@/contexts/conversations/memory/tieredMemoryManager';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { ConversationTurn } from '@/protocol/schemas/conversationSchemas';

/**
 * Mock implementation of ConversationMemoryService
 */
export class MockConversationMemoryService {
  private static instance: MockConversationMemoryService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationMemoryService {
    if (!MockConversationMemoryService.instance) {
      MockConversationMemoryService.instance = new MockConversationMemoryService();
    }
    return MockConversationMemoryService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationMemoryService.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationMemoryService {
    return new MockConversationMemoryService();
  }
  
  // Mock methods with default implementations
  public addTurn = mock((_conversationId: string, _turn: Partial<ConversationTurn>) => {
    return Promise.resolve(`turn-${nanoid()}`);
  });
  
  public getTurns = mock((_conversationId: string, _limit?: number, _offset?: number) => {
    return Promise.resolve([
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(),
        query: 'Test query',
        response: 'Test response',
        userId: 'user-1',
        userName: 'Test User',
        metadata: {},
      },
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(),
        query: 'Another query',
        response: 'Another response',
        userId: 'user-1',
        userName: 'Test User',
        metadata: {},
      },
    ] as ConversationTurn[]);
  });
  
  public getSummaries = mock((_conversationId: string) => {
    return Promise.resolve([{
      id: `summary-${nanoid()}`,
      content: 'Test summary content',
      createdAt: new Date(),
      turnCount: 5,
    }] as ConversationSummary[]);
  });
  
  public forceSummarize = mock((_conversationId: string) => {
    return Promise.resolve(true);
  });
  
  public getTieredHistory = mock((_conversationId: string) => {
    return Promise.resolve({
      activeTurns: [{
        id: `turn-${nanoid()}`,
        timestamp: new Date(),
        query: 'Recent query',
        response: 'Recent response',
        userId: 'user-1',
        userName: 'Test User',
        metadata: { isActive: true },
      }] as ConversationTurn[],
      summaries: [{
        id: `summary-${nanoid()}`,
        content: 'Test summary content',
        createdAt: new Date(),
        turnCount: 5,
      }] as ConversationSummary[],
      archivedTurns: [{
        id: `turn-${nanoid()}`,
        timestamp: new Date(),
        query: 'Old query',
        response: 'Old response',
        userId: 'user-1',
        userName: 'Test User',
        metadata: { isActive: false },
      }] as ConversationTurn[],
    } as TieredHistory);
  });
  
  public formatHistoryForPrompt = mock((_conversationId: string, _maxTokens?: number) => {
    return Promise.resolve(
      'User: What is the weather like?\nAssistant: It\'s sunny today!\n\n' +
      'User: How hot is it?\nAssistant: Around 25°C.\n\n',
    );
  });
  
  public updateConfig = mock((_config: Record<string, unknown>) => {
    // Void function, no return value
  });
}