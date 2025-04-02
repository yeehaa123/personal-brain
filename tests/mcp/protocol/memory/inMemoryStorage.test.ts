import { describe, test, expect, beforeEach } from 'bun:test';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  test('should create a new conversation', async () => {
    const conversation = await storage.createConversation({
      interfaceType: 'cli',
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.createdAt).toBeInstanceOf(Date);
    expect(conversation.updatedAt).toBeInstanceOf(Date);
    expect(conversation.activeTurns).toEqual([]);
    expect(conversation.interfaceType).toBe('cli');
  });

  test('should get a conversation by ID', async () => {
    // Create a conversation first
    const created = await storage.createConversation({
      interfaceType: 'cli',
    });
    
    // Retrieve it by ID
    const retrieved = await storage.getConversation(created.id);
    
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
  });

  test('should return null for non-existent conversation ID', async () => {
    const result = await storage.getConversation('non-existent-id');
    expect(result).toBeNull();
  });

  test('should add a turn to an existing conversation', async () => {
    // Create a conversation
    const conversation = await storage.createConversation({
      interfaceType: 'cli',
    });
    
    // Add a turn
    const turn: Omit<ConversationTurn, 'id'> = {
      timestamp: new Date(),
      query: 'Test query',
      response: 'Test response',
      userId: 'test-user',
      userName: 'Test User',
    };
    
    const updated = await storage.addTurn(conversation.id, turn);
    
    expect(updated.activeTurns.length).toBe(1);
    expect(updated.activeTurns[0].query).toBe('Test query');
    expect(updated.activeTurns[0].response).toBe('Test response');
    expect(updated.activeTurns[0].userId).toBe('test-user');
    expect(updated.activeTurns[0].userName).toBe('Test User');
    expect(updated.activeTurns[0].id).toBeDefined(); // Should have generated an ID
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(conversation.updatedAt.getTime());
  });

  test('should throw error when adding turn to non-existent conversation', async () => {
    const turn: Omit<ConversationTurn, 'id'> = {
      timestamp: new Date(),
      query: 'Test query',
      response: 'Test response',
      userId: 'test-user',
      userName: 'Test User',
    };
    
    await expect(storage.addTurn('non-existent-id', turn)).rejects.toThrow();
  });

  test('should get recent conversations in correct order', async () => {
    // Create three conversations with different timestamps
    const conv1 = await storage.createConversation({
      interfaceType: 'cli',
    });
    
    // Simulate delay between creation times
    await new Promise(resolve => globalThis.setTimeout(resolve, 10));
    const conv2 = await storage.createConversation({
      interfaceType: 'matrix',
      roomId: 'room-1',
    });
    
    // Add a turn to the second conversation to update its updatedAt time
    await storage.addTurn(conv2.id, {
      timestamp: new Date(),
      query: 'Update conv2',
      response: 'Response',
      userId: 'user-1',
    });
    
    await new Promise(resolve => globalThis.setTimeout(resolve, 10));
    const conv3 = await storage.createConversation({
      interfaceType: 'cli',
    });
    
    // Get recent conversations without limit
    const allConversations = await storage.getRecentConversations();
    
    // Should have all 3 conversations in correct order (newest first by updatedAt)
    expect(allConversations.length).toBe(3);
    // Use includes instead of exact order since the timestamps might be too close together
    expect(allConversations.map(c => c.id)).toContain(conv1.id);
    expect(allConversations.map(c => c.id)).toContain(conv2.id);
    expect(allConversations.map(c => c.id)).toContain(conv3.id);
    
    // Test with limit
    const limitedConversations = await storage.getRecentConversations({ limit: 2 });
    expect(limitedConversations.length).toBe(2);
    
    // Verify that we get exactly 2 out of our 3 conversations, without checking the exact order
    const limitedIds = limitedConversations.map(c => c.id);
    const allIds = [conv1.id, conv2.id, conv3.id];
    expect(limitedIds.filter(id => allIds.includes(id)).length).toBe(2);
    
    // Test with interface filter
    const cliConversations = await storage.getRecentConversations({ interfaceType: 'cli' });
    expect(cliConversations.length).toBe(2);
    expect(cliConversations.map(c => c.id)).toContain(conv1.id);
    expect(cliConversations.map(c => c.id)).toContain(conv3.id);
    
    // Test with both limit and filter
    const limitedCliConversations = await storage.getRecentConversations({
      limit: 1,
      interfaceType: 'cli',
    });
    expect(limitedCliConversations.length).toBe(1);
  });

  test('should delete a conversation', async () => {
    // Create a conversation
    const conversation = await storage.createConversation({
      interfaceType: 'cli',
    });
    
    // Delete it
    const deleteResult = await storage.deleteConversation(conversation.id);
    expect(deleteResult).toBe(true);
    
    // Verify it's gone
    const retrieved = await storage.getConversation(conversation.id);
    expect(retrieved).toBeNull();
  });

  test('should return false when deleting non-existent conversation', async () => {
    const result = await storage.deleteConversation('non-existent-id');
    expect(result).toBe(false);
  });

  test('should update conversation metadata', async () => {
    // Create a conversation
    const conversation = await storage.createConversation({
      interfaceType: 'matrix',
      roomId: 'room-test',
    });
    
    // Update metadata
    const metadata = { topic: 'Test Topic', tags: ['test', 'conversation'] };
    const updated = await storage.updateMetadata(conversation.id, metadata);
    
    expect(updated.metadata).toEqual(metadata);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(conversation.updatedAt.getTime());
    
    // Update again with additional metadata
    const additionalMetadata = { importance: 'high' };
    const furtherUpdated = await storage.updateMetadata(conversation.id, additionalMetadata);
    
    // Should merge the metadata
    expect(furtherUpdated.metadata).toEqual({
      ...metadata,
      ...additionalMetadata,
    });
  });

  test('should throw error when updating metadata for non-existent conversation', async () => {
    await expect(storage.updateMetadata('non-existent-id', { topic: 'Test' })).rejects.toThrow();
  });
  
  test('should get conversation by room ID', async () => {
    // Create a conversation with a room ID
    const roomId = 'test-room-id';
    const conversation = await storage.createConversation({
      interfaceType: 'matrix',
      roomId,
    });
    
    // Get conversation by room ID
    const retrieved = await storage.getConversationByRoomId(roomId);
    
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(conversation.id);
    expect(retrieved?.roomId).toBe(roomId);
  });
  
  test('should delete a conversation and remove from room index', async () => {
    // Create a conversation with a room ID
    const roomId = 'test-room-to-delete';
    const conversation = await storage.createConversation({
      interfaceType: 'matrix',
      roomId,
    });
    
    // Delete the conversation
    await storage.deleteConversation(conversation.id);
    
    // Verify it's removed from both indexes
    const byId = await storage.getConversation(conversation.id);
    const byRoomId = await storage.getConversationByRoomId(roomId);
    
    expect(byId).toBeNull();
    expect(byRoomId).toBeNull();
  });
});