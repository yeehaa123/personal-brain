/**
 * MockConversationQueryService
 * 
 * Standard mock for ConversationQueryService that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';
import { nanoid } from 'nanoid';

import type { ConversationInfo, SearchCriteria } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation } from '@/protocol/formats/schemas/conversationSchemas';

/**
 * Mock implementation of ConversationQueryService
 */
export class MockConversationQueryService {
  private static instance: MockConversationQueryService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationQueryService {
    if (!MockConversationQueryService.instance) {
      MockConversationQueryService.instance = new MockConversationQueryService();
    }
    return MockConversationQueryService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationQueryService.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationQueryService {
    return new MockConversationQueryService();
  }
  
  // Mock methods with default implementations
  public createConversation = mock((_interfaceType: 'cli' | 'matrix', _roomId: string) => {
    return Promise.resolve(`conv-${nanoid()}`);
  });
  
  public getConversation = mock((_conversationId: string) => {
    return Promise.resolve({
      id: _conversationId,
      interfaceType: 'cli',
      roomId: 'test-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      metadata: {},
    } as Conversation);
  });
  
  public getConversationIdByRoom = mock((_roomId: string, _interfaceType?: 'cli' | 'matrix') => {
    return Promise.resolve(`conv-${nanoid()}`);
  });
  
  public getOrCreateConversationForRoom = mock((_roomId: string, _interfaceType: 'cli' | 'matrix') => {
    return Promise.resolve(`conv-${nanoid()}`);
  });
  
  public findConversations = mock((_criteria: SearchCriteria) => {
    return Promise.resolve([{
      id: `conv-${nanoid()}`,
      interfaceType: 'cli',
      roomId: 'test-room',
      startedAt: new Date(),
      updatedAt: new Date(),
      turnCount: 0,
      metadata: {},
    }] as ConversationInfo[]);
  });
  
  public getConversationsByRoom = mock((_roomId: string, interfaceType?: 'cli' | 'matrix') => {
    return Promise.resolve([{
      id: `conv-${nanoid()}`,
      interfaceType: interfaceType || 'cli',
      roomId: _roomId,
      startedAt: new Date(),
      updatedAt: new Date(),
      turnCount: 0,
      metadata: {},
    }] as ConversationInfo[]);
  });
  
  public getRecentConversations = mock((_limit?: number, interfaceType?: 'cli' | 'matrix') => {
    return Promise.resolve([{
      id: `conv-${nanoid()}`,
      interfaceType: interfaceType || 'cli',
      roomId: 'test-room',
      startedAt: new Date(),
      updatedAt: new Date(),
      turnCount: 0,
      metadata: {},
    }] as ConversationInfo[]);
  });
  
  public updateMetadata = mock((_conversationId: string, _metadata: Record<string, unknown>) => {
    return Promise.resolve(true);
  });
  
  public deleteConversation = mock((_conversationId: string) => {
    return Promise.resolve(true);
  });
}