/**
 * MockConversationResourceService
 * 
 * Standard mock for ConversationResourceService that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';

import type { ResourceDefinition } from '@/contexts/core/contextInterface';

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
        handler: mock(() => Promise.resolve([])),
      },
      {
        protocol: 'conversations',
        path: 'get/:id',
        handler: mock(() => Promise.resolve({})),
      },
      {
        protocol: 'conversations',
        path: 'search',
        handler: mock(() => Promise.resolve({ results: [] })),
      },
      {
        protocol: 'conversations',
        path: 'recent',
        handler: mock(() => Promise.resolve([])),
      },
    ] as ResourceDefinition[];
  });
}