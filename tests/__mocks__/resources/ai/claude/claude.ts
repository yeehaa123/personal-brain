/**
 * Mock Claude Language Model Adapter
 */
import type { ModelResponse } from '@/resources/ai/interfaces';

export interface ClaudeModelOptions {
  model?: string;
}

/**
 * Options for completion requests
 */
export interface CompleteOptions {
  schema?: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Mock ClaudeModel for testing
 */
export class ClaudeModel {
  private static instance: ClaudeModel | null = null;
  
  /**
   * Standard mock response for testing
   */
  public mockResponse: ModelResponse<{ answer: string }> = {
    object: { answer: 'This is a mock Claude response' },
    usage: { inputTokens: 10, outputTokens: 20 },
  };
  
  /**
   * Get the singleton instance of ClaudeModel
   */
  public static getInstance(_options?: ClaudeModelOptions): ClaudeModel {
    if (!ClaudeModel.instance) {
      ClaudeModel.instance = new ClaudeModel();
    }
    return ClaudeModel.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    ClaudeModel.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(_options?: ClaudeModelOptions): ClaudeModel {
    return new ClaudeModel();
  }

  /**
   * Mock complete method that returns test-specific responses
   */
  async complete(options: CompleteOptions): Promise<ModelResponse<unknown>> {
    // Generate conditional responses based on userPrompt content
    const prompt = options.userPrompt.toLowerCase();
    
    if (prompt.includes('extract up to') && prompt.includes('tags that best represent')) {
      // This is a tag extraction request
      let tags: string[] = ['general', 'concept', 'idea', 'topic', 'subject'];
      
      if (prompt.includes('education should focus')) {
        tags = ['education', 'learning', 'knowledge-sharing', 'curriculum', 'pedagogy'];
      } else if (prompt.includes('technology is rapidly evolving')) {
        tags = ['technology', 'digital', 'software', 'ai', 'innovation'];
      } else if (prompt.includes('ecosystem architecture is a practice')) {
        tags = ['ecosystem-architecture', 'innovation', 'collaboration', 'decentralized', 'community'];
      }
      
      return {
        object: { tags },
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    }
    
    // For summarization
    if (prompt.includes('please summarize the following conversation')) {
      return {
        object: { answer: 'This is a summary of the conversation.' },
        usage: { inputTokens: 50, outputTokens: 10 },
      };
    }
    
    // Default response
    return this.mockResponse;
  }
}