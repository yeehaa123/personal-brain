import { describe, test, expect } from 'bun:test';
import {
  ConversationTurnSchema,
  ConversationSchema,
  ConversationMemoryOptionsSchema,
} from '@/mcp/protocol/schemas/conversationSchemas';
import { z } from 'zod';

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
      turns: [
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
      turns: [],
    };

    const result = ConversationSchema.safeParse(emptyConversation);
    expect(result.success).toBe(true);
  });

  test('should apply default values to conversation memory options', () => {
    // Provide empty options
    const result = ConversationMemoryOptionsSchema.parse({});

    // Check that defaults are applied
    expect(result.maxTurns).toBe(10);
    expect(result.maxTokens).toBe(2000);
    expect(result.includeSystemMessages).toBe(false);
    expect(result.relevanceDecay).toBe(0.9);
  });

  test('should validate custom conversation memory options', () => {
    const customOptions = {
      maxTurns: 5,
      maxTokens: 1000,
      includeSystemMessages: true,
      relevanceDecay: 0.5,
      defaultUserId: 'custom-user',
      defaultUserName: 'Custom User',
      anchorName: 'Custom Anchor',
    };

    const result = ConversationMemoryOptionsSchema.parse(customOptions);
    
    // Should have all properties from the input
    expect(result.maxTurns).toBe(customOptions.maxTurns);
    expect(result.maxTokens).toBe(customOptions.maxTokens);
    expect(result.includeSystemMessages).toBe(customOptions.includeSystemMessages);
    expect(result.relevanceDecay).toBe(customOptions.relevanceDecay);
    expect(result.defaultUserId).toBe(customOptions.defaultUserId);
    expect(result.defaultUserName).toBe(customOptions.defaultUserName);
    expect(result.anchorName).toBe(customOptions.anchorName);
  });

  test('should reject invalid option values', () => {
    const invalidOptions = {
      maxTurns: -5, // Negative value, should be positive
      maxTokens: 0, // Zero value, should be positive
      relevanceDecay: 1.5, // > 1.0, should be between 0 and 1
    };

    // Should throw a ZodError
    expect(() => {
      ConversationMemoryOptionsSchema.parse(invalidOptions);
    }).toThrow(z.ZodError);
  });
});