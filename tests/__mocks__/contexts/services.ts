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
 */
export class MockQueryService {
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
}

/**
 * Standardized Mock Memory Service for Conversation Context tests
 */
export class MockMemoryService {
  addTurn = mock(() => Promise.resolve('turn-123'));
  getTurns = mock<() => Promise<Record<string, unknown>[]>>(() => Promise.resolve([]));
  getSummaries = mock<() => Promise<Record<string, unknown>[]>>(() => Promise.resolve([]));
  checkAndSummarize = mock(() => Promise.resolve(false));
  forceSummarize = mock(() => Promise.resolve(true));
  getTieredHistory = mock(() => Promise.resolve({ activeTurns: [], summaries: [], archivedTurns: [] }));
  formatHistoryForPrompt = mock(() => Promise.resolve(''));
  updateConfig = mock(() => {});
}

/**
 * Standardized Mock Resource Service for context tests
 */
export class MockResourceService {
  getResources = mock<() => ResourceDefinition[]>(() => []);
}

/**
 * Standardized Mock Tool Service for context tests
 */
export class MockToolService {
  getTools = mock<() => ResourceDefinition[]>(() => []);
  getToolSchema = mock(() => ({}));
}