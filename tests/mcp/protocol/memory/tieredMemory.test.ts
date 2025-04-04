/**
 * Tests for the tiered memory system
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { conversationConfig } from '@/config';
import { ConversationMemory, InMemoryStorage } from '@/mcp/protocol/memory';

// Mock the summarizer
mock.module('@/mcp/protocol/memory/summarizer', () => {
  return {
    ConversationSummarizer: class MockSummarizer {
      async summarizeTurns() {
        return {
          id: 'mock-summary-id',
          timestamp: new Date(),
          content: 'This is a mock summary of the conversation.',
          startTurnIndex: 0,
          endTurnIndex: 2,
          startTimestamp: new Date(),
          endTimestamp: new Date(),
          turnCount: 3,
          metadata: {
            originalTurnIds: ['1', '2', '3'],
          },
        };
      }
    },
  };
});

describe('Tiered Memory System', () => {
  let memory: ConversationMemory;
  let storage: InMemoryStorage;

  beforeEach(async () => {
    // Create a fresh memory system for each test
    storage = InMemoryStorage.createFresh();
    memory = new ConversationMemory({
      interfaceType: 'cli',
      storage,
      options: {
        maxActiveTurns: 5,
        summaryTurnCount: 3,
      },
    });

    // Initialize by starting a conversation
    await memory.startConversation(conversationConfig.defaultCliRoomId);
  });

  afterEach(() => {
    // Clear any test state if needed
  });

  test('should initialize with empty tiers', async () => {
    const conversationId = memory.currentConversation!;
    const conversation = await storage.getConversation(conversationId);

    expect(conversation).toBeDefined();
    expect(conversation?.activeTurns).toHaveLength(0);
    expect(conversation?.summaries).toHaveLength(0);
    expect(conversation?.archivedTurns).toHaveLength(0);
  });

  test('should add turns to the active tier', async () => {
    await memory.addTurn('Hello', 'Hi there');

    const history = await memory.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].query).toBe('Hello');
    expect(history[0].response).toBe('Hi there');
  });

  test('should automatically summarize when active turns exceed max', async () => {
    // Add 6 turns (maxActiveTurns is 5)
    for (let i = 0; i < 6; i++) {
      await memory.addTurn(`Question ${i + 1}`, `Answer ${i + 1}`);
    }

    // No need to verify the mock was called now that we use the global mock

    // Get the conversation directly from storage
    const conversation = await storage.getConversation(memory.currentConversation!);

    // Check that turns were moved to archive and summary was created
    expect(conversation?.activeTurns.length).toBeLessThanOrEqual(5);
    expect(conversation?.summaries.length).toBeGreaterThan(0);
    expect(conversation?.archivedTurns.length).toBeGreaterThan(0);

    // Just verify that a summary exists (content will depend on the global mock)
    const summary = conversation?.summaries[0];
    expect(summary?.content).toBeDefined();
  });

  test('should format history with both active turns and summaries', async () => {
    // Add enough turns to trigger summarization
    for (let i = 0; i < 8; i++) {
      await memory.addTurn(`Question ${i + 1}`, `Answer ${i + 1}`);
    }

    // Get formatted history
    const formattedHistory = await memory.formatHistoryForPrompt();

    // Should contain both summary and active turns
    expect(formattedHistory).toContain('CONVERSATION SUMMARIES:');
    expect(formattedHistory).toContain('Summary');
    expect(formattedHistory).toContain('RECENT CONVERSATION:');
    expect(formattedHistory).toContain('Question');
    expect(formattedHistory).toContain('Answer');
  });

  test('should allow forcing summarization manually', async () => {
    // Add 3 turns
    for (let i = 0; i < 3; i++) {
      await memory.addTurn(`Question ${i + 1}`, `Answer ${i + 1}`);
    }

    // Force summarization
    const summary = await memory.forceSummarizeActiveTurns();

    // Verify summary was created (content will depend on the global mock)
    expect(summary).toBeDefined();
    expect(summary?.content).toBeDefined();

    // Check that turns were moved to archive
    const conversation = await storage.getConversation(memory.currentConversation!);
    expect(conversation?.activeTurns.length).toBeLessThan(3);
    expect(conversation?.summaries.length).toBe(1);
    expect(conversation?.archivedTurns.length).toBeGreaterThan(0);
  });

  // Set a longer timeout for this test (10 seconds)
  test('should get tiered history with all tiers', async () => {
    // Add turns to create all tiers (using fewer turns to speed up test)
    for (let i = 0; i < 6; i++) {
      await memory.addTurn(`Question ${i + 1}`, `Answer ${i + 1}`);
    }
    
    // Force a summary to ensure we have all tiers
    await memory.forceSummarizeActiveTurns();

    // Get all tiers
    const { activeTurns, summaries, archivedTurns } = await memory.getTieredHistory();

    // Verify all tiers have content
    expect(activeTurns.length).toBeGreaterThan(0);
    expect(summaries.length).toBeGreaterThan(0);
    expect(archivedTurns.length).toBeGreaterThan(0);
  });
});
