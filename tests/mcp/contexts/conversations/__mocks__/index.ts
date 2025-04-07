/**
 * Mocks for conversation context tests
 */

import { mock } from 'bun:test';

// Create mock services
import type { ConversationSummary } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { ResourceDefinition } from '@/mcp/contexts/core/contextInterface';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';


// MockInMemoryStorage is now imported from '@test/__mocks__/storage' as MockConversationStorage

export class MockQueryService {
  createConversation = mock(() => Promise.resolve('conv-123'));
  getConversation = mock(() => Promise.resolve<Conversation | null>(null));
  getConversationIdByRoom = mock(() => Promise.resolve(null));
  getOrCreateConversationForRoom = mock(() => Promise.resolve('conv-123'));
  findConversations = mock(() => Promise.resolve([]));
  getConversationsByRoom = mock(() => Promise.resolve([]));
  getRecentConversations = mock(() => Promise.resolve([]));
  updateMetadata = mock(() => Promise.resolve(true));
  deleteConversation = mock(() => Promise.resolve(true));
}

export class MockMemoryService {
  addTurn = mock(() => Promise.resolve('turn-123'));
  getTurns = mock<() => Promise<ConversationTurn[]>>(() => Promise.resolve([]));
  getSummaries = mock<() => Promise<ConversationSummary[]>>(() => Promise.resolve([]));
  checkAndSummarize = mock(() => Promise.resolve(false));
  forceSummarize = mock(() => Promise.resolve(true));
  getTieredHistory = mock(() => Promise.resolve({ activeTurns: [], summaries: [], archivedTurns: [] }));
  formatHistoryForPrompt = mock(() => Promise.resolve(''));
  updateConfig = mock(() => {});
}

export class MockResourceService {
  getResources = mock<() => ResourceDefinition[]>(() => []);
}

export class MockToolService {
  getTools = mock<() => ResourceDefinition[]>(() => []);
  getToolSchema = mock(() => ({}));
}