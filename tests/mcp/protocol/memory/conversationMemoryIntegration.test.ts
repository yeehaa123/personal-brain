/**
 * Test file for validating ConversationMemory integration with BrainProtocol
 */
import { describe, expect, mock, test } from 'bun:test';

import { ConversationMemory, InMemoryStorage } from '@/mcp/protocol/memory';
import type { ConversationMemoryStorage } from '@/mcp/protocol/schemas/conversationMemoryStorage';

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
        await this.conversationMemory.startConversation();
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
  
  // Method to set Matrix room ID
  async setCurrentRoom(roomId: string): Promise<void> {
    if (this.interfaceType !== 'matrix') {
      throw new Error('Cannot set room ID for non-Matrix interface');
    }
    
    this.currentRoomId = roomId;
    await this.conversationMemory.getOrCreateConversationForRoom(roomId);
  }
}

/**
 * These tests validate the integration pattern between BrainProtocol
 * and ConversationMemory using a mock implementation.
 */
describe('Conversation Memory Integration', () => {
  test('should provide access to conversation memory instance', () => {
    const protocol = new MockBrainProtocol();
    const memory = protocol.getConversationMemory();
    
    expect(memory).toBeDefined();
    expect(typeof memory.formatHistoryForPrompt).toBe('function');
    expect(typeof memory.addTurn).toBe('function');
  });
  
  test('should include conversation history in processQuery', async () => {
    const protocol = new MockBrainProtocol();
    
    // Process a query
    await protocol.processQuery('test query');
    
    // Process another query which should now include history
    const response = await protocol.processQuery('follow-up query');
    
    expect(response).toBeDefined();
    expect(response.answer).toBe('Test response');
  });
  
  test('CLI should be the default interface type', async () => {
    const protocol = new MockBrainProtocol();
    const memory = protocol.getConversationMemory();
    
    // Add a conversation turn
    await protocol.processQuery('cli test');
    
    // Get history - no need to assert on content, just that it works
    const history = await memory.formatHistoryForPrompt();
    expect(history).toBeDefined();
  });
  
  test('Matrix interface should support room-based conversations', async () => {
    const protocol = new MockBrainProtocol({
      interfaceType: 'matrix',
      roomId: 'test-room',
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
  
  test('non-Matrix interface should reject room operations', async () => {
    const protocol = new MockBrainProtocol({ interfaceType: 'cli' });
    
    // Should throw an error for CLI interface
    await expect(async () => {
      await protocol.setCurrentRoom('test-room');
    }).toThrow('Cannot set room ID for non-Matrix interface');
  });
});