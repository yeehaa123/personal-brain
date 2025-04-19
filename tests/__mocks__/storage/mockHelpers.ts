/**
 * Storage Mock Helpers
 * 
 * This file provides helper functions for creating and working with storage mocks.
 */
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';

/**
 * Create a mock conversation for testing
 */
export function createMockConversation(
  id = 'test-conversation',
  interfaceType: 'cli' | 'matrix' = 'cli',
  roomId = 'test-room',
): Conversation {
  return {
    id,
    interfaceType,
    roomId,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
    activeTurns: [],
    summaries: [],
    archivedTurns: [],
  };
}

/**
 * Create a mock conversation turn for testing
 */
export function createMockConversationTurn(
  id = 'test-turn',
  query = 'Test query',
  response = 'Test response',
): ConversationTurn {
  return {
    id,
    query,
    response,
    timestamp: new Date(),
    userId: 'test-user',
    userName: 'Test User',
    metadata: {},
  };
}

/**
 * Create a mock conversation summary for testing
 */
export function createMockConversationSummary(
  id = 'test-summary',
  conversationId = 'test-conversation',
  content = 'Test summary content',
): ConversationSummary {
  return {
    id,
    conversationId,
    content,
    createdAt: new Date(),
    metadata: {},
  };
}

/**
 * Create multiple mock conversation turns
 */
export function createMockConversationTurns(count = 3): ConversationTurn[] {
  return Array.from({ length: count }, (_, i) => 
    createMockConversationTurn(`turn-${i}`, `Query ${i}`, `Response ${i}`),
  );
}

/**
 * Create multiple mock conversations
 */
export function createMockConversations(count = 3): Conversation[] {
  return Array.from({ length: count }, (_, i) => 
    createMockConversation(`conv-${i}`, i % 2 === 0 ? 'cli' : 'matrix', `room-${i}`),
  );
}