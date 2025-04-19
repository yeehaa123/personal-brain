/**
 * Tests for the ConversationContext mock implementation
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation } from '@/protocol/formats/schemas/conversationSchemas';

import { MockConversationContext } from './conversationContext';

describe('MockConversationContext', () => {
  // Reset singleton for each test
  beforeEach(() => {
    MockConversationContext.resetInstance();
  });
  
  test('getInstance should return the same instance', () => {
    const instance1 = MockConversationContext.getInstance();
    const instance2 = MockConversationContext.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh should create a new instance', () => {
    const instance1 = MockConversationContext.createFresh();
    const instance2 = MockConversationContext.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const instance1 = MockConversationContext.getInstance();
    MockConversationContext.resetInstance();
    const instance2 = MockConversationContext.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('constructor should set default config values', () => {
    const context = MockConversationContext.createFresh();
    
    expect(context.getContextName()).toBe('ConversationBrain');
    expect(context.getContextVersion()).toBe('1.0.0');
    expect(context.getAnchorName()).toBe('Host');
  });
  
  test('constructor should use provided config values', () => {
    const context = MockConversationContext.createFresh({
      name: 'CustomBrain',
      version: '2.0.0',
      display: {
        anchorName: 'CustomHost',
        anchorId: 'host-123',
        defaultUserName: 'CustomUser',
        defaultUserId: 'user-123',
      },
    });
    
    expect(context.getContextName()).toBe('CustomBrain');
    expect(context.getContextVersion()).toBe('2.0.0');
    expect(context.getAnchorName()).toBe('CustomHost');
    expect(context.getAnchorId()).toBe('host-123');
    expect(context.isAnchor('host-123')).toBe(true);
    expect(context.isAnchor('other-id')).toBe(false);
  });
  
  test('service methods are properly mocked', () => {
    const context = MockConversationContext.createFresh();
    
    // Check that mock services are initialized
    expect(context.getQueryService()).toBeDefined();
    expect(context.getMemoryService()).toBeDefined();
    expect(context.getResourceService()).toBeDefined();
    expect(context.getToolService()).toBeDefined();
    expect(context.getStorage()).toBeDefined();
    expect(context.getFormatter()).toBeDefined();
    expect(context.getMcpFormatter()).toBeDefined();
  });
  
  test('createConversation delegates to query service', async () => {
    const context = MockConversationContext.createFresh();
    
    // Store the original function
    const original = context.queryService.createConversation;
    
    // Replace with our own implementation
    context.queryService.createConversation = mock(() => Promise.resolve('custom-conv-id'));
    
    const id = await context.createConversation('cli', 'test-room');
    
    expect(id).toBe('custom-conv-id');
    expect(context.queryService.createConversation).toHaveBeenCalledWith('cli', 'test-room');
    
    // Restore the original
    context.queryService.createConversation = original;
  });
  
  test('addTurn delegates to memory service after validation', async () => {
    const context = MockConversationContext.createFresh();
    
    // Store the original functions
    const originalGet = context.queryService.getConversation;
    const originalAdd = context.memoryService.addTurn;
    
    // Replace with our own implementations
    context.queryService.getConversation = mock(() => Promise.resolve({
      id: 'test-id',
      interfaceType: 'cli',
      roomId: 'test-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    } as Conversation));
    
    context.memoryService.addTurn = mock(() => Promise.resolve('test-turn-id'));
    
    const turnId = await context.addTurn('test-id', 'Hello', 'Hi there');
    
    expect(turnId).toBe('test-turn-id');
    expect(context.queryService.getConversation).toHaveBeenCalledWith('test-id');
    expect(context.memoryService.addTurn).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({
        query: 'Hello',
        response: 'Hi there',
        metadata: expect.objectContaining({
          isActive: true,
        }),
      }),
    );
    
    // Restore the originals
    context.queryService.getConversation = originalGet;
    context.memoryService.addTurn = originalAdd;
  });
  
  test('getConversationHistory delegates to memory service and formatter', async () => {
    const context = MockConversationContext.createFresh();
    
    // Set up mock implementations
    const mockTurns = [
      {
        id: 'turn-1',
        timestamp: new Date(),
        query: 'Hello',
        response: 'Hi there',
      },
    ];
    
    // Store original functions
    const originalGetTurns = context.memoryService.getTurns;
    const originalGetSummaries = context.memoryService.getSummaries;
    const originalFormat = context.formatter.formatConversation;
    
    // Replace with our implementations
    context.memoryService.getTurns = mock(() => Promise.resolve(mockTurns));
    context.memoryService.getSummaries = mock(() => Promise.resolve([]));
    context.formatter.formatConversation = mock(() => 'Custom formatted conversation');
    
    const history = await context.getConversationHistory('test-id', {
      format: 'markdown',
      includeSummaries: true,
    });
    
    expect(history).toBe('Custom formatted conversation');
    expect(context.memoryService.getTurns).toHaveBeenCalledWith('test-id', undefined);
    expect(context.memoryService.getSummaries).toHaveBeenCalledWith('test-id');
    expect(context.formatter.formatConversation).toHaveBeenCalledWith(
      mockTurns,
      [],
      expect.objectContaining({
        format: 'markdown',
      }),
    );
    
    // Restore original functions
    context.memoryService.getTurns = originalGetTurns;
    context.memoryService.getSummaries = originalGetSummaries;
    context.formatter.formatConversation = originalFormat;
  });
  
  test('getFormattedConversationForMcp delegates to the appropriate services', async () => {
    const context = MockConversationContext.createFresh();
    
    // Set up mock implementations
    const mockConversation = {
      id: 'test-id',
      interfaceType: 'cli',
      roomId: 'test-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
    
    const mockTurns = [
      {
        id: 'turn-1',
        timestamp: new Date(),
        query: 'Hello',
        response: 'Hi there',
      },
    ];
    
    // Create test summaries that match the schema
    const mockSummaries: ConversationSummary[] = [{
      id: 'summary-1',
      conversationId: 'test-id',
      content: 'Test summary content',
      createdAt: new Date(),
      turnCount: 2,
    }];
    
    // Store original functions
    const originalGetConversation = context.queryService.getConversation;
    const originalGetTurns = context.memoryService.getTurns;
    const originalGetSummaries = context.memoryService.getSummaries;
    const originalFormat = context.mcpFormatter.formatConversationForMcp;
    
    // Replace with our implementations
    context.queryService.getConversation = mock(() => Promise.resolve({
      ...mockConversation,
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    } as Conversation));
    context.memoryService.getTurns = mock(() => Promise.resolve(mockTurns));
    context.memoryService.getSummaries = mock(() => Promise.resolve(mockSummaries));
    context.mcpFormatter.formatConversationForMcp = mock(() => Promise.resolve({
      id: 'test-id',
      interfaceType: 'cli' as 'cli' | 'matrix',
      roomId: 'test-room',
      createdAt: new Date(),
      updatedAt: new Date(),
      turnCount: 1,
      summaryCount: 0,
      statistics: {},
      turns: [{ query: 'Hello', response: 'Hi there' }],
    }));
    
    const result = await context.getFormattedConversationForMcp('test-id', { format: 'short' });
    
    expect(result).toEqual({
      id: 'test-id',
      interfaceType: 'cli' as 'cli' | 'matrix',
      roomId: 'test-room',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      turnCount: 1,
      summaryCount: 0,
      statistics: {},
      turns: [{ query: 'Hello', response: 'Hi there' }],
    });
    
    expect(context.queryService.getConversation).toHaveBeenCalledWith('test-id');
    expect(context.memoryService.getTurns).toHaveBeenCalledWith('test-id');
    expect(context.memoryService.getSummaries).toHaveBeenCalledWith('test-id');
    // Check that formatConversationForMcp was called, but don't check parameters
    // since they depend on the object passed to it
    expect(context.mcpFormatter.formatConversationForMcp).toHaveBeenCalled();
    
    // Restore original functions
    context.queryService.getConversation = originalGetConversation;
    context.memoryService.getTurns = originalGetTurns;
    context.memoryService.getSummaries = originalGetSummaries;
    context.mcpFormatter.formatConversationForMcp = originalFormat;
  });
});