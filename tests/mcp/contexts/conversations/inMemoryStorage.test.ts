import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

// Import the real implementation
import { InMemoryStorage } from '@/mcp/contexts/conversations/storage/inMemoryStorage';

describe('InMemoryStorage', () => {
  // We don't need to access instance directly as the tests
  // should focus on the public API, not implementation details
  
  // Tests specifically for the createFresh fix to ensure complete isolation between instances
  describe('createFresh isolation (cross-test contamination fix)', () => {
    test('should create instances with completely empty data structures', () => {
      const instance = InMemoryStorage.createFresh();
      
      // Access private fields for testing - since this test is specifically checking implementation
      // @ts-expect-error - Accessing private field for testing
      expect(instance.conversations.size).toBe(0);
      // @ts-expect-error - Accessing private field for testing
      expect(instance.turns.size).toBe(0);
      // @ts-expect-error - Accessing private field for testing
      expect(instance.summaries.size).toBe(0);
      // @ts-expect-error - Accessing private field for testing
      expect(instance.roomIndex.size).toBe(0);
    });
    
    test('should create instances with no shared state', async () => {
      const instance1 = InMemoryStorage.createFresh();
      const instance2 = InMemoryStorage.createFresh();
      
      // Add data to first instance
      const roomId = 'unique-test-room-123';
      await instance1.createConversation({
        interfaceType: 'matrix',
        roomId,
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Verify first instance has data
      const byRoom1 = await instance1.getConversationByRoom(roomId, 'matrix');
      expect(byRoom1).not.toBeNull();
      
      // Verify second instance has no data (completely isolated)
      const byRoom2 = await instance2.getConversationByRoom(roomId, 'matrix');
      expect(byRoom2).toBeNull();
    });
    
    test('clear() should reset singleton instance', async () => {
      // Create two instances and verify they're isolated
      const instance1 = InMemoryStorage.createFresh();
      
      // Add data to first instance
      const roomId = 'test-room-clear';
      await instance1.createConversation({
        interfaceType: 'matrix',
        roomId,
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Explicitly clear the instance
      instance1.clear();
      
      // Get a new instance - it should be completely fresh
      const instance2 = InMemoryStorage.createFresh();
      
      // Verify new instance has no access to previous data
      const byRoom = await instance2.getConversationByRoom(roomId, 'matrix');
      expect(byRoom).toBeNull();
      
      // Verify singleton is null or different after clear
      // @ts-expect-error - Accessing private static field for testing
      expect(InMemoryStorage.instance).toBeNull();
    });
  });
  
  let storage: InMemoryStorage;

  beforeEach(() => {
    // Create a fresh instance for each test
    storage = InMemoryStorage.createFresh();
  });
  
  afterEach(() => {
    // Explicitly call clear to ensure no lingering state
    storage.clear();
    // Reset singleton instance
    // @ts-expect-error - Accessing private field for testing
    InMemoryStorage.instance = null;
  });

  describe('createConversation', () => {
    test('should create a new conversation with a generated ID', async () => {
      const result = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result).toBeDefined();
      // Should return an ID string
      expect(typeof result).toBe('string');
    });

    test('should use the provided ID if one is given', async () => {
      const customId = 'custom-id';
      const result = await storage.createConversation({
        id: customId,
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result).toBe(customId);
    });
  });

  describe('getConversation', () => {
    test('should return null for a non-existent conversation', async () => {
      const result = await storage.getConversation('non-existent-id');
      expect(result).toBeNull();
    });

    test('should retrieve a created conversation', async () => {
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await storage.getConversation(id);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(id);
      expect(result?.interfaceType).toBe('cli');
      expect(result?.roomId).toBe('test-room');
    });
  });

  describe('getConversationByRoom', () => {
    test('should return null for a non-existent room', async () => {
      const result = await storage.getConversationByRoom('non-existent-room');
      expect(result).toBeNull();
    });

    test('should retrieve a conversation by room ID', async () => {
      const roomId = 'test-room';
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId,
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await storage.getConversationByRoom(roomId);
      expect(result).toBe(id);
    });

    test('should filter by interface type if provided', async () => {
      const roomId = 'shared-room';
      
      // Create a CLI conversation
      await storage.createConversation({
        interfaceType: 'cli',
        roomId,
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a Matrix conversation with the same room ID
      const matrixId = await storage.createConversation({
        interfaceType: 'matrix',
        roomId,
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Should find the Matrix conversation
      const matrixResult = await storage.getConversationByRoom(roomId, 'matrix');
      expect(matrixResult).toBe(matrixId);

      // Should find a conversation but not specified which one (implementation dependent)
      const anyResult = await storage.getConversationByRoom(roomId);
      expect(anyResult).toBeDefined();
    });
  });

  describe('addTurn and getTurns', () => {
    test('should add a turn to a conversation', async () => {
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      const turnId = await storage.addTurn(id, {
        id: 'turn-1',
        query: 'Hello',
        response: 'Hi there!',
        timestamp: new Date(),
        userId: 'user-1',
        userName: 'Test User',
      });

      expect(turnId).toBe('turn-1');

      const turns = await storage.getTurns(id);
      expect(turns.length).toBe(1);
      expect(turns[0].query).toBe('Hello');
      expect(turns[0].response).toBe('Hi there!');
    });

    test('should generate an ID if one is not provided', async () => {
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      const turnId = await storage.addTurn(id, {
        query: 'Hello',
        response: 'Hi there!',
        timestamp: new Date(),
      });

      expect(turnId).toBeDefined();
      expect(typeof turnId).toBe('string');

      const turns = await storage.getTurns(id);
      expect(turns.length).toBe(1);
      expect(turns[0].id).toBe(turnId);
    });
  });
});