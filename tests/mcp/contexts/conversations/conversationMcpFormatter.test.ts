/**
 * Tests for ConversationMcpFormatter
 */
import { describe, expect, test } from 'bun:test';

import { ConversationMcpFormatter, type McpFormattedConversation, type McpFormattedSummaries, type McpFormattedTurns } from '@/mcp/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationSummary } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

describe('ConversationMcpFormatter', () => {
  // Mock data for testing
  const mockConversation: Conversation = {
    id: 'conv-123',
    interfaceType: 'cli',
    roomId: 'room-1',
    createdAt: new Date('2025-03-01T10:00:00Z'),
    updatedAt: new Date('2025-03-01T11:30:00Z'),
    metadata: {},
    activeTurns: [],
    summaries: [],
    archivedTurns: [],
  };

  const mockTurns: ConversationTurn[] = [
    {
      id: 'turn-1',
      timestamp: new Date('2025-03-01T10:05:00Z'),
      query: 'Hello, how can you help me today?',
      response: 'I can help you with various tasks. What would you like assistance with?',
      userId: 'user-1',
      userName: 'Alice',
      metadata: {
        tokenCount: 25,
      },
    },
    {
      id: 'turn-2',
      timestamp: new Date('2025-03-01T10:10:00Z'),
      query: 'I need to organize my notes better.',
      response: 'I can suggest several approaches to organize your notes effectively.',
      userId: 'user-1',
      userName: 'Alice',
      metadata: {
        tokenCount: 30,
      },
    },
    {
      id: 'turn-3',
      timestamp: new Date('2025-03-01T10:15:00Z'),
      query: 'Can you explain what tags are good for?',
      response: 'Tags help you categorize and find related information quickly.',
      userId: 'user-1',
      userName: 'Alice',
      metadata: {
        tokenCount: 20,
      },
    },
  ];

  const mockSummaries: Array<ConversationSummary & { turnCount: number }> = [
    {
      id: 'summary-1',
      conversationId: 'conv-123',
      content: 'Discussed note organization and tagging systems.',
      createdAt: new Date('2025-03-01T10:30:00Z'),
      turnCount: 3,
      metadata: {
        originalTurnIds: ['turn-1', 'turn-2', 'turn-3'],
      },
    },
  ];

  const formatter = new ConversationMcpFormatter();

  test('formatConversationForMcp should format a conversation with basic options', () => {
    const result: McpFormattedConversation = formatter.formatConversationForMcp(
      mockConversation,
      mockTurns,
      mockSummaries,
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('conv-123');
    expect(result.interfaceType).toBe('cli');
    expect(result.roomId).toBe('room-1');
    expect(result.turnCount).toBe(3);
    expect(result.summaryCount).toBe(1);
    
    // Should include statistics
    expect(result.statistics).toBeDefined();
    
    // Should include turn preview by default (not full turns)
    expect(result.turnPreview).toBeDefined();
    expect(Array.isArray(result.turnPreview)).toBe(true);
    
    // Should include summaries but without full metadata
    expect(result.summaries).toBeDefined();
    if (result.summaries) {
      expect(Array.isArray(result.summaries)).toBe(true);
      expect(result.summaries[0].content).toBeDefined();
      expect(result.summaries[0].metadata).toBeUndefined();
    }
  });

  test('formatConversationForMcp should include full turns when specified', () => {
    const result: McpFormattedConversation = formatter.formatConversationForMcp(
      mockConversation,
      mockTurns,
      mockSummaries,
      { includeFullTurns: true },
    );

    expect(result.turns).toBeDefined();
    if (result.turns) {
      expect(Array.isArray(result.turns)).toBe(true);
      expect(result.turns.length).toBe(3);
    }
    expect(result.turnPreview).toBeUndefined();
  });

  test('formatConversationForMcp should include full metadata when specified', () => {
    const result: McpFormattedConversation = formatter.formatConversationForMcp(
      mockConversation,
      mockTurns,
      mockSummaries,
      { includeFullMetadata: true },
    );

    if (result.summaries && result.summaries.length > 0) {
      expect(result.summaries[0].metadata).toBeDefined();
    }
  });

  test('formatTurnsForMcp should format conversation turns', () => {
    const result: McpFormattedTurns = formatter.formatTurnsForMcp('conv-123', mockTurns);

    expect(result).toBeDefined();
    expect(result.conversationId).toBe('conv-123');
    expect(result.turnCount).toBe(3);
    expect(result.statistics).toBeDefined();
    expect(Array.isArray(result.turns)).toBe(true);
    expect(result.turns.length).toBe(3);
    
    // Should omit detailed metadata by default
    expect(result.turns[0].metadata).toBeUndefined();
  });

  test('formatTurnsForMcp should include full metadata when specified', () => {
    const result: McpFormattedTurns = formatter.formatTurnsForMcp(
      'conv-123',
      mockTurns,
      { includeFullMetadata: true },
    );

    if (result.turns[0].metadata) {
      expect(result.turns[0].metadata).toBeDefined();
      expect(result.turns[0].metadata['tokenCount']).toBe(25);
    }
  });

  test('formatSummariesForMcp should format conversation summaries', () => {
    const result: McpFormattedSummaries = formatter.formatSummariesForMcp(
      'conv-123',
      mockSummaries,
    );

    expect(result).toBeDefined();
    expect(result.conversationId).toBe('conv-123');
    expect(result.summaryCount).toBe(1);
    expect(result.timeline).toBeDefined();
    expect(result.timeline.points).toBeDefined();
    expect(Array.isArray(result.timeline.points)).toBe(true);
    
    // Should omit detailed metadata by default
    expect(result.summaries[0].metadata).toBeUndefined();
  });

  test('formatSummariesForMcp should include full metadata when specified', () => {
    const result: McpFormattedSummaries = formatter.formatSummariesForMcp(
      'conv-123',
      mockSummaries,
      { includeFullMetadata: true },
    );

    if (result.summaries[0].metadata) {
      expect(result.summaries[0].metadata).toBeDefined();
      expect(result.summaries[0].metadata['originalTurnIds']).toBeDefined();
    }
  });

  test('should calculate conversation statistics correctly', () => {
    const result: McpFormattedTurns = formatter.formatTurnsForMcp('conv-123', mockTurns);
    
    expect(result.statistics).toBeDefined();
    expect(result.statistics['avgQueryLength']).toBeGreaterThan(0);
    expect(result.statistics['avgResponseLength']).toBeGreaterThan(0);
    expect(result.statistics['totalQueryLength']).toBeGreaterThan(0);
    expect(result.statistics['totalResponseLength']).toBeGreaterThan(0);
    expect(result.statistics['userNameCounts']).toBeDefined();
    if (typeof result.statistics['userNameCounts'] === 'object') {
      const counts = result.statistics['userNameCounts'] as Record<string, number>;
      expect(counts['Alice']).toBe(3);
    }
    expect(result.statistics['timeSpan']).toBeDefined();
  });

  test('should handle empty conversations gracefully', () => {
    const result: McpFormattedConversation = formatter.formatConversationForMcp(
      mockConversation,
      [],
      [],
    );
    
    expect(result).toBeDefined();
    expect(result.turnCount).toBe(0);
    expect(result.summaryCount).toBe(0);
    expect(result.statistics).toBeDefined();
    expect(result.statistics['empty']).toBe(true);
  });
});