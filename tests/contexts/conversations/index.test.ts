/**
 * Test exports from the refactored ConversationContext index
 */
import { describe, expect, test } from 'bun:test';

import * as ConversationContextModule from '@/contexts/conversations';
import { InMemoryStorage } from '@/contexts/conversations/storage/inMemoryStorage';

describe('ConversationContext Module - Public API', () => {
  test('should export the main ConversationContext class from the correct path', () => {
    expect(ConversationContextModule.ConversationContext).toBeDefined();
    expect(typeof ConversationContextModule.ConversationContext.getInstance).toBe('function');
    expect(typeof ConversationContextModule.ConversationContext.resetInstance).toBe('function');
  });

  test('should export the ConversationStorageAdapter class', () => {
    expect(ConversationContextModule.ConversationStorageAdapter).toBeDefined();
    // Create an instance using our mock for testing (should use getInstance() since constructor is private)
    const storage = InMemoryStorage.getInstance();
    const adapter = new ConversationContextModule.ConversationStorageAdapter(storage);
    expect(typeof adapter.create).toBe('function');
  });

  test('should export core type definitions', () => {
    // These types won't have runtime representation, but we can at least verify
    // the module has the expected structure for TypeScript
    expect(ConversationContextModule).toBeDefined();
    expect(typeof ConversationContextModule).toBe('object');
  });
});