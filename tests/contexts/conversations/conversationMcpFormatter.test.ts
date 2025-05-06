/**
 * Tests for ConversationMcpFormatter
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/protocol/schemas/conversationSchemas';

describe('ConversationMcpFormatter', () => {
  // Reset the instance before each test to ensure clean state
  beforeEach(() => {
    ConversationMcpFormatter.resetInstance();
  });

  test('conversation formatter handles various formatting options correctly', () => {
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
    
    // Get a fresh instance for testing
    const formatter = ConversationMcpFormatter.createFresh();
    
    // Run all test cases and collect results in one object
    const results = {
      // Conversation formatting with different options
      conversation: {
        default: formatter.formatConversationForMcp(mockConversation, mockTurns, mockSummaries),
        fullTurns: formatter.formatConversationForMcp(mockConversation, mockTurns, mockSummaries, 
          { includeFullTurns: true }),
        fullMetadata: formatter.formatConversationForMcp(mockConversation, mockTurns, mockSummaries,
          { includeFullMetadata: true }),
        empty: formatter.formatConversationForMcp(mockConversation, [], []),
      },
      
      // Turns formatting with different options
      turns: {
        default: formatter.formatTurnsForMcp('conv-123', mockTurns),
        fullMetadata: formatter.formatTurnsForMcp('conv-123', mockTurns, { includeFullMetadata: true }),
      },
      
      // Summaries formatting with different options
      summaries: {
        default: formatter.formatSummariesForMcp('conv-123', mockSummaries),
        fullMetadata: formatter.formatSummariesForMcp('conv-123', mockSummaries, { includeFullMetadata: true }),
      },
    };
    
    // Consolidated validation object that extracts the properties we want to verify
    const validationResults = {
      conversation: {
        defaultCase: {
          basicMetadata: {
            id: results.conversation.default.id,
            interfaceType: results.conversation.default.interfaceType,
            roomId: results.conversation.default.roomId,
            turnCount: results.conversation.default.turnCount,
            summaryCount: results.conversation.default.summaryCount,
          },
          defaultBehavior: {
            hasTurnPreview: !!results.conversation.default.turnPreview && 
                           Array.isArray(results.conversation.default.turnPreview),
            hasSummaries: !!results.conversation.default.summaries,
            metadataIsOmitted: !results.conversation.default.summaries?.[0]?.metadata,
          },
        },
        fullTurnsCase: {
          hasTurns: !!results.conversation.fullTurns.turns,
          turnsCount: results.conversation.fullTurns.turns?.length,
          turnPreviewReplaced: !results.conversation.fullTurns.turnPreview,
        },
        fullMetadataCase: {
          summariesMetadataIncluded: !!results.conversation.fullMetadata.summaries?.[0]?.metadata,
        },
        emptyCase: {
          turnCount: results.conversation.empty.turnCount,
          summaryCount: results.conversation.empty.summaryCount,
          markedAsEmpty: results.conversation.empty.statistics?.['empty'] === true,
        },
      },
      
      turns: {
        defaultCase: {
          basicProperties: {
            conversationId: results.turns.default.conversationId,
            turnCount: results.turns.default.turnCount,
            turnsLength: results.turns.default.turns.length,
            metadataOmitted: !results.turns.default.turns[0].metadata,
          },
          statistics: {
            hasAvgQueryLength: typeof results.turns.default.statistics?.['avgQueryLength'] === 'number' && 
                              results.turns.default.statistics?.['avgQueryLength'] > 0,
            hasAvgResponseLength: typeof results.turns.default.statistics?.['avgResponseLength'] === 'number' && 
                                results.turns.default.statistics?.['avgResponseLength'] > 0,
            userNameCountCorrect: (results.turns.default.statistics?.['userNameCounts'] as 
                                 Record<string, number>)?.['Alice'] === 3,
            hasTimeSpan: !!results.turns.default.statistics?.['timeSpan'],
          },
        },
        fullMetadataCase: {
          metadataIncluded: !!results.turns.fullMetadata.turns[0].metadata,
          tokenCountIncluded: results.turns.fullMetadata.turns[0].metadata?.['tokenCount'] === 25,
        },
      },
      
      summaries: {
        defaultCase: {
          basicProperties: {
            conversationId: results.summaries.default.conversationId,
            summaryCount: results.summaries.default.summaryCount,
            hasTimelinePoints: !!results.summaries.default.timeline?.points && 
                              Array.isArray(results.summaries.default.timeline?.points),
            metadataOmitted: !results.summaries.default.summaries[0].metadata,
          },
        },
        fullMetadataCase: {
          metadataIncluded: !!results.summaries.fullMetadata.summaries[0].metadata,
          originalTurnIdsIncluded: !!results.summaries.fullMetadata.summaries[0].metadata?.['originalTurnIds'],
        },
      },
    };
    
    // Single consolidated assertion for all test cases
    expect(validationResults).toMatchObject({
      conversation: {
        defaultCase: {
          basicMetadata: {
            id: 'conv-123',
            interfaceType: 'cli',
            roomId: 'room-1',
            turnCount: 3,
            summaryCount: 1,
          },
          defaultBehavior: {
            hasTurnPreview: true,
            hasSummaries: true,
            metadataIsOmitted: true,
          },
        },
        fullTurnsCase: {
          hasTurns: true,
          turnsCount: 3,
          turnPreviewReplaced: true,
        },
        fullMetadataCase: {
          summariesMetadataIncluded: true,
        },
        emptyCase: {
          turnCount: 0,
          summaryCount: 0,
          markedAsEmpty: true,
        },
      },
      
      turns: {
        defaultCase: {
          basicProperties: {
            conversationId: 'conv-123',
            turnCount: 3,
            turnsLength: 3,
            metadataOmitted: true,
          },
          statistics: {
            hasAvgQueryLength: true,
            hasAvgResponseLength: true,
            userNameCountCorrect: true,
            hasTimeSpan: true,
          },
        },
        fullMetadataCase: {
          metadataIncluded: true,
          tokenCountIncluded: true,
        },
      },
      
      summaries: {
        defaultCase: {
          basicProperties: {
            conversationId: 'conv-123',
            summaryCount: 1,
            hasTimelinePoints: true,
            metadataOmitted: true,
          },
        },
        fullMetadataCase: {
          metadataIncluded: true,
          originalTurnIdsIncluded: true,
        },
      },
    });
  });
});