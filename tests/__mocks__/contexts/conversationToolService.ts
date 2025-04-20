/**
 * MockConversationToolService
 * 
 * Standard mock for ConversationToolService that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';
import { z } from 'zod';

import type { ResourceDefinition } from '@/contexts/core/contextInterface';

/**
 * Mock implementation of ConversationToolService
 */
export class MockConversationToolService {
  private static instance: MockConversationToolService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationToolService {
    if (!MockConversationToolService.instance) {
      MockConversationToolService.instance = new MockConversationToolService();
    }
    return MockConversationToolService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationToolService.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationToolService {
    return new MockConversationToolService();
  }
  
  // Mock methods with default implementations
  public getTools = mock((_context: unknown) => {
    return [
      {
        protocol: 'conversations',
        path: 'create_conversation',
        name: 'create_conversation',
        description: 'Creates a new conversation',
        handler: mock(() => Promise.resolve({ conversationId: 'conv-123' })),
      },
      {
        protocol: 'conversations',
        path: 'add_turn',
        name: 'add_turn',
        description: 'Adds a turn to a conversation',
        handler: mock(() => Promise.resolve({ turnId: 'turn-123' })),
      },
      {
        protocol: 'conversations',
        path: 'get_conversation_history',
        name: 'get_conversation_history',
        description: 'Retrieves formatted conversation history',
        handler: mock(() => Promise.resolve({ history: 'Mock conversation history' })),
      },
    ] as ResourceDefinition[];
  });
  
  public getToolSchema = mock((_tool: { name?: string }) => {
    switch (_tool.name) {
    case 'create_conversation':
      return {
        interfaceType: z.enum(['cli', 'matrix']).describe('Interface type of the conversation'),
        roomId: z.string().describe('Room ID for the conversation'),
      };
      
    case 'add_turn':
      return {
        conversationId: z.string().describe('ID of the conversation'),
        query: z.string().min(1).describe('User query'),
        response: z.string().optional().describe('Assistant response'),
        userId: z.string().optional().describe('User ID (optional)'),
        userName: z.string().optional().describe('User name (optional)'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata (optional)'),
      };
      
    case 'get_conversation_history':
      return {
        conversationId: z.string().describe('ID of the conversation'),
        format: z.enum(['text', 'markdown', 'json', 'html']).optional()
          .describe('Format of the output'),
        maxTurns: z.number().optional().describe('Maximum number of turns to include'),
      };
      
    default:
      return {};
    }
  });
}