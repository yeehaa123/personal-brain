/**
 * Storage Mocks Index
 * 
 * This file exports all storage mock implementations and helpers for easy importing.
 */

// Base storage mock
export { 
  MockStorageInterface,
  createMockStorageInterface,
} from './baseStorageInterface';

// Conversation storage mock
export {
  MockConversationStorage,
  mockConversationStorage,
} from './conversationStorage';

// Helper functions for creating test data
export {
  createMockConversation,
  createMockConversations,
  createMockConversationTurn,
  createMockConversationTurns,
  createMockConversationSummary,
} from './mockHelpers';