import { describe, expect, test } from 'bun:test';

import { ConversationFormatter } from '../../../../src/mcp/contexts/conversations/conversationFormatter';
import type { ConversationSummary } from '../../../../src/mcp/contexts/conversations/conversationStorage';
import type { ConversationTurn } from '../../../../src/mcp/protocol/schemas/conversationSchemas';

describe('ConversationFormatter', () => {
  const formatter = new ConversationFormatter();
  
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
    test('should format turns as text by default', () => {
      const result = formatter.formatTurns(mockTurns);
      
      expect(result).toContain('User: Hello');
      expect(result).toContain('Assistant: Hi there!');
      expect(result).toContain('User: How are you?');
      expect(result).toContain('Assistant: I\'m doing well, thanks for asking!');
    });
    
    test('should format turns as markdown when specified', () => {
      const result = formatter.formatTurns(mockTurns, { format: 'markdown' });
      
      expect(result).toContain('**User**: Hello');
      expect(result).toContain('**Assistant**: Hi there!');
      expect(result).toContain('**User**: How are you?');
      expect(result).toContain('**Assistant**: I\'m doing well, thanks for asking!');
    });
    
    test('should include timestamps when requested', () => {
      const result = formatter.formatTurns(mockTurns, { includeTimestamps: true });
      
      expect(result).toContain('[2023-01-01T10:00:00.000Z]');
      expect(result).toContain('[2023-01-01T10:01:00.000Z]');
    });
    
    test('should highlight anchor when requested', () => {
      const result = formatter.formatTurns(mockTurns, { 
        highlightAnchor: true,
        anchorId: 'user-1',
        anchorName: 'Host',
      });
      
      expect(result).toContain('Host (User): Hello');
      expect(result).toContain('Host (User): How are you?');
    });
  });

  describe('formatSummaries', () => {
    test('should format summaries as text by default', () => {
      const result = formatter.formatSummaries(mockSummaries);
      
      expect(result).toContain('Summary 1: The user greeted the assistant');
    });
    
    test('should format summaries as markdown when specified', () => {
      const result = formatter.formatSummaries(mockSummaries, { format: 'markdown' });
      
      expect(result).toContain('### Summary 1');
      expect(result).toContain('The user greeted the assistant');
    });
  });

  describe('formatConversation', () => {
    test('should combine summaries and turns with appropriate headers', () => {
      const result = formatter.formatConversation(mockTurns, mockSummaries);
      
      expect(result).toContain('CONVERSATION SUMMARIES:');
      expect(result).toContain('Summary 1: The user greeted the assistant');
      expect(result).toContain('RECENT CONVERSATION:');
      expect(result).toContain('User: Hello');
    });
    
    test('should format according to the specified format', () => {
      const result = formatter.formatConversation(mockTurns, mockSummaries, { format: 'markdown' });
      
      expect(result).toContain('## Conversation Summaries');
      expect(result).toContain('### Summary 1');
      expect(result).toContain('## Recent Conversation');
      expect(result).toContain('**User**: Hello');
    });
  });

  describe('formatHistoryForPrompt', () => {
    test('should format history for inclusion in prompts', () => {
      const result = formatter.formatHistoryForPrompt(mockTurns, mockSummaries);
      
      expect(result).toContain('CONVERSATION SUMMARIES:');
      expect(result).toContain('Summary 1: The user greeted the assistant');
      expect(result).toContain('RECENT CONVERSATION:');
      expect(result).toContain('User: Hello');
      expect(result).toContain('Assistant: Hi there!');
    });
    
    test('should highlight anchor when requested', () => {
      const result = formatter.formatHistoryForPrompt(mockTurns, mockSummaries, {
        highlightAnchor: true,
        anchorId: 'user-1',
        anchorName: 'Host',
      });
      
      expect(result).toContain('Host (User): Hello');
      expect(result).toContain('Host (User): How are you?');
    });
  });
});