/**
 * MockConversationMcpFormatter
 * 
 * Standard mock for ConversationMcpFormatter that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';

import type { McpFormattedConversation } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';

export interface McpFormattingOptions {
  includeFullTurns?: boolean;
  includeFullMetadata?: boolean;
  includeFullSummaries?: boolean;
}

/**
 * Mock implementation of ConversationMcpFormatter
 */
export class MockConversationMcpFormatter {
  private static instance: MockConversationMcpFormatter | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationMcpFormatter {
    if (!MockConversationMcpFormatter.instance) {
      MockConversationMcpFormatter.instance = new MockConversationMcpFormatter();
    }
    return MockConversationMcpFormatter.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationMcpFormatter.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationMcpFormatter {
    return new MockConversationMcpFormatter();
  }
  
  // Mock methods with default implementations
  public formatConversationForMcp = mock((
    conversation: Conversation,
    turns: ConversationTurn[],
    summaries: ConversationSummary[],
    options: McpFormattingOptions = {},
  ) => {
    return Promise.resolve({
      id: conversation.id,
      interfaceType: conversation.interfaceType,
      roomId: conversation.roomId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      turnCount: turns.length,
      summaryCount: summaries.length,
      statistics: {},
      turns: options.includeFullTurns ? turns : turns.map(t => ({ id: t.id, query: t.query })),
      summaries: options.includeFullSummaries ? summaries : [],
    } as McpFormattedConversation);
  });
  
  public formatTurnsForMcp = mock((
    conversationId: string,
    turns: ConversationTurn[],
    options: { includeFullMetadata?: boolean } = {},
  ) => {
    return {
      conversationId,
      count: turns.length,
      turns: turns.map(t => ({
        id: t.id,
        query: t.query,
        response: t.response,
        timestamp: t.timestamp,
        userId: t.userId,
        userName: t.userName,
        metadata: options.includeFullMetadata ? t.metadata : undefined,
      })),
    };
  });
  
  public formatSummariesForMcp = mock((
    conversationId: string,
    summaries: ConversationSummary[],
    options: { includeFullMetadata?: boolean } = {},
  ) => {
    return {
      conversationId,
      count: summaries.length,
      summaries: summaries.map(s => ({
        id: s.id,
        content: s.content,
        turnCount: s.turnCount || 0,
        createdAt: s.createdAt,
        metadata: options.includeFullMetadata ? s.metadata : undefined,
      })),
    };
  });
}