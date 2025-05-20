import { describe, expect, test } from 'bun:test';

import { ConversationFormatter } from '@/contexts/conversations/formatters/conversationFormatter';

describe('ConversationFormatter Behavior', () => {
  const formatter = ConversationFormatter.createFresh();
  
  const mockTurns = [
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
  
  const mockSummaries = [
    {
      id: 'summary-1',
      conversationId: 'conv-1',
      content: 'The user greeted the assistant',
      createdAt: new Date('2023-01-01T10:02:00Z'),
    },
  ];

  test('formats turns as text', () => {
    const result = formatter.formatTurns(mockTurns);
    
    expect(result).toContain('User: Hello');
    expect(result).toContain('Assistant: Hi there!');
    expect(result).toContain('User: How are you?');
    expect(result).toContain('Assistant: I\'m doing well, thanks for asking!');
  });

  test('formats turns as markdown', () => {
    const result = formatter.formatTurns(mockTurns, { format: 'markdown' });
    
    expect(result).toContain('**User**: Hello');
    expect(result).toContain('**Assistant**: Hi there!');
  });

  test('includes timestamps when requested', () => {
    const result = formatter.formatTurns(mockTurns, { includeTimestamps: true });
    
    expect(result).toContain('2023-01-01T10:00:00.000Z');
    expect(result).toContain('2023-01-01T10:01:00.000Z');
  });

  test('highlights anchor user', () => {
    const result = formatter.formatTurns(mockTurns, { 
      highlightAnchor: true,
      anchorId: 'user-1',
      anchorName: 'Host',
    });
    
    expect(result).toContain('Host (User): Hello');
    expect(result).toContain('Host (User): How are you?');
  });

  test('formats summaries', () => {
    const textResult = formatter.formatSummaries(mockSummaries);
    expect(textResult).toContain('Summary 1: The user greeted the assistant');
    
    const markdownResult = formatter.formatSummaries(mockSummaries, { format: 'markdown' });
    expect(markdownResult).toContain('### Summary 1');
    expect(markdownResult).toContain('The user greeted the assistant');
  });

  test('formats complete conversation', () => {
    const result = formatter.formatConversation(mockTurns, mockSummaries);
    
    expect(result).toContain('CONVERSATION SUMMARIES:');
    expect(result).toContain('Summary 1: The user greeted the assistant');
    expect(result).toContain('RECENT CONVERSATION:');
    expect(result).toContain('User: Hello');
  });

  test('formats conversation for AI prompt', () => {
    const result = formatter.formatHistoryForPrompt(mockTurns, mockSummaries);
    
    expect(result).toContain('CONVERSATION SUMMARIES:');
    expect(result).toContain('Summary 1: The user greeted the assistant');
    expect(result).toContain('RECENT CONVERSATION:');
    expect(result).toContain('User: Hello');
    expect(result).toContain('Assistant: Hi there!');
  });
});