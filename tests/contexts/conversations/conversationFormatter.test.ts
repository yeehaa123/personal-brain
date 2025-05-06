import { beforeEach, describe, expect, test } from 'bun:test';

import { ConversationFormatter } from '@/contexts/conversations/formatters/conversationFormatter';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { ConversationTurn } from '@/protocol/schemas/conversationSchemas';

describe('ConversationFormatter', () => {
  // Reset the instance before each test to ensure clean state
  beforeEach(() => {
    ConversationFormatter.resetInstance();
  });
  
  // Get a fresh instance for testing
  const formatter = ConversationFormatter.createFresh();
  
  const mockTurns: ConversationTurn[] = [
    {
      id: 'turn-1',
      query: 'Hello',
      response: 'Hi there!',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      userName: 'User',
      userId: 'user-1',
    },
    {
      id: 'turn-2',
      query: 'How are you?',
      response: 'I\'m doing well, thanks for asking!',
      timestamp: new Date('2023-01-01T10:01:00Z'),
      userName: 'User',
      userId: 'user-1',
    },
  ];
  
  const mockSummaries: ConversationSummary[] = [
    {
      id: 'summary-1',
      conversationId: 'conv-1',
      content: 'The user greeted the assistant',
      createdAt: new Date('2023-01-01T10:02:00Z'),
    },
  ];

  describe('formatTurns', () => {
    // Define a table of test cases
    const formatTurnTestCases = [
      {
        name: 'text format (default)',
        options: {},
        expectedPatterns: [
          'User: Hello',
          'Assistant: Hi there!',
          'User: How are you?',
          'Assistant: I\'m doing well, thanks for asking!',
        ],
      },
      {
        name: 'markdown format',
        options: { format: 'markdown' as const },
        expectedPatterns: [
          '**User**: Hello',
          '**Assistant**: Hi there!',
          '**User**: How are you?',
          '**Assistant**: I\'m doing well, thanks for asking!',
        ],
      },
      {
        name: 'with timestamps',
        options: { includeTimestamps: true },
        expectedPatterns: [
          '[2023-01-01T10:00:00.000Z]',
          '[2023-01-01T10:01:00.000Z]',
        ],
      },
      {
        name: 'with anchor highlighting',
        options: { 
          highlightAnchor: true,
          anchorId: 'user-1',
          anchorName: 'Host',
        },
        expectedPatterns: [
          'Host (User): Hello',
          'Host (User): How are you?',
        ],
      },
    ];
    
    // Run all test cases with a single test
    test('should format turns correctly with different options', () => {
      // Map each test case to a result object
      const results = formatTurnTestCases.map(testCase => {
        const result = formatter.formatTurns(mockTurns, testCase.options);
        return {
          name: testCase.name,
          containsAllPatterns: testCase.expectedPatterns.every(pattern => 
            result.includes(pattern),
          ),
        };
      });
      
      // Single assertion that validates all test cases
      expect(results).toMatchObject(
        formatTurnTestCases.map(testCase => ({
          name: testCase.name,
          containsAllPatterns: true,
        })),
      );
    });
  });

  describe('formatSummaries', () => {
    // Define a table of test cases
    const formatSummaryTestCases = [
      {
        name: 'text format (default)',
        options: {},
        expectedPatterns: [
          'Summary 1: The user greeted the assistant',
        ],
      },
      {
        name: 'markdown format',
        options: { format: 'markdown' as const },
        expectedPatterns: [
          '### Summary 1',
          'The user greeted the assistant',
        ],
      },
    ];
    
    // Run all test cases with a single test
    test('should format summaries correctly with different options', () => {
      // Map each test case to a result object
      const results = formatSummaryTestCases.map(testCase => {
        const result = formatter.formatSummaries(mockSummaries, testCase.options);
        return {
          name: testCase.name,
          containsAllPatterns: testCase.expectedPatterns.every(pattern => 
            result.includes(pattern),
          ),
        };
      });
      
      // Single assertion that validates all test cases
      expect(results).toMatchObject(
        formatSummaryTestCases.map(testCase => ({
          name: testCase.name,
          containsAllPatterns: true,
        })),
      );
    });
  });

  describe('formatConversation', () => {
    // Define a table of test cases
    const formatConversationTestCases = [
      {
        name: 'text format (default)',
        options: {},
        expectedPatterns: [
          'CONVERSATION SUMMARIES:',
          'Summary 1: The user greeted the assistant',
          'RECENT CONVERSATION:',
          'User: Hello',
        ],
      },
      {
        name: 'markdown format',
        options: { format: 'markdown' as const },
        expectedPatterns: [
          '## Conversation Summaries',
          '### Summary 1',
          '## Recent Conversation',
          '**User**: Hello',
        ],
      },
    ];
    
    // Run all test cases with a single test
    test('should format conversations correctly with different options', () => {
      // Map each test case to a result object
      const results = formatConversationTestCases.map(testCase => {
        const result = formatter.formatConversation(mockTurns, mockSummaries, testCase.options);
        return {
          name: testCase.name,
          containsAllPatterns: testCase.expectedPatterns.every(pattern => 
            result.includes(pattern),
          ),
        };
      });
      
      // Single assertion that validates all test cases
      expect(results).toMatchObject(
        formatConversationTestCases.map(testCase => ({
          name: testCase.name,
          containsAllPatterns: true,
        })),
      );
    });
  });

  describe('formatHistoryForPrompt', () => {
    // Define a table of test cases
    const formatHistoryTestCases = [
      {
        name: 'default format',
        options: {},
        expectedPatterns: [
          'CONVERSATION SUMMARIES:',
          'Summary 1: The user greeted the assistant',
          'RECENT CONVERSATION:',
          'User: Hello',
          'Assistant: Hi there!',
        ],
      },
      {
        name: 'with anchor highlighting',
        options: {
          highlightAnchor: true,
          anchorId: 'user-1',
          anchorName: 'Host',
        },
        expectedPatterns: [
          'Host (User): Hello',
          'Host (User): How are you?',
        ],
      },
    ];
    
    // Run all test cases with a single test
    test('should format history correctly with different options', () => {
      // Map each test case to a result object
      const results = formatHistoryTestCases.map(testCase => {
        const result = formatter.formatHistoryForPrompt(mockTurns, mockSummaries, testCase.options);
        return {
          name: testCase.name,
          containsAllPatterns: testCase.expectedPatterns.every(pattern => 
            result.includes(pattern),
          ),
        };
      });
      
      // Single assertion that validates all test cases
      expect(results).toMatchObject(
        formatHistoryTestCases.map(testCase => ({
          name: testCase.name,
          containsAllPatterns: true,
        })),
      );
    });
  });
});