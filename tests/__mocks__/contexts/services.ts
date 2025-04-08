/**
 * Standardized Mock Services for Context Tests
 * 
 * This file provides standardized mock implementations for various services
 * used in context tests. These mocks follow a consistent pattern and
 * can be used throughout the test suite.
 */

import { mock } from 'bun:test';

import type { ResourceDefinition } from '@/mcp/contexts/core/contextInterface';

/**
 * Standardized Mock Query Service for Conversation Context tests
 * Follows the Component Interface Standardization pattern
 */
export class MockQueryService {
  /** The singleton instance */
  private static instance: MockQueryService | null = null;
  
  // Allow both null and Conversation return types
  createConversation = mock(() => Promise.resolve('conv-123'));
  getConversation = mock<() => Promise<Record<string, unknown> | null>>(() => Promise.resolve(null));
  getConversationIdByRoom = mock(() => Promise.resolve(null));
  getOrCreateConversationForRoom = mock(() => Promise.resolve('conv-123'));
  findConversations = mock(() => Promise.resolve([]));
  getConversationsByRoom = mock(() => Promise.resolve([]));
  getRecentConversations = mock(() => Promise.resolve([]));
  updateMetadata = mock(() => Promise.resolve(true));
  deleteConversation = mock(() => Promise.resolve(true));
  
  /**
   * Get the singleton instance of MockQueryService
   * 
   * @returns The shared MockQueryService instance
   */
  public static getInstance(): MockQueryService {
    if (!MockQueryService.instance) {
      MockQueryService.instance = new MockQueryService();
    }
    return MockQueryService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockQueryService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * 
   * @returns A new MockQueryService instance
   */
  public static createFresh(): MockQueryService {
    return new MockQueryService();
  }
}

/**
 * Standardized Mock Memory Service for Conversation Context tests
 * Follows the Component Interface Standardization pattern
 */
export class MockMemoryService {
  /** The singleton instance */
  private static instance: MockMemoryService | null = null;
  
  addTurn = mock(() => Promise.resolve('turn-123'));
  getTurns = mock<() => Promise<Record<string, unknown>[]>>(() => Promise.resolve([]));
  getSummaries = mock<() => Promise<Record<string, unknown>[]>>(() => Promise.resolve([]));
  checkAndSummarize = mock(() => Promise.resolve(false));
  forceSummarize = mock(() => Promise.resolve(true));
  getTieredHistory = mock(() => Promise.resolve({ activeTurns: [], summaries: [], archivedTurns: [] }));
  formatHistoryForPrompt = mock(() => Promise.resolve(''));
  updateConfig = mock(() => {});
  
  /**
   * Get the singleton instance of MockMemoryService
   * 
   * @returns The shared MockMemoryService instance
   */
  public static getInstance(): MockMemoryService {
    if (!MockMemoryService.instance) {
      MockMemoryService.instance = new MockMemoryService();
    }
    return MockMemoryService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockMemoryService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * 
   * @returns A new MockMemoryService instance
   */
  public static createFresh(): MockMemoryService {
    return new MockMemoryService();
  }
}

/**
 * Standardized Mock Resource Service for context tests
 * Follows the Component Interface Standardization pattern
 */
export class MockResourceService {
  /** The singleton instance */
  private static instance: MockResourceService | null = null;
  
  getResources = mock<() => ResourceDefinition[]>(() => []);
  
  /**
   * Get the singleton instance of MockResourceService
   * 
   * @returns The shared MockResourceService instance
   */
  public static getInstance(): MockResourceService {
    if (!MockResourceService.instance) {
      MockResourceService.instance = new MockResourceService();
    }
    return MockResourceService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockResourceService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * 
   * @returns A new MockResourceService instance
   */
  public static createFresh(): MockResourceService {
    return new MockResourceService();
  }
}

/**
 * Standardized Mock Tool Service for context tests
 * Follows the Component Interface Standardization pattern
 */
export class MockToolService {
  /** The singleton instance */
  private static instance: MockToolService | null = null;
  
  getTools = mock<() => ResourceDefinition[]>(() => []);
  getToolSchema = mock(() => ({}));
  
  /**
   * Get the singleton instance of MockToolService
   * 
   * @returns The shared MockToolService instance
   */
  public static getInstance(): MockToolService {
    if (!MockToolService.instance) {
      MockToolService.instance = new MockToolService();
    }
    return MockToolService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockToolService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * 
   * @returns A new MockToolService instance
   */
  public static createFresh(): MockToolService {
    return new MockToolService();
  }
}