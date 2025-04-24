/**
 * Tests for ConversationStorageAdapter
 */
import { describe, expect, spyOn, test } from 'bun:test';

import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import type { ListOptions, SearchCriteria } from '@/contexts/storageInterface';
import type { ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';
import { MockConversationStorage } from '@test/__mocks__/storage/conversationStorage';

// The InMemoryStorage mock is now set up globally in setup.ts


describe('ConversationStorageAdapter', () => {

  describe('CRUD operations', () => {
    test('create() creates a conversation and returns its ID', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const result = await adapter.create({
        roomId: 'test-room',
        interfaceType: 'cli',
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('conv-');

      // Verify conversation was created in underlying storage
      const conversation = await storage.getConversation(result);
      expect(conversation).toBeDefined();
      expect(conversation?.roomId).toBe('test-room');
    });

    test('read() retrieves a conversation by ID', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const id = await storage.createConversation({
        roomId: 'test-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Read through adapter
      const conversation = await adapter.read(id);

      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe(id);
      expect(conversation?.roomId).toBe('test-room');
    });

    test('update() updates a conversation', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const id = await storage.createConversation({
        roomId: 'test-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update through adapter
      const success = await adapter.update(id, {
        metadata: { isImportant: true },
      });

      expect(success).toBe(true);

      // Verify update was applied
      const conversation = await storage.getConversation(id);
      expect(conversation?.metadata?.['isImportant']).toBe(true);
      storage.clear();
    });

    test('delete() deletes a conversation', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const id = await storage.createConversation({
        roomId: 'test-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Delete through adapter
      const success = await adapter.delete(id);

      expect(success).toBe(true);

      // Verify deletion
      const conversation = await storage.getConversation(id);
      expect(conversation).toBeNull();
      storage.clear();
    });
  });

  describe('Search and list operations', () => {
    test('search() correctly passes search criteria to storage', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      // Create spy on the findConversations method
      const spy = spyOn(storage, 'findConversations');

      // Mock implementation - just return empty array
      spy.mockImplementation(() => Promise.resolve([]));

      // Search criteria
      const criteria = {
        interfaceType: 'cli',
        query: 'test',
        limit: 10,
      } as SearchCriteria;

      // Call adapter search
      await adapter.search(criteria);

      // Verify storage method was called with proper criteria
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        interfaceType: 'cli',
        query: 'test',
        limit: 10,
      }));
    });

    test('list() correctly passes list options to getRecentConversations', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      // Create spy on the getRecentConversations method
      const spy = spyOn(storage, 'getRecentConversations');

      // Mock implementation - return empty array
      spy.mockImplementation(() => Promise.resolve([]));

      // List options
      const options = {
        limit: 5,
        offset: 10,
        interfaceType: 'cli',
      } as ListOptions;

      // Call adapter list
      await adapter.list(options);

      // Verify storage method was called with correct parameters
      expect(spy).toHaveBeenCalledWith(options['limit'], options['interfaceType']);
    });

    test('count() without criteria uses findConversations with empty object', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      // Create spy on findConversations
      const spy = spyOn(storage, 'findConversations');

      // Mock to return two conversations
      spy.mockImplementation(() => Promise.resolve([
        { id: '1', interfaceType: 'cli', roomId: 'room1', startedAt: new Date(), updatedAt: new Date(), turnCount: 1 },
        { id: '2', interfaceType: 'cli', roomId: 'room2', startedAt: new Date(), updatedAt: new Date(), turnCount: 2 },
      ]));

      // Call count without criteria
      const count = await adapter.count();

      // Should call findConversations with empty object
      expect(spy).toHaveBeenCalledWith({});

      // And return the length of the array from findConversations
      expect(count).toBe(2);
    });
  });

  describe('Turn and summary operations', () => {
    test('addTurn() adds a turn through the adapter', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const id = await storage.createConversation({
        roomId: 'test-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Add a turn through adapter using our custom method
      const turn: Partial<ConversationTurn> = {
        query: 'Test query',
        response: 'Test response',
        userId: 'user-1',
        userName: 'Test User',
      };

      const turnId = await adapter.addTurn(id, turn);

      expect(turnId).toBeDefined();

      // Verify turn was added
      const turns = await storage.getTurns(id);
      expect(turns.length).toBe(1);
      expect(turns[0].query).toBe('Test query');
      expect(turns[0].response).toBe('Test response');
    });

    test('getTurns() retrieves turns through the adapter', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const id = await storage.createConversation({
        roomId: 'test-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      await storage.addTurn(id, {
        id: 'turn-1',
        query: 'First query',
        response: 'First response',
        timestamp: new Date(),
        userId: 'user-1',
        userName: 'Test User',
      });

      await storage.addTurn(id, {
        id: 'turn-2',
        query: 'Second query',
        response: 'Second response',
        timestamp: new Date(),
        userId: 'user-1',
        userName: 'Test User',
      });

      // Get turns through adapter
      const turns = await adapter.getTurns(id, 1);

      expect(turns.length).toBe(1);
      expect(turns[0].id).toBe('turn-1');
    });
  });

  describe('Extended functionality', () => {

    test('getConversationByRoom() retrieves conversation ID by room ID', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      await storage.createConversation({
        roomId: 'test-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Get conversation by room
      const id = await adapter.getConversationByRoom('test-room', 'cli');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    test('getOrCreateConversation() creates a new conversation if none exists', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const id = await adapter.getOrCreateConversation('new-room', 'cli');

      expect(id).toBeDefined();

      // Verify conversation was created
      const conversation = await storage.getConversation(id);
      expect(conversation?.roomId).toBe('new-room');
    });

    test('getOrCreateConversation() returns existing conversation if one exists', async () => {
      const storage = MockConversationStorage.createFresh();
      const adapter = new ConversationStorageAdapter(storage);

      const originalId = await storage.createConversation({
        roomId: 'existing-room',
        interfaceType: 'cli',
        startedAt: new Date(),
        updatedAt: new Date(),
      });

      // Get or create for the same room
      const retrievedId = await adapter.getOrCreateConversation('existing-room', 'cli');

      expect(retrievedId).toBe(originalId);
    });
  });

});
