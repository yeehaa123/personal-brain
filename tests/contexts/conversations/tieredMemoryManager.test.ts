import { beforeEach, describe, expect, test } from 'bun:test';

import { ConversationSummarizer } from '@/contexts/conversations/memory/summarizer';
import { TieredMemoryManager } from '@/contexts/conversations/memory/tieredMemoryManager';
import { MockConversationStorage } from '@test/__mocks__/storage';

// We'll skip more complex mocking for now and focus on the basic functionality
describe('TieredMemoryManager', () => {
  let manager: TieredMemoryManager;
  let storage: MockConversationStorage;
  let conversationId: string;

  beforeEach(async () => {
    // Reset the singleton instances before each test
    TieredMemoryManager.resetInstance();
    ConversationSummarizer.resetInstance();
    
    // Create a fresh storage instance
    storage = MockConversationStorage.createFresh();
    
    // Create the tiered memory manager
    manager = TieredMemoryManager.createFresh({
      storage,
      config: {
        maxActiveTurns: 5,
        summaryTurnCount: 3,
      },
    });
    
    // Create a test conversation
    conversationId = await storage.createConversation({
      interfaceType: 'cli',
      roomId: 'test-room',
      startedAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('getTieredHistory', () => {
    test('should return active turns, summaries, and archived turns', async () => {
      // Add some turns
      await storage.addTurn(conversationId, {
        query: 'Active 1',
        response: 'Response 1',
        timestamp: new Date(),
      });
      await storage.addTurn(conversationId, {
        query: 'Active 2',
        response: 'Response 2',
        timestamp: new Date(),
      });
      
      // Add a summary
      await storage.addSummary(conversationId, {
        id: 'summary-1',
        conversationId,
        content: 'Test summary',
        createdAt: new Date(),
      });
      
      // Get tiered history
      const history = await manager.getTieredHistory(conversationId);
      
      // Check result structure
      expect(history).toHaveProperty('activeTurns');
      expect(history).toHaveProperty('summaries');
      expect(history).toHaveProperty('archivedTurns');
      
      // Should have 2 active turns
      expect(history.activeTurns.length).toBe(2);
      
      // Should have 1 summary
      expect(history.summaries.length).toBe(1);
      expect(history.summaries[0].content).toBe('Test summary');
      
      // Should have 0 archived turns initially
      expect(history.archivedTurns.length).toBe(0);
    });
  });

  describe('config management', () => {
    test('should allow getting and setting config values', () => {
      const initialConfig = manager.getConfig();
      expect(initialConfig.maxActiveTurns).toBe(5);
      expect(initialConfig.summaryTurnCount).toBe(3);
      
      // Update config
      manager.setConfig({
        maxActiveTurns: 10,
        maxTokens: 3000,
      });
      
      const updatedConfig = manager.getConfig();
      expect(updatedConfig.maxActiveTurns).toBe(10);
      expect(updatedConfig.summaryTurnCount).toBe(3); // Unchanged
      expect(updatedConfig.maxTokens).toBe(3000); // Updated
    });
  });
});