import { describe, expect, test } from 'bun:test';
import { z } from 'zod';

import {
  ConversationOptionsSchema,
  ConversationSchema,
  ConversationTurnSchema,
} from '@/protocol/formats/schemas/conversationSchemas';

describe('Conversation Schema Validation', () => {
  test('should validate a valid conversation turn', () => {
    const validTurn = {
      id: '123',
      timestamp: new Date(),
      query: 'What is quantum computing?',
      response: 'Quantum computing is a type of computing that uses quantum bits.',
      userId: 'user-123',
      userName: 'Test User',
      metadata: { source: 'user input' },
    };

    const result = ConversationTurnSchema.safeParse(validTurn);
    expect(result.success).toBe(true);
  });

  test('should require a minimum query length', () => {
    const invalidTurn = {
      id: '123',
      timestamp: new Date(),
      query: '', // Empty query should fail
      response: 'I cannot answer an empty question.',
      metadata: {},
    };

    const result = ConversationTurnSchema.safeParse(invalidTurn);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('query');
    }
  });

  test('should validate a valid conversation', () => {
    const validConversation = {
      id: 'conv-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      interfaceType: 'cli' as const,
      roomId: 'cli-room-id', // Add required roomId field
      activeTurns: [
        {
          id: 'turn-1',
          timestamp: new Date(),
          query: 'Hello',
          response: 'Hi there!',
          userId: 'user-1',
          userName: 'John',
        },
        {
          id: 'turn-2',
          timestamp: new Date(),
          query: 'How are you?',
          response: 'I am doing well, thank you!',
          userId: 'user-2',
          userName: 'Jane',
          metadata: { sentiment: 'positive' },
        },
      ],
      summaries: [],
      archivedTurns: [],
      metadata: { topic: 'greeting' },
    };

    const result = ConversationSchema.safeParse(validConversation);
    expect(result.success).toBe(true);
  });

  test('should validate a conversation with no turns', () => {
    const emptyConversation = {
      id: 'conv-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      interfaceType: 'matrix' as const,
      roomId: 'room-123',
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
    };

    const result = ConversationSchema.safeParse(emptyConversation);
    expect(result.success).toBe(true);
  });

  test('should apply default values to conversation options', () => {
    // Provide empty options
    const result = ConversationOptionsSchema.parse({});

    // Check that defaults are applied
    expect(result.maxActiveTurns).toBe(10);
    expect(result.maxTokens).toBe(2000);
    expect(result.includeSystemMessages).toBe(false);
    expect(result.relevanceDecay).toBe(0.9);
    expect(result.maxSummaries).toBe(3);
    expect(result.summaryTurnCount).toBe(5);
    expect(result.maxArchivedTurns).toBe(50);
  });

  test('should validate custom conversation options', () => {
    const customOptions = {
      maxActiveTurns: 5,
      maxTokens: 1000,
      includeSystemMessages: true,
      relevanceDecay: 0.5,
      defaultUserId: 'custom-user',
      defaultUserName: 'Custom User',
      anchorName: 'Custom Anchor',
      maxSummaries: 2,
      summaryTurnCount: 3,
      maxArchivedTurns: 30,
    };

    const result = ConversationOptionsSchema.parse(customOptions);
    
    // Should have all properties from the input
    expect(result.maxActiveTurns).toBe(customOptions.maxActiveTurns);
    expect(result.maxTokens).toBe(customOptions.maxTokens);
    expect(result.includeSystemMessages).toBe(customOptions.includeSystemMessages);
    expect(result.relevanceDecay).toBe(customOptions.relevanceDecay);
    expect(result.defaultUserId).toBe(customOptions.defaultUserId);
    expect(result.defaultUserName).toBe(customOptions.defaultUserName);
    expect(result.anchorName).toBe(customOptions.anchorName);
    expect(result.maxSummaries).toBe(customOptions.maxSummaries);
    expect(result.summaryTurnCount).toBe(customOptions.summaryTurnCount);
    expect(result.maxArchivedTurns).toBe(customOptions.maxArchivedTurns);
  });

  test('should reject invalid option values', () => {
    const invalidOptions = {
      maxActiveTurns: -5, // Negative value, should be positive
      maxTokens: 0, // Zero value, should be positive
      relevanceDecay: 1.5, // > 1.0, should be between 0 and 1
      maxSummaries: -1, // Negative value, should be positive
    };

    // Should throw a ZodError
    expect(() => {
      ConversationOptionsSchema.parse(invalidOptions);
    }).toThrow(z.ZodError);
  });
});