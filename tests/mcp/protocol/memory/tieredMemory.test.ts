/**
 * Tests for the tiered memory system
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ConversationMemory, InMemoryStorage } from '@/mcp/protocol/memory';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

// Mock the summarizer
const mockSummarizeTurns = mock(async (turns: ConversationTurn[]) => {
  // Create a simple mock summary
  return {
    timestamp: new Date(),
    content: `Summary of ${turns.length} turns: ${turns.map(t => t.query.slice(0, 20)).join(' | ')}...`,
    startTurnIndex: 0,
    endTurnIndex: turns.length - 1,
    startTimestamp: turns[0].timestamp,
    endTimestamp: turns[turns.length - 1].timestamp,
    turnCount: turns.length,
    metadata: {
      originalTurnIds: turns.map(t => t.id),
    },
  };
});

// Mock the summarizer class
mock.module('@/mcp/protocol/memory/summarizer', () => {
  return {
    ConversationSummarizer: function() {
      return {
        summarizeTurns: mockSummarizeTurns,
      };
    },
  };
});

describe('Tiered Memory System', () => {
  let memory: ConversationMemory;
  let storage: InMemoryStorage;

  beforeEach(async () => {
    // Create a fresh memory system for each test
    storage = new InMemoryStorage();
    memory = new ConversationMemory({
      interfaceType: 'cli',
      storage,
      options: {
        maxActiveTurns: 5,
        summaryTurnCount: 3,
      },
    });
    
    // Initialize by starting a conversation
    await memory.startConversation();
  });

  afterEach(() => {
    mockSummarizeTurns.mockClear();
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
    
    // Verify the summarizeTurns mock was called
    expect(mockSummarizeTurns).toHaveBeenCalled();
    
    // Get the conversation directly from storage
    const conversation = await storage.getConversation(memory.currentConversation!);
    
    // Check that turns were moved to archive and summary was created
    expect(conversation?.activeTurns.length).toBeLessThanOrEqual(5);
    expect(conversation?.summaries.length).toBeGreaterThan(0);
    expect(conversation?.archivedTurns.length).toBeGreaterThan(0);
    
    // Verify the summary contains information about the archived turns
    const summary = conversation?.summaries[0];
    expect(summary?.content).toContain('Summary of');
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
    
    // Verify summary was created
    expect(summary).toBeDefined();
    expect(summary?.content).toContain('Summary of');
    
    // Check that turns were moved to archive
    const conversation = await storage.getConversation(memory.currentConversation!);
    expect(conversation?.activeTurns.length).toBeLessThan(3);
    expect(conversation?.summaries.length).toBe(1);
    expect(conversation?.archivedTurns.length).toBeGreaterThan(0);
  });

  test('should get tiered history with all tiers', async () => {
    // Add turns to create all tiers
    for (let i = 0; i < 9; i++) {
      await memory.addTurn(`Question ${i + 1}`, `Answer ${i + 1}`);
    }
    
    // Get all tiers
    const { activeTurns, summaries, archivedTurns } = await memory.getTieredHistory();
    
    // Verify all tiers have content
    expect(activeTurns.length).toBeGreaterThan(0);
    expect(summaries.length).toBeGreaterThan(0);
    expect(archivedTurns.length).toBeGreaterThan(0);
  });
});