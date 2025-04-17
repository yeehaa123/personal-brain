/**
 * Test exports from the refactored ConversationContext index
 */
import { describe, expect, test } from 'bun:test';

import * as ConversationContextModule from '@/contexts/conversations';

describe('ConversationContext Module', () => {
  test('should export the main ConversationContext class from the correct path', () => {
    expect(ConversationContextModule.ConversationContext).toBeDefined();
    expect(typeof ConversationContextModule.ConversationContext.getInstance).toBe('function');
    expect(typeof ConversationContextModule.ConversationContext.resetInstance).toBe('function');
  });

  test('should export the ConversationStorageAdapter class', () => {
    expect(ConversationContextModule.ConversationStorageAdapter).toBeDefined();
    // Create an instance using our mock for testing (should use getInstance() since constructor is private)
    const storage = ConversationContextModule.InMemoryStorage.getInstance();
    const adapter = new ConversationContextModule.ConversationStorageAdapter(storage);
    expect(typeof adapter.create).toBe('function');
  });

  test('should export the InMemoryStorage class', () => {
    expect(ConversationContextModule.InMemoryStorage).toBeDefined();
    expect(typeof ConversationContextModule.InMemoryStorage.getInstance).toBe('function');
  });

  test('should export the TieredMemoryManager class', () => {
    expect(ConversationContextModule.TieredMemoryManager).toBeDefined();
  });

  test('should export the ConversationFormatter class', () => {
    expect(ConversationContextModule.ConversationFormatter).toBeDefined();
  });

  test('should export the ConversationMcpFormatter class', () => {
    expect(ConversationContextModule.ConversationMcpFormatter).toBeDefined();
    
    // Reset before test
    ConversationContextModule.ConversationMcpFormatter.resetInstance();
    
    // Use createFresh instead of constructor
    const formatter = ConversationContextModule.ConversationMcpFormatter.createFresh();
    expect(typeof formatter.formatConversationForMcp).toBe('function');
  });
});