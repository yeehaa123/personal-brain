import { anthropic } from '@ai-sdk/anthropic';
import { generateText, type LanguageModelUsage } from 'ai';

import { aiConfig } from '@/config';
import logger from '@/utils/logger';

export interface ModelResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Configuration options for ClaudeModel
 */
export interface ClaudeModelOptions {
  /** Optional API key (falls back to config) */
  apiKey?: string;
  /** Model to use (defaults to aiConfig.anthropic.defaultModel) */
  model?: string;
}

/**
 * Claude Large Language Model client wrapper
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class ClaudeModel {
  /**
   * Singleton instance of ClaudeModel
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ClaudeModel | null = null;
  
  private apiKey: string;
  private model: string;

  /**
   * Get the singleton instance of ClaudeModel
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  public static getInstance(options?: ClaudeModelOptions): ClaudeModel {
    if (!ClaudeModel.instance) {
      ClaudeModel.instance = new ClaudeModel(options?.apiKey, options?.model);
      logger.debug('ClaudeModel singleton instance created');
    } else if (options && Object.keys(options).length > 0) {
      // Log at debug level if trying to get instance with different config
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
    }
    
    return ClaudeModel.instance;
  }

  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    ClaudeModel.instance = null;
    logger.debug('ClaudeModel singleton instance reset');
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to create isolated instances.
   * 
   * @param options Configuration options
   * @returns A new ClaudeModel instance
   */
  public static createFresh(options?: ClaudeModelOptions): ClaudeModel {
    logger.debug('Creating fresh ClaudeModel instance');
    return new ClaudeModel(options?.apiKey, options?.model);
  }

  /**
   * Private constructor to enforce factory method usage
   * 
   * Part of the Component Interface Standardization pattern.
   * Users should call getInstance() or createFresh() instead.
   * 
   * @param apiKey Optional API key (falls back to config)
   * @param model Model to use (defaults to aiConfig.anthropic.defaultModel)
   */
  private constructor(apiKey?: string, model = aiConfig.anthropic.defaultModel) {
    this.apiKey = apiKey || aiConfig.anthropic.apiKey;
    this.model = model;
    logger.debug(`Claude model initialized with model: ${this.model}`);
  }

  /**
   * Send a completion request to Claude
   * 
   * @param systemPrompt The system prompt to set context
   * @param userPrompt The user's prompt/question
   * @param maxTokens Maximum tokens in the response
   * @returns Model response with text and token usage
   */
  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = aiConfig.anthropic.defaultMaxTokens,
  ): Promise<ModelResponse> {
    try {
      // The Vercel AI SDK uses environment variables for API keys by default
      // Here we temporarily set the environment variable if we have a custom API key
      const originalApiKey = process.env['ANTHROPIC_API_KEY'];
      if (this.apiKey) {
        process.env['ANTHROPIC_API_KEY'] = this.apiKey;
      }
      
      try {
        // Generate text using the Vercel AI SDK
        const { text, usage } = await generateText({
          model: anthropic(this.model),
          system: systemPrompt,
          prompt: userPrompt,
          maxTokens,
          temperature: aiConfig.anthropic.temperature,
        });
        
        // Map usage from the AI SDK to our internal format
        const mappedUsage = this.mapUsage(usage);
        
        return {
          response: text,
          usage: mappedUsage,
        };
      } finally {
        // Restore the original API key environment variable
        if (originalApiKey) {
          process.env['ANTHROPIC_API_KEY'] = originalApiKey;
        } else if (this.apiKey) {
          delete process.env['ANTHROPIC_API_KEY'];
        }
      }
    } catch (error) {
      logger.error(`Error calling Claude API: ${error}`);
      throw error;
    }
  }
  
  /**
   * Map SDK usage object to our internal format
   * @param usage The AI SDK usage object
   * @returns Our internal usage format
   */
  private mapUsage(usage?: LanguageModelUsage): { inputTokens: number; outputTokens: number } {
    if (!usage) {
      return { inputTokens: 0, outputTokens: 0 };
    }
    
    // The AI SDK usage object structure is different, so we need to map it
    // The 'prompt' tokens are the input, and the 'completion' tokens are the output
    return {
      inputTokens: usage.promptTokens ?? 0,
      outputTokens: usage.completionTokens ?? 0,
    };
  }
}