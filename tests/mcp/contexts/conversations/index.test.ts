import { describe, expect, test } from 'bun:test';

import * as ConversationContextModule from '../../../../src/mcp/contexts/conversations';

describe('ConversationContext Module', () => {
  test('should export the main ConversationContext class', () => {
    expect(ConversationContextModule.ConversationContext).toBeDefined();
  });

  test('should export the InMemoryStorage class', () => {
    expect(ConversationContextModule.InMemoryStorage).toBeDefined();
  });

  test('should export the TieredMemoryManager class', () => {
    expect(ConversationContextModule.TieredMemoryManager).toBeDefined();
  });

  test('should export the ConversationFormatter class', () => {
    expect(ConversationContextModule.ConversationFormatter).toBeDefined();
  });
});