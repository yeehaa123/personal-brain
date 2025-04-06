import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';

import { ConversationContext } from '../../../../src/mcp/contexts/conversations';
import { InMemoryStorage } from '../../../../src/mcp/contexts/conversations/inMemoryStorage';

describe('ConversationContext', () => {
  let context: ConversationContext;
  let storage: InMemoryStorage;

  beforeEach(() => {
    // Create a fresh instance for each test
    storage = InMemoryStorage.getInstance();
    // Clear any existing conversations from previous tests
    spyOn(storage, 'createConversation');
    spyOn(storage, 'addTurn');
    spyOn(storage, 'getSummaries');
    spyOn(storage, 'getTurns');
    
    context = ConversationContext.createFresh({
      storage,
    });
  });

  afterEach(() => {
    // No need to restore mocks in Bun test as they're scoped to the test
  });

  describe('createConversation', () => {
    test('should create a new conversation', async () => {
      const roomId = 'test-room';
      const id = await context.createConversation('cli', roomId);
      
      expect(id).toBeDefined();
      expect(storage.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId,
          interfaceType: 'cli',
        }),
      );
    });
  });

  describe('addTurn', () => {
    test('should add a turn to an existing conversation', async () => {
      const conversationId = await context.createConversation('cli', 'test-room');
      const query = 'Hello, world!';
      const response = 'Hi there!';
      
      await context.addTurn(conversationId, query, response);
      
      expect(storage.addTurn).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          query,
          response,
        }),
      );
    });

    test('should throw an error if conversation does not exist', async () => {
      const nonExistentId = 'non-existent-id';
      
      await expect(
        context.addTurn(nonExistentId, 'Hello', 'World'),
      ).rejects.toThrow();
    });
  });

  describe('getConversationHistory', () => {
    test('should return formatted conversation history', async () => {
      // Create a conversation and add some turns
      const conversationId = await context.createConversation('cli', 'test-room');
      await context.addTurn(conversationId, 'Hello', 'Hi there!');
      await context.addTurn(conversationId, 'How are you?', 'I am fine, thanks!');
      
      const history = await context.getConversationHistory(conversationId);
      
      expect(history).toContain('Hello');
      expect(history).toContain('Hi there!');
      expect(history).toContain('How are you?');
      expect(history).toContain('I am fine, thanks!');
      
      // Verify that the storage was queried
      expect(storage.getTurns).toHaveBeenCalledWith(conversationId, undefined);
      // The getSummaries is called conditionally, and we didn't set includeSummaries: true
      // So we check that getTurns was called instead
    });
  });

  describe('Singleton pattern', () => {
    test('should return the same instance with getInstance', () => {
      const instance1 = ConversationContext.getInstance();
      const instance2 = ConversationContext.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('should create a new instance with createFresh', () => {
      const instance1 = ConversationContext.createFresh();
      const instance2 = ConversationContext.createFresh();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});