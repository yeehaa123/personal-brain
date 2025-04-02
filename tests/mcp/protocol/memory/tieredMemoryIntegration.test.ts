/**
 * Test file for validating Tiered ConversationMemory integration with BrainProtocol
 */
import { describe, test, expect, mock } from 'bun:test';
import { ConversationMemory, InMemoryStorage } from '@/mcp/protocol/memory';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

// Create a partial mock of BrainProtocol for testing
class MockBrainProtocol {
  private interfaceType: 'cli' | 'matrix';
  private currentRoomId?: string;
  private conversationMemory: ConversationMemory;
  private model: { complete: unknown };

  constructor(options?: { interfaceType?: 'cli' | 'matrix'; roomId?: string }) {
    this.interfaceType = options?.interfaceType || 'cli';
    this.currentRoomId = options?.roomId;
    
    // Initialize tiered conversation memory
    this.conversationMemory = new ConversationMemory({
      interfaceType: this.interfaceType,
      storage: new InMemoryStorage(),
      options: {
        maxActiveTurns: 5,  // Use a smaller limit for testing
        summaryTurnCount: 2,
      },
    });
    
    // Mock model
    this.model = {
      complete: mock(async () => ({
        response: 'Test response',
        usage: { inputTokens: 10, outputTokens: 10 },
      })),
    };
    
    // Initialize conversation
    this.initializeConversation();
  }
  
  // Helper method to initialize conversation
  private async initializeConversation(): Promise<void> {
    try {
      if (this.interfaceType === 'matrix' && this.currentRoomId) {
        await this.conversationMemory.getOrCreateConversationForRoom(this.currentRoomId);
      } else if (!this.conversationMemory.currentConversation) {
        await this.conversationMemory.startConversation();
      }
    } catch (_) {
      // Ignore errors in tests
    }
  }
  
  // Mimic the getConversationMemory method in BrainProtocol
  getConversationMemory(): ConversationMemory {
    return this.conversationMemory;
  }
  
  // Simplified version of processQuery
  async processQuery(query: string, options?: { userId?: string; userName?: string; roomId?: string }): Promise<{ answer: string }> {
    // Get conversation history
    let conversationHistory = '';
    try {
      conversationHistory = await this.conversationMemory.formatHistoryForPrompt();
    } catch (_) {
      // Ignore errors in tests
    }
    
    // Simulate calling the model
    // Using unknown type and casting for test simplicity
    const modelComplete = this.model.complete as (
      systemPrompt: string, 
      userPrompt: string
    ) => Promise<{ response: string }>;
    
    const response = await modelComplete('test', query + '\n' + conversationHistory);
    
    // Save the conversation turn
    try {
      await this.conversationMemory.addTurn(
        query,
        response.response,
        {
          userId: options?.userId,
          userName: options?.userName,
          metadata: { test: true },
        },
      );
    } catch (_) {
      // Ignore errors in tests
    }
    
    return { answer: response.response };
  }
  
  // Method to set Matrix room ID
  async setCurrentRoom(roomId: string): Promise<void> {
    if (this.interfaceType !== 'matrix') {
      throw new Error('Cannot set room ID for non-Matrix interface');
    }
    
    this.currentRoomId = roomId;
    await this.conversationMemory.getOrCreateConversationForRoom(roomId);
  }
  
  // Method to force a summary for testing
  async forceCreateSummary(): Promise<void> {
    await this.conversationMemory.forceSummarizeActiveTurns();
  }
  
  // Get tiered history stats for testing
  async getTieredHistoryStats(): Promise<{
    activeTurnsCount: number;
    summariesCount: number;
    archivedTurnsCount: number;
  }> {
    const { activeTurns, summaries, archivedTurns } = await this.conversationMemory.getTieredHistory();
    return {
      activeTurnsCount: activeTurns.length,
      summariesCount: summaries.length,
      archivedTurnsCount: archivedTurns.length,
    };
  }
}

// Mock the summarizer to prevent API calls
mock.module('@/mcp/protocol/memory/summarizer', () => {
  const mockSummarizeTurns = mock(async (turns: ConversationTurn[]) => {
    return {
      id: 'mock-summary-id',
      timestamp: new Date(),
      content: `Summary of ${turns.length} conversation turns about various topics.`,
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

  return {
    ConversationSummarizer: function() {
      return {
        summarizeTurns: mockSummarizeTurns,
      };
    },
  };
});

/**
 * These tests validate the integration pattern between BrainProtocol
 * and the Tiered ConversationMemory using a mock implementation.
 */
describe('Tiered Memory Integration', () => {
  test('should summarize conversations after enough turns', async () => {
    const protocol = new MockBrainProtocol();
    
    // Process enough queries to trigger summarization (maxActiveTurns + 1)
    for (let i = 0; i < 6; i++) {
      await protocol.processQuery(`test query ${i + 1}`);
    }
    
    // Get tiered history stats
    const stats = await protocol.getTieredHistoryStats();
    
    // Verify we have summaries and archived turns
    expect(stats.activeTurnsCount).toBeLessThanOrEqual(5); // maxActiveTurns
    expect(stats.summariesCount).toBeGreaterThan(0);
    expect(stats.archivedTurnsCount).toBeGreaterThan(0);
  });
  
  test('should allow forcing summarization', async () => {
    const protocol = new MockBrainProtocol();
    
    // Add a few turns
    await protocol.processQuery('question one');
    await protocol.processQuery('question two');
    await protocol.processQuery('question three');
    
    // Stats before forcing summary
    const beforeStats = await protocol.getTieredHistoryStats();
    expect(beforeStats.summariesCount).toBe(0);
    
    // Force summarization
    await protocol.forceCreateSummary();
    
    // Stats after forcing summary
    const afterStats = await protocol.getTieredHistoryStats();
    expect(afterStats.summariesCount).toBeGreaterThan(0);
    expect(afterStats.archivedTurnsCount).toBeGreaterThan(0);
  });
  
  test('should include both summaries and active turns in formatted history', async () => {
    const protocol = new MockBrainProtocol();
    
    // Add turns and force summarization
    await protocol.processQuery('question one');
    await protocol.processQuery('question two');
    await protocol.forceCreateSummary();
    
    // Add more turns after summarization
    await protocol.processQuery('question three');
    await protocol.processQuery('question four');
    
    // Get the formatted history
    const memory = protocol.getConversationMemory();
    const formattedHistory = await memory.formatHistoryForPrompt();
    
    // Should include both summaries and active turns
    expect(formattedHistory).toContain('CONVERSATION SUMMARIES:');
    expect(formattedHistory).toContain('Summary of');
    expect(formattedHistory).toContain('RECENT CONVERSATION:');
    expect(formattedHistory).toContain('question three');
    expect(formattedHistory).toContain('question four');
  });
  
  test('Matrix interface should support tiered memory for each room', async () => {
    const protocol = new MockBrainProtocol({
      interfaceType: 'matrix',
      roomId: 'room-1',
    });
    
    // Add turns to room 1
    await protocol.processQuery('room 1 question 1');
    await protocol.processQuery('room 1 question 2');
    await protocol.forceCreateSummary();
    
    // Switch to room 2
    await protocol.setCurrentRoom('room-2');
    
    // Add turns to room 2
    await protocol.processQuery('room 2 question 1');
    await protocol.processQuery('room 2 question 2');
    
    // Check no summaries yet in room 2
    const room2Stats = await protocol.getTieredHistoryStats();
    expect(room2Stats.activeTurnsCount).toBe(2);
    expect(room2Stats.summariesCount).toBe(0);
    
    // Switch back to room 1
    await protocol.setCurrentRoom('room-1');
    
    // Check room 1 has summaries
    const room1Stats = await protocol.getTieredHistoryStats();
    expect(room1Stats.summariesCount).toBeGreaterThan(0);
  });
});