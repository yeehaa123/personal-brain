/**
 * MockConversationFormatter
 * 
 * Mock implementation of ConversationFormatter for testing
 */

import type { FormattingOptions } from '@/contexts/conversations/formatters/conversationFormatter';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';


// Re-export the FormattingOptions type
export type { FormattingOptions };

/**
 * Mock implementation of ConversationFormatter
 * 
 * We're providing a simple mock implementation that matches the public API
 * but doesn't try to match internal implementation details.
 */
export class MockConversationFormatter {
  // Singleton pattern implementation
  private static instance: MockConversationFormatter | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // No initialization needed for the mock
  }
  
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
  
  // Public methods matching the ConversationFormatter interface
  formatTurns(_turns: ConversationTurn[], _options: FormattingOptions = {}): string {
    return 'Formatted turns';
  }
  
  formatSummaries(_summaries: ConversationSummary[], _options: FormattingOptions = {}): string {
    return 'Formatted summaries';
  }
  
  formatConversation(
    _turns: ConversationTurn[], 
    _summaries: ConversationSummary[], 
    options: FormattingOptions = {},
  ): string {
    const format = options.format || 'text';
    
    if (format === 'json') {
      return '{"turns":[],"summaries":[]}';
    }
    
    if (format === 'html') {
      return '<div><h2>Conversation</h2><div class="conversation">Mock formatted conversation</div></div>';
    }
    
    if (format === 'markdown') {
      return '## Conversation\n\n**User**: Test query\n\n**Assistant**: Test response\n\n';
    }
    
    // Default text format
    return 'User: Test query\nAssistant: Test response\n\n';
  }
  
  formatHistoryForPrompt(
    _turns: ConversationTurn[], 
    _summaries: ConversationSummary[],
    _options: FormattingOptions = {},
  ): string {
    return 'Formatted history for prompt';
  }
}

