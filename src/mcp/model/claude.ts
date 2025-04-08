import Anthropic from '@anthropic-ai/sdk';

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
  
  private client: Anthropic;
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
    this.client = new Anthropic({
      apiKey: apiKey || aiConfig.anthropic.apiKey,
    });
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
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: maxTokens,
      });

      let responseText = '';
      if (response.content.length > 0) {
        const firstContent = response.content[0];
        if (firstContent.type === 'text') {
          responseText = firstContent.text ?? '';
        } else {
          responseText = JSON.stringify(firstContent);
        }
      }
      
      return {
        response: responseText,
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
        },
      };
    } catch (error) {
      logger.error(`Error calling Claude API: ${error}`);
      throw error;
    }
  }
}