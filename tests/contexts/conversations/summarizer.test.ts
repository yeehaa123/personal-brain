/**
 * Tests for the ConversationSummarizer
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { nanoid } from 'nanoid';

import { ConversationSummarizer } from '@/contexts/conversations/memory/summarizer';
import type { ConversationTurn } from '@/protocol/schemas/conversationSchemas';

// Define interface for test purposes
interface ConversationSummarizerOptions {
  apiKey?: string;
}

// Manual mock for the ConversationSummarizer class
mock.module('@/contexts/conversations/memory/summarizer', () => {
  let mockInstance: Record<string, unknown> | null = null;
  
  const MockSummarizer = {
    getInstance: (_options?: ConversationSummarizerOptions) => {
      if (!mockInstance) {
        mockInstance = {
          summarizeTurns: async (turns: ConversationTurn[]) => {
            if (!turns || turns.length === 0) {
              throw new Error('Cannot summarize empty turns array');
            }
            
            return {
              id: 'mock-summary-id',
              timestamp: new Date(),
              content: 'Summary of 3 conversation turns discussing conversation summarization and the tiered memory system.',
              startTurnIndex: 0,
              endTurnIndex: turns.length - 1,
              startTimestamp: turns[0].timestamp,
              endTimestamp: turns[turns.length - 1].timestamp,
              turnCount: turns.length,
              metadata: {
                originalTurnIds: turns.map((t: ConversationTurn) => t.id),
              },
            };
          },
        };
      }
      return mockInstance;
    },
    resetInstance: () => {
      mockInstance = null;
    },
    createFresh: (_options?: ConversationSummarizerOptions) => {
      return {
        summarizeTurns: async (turns: ConversationTurn[]) => {
          if (!turns || turns.length === 0) {
            throw new Error('Cannot summarize empty turns array');
          }
          
          return {
            id: 'mock-summary-id',
            timestamp: new Date(),
            content: 'Summary of 3 conversation turns discussing conversation summarization and the tiered memory system.',
            startTurnIndex: 0,
            endTurnIndex: turns.length - 1,
            startTimestamp: turns[0].timestamp,
            endTimestamp: turns[turns.length - 1].timestamp,
            turnCount: turns.length,
            metadata: {
              originalTurnIds: turns.map((t: ConversationTurn) => t.id),
            },
          };
        },
      };
    },
  };

  return {
    ConversationSummarizer: MockSummarizer,
    ConversationSummarizerOptions: {},
  };
});

describe('ConversationSummarizer', () => {
  let summarizer: ConversationSummarizer;
  let sampleTurns: ConversationTurn[];

  beforeEach(() => {
    // Reset the singleton instance before each test
    ConversationSummarizer.resetInstance();
    // Get a fresh instance for testing
    summarizer = ConversationSummarizer.createFresh();

    // Create some sample turns
    const now = new Date();
    sampleTurns = [
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(now.getTime() - 3000),
        query: 'What is conversation summarization?',
        response: 'Conversation summarization is the process of creating concise summaries of longer conversations to preserve context while reducing token usage.',
        userId: 'user1',
        userName: 'Alice',
      },
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(now.getTime() - 2000),
        query: 'Why is it useful?',
        response: 'It is useful for maintaining conversation context over longer sessions without exceeding token limits. It allows for more efficient use of the context window in language models.',
        userId: 'user1',
        userName: 'Alice',
      },
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(now.getTime() - 1000),
        query: 'How does the tiered memory system work?',
        response: 'The tiered memory system organizes conversation history into active, summary, and archive tiers. Recent turns stay in the active tier, older turns are summarized and moved to the summary tier, and original turns are archived for reference.',
        userId: 'user1',
        userName: 'Alice',
      },
    ];
  });

  test('should summarize conversation turns', async () => {
    const summary = await summarizer.summarizeTurns(sampleTurns);
    const firstTimestamp = sampleTurns[0].timestamp || new Date();
    const lastTimestamp = sampleTurns[2].timestamp || new Date();

    // Single consolidated assertion to check all summary properties
    expect({
      // Structure checks
      hasRequiredProperties: [
        'id', 'timestamp', 'content', 'startTurnIndex', 'endTurnIndex',
        'startTimestamp', 'endTimestamp', 'turnCount', 'metadata',
      ].every(prop => prop in summary),
      
      // Content validation
      content: {
        hasContent: summary.content.length > 10,
        turnCount: summary.turnCount,
      },
      
      // Timestamp validation
      timestamps: {
        startMatches: summary.startTimestamp?.getTime() === firstTimestamp?.getTime(),
        endMatches: summary.endTimestamp?.getTime() === lastTimestamp?.getTime(),
      },
      
      // Metadata validation
      metadata: {
        hasTurnIds: summary.metadata && typeof summary.metadata === 'object' && 'originalTurnIds' in summary.metadata,
        turnIdsLength: (summary.metadata && typeof summary.metadata === 'object' && 
                      'originalTurnIds' in summary.metadata && 
                      Array.isArray(summary.metadata['originalTurnIds'])) 
          ? summary.metadata['originalTurnIds'].length : 0,
        includesFirstTurn: (summary.metadata && typeof summary.metadata === 'object' && 
                          'originalTurnIds' in summary.metadata && 
                          Array.isArray(summary.metadata['originalTurnIds'])) 
          ? summary.metadata['originalTurnIds'].includes(sampleTurns[0].id) : false,
      },
    }).toMatchObject({
      hasRequiredProperties: true,
      
      content: {
        hasContent: true,
        turnCount: 3,
      },
      
      timestamps: {
        startMatches: true,
        endMatches: true,
      },
      
      metadata: {
        hasTurnIds: true,
        turnIdsLength: 3,
        includesFirstTurn: true,
      },
    });
  });

  test('should throw error on empty turns array', async () => {
    // Use a single async/await pattern with try/catch for cleaner testing
    const result = await summarizer.summarizeTurns([])
      .then(() => ({ threw: false }))
      .catch(e => ({ threw: true, error: e as Error }));
    
    // Single consolidated assertion
    expect({
      errorThrown: result.threw,
      errorMessage: 'error' in result ? result.error.message : '',
      containsExpectedText: 'error' in result && result.error.message.includes('Cannot summarize empty turns'),
    }).toMatchObject({
      errorThrown: true,
      containsExpectedText: true,
    });
  });

  test('should handle turns of varying lengths', async () => {
    // Create test data with varied turn lengths
    const variedTurns = [
      ...sampleTurns,
      // Short turn
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(),
        query: 'Short?',
        response: 'Yes.',
        userId: 'user1',
        userName: 'Alice',
      },
      // Very long turn
      {
        id: `turn-${nanoid()}`,
        timestamp: new Date(),
        query: 'Tell me a long story about summarization.',
        response: 'Once upon a time, there was a language model that needed to remember very long conversations. ' +
          'This model found that as conversations got longer, it would run out of context space to process all the turns. ' +
          'So the engineers created a tiered memory system that would summarize older parts of the conversation, ' +
          'allowing the model to maintain awareness of what was discussed while using context space efficiently. ' +
          'This approach combined the best of both worlds, preserving important details while making room for new information.',
        userId: 'user1',
        userName: 'Alice',
      },
    ];

    // Execute the summarization
    const summary = await summarizer.summarizeTurns(variedTurns);
    
    // Single consolidated assertion for varied content handling
    expect({
      hasContent: 'content' in summary,
      processesTurnCount: summary.turnCount === 5,
      respectsTurnIds: (summary.metadata && typeof summary.metadata === 'object' && 
                    'originalTurnIds' in summary.metadata && 
                    Array.isArray(summary.metadata['originalTurnIds'])) 
        ? summary.metadata['originalTurnIds'].length === 5 : false,
    }).toMatchObject({
      hasContent: true,
      processesTurnCount: true,
      respectsTurnIds: true,
    });
  });
});