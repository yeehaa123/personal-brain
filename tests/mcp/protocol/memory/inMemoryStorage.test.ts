import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

// Import the InMemoryStorage class directly
import { conversationConfig } from '@/config'; 
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

// Test suite for InMemoryStorage singleton
describe('InMemoryStorage', () => {
  beforeEach(() => {
    // Reset the singleton before each test to ensure a clean state
    InMemoryStorage.getInstance().reset();
  });

  afterEach(() => {
    // Clean up after each test
    InMemoryStorage.getInstance().reset();
  });

  // Test singleton pattern
  test('should maintain singleton instance', async () => {
    // Reset the singleton first to ensure clean state
    InMemoryStorage.getInstance().reset();
    
    const instance1 = InMemoryStorage.getInstance();
    const instance2 = InMemoryStorage.getInstance();
    
    // Should be the same instance
    expect(instance1).toBe(instance2);
    
    // Add data to the first instance
    await instance1.createConversation({ 
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
    });
    
    // Both instances should share the same data
    const conversations = await instance2.getRecentConversations();
    expect(conversations.length).toBe(1);
  });
  
  test('createFresh should create isolated instances', async () => {
    const instance1 = InMemoryStorage.createFresh();
    const instance2 = InMemoryStorage.createFresh();
    
    // Should be different instances
    expect(instance1).not.toBe(instance2);
    
    // Add data to first instance
    await instance1.createConversation({ interfaceType: 'cli', roomId: conversationConfig.defaultCliRoomId });
    
    // Second instance should have no data
    const conversations = await instance2.getRecentConversations();
    expect(conversations.length).toBe(0);
  });
  
  test('singleton instance should be separate from createFresh instances', async () => {
    const singleton = InMemoryStorage.getInstance();
    const fresh = InMemoryStorage.createFresh();
    
    // Should be different instances
    expect(singleton).not.toBe(fresh);
    
    // Reset singleton to ensure clean state
    singleton.reset();
    
    // Add data to singleton
    await singleton.createConversation({ interfaceType: 'cli', roomId: conversationConfig.defaultCliRoomId });
    
    // Fresh instance should have no data
    const freshConversations = await fresh.getRecentConversations();
    expect(freshConversations.length).toBe(0);
    
    // Singleton should have data
    const singletonConversations = await singleton.getRecentConversations();
    expect(singletonConversations.length).toBe(1);
  });
  
  // Each test uses the singleton instance, which is reset before each test

  test('should create a new conversation', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    const conversation = await storage.createConversation({
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.createdAt).toBeInstanceOf(Date);
    expect(conversation.updatedAt).toBeInstanceOf(Date);
    expect(conversation.activeTurns).toEqual([]);
    expect(conversation.interfaceType).toBe('cli');
  });

  test('should get a conversation by ID', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    // Create a conversation first
    const created = await storage.createConversation({
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
    });

    // Retrieve it by ID
    const retrieved = await storage.getConversation(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
  });

  test('should return null for non-existent conversation ID', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    const result = await storage.getConversation('non-existent-id');
    expect(result).toBeNull();
  });

  test('should add a turn to an existing conversation', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    // Create a conversation
    const conversation = await storage.createConversation({
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
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
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    const turn: Omit<ConversationTurn, 'id'> = {
      timestamp: new Date(),
      query: 'Test query',
      response: 'Test response',
      userId: 'test-user',
      userName: 'Test User',
    };

    expect(storage.addTurn('non-existent-id', turn)).rejects.toThrow();
  });

  // Break up the large test into smaller, focused tests

  test('should filter conversations by cli interface type', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    // Create a CLI conversation
    const cliConv = await storage.createConversation({
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
    });

    // Test filtering
    const cliConversations = await storage.getRecentConversations({ interfaceType: 'cli' });
    expect(cliConversations.length).toBe(1);
    expect(cliConversations[0].id).toBe(cliConv.id);
  });

  test('should filter conversations by matrix interface type', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    // Create a Matrix conversation
    const matrixConv = await storage.createConversation({
      interfaceType: 'matrix',
      roomId: 'test-room-filter',
    });

    // Test filtering
    const matrixConversations = await storage.getRecentConversations({ interfaceType: 'matrix' });
    expect(matrixConversations.length).toBe(1);
    expect(matrixConversations[0].id).toBe(matrixConv.id);
  });

  test('should limit conversation results', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    // Create multiple conversations
    await storage.createConversation({ interfaceType: 'cli', roomId: conversationConfig.defaultCliRoomId });
    await storage.createConversation({ interfaceType: 'cli', roomId: conversationConfig.defaultCliRoomId });

    // Test with limit
    const limitedConversations = await storage.getRecentConversations({ limit: 1 });
    expect(limitedConversations.length).toBe(1);
  });

  // Test that storage can retrieve conversations by a variety of filters (split into multiple tests)
  test('should find cli conversations with type filter', async () => {
    // Create a completely fresh instance for this specific test
    const testInstance = InMemoryStorage.createFresh();
    
    // Create one CLI conversation
    const cliConv = await testInstance.createConversation({ interfaceType: 'cli', roomId: conversationConfig.defaultCliRoomId });
    
    // Test retrieving by type
    const result = await testInstance.getRecentConversations({ interfaceType: 'cli' });
    
    // Verify exactly one conversation was found
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(cliConv.id);
  });
  
  test('should find matrix conversations with type filter', async () => {
    // Create a completely fresh instance for this specific test
    const testInstance = InMemoryStorage.createFresh();
    
    // Create one Matrix conversation
    const matrixConv = await testInstance.createConversation({ 
      interfaceType: 'matrix',
      roomId: 'unique-room-id-all-matrix',
    });
    
    // Test retrieving by type
    const result = await testInstance.getRecentConversations({ interfaceType: 'matrix' });
    
    // Verify exactly one conversation was found
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(matrixConv.id);
  });

  test('should delete a conversation', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    // Create a conversation
    const conversation = await storage.createConversation({
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
    });

    // Delete it
    const deleteResult = await storage.deleteConversation(conversation.id);
    expect(deleteResult).toBe(true);

    // Verify it's gone
    const retrieved = await storage.getConversation(conversation.id);
    expect(retrieved).toBeNull();
  });

  test('should return false when deleting non-existent conversation', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    const result = await storage.deleteConversation('non-existent-id');
    expect(result).toBe(false);
  });

  test('should update conversation metadata', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

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
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

    expect(storage.updateMetadata('non-existent-id', { topic: 'Test' })).rejects.toThrow();
  });

  test('should get conversation by room ID', async () => {
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

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
    // Always use a fresh instance for proper test isolation
    const storage = InMemoryStorage.createFresh();

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
