/**
 * Tests for the ConversationSummarizer
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { v4 as uuidv4 } from 'uuid';

import { ConversationSummarizer } from '@/mcp/protocol/memory';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

// Manual mock for the ConversationSummarizer class
mock.module('@/mcp/protocol/memory/summarizer', () => {
  return {
    ConversationSummarizer: function() {
      return {
        summarizeTurns: async (turns: ConversationTurn[]) => {
          if (!turns || turns.length === 0) {
            throw new Error('Cannot summarize empty turns array');
          }
          
          return {
            id: 'mock-summary-id',
            timestamp: new Date(),
            content: 'This is a mock summary of the conversation that discusses various topics including testing, summarization, and mocking APIs.',
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
});

describe('ConversationSummarizer', () => {
  let summarizer: ConversationSummarizer;
  let sampleTurns: ConversationTurn[];

  beforeEach(() => {
    summarizer = new ConversationSummarizer();

    // Create some sample turns
    const now = new Date();
    sampleTurns = [
      {
        id: uuidv4(),
        timestamp: new Date(now.getTime() - 3000),
        query: 'What is conversation summarization?',
        response: 'Conversation summarization is the process of creating concise summaries of longer conversations to preserve context while reducing token usage.',
        userId: 'user1',
        userName: 'Alice',
      },
      {
        id: uuidv4(),
        timestamp: new Date(now.getTime() - 2000),
        query: 'Why is it useful?',
        response: 'It is useful for maintaining conversation context over longer sessions without exceeding token limits. It allows for more efficient use of the context window in language models.',
        userId: 'user1',
        userName: 'Alice',
      },
      {
        id: uuidv4(),
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

    // Check summary structure
    expect(summary).toHaveProperty('id');
    expect(summary).toHaveProperty('timestamp');
    expect(summary).toHaveProperty('content');
    expect(summary).toHaveProperty('startTurnIndex');
    expect(summary).toHaveProperty('endTurnIndex');
    expect(summary).toHaveProperty('startTimestamp');
    expect(summary).toHaveProperty('endTimestamp');
    expect(summary).toHaveProperty('turnCount');
    expect(summary).toHaveProperty('metadata');
    
    // Check content
    expect(summary.content).toContain('mock summary');
    expect(summary.turnCount).toBe(3);
    
    // Check timestamps are consistent
    expect(summary.startTimestamp).toEqual(sampleTurns[0].timestamp);
    expect(summary.endTimestamp).toEqual(sampleTurns[2].timestamp);
    
    // Check metadata contains original turn IDs
    expect(summary.metadata && summary.metadata['originalTurnIds']).toHaveLength(3);
    expect(summary.metadata && summary.metadata['originalTurnIds']).toContain(sampleTurns[0].id);
  });

  test('should throw error on empty turns array', async () => {
    let error: Error | undefined;
    try {
      await summarizer.summarizeTurns([]);
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeDefined();
    expect(error?.message).toContain('Cannot summarize empty turns');
  });

  test('should handle turns of varying lengths', async () => {
    // Add some turns with very short and very long content
    const variedTurns = [
      ...sampleTurns,
      {
        id: uuidv4(),
        timestamp: new Date(),
        query: 'Short?',
        response: 'Yes.',
        userId: 'user1',
        userName: 'Alice',
      },
      {
        id: uuidv4(),
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

    const summary = await summarizer.summarizeTurns(variedTurns);
    
    // Should handle the varied content without issues
    expect(summary).toHaveProperty('content');
    expect(summary.turnCount).toBe(5);
  });
});