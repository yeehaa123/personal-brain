import { beforeEach, describe, expect, test } from 'bun:test';

import { ConversationSummarizer } from '@/contexts/conversations/memory/summarizer';
import { TieredMemoryManager } from '@/contexts/conversations/memory/tieredMemoryManager';
import { MockConversationStorage } from '@test/__mocks__/storage/conversationStorage';

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

      // Single consolidated assertion for all structure and content checks
      expect({
        // Structure validation
        structure: {
          hasActiveTurns: 'activeTurns' in history,
          hasSummaries: 'summaries' in history,
          hasArchivedTurns: 'archivedTurns' in history,
        },
        // Content validation
        content: {
          activeTurnsCount: history.activeTurns.length,
          summariesCount: history.summaries.length,
          summaryContent: history.summaries[0]?.content,
          archivedTurnsCount: history.archivedTurns.length,
        },
      }).toMatchObject({
        structure: {
          hasActiveTurns: true,
          hasSummaries: true,
          hasArchivedTurns: true,
        },
        content: {
          activeTurnsCount: 2,
          summariesCount: 1,
          summaryContent: 'Test summary',
          archivedTurnsCount: 0,
        },
      });
    });
  });

  describe('config management', () => {
    test('should allow getting and setting config values', () => {
      const initialConfig = manager.getConfig();
      
      // Update config
      manager.setConfig({
        maxActiveTurns: 10,
        maxTokens: 3000,
      });

      const updatedConfig = manager.getConfig();
      
      // Single consolidated assertion that verifies both initial and updated config
      expect({
        initialConfig: {
          maxActiveTurns: initialConfig.maxActiveTurns,
          summaryTurnCount: initialConfig.summaryTurnCount,
        },
        updatedConfig: {
          maxActiveTurns: updatedConfig.maxActiveTurns,
          summaryTurnCount: updatedConfig.summaryTurnCount,
          maxTokens: updatedConfig.maxTokens,
        },
      }).toMatchObject({
        initialConfig: {
          maxActiveTurns: 5,
          summaryTurnCount: 3,
        },
        updatedConfig: {
          maxActiveTurns: 10,   // Should be updated
          summaryTurnCount: 3,  // Should remain unchanged
          maxTokens: 3000,       // Should be added
        },
      });
    });
  });
});
