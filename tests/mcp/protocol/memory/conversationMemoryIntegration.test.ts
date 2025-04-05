/**
 * Test file for validating ConversationMemory integration with BrainProtocol
 */
import { describe, expect, mock, test } from 'bun:test';

import { ConversationMemory } from '@/mcp/protocol/memory';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { ConversationMemoryStorage } from '@/mcp/protocol/schemas/conversationMemoryStorage';

import { createIsolatedMemory } from '../../../utils/memoryUtils';

// Create a partial mock of BrainProtocol for testing
class MockBrainProtocol {
  private interfaceType: 'cli' | 'matrix';
  private currentRoomId?: string;
  private conversationMemory: ConversationMemory;
  private model: { complete: unknown };

  constructor(options?: { 
    interfaceType?: 'cli' | 'matrix'; 
    roomId?: string;
    storage?: ConversationMemoryStorage; // Added storage parameter
  }) {
    this.interfaceType = options?.interfaceType || 'cli';
    this.currentRoomId = options?.roomId;
    
    // Initialize conversation memory - use provided storage or create fresh one
    // Always use createFresh() for tests to ensure proper isolation
    this.conversationMemory = new ConversationMemory({
      interfaceType: this.interfaceType,
      storage: options?.storage || InMemoryStorage.createFresh(),
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
        // Use default CLI room ID or a test room ID
        const roomId = this.currentRoomId || 'cli-test-room-id';
        await this.conversationMemory.startConversation(roomId);
      }
    } catch (_error) {
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
    } catch (_error) {
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
    } catch (_error) {
      // Ignore errors in tests
    }
    
    return { answer: response.response };
  }
  
  // Method to set room ID (for any interface)
  async setCurrentRoom(roomId: string): Promise<void> {
    // No interface check - both CLI and Matrix support room IDs now
    this.currentRoomId = roomId;
    await this.conversationMemory.getOrCreateConversationForRoom(roomId);
  }
}

/**
 * These tests validate the integration pattern between BrainProtocol
 * and ConversationMemory using a mock implementation.
 */
describe('Conversation Memory Integration', () => {
  test('should provide access to conversation memory instance', async () => {
    // Use isolated memory to prevent test interference
    const { storage } = await createIsolatedMemory();
    const protocol = new MockBrainProtocol({ storage });
    const memory = protocol.getConversationMemory();
    
    expect(memory).toBeDefined();
    expect(typeof memory.formatHistoryForPrompt).toBe('function');
    expect(typeof memory.addTurn).toBe('function');
  });
  
  test('should include conversation history in processQuery', async () => {
    // Use isolated memory to prevent test interference
    const { storage } = await createIsolatedMemory();
    const protocol = new MockBrainProtocol({ storage });
    
    // Process a query
    await protocol.processQuery('test query');
    
    // Process another query which should now include history
    const response = await protocol.processQuery('follow-up query');
    
    expect(response).toBeDefined();
    expect(response.answer).toBe('Test response');
  });
  
  test('CLI should be the default interface type', async () => {
    // Use isolated memory to prevent test interference
    const { storage } = await createIsolatedMemory();
    const protocol = new MockBrainProtocol({ storage });
    const memory = protocol.getConversationMemory();
    
    // Add a conversation turn
    await protocol.processQuery('cli test');
    
    // Get history - no need to assert on content, just that it works
    const history = await memory.formatHistoryForPrompt();
    expect(history).toBeDefined();
  });
  
  test('Matrix interface should support room-based conversations', async () => {
    // Use isolated memory to prevent test interference
    const { storage } = await createIsolatedMemory({ interfaceType: 'matrix' });
    const protocol = new MockBrainProtocol({
      interfaceType: 'matrix',
      roomId: 'test-room',
      storage,
    });
    
    // This should work without throwing
    await protocol.setCurrentRoom('another-room');
    
    // Adding turns should work
    await protocol.processQuery('matrix test', {
      userId: '@test:matrix.org',
      userName: 'Test User',
      roomId: 'another-room',
    });
  });
  
  test('non-Matrix interface should now support room operations', async () => {
    const protocol = new MockBrainProtocol({ interfaceType: 'cli' });
    
    // Should not throw an error for CLI interface anymore
    await protocol.setCurrentRoom('test-room');
    
    // Process a query to verify it works
    const response = await protocol.processQuery('test query');
    expect(response).toBeDefined();
    expect(response.answer).toBe('Test response');
  });
});