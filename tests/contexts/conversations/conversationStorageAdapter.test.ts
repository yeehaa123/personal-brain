import { describe, expect, test } from 'bun:test';

import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import { MockConversationStorage } from '@test/__mocks__/storage/conversationStorage';

describe('ConversationStorageAdapter Behavior', () => {
  
  test('creates and retrieves conversations', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create a conversation
    const id = await adapter.create({
      roomId: 'test-room',
      interfaceType: 'cli',
    });

    expect(id).toBeDefined();
    expect(id).toContain('conv-');

    // Retrieve it
    const conversation = await adapter.read(id);
    expect(conversation).toBeDefined();
    expect(conversation?.roomId).toBe('test-room');
    expect(conversation?.interfaceType).toBe('cli');
  });

  test('updates conversations', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create a conversation
    const id = await adapter.create({
      roomId: 'test-room',
      interfaceType: 'cli',
    });

    // Update it
    const success = await adapter.update(id, {
      metadata: { isImportant: true },
    });

    expect(success).toBe(true);

    // Verify update
    const updated = await adapter.read(id);
    expect(updated?.metadata?.['isImportant']).toBe(true);
  });

  test('deletes conversations', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create a conversation
    const id = await adapter.create({
      roomId: 'test-room',
      interfaceType: 'cli',
    });

    // Delete it
    const success = await adapter.delete(id);
    expect(success).toBe(true);

    // Verify deletion
    const deleted = await adapter.read(id);
    expect(deleted).toBeNull();
  });

  test('searches conversations', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create some conversations
    await adapter.create({ roomId: 'room1', interfaceType: 'cli' });
    await adapter.create({ roomId: 'room2', interfaceType: 'matrix' });
    await adapter.create({ roomId: 'room3', interfaceType: 'cli' });

    // Search for CLI conversations
    const results = await adapter.search({
      interfaceType: 'cli',
      limit: 10,
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every(c => c.interfaceType === 'cli')).toBe(true);
  });

  test('lists recent conversations', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create some conversations
    await adapter.create({ roomId: 'room1', interfaceType: 'cli' });
    await adapter.create({ roomId: 'room2', interfaceType: 'cli' });

    // List them
    const results = await adapter.list({
      limit: 5,
      interfaceType: 'cli',
    });

    expect(results.length).toBeLessThanOrEqual(5);
    expect(results.every(c => c.interfaceType === 'cli')).toBe(true);
  });

  test('counts conversations', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create some conversations
    await adapter.create({ roomId: 'room1', interfaceType: 'cli' });
    await adapter.create({ roomId: 'room2', interfaceType: 'cli' });

    // Count all
    const count = await adapter.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Count with criteria
    const cliCount = await adapter.count({ interfaceType: 'cli' });
    expect(cliCount).toBeGreaterThanOrEqual(2);
  });

  test('manages conversation turns', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create a conversation
    const id = await adapter.create({
      roomId: 'test-room',
      interfaceType: 'cli',
    });

    // Add turns
    const turn1Id = await adapter.addTurn(id, {
      query: 'First query',
      response: 'First response',
      userId: 'user-1',
      userName: 'Test User',
    });

    const turn2Id = await adapter.addTurn(id, {
      query: 'Second query',
      response: 'Second response',
      userId: 'user-1',
      userName: 'Test User',
    });

    expect(turn1Id).toBeDefined();
    expect(turn2Id).toBeDefined();

    // Get turns
    const turns = await adapter.getTurns(id);
    expect(turns.length).toBe(2);
    expect(turns[0].query).toBe('First query');
    expect(turns[1].query).toBe('Second query');

    // Get limited turns
    const limitedTurns = await adapter.getTurns(id, 1);
    expect(limitedTurns.length).toBe(1);
  });

  test('finds conversation by room', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // Create a conversation
    const originalId = await adapter.create({
      roomId: 'unique-room',
      interfaceType: 'cli',
    });

    // Find it by room
    const foundId = await adapter.getConversationByRoom('unique-room', 'cli');
    expect(foundId).toBe(originalId);
  });

  test('gets or creates conversation', async () => {
    const storage = MockConversationStorage.createFresh();
    const adapter = new ConversationStorageAdapter(storage);

    // First call creates
    const id1 = await adapter.getOrCreateConversation('room-x', 'cli');
    expect(id1).toBeDefined();

    // Second call retrieves
    const id2 = await adapter.getOrCreateConversation('room-x', 'cli');
    expect(id2).toBe(id1);

    // Different room creates new
    const id3 = await adapter.getOrCreateConversation('room-y', 'cli');
    expect(id3).not.toBe(id1);
  });
});