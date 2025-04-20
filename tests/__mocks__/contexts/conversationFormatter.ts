/**
 * MockConversationFormatter
 * 
 * Standard mock for ConversationFormatter that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';

import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';

export interface FormattingOptions {
  format?: 'text' | 'markdown' | 'json' | 'html';
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
  anchorName?: string;
  anchorId?: string;
  highlightAnchor?: boolean;
}

/**
 * Mock implementation of ConversationFormatter
 */
export class MockConversationFormatter {
  private static instance: MockConversationFormatter | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockConversationFormatter {
    if (!MockConversationFormatter.instance) {
      MockConversationFormatter.instance = new MockConversationFormatter();
    }
    return MockConversationFormatter.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationFormatter.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockConversationFormatter {
    return new MockConversationFormatter();
  }
  
  // Mock methods with default implementations
  public formatConversation = mock((
    turns: ConversationTurn[],
    summaries: ConversationSummary[],
    options: FormattingOptions,
  ) => {
    const format = options.format || 'text';
    
    if (format === 'json') {
      return JSON.stringify({ turns, summaries });
    }
    
    if (format === 'html') {
      return '<div><h2>Conversation</h2><div class="conversation">Mock formatted conversation</div></div>';
    }
    
    if (format === 'markdown') {
      return '## Conversation\n\n**User**: Test query\n\n**Assistant**: Test response\n\n';
    }
    
    // Default text format
    return 'User: Test query\nAssistant: Test response\n\n';
  });
}