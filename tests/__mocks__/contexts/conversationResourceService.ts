/**
 * MockConversationResourceService
 * 
 * Standard mock for ConversationResourceService that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';

import type { ResourceDefinition } from '@/contexts/contextInterface';

/**
 * Mock implementation of ConversationResourceService
 */
export class MockConversationResourceService {
  private static instance: MockConversationResourceService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationResourceService {
    if (!MockConversationResourceService.instance) {
      MockConversationResourceService.instance = new MockConversationResourceService();
    }
    return MockConversationResourceService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationResourceService.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationResourceService {
    return new MockConversationResourceService();
  }
  
  // Mock methods with default implementations
  public getResources = mock((_context: unknown) => {
    return [
      {
        protocol: 'conversations',
        path: 'list',
        name: 'List Conversations',
        description: 'Get a list of all conversations with optional filtering',
        handler: mock(() => Promise.resolve([])),
      },
      {
        protocol: 'conversations',
        path: 'get/:id',
        name: 'Get Conversation',
        description: 'Get a conversation by ID with its turns and summaries',
        handler: mock(() => Promise.resolve({})),
      },
      {
        protocol: 'conversations',
        path: 'search',
        name: 'Search Conversations',
        description: 'Search for conversations based on various criteria',
        handler: mock(() => Promise.resolve({ results: [] })),
      },
      {
        protocol: 'conversations',
        path: 'recent',
        name: 'Recent Conversations',
        description: 'Get a list of recent conversations',
        handler: mock(() => Promise.resolve([])),
      },
    ] as ResourceDefinition[];
  });
}