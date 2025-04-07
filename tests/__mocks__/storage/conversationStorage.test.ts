/**
 * Tests for conversationStorage mock
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { MockConversationStorage } from './conversationStorage';
import { 
  createMockConversationSummary, 
  createMockConversationTurn, 
} from './mockHelpers';

describe('MockConversationStorage', () => {
  let storage: MockConversationStorage;
  
  beforeEach(() => {
    // Create a fresh instance for each test
    storage = MockConversationStorage.createFresh();
  });
  
  afterEach(() => {
    // Clear data and reset instance
    storage.clear();
    MockConversationStorage.resetInstance();
  });
  
  describe('getInstance and createFresh', () => {
    test('getInstance should return the same instance', () => {
      const instance1 = MockConversationStorage.getInstance();
      const instance2 = MockConversationStorage.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('createFresh should create an isolated instance', () => {
      const instance1 = MockConversationStorage.createFresh();
      const instance2 = MockConversationStorage.createFresh();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = MockConversationStorage.getInstance();
      MockConversationStorage.resetInstance();
      const instance2 = MockConversationStorage.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });
  
  describe('Conversation operations', () => {
    test('createConversation should create a new conversation', async () => {
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      
      expect(typeof id).toBe('string');
      expect(id).toBeDefined();
      
      const conversation = await storage.getConversation(id);
      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe(id);
      expect(conversation?.interfaceType).toBe('cli');
      expect(conversation?.roomId).toBe('test-room');
    });
    
    test('getConversation should return null for non-existent conversation', async () => {
      const conversation = await storage.getConversation('non-existent');
      expect(conversation).toBeNull();
    });
    
    test('getConversationByRoom should find a conversation by room ID', async () => {
      const roomId = 'test-room';
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId,
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      
      const foundId = await storage.getConversationByRoom(roomId);
      expect(foundId).toBe(id);
    });
    
    test('updateConversation should modify a conversation', async () => {
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      
      const success = await storage.updateConversation(id, {
        roomId: 'updated-room',
      });
      
      expect(success).toBe(true);
      
      const conversation = await storage.getConversation(id);
      expect(conversation?.roomId).toBe('updated-room');
    });
    
    test('deleteConversation should remove a conversation', async () => {
      const id = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      
      const success = await storage.deleteConversation(id);
      expect(success).toBe(true);
      
      const conversation = await storage.getConversation(id);
      expect(conversation).toBeNull();
    });
  });
  
  describe('Turn operations', () => {
    let conversationId: string;
    
    beforeEach(async () => {
      // Create a conversation for testing turns
      conversationId = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
    });
    
    test('addTurn should add a turn to a conversation', async () => {
      const turn = createMockConversationTurn();
      const turnId = await storage.addTurn(conversationId, turn);
      
      expect(turnId).toBe(turn.id!);
      
      const turns = await storage.getTurns(conversationId);
      expect(turns.length).toBe(1);
      expect(turns[0].id).toBe(turn.id!);
      expect(turns[0].query).toBe(turn.query!);
      expect(turns[0].response).toBe(turn.response!);
    });
    
    test('getTurns should return empty array for a conversation with no turns', async () => {
      const turns = await storage.getTurns(conversationId);
      expect(turns).toEqual([]);
    });
    
    test('updateTurn should modify a turn', async () => {
      // Add a turn
      const turn = createMockConversationTurn();
      const turnId = await storage.addTurn(conversationId, turn);
      
      // Update it
      const success = await storage.updateTurn(turnId, {
        response: 'Updated response',
      });
      
      expect(success).toBe(true);
      
      // Verify update
      const turns = await storage.getTurns(conversationId);
      expect(turns[0].response).toBe('Updated response');
    });
  });
  
  describe('Summary operations', () => {
    let conversationId: string;
    
    beforeEach(async () => {
      // Create a conversation for testing summaries
      conversationId = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
    });
    
    test('addSummary should add a summary to a conversation', async () => {
      const summary = createMockConversationSummary('summary-1', conversationId);
      const summaryId = await storage.addSummary(conversationId, summary);
      
      expect(summaryId).toBe(summary.id);
      
      const summaries = await storage.getSummaries(conversationId);
      expect(summaries.length).toBe(1);
      expect(summaries[0].id).toBe(summary.id);
      expect(summaries[0].content).toBe(summary.content);
    });
    
    test('getSummaries should return empty array for a conversation with no summaries', async () => {
      const summaries = await storage.getSummaries(conversationId);
      expect(summaries).toEqual([]);
    });
  });
  
  describe('Search operations', () => {
    beforeEach(async () => {
      // Create conversations with increasing updatedAt times
      // Create oldest conversation first (3 seconds ago)
      await storage.createConversation({
        id: 'conv-1',
        interfaceType: 'cli',
        roomId: 'room-1',
        startedAt: new Date(Date.now() - 3000),
        updatedAt: new Date(Date.now() - 3000),
      });
      
      // Wait to ensure ordering
      await new Promise(resolve => globalThis.setTimeout(resolve, 10));
      
      // Create middle conversation (2 seconds ago)
      await storage.createConversation({
        id: 'conv-2',
        interfaceType: 'matrix',
        roomId: 'room-2',
        startedAt: new Date(Date.now() - 2000),
        updatedAt: new Date(Date.now() - 2000),
      });
      
      // Wait to ensure ordering
      await new Promise(resolve => globalThis.setTimeout(resolve, 10));
      
      // Create newest conversation (1 second ago)
      await storage.createConversation({
        id: 'conv-3',
        interfaceType: 'cli',
        roomId: 'room-3',
        startedAt: new Date(Date.now() - 1000),
        updatedAt: new Date(), // Use the current time
      });
      
      // For testing purposes, let's not add a turn here as it would update the conversation's updatedAt timestamp
      // We can test turn functionality separately
    });
    
    test('findConversations should find all conversations when no criteria provided', async () => {
      const results = await storage.findConversations({});
      expect(results.length).toBe(3);
    });
    
    test('findConversations should filter by interface type', async () => {
      const results = await storage.findConversations({ interfaceType: 'cli' });
      expect(results.length).toBe(2);
      expect(results.map(r => r.id)).toEqual(expect.arrayContaining(['conv-1', 'conv-3']));
    });
    
    test('findConversations should filter by room ID', async () => {
      const results = await storage.findConversations({ roomId: 'room-2' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('conv-2');
    });
    
    test('getRecentConversations should return conversations sorted by updated time', async () => {
      const results = await storage.getRecentConversations();
      expect(results.length).toBe(3);
      
      // Should be sorted newest first
      expect(results[0].id).toBe('conv-3');
      expect(results[1].id).toBe('conv-2');
      expect(results[2].id).toBe('conv-1');
    });
    
    test('getRecentConversations should filter by interface type', async () => {
      const results = await storage.getRecentConversations(undefined, 'matrix');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('conv-2');
    });
  });
  
  describe('Metadata operations', () => {
    let conversationId: string;
    
    beforeEach(async () => {
      // Create a conversation for testing metadata
      conversationId = await storage.createConversation({
        interfaceType: 'cli',
        roomId: 'test-room',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
    });
    
    test('updateMetadata should add metadata to a conversation', async () => {
      const success = await storage.updateMetadata(conversationId, {
        testKey: 'testValue',
      });
      
      expect(success).toBe(true);
      
      const metadata = await storage.getMetadata(conversationId);
      expect(metadata?.['testKey']).toBe('testValue');
    });
    
    test('updateMetadata should merge with existing metadata', async () => {
      // Add initial metadata
      await storage.updateMetadata(conversationId, {
        key1: 'value1',
      });
      
      // Add more metadata
      await storage.updateMetadata(conversationId, {
        key2: 'value2',
      });
      
      // Verify both keys exist
      const metadata = await storage.getMetadata(conversationId);
      expect(metadata?.['key1']).toBe('value1');
      expect(metadata?.['key2']).toBe('value2');
    });
    
    test('getMetadata should return null for a non-existent conversation', async () => {
      const metadata = await storage.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });
});