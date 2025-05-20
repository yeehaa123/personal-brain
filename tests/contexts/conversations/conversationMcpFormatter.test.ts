import { describe, expect, test } from 'bun:test';

import { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';

describe('ConversationMcpFormatter Behavior', () => {
  const formatter = ConversationMcpFormatter.createFresh();
  
  const mockConversation = {
    id: 'conv-123',
    interfaceType: 'cli' as const,
    roomId: 'room-1',
    createdAt: new Date('2025-03-01T10:00:00Z'),
    updatedAt: new Date('2025-03-01T11:30:00Z'),
    metadata: {},
    activeTurns: [],
    summaries: [],
    archivedTurns: [],
  };

  const mockTurns = [
    {
      id: 'turn-1',
      timestamp: new Date('2025-03-01T10:05:00Z'),
      query: 'Hello, how can you help me today?',
      response: 'I can help you with various tasks.',
      userId: 'user-1',
      userName: 'Alice',
      metadata: { tokenCount: 25 },
    },
    {
      id: 'turn-2',
      timestamp: new Date('2025-03-01T10:10:00Z'),
      query: 'I need to organize my notes better.',
      response: 'I can suggest several approaches.',
      userId: 'user-1',
      userName: 'Alice',
      metadata: { tokenCount: 30 },
    },
  ];

  const mockSummaries = [{
    id: 'summary-1',
    conversationId: 'conv-123',
    content: 'Discussed note organization and tagging systems.',
    createdAt: new Date('2025-03-01T10:30:00Z'),
    turnCount: 2,
    metadata: {
      originalTurnIds: ['turn-1', 'turn-2'],
    },
  }];
  
  test('formats conversation for MCP with basic info', () => {
    const result = formatter.formatConversationForMcp(mockConversation, mockTurns, mockSummaries);
    
    expect(result.id).toBe('conv-123');
    expect(result.interfaceType).toBe('cli');
    expect(result.turnCount).toBe(2);
    expect(result.summaryCount).toBe(1);
    expect(result.turnPreview).toBeDefined();
    expect(result.summaries).toBeDefined();
  });

  test('includes full turns when requested', () => {
    const result = formatter.formatConversationForMcp(
      mockConversation, 
      mockTurns, 
      mockSummaries,
      { includeFullTurns: true },
    );
    
    expect(result.turns).toBeDefined();
    expect(result.turns?.length).toBe(2);
    expect(result.turnPreview).toBeUndefined(); // Replaced by full turns
  });

  test('includes metadata when requested', () => {
    const result = formatter.formatConversationForMcp(
      mockConversation, 
      mockTurns, 
      mockSummaries,
      { includeFullMetadata: true },
    );
    
    expect(result.summaries?.[0]?.metadata).toBeDefined();
  });

  test('formats turns for MCP with statistics', () => {
    const result = formatter.formatTurnsForMcp('conv-123', mockTurns);
    
    expect(result.conversationId).toBe('conv-123');
    expect(result.turnCount).toBe(2);
    expect(result.turns.length).toBe(2);
    expect(result.statistics?.['avgQueryLength']).toBeGreaterThan(0);
    expect(result.statistics?.['userNameCounts']).toEqual({ Alice: 2 });
  });

  test('formats summaries with timeline', () => {
    const result = formatter.formatSummariesForMcp('conv-123', mockSummaries);
    
    expect(result.conversationId).toBe('conv-123');
    expect(result.summaryCount).toBe(1);
    expect(result.summaries.length).toBe(1);
    expect(result.timeline?.points).toBeDefined();
  });

  test('handles empty conversations', () => {
    const result = formatter.formatConversationForMcp(mockConversation, [], []);
    
    expect(result.turnCount).toBe(0);
    expect(result.summaryCount).toBe(0);
    expect(result.statistics?.['empty']).toBe(true);
  });
});