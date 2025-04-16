import { anthropic } from '@ai-sdk/anthropic';
import { generateObject, generateText, type LanguageModelUsage } from 'ai';
import type { z } from 'zod';

import { aiConfig } from '@/config';
import logger from '@/utils/logger';

export interface ModelResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ModelObjectResponse<T> {
  object: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Configuration options for ClaudeModel
 */
export interface ClaudeModelOptions {
  /** Model to use (defaults to aiConfig.anthropic.defaultModel) */
  model?: string;
}

/**
 * Options for text completion requests
 */
export interface CompleteOptions {
  /** System prompt to set context */
  systemPrompt: string;
  /** User prompt/question */
  userPrompt: string;
  /** Maximum tokens in the response (defaults to aiConfig.anthropic.defaultMaxTokens) */
  maxTokens?: number;
  /** Temperature for sampling (0-1, lower = more deterministic) */
  temperature?: number;
}

/**
 * Options for schema-based completion requests
 */
export interface CompleteWithSchemaOptions<Schema extends z.ZodType<any>> {
  /** Schema defining the expected return structure */
  schema: Schema;
  /** System prompt to set context */
  systemPrompt: string;
  /** User prompt/question */
  userPrompt: string;
  /** Maximum tokens in the response (defaults to aiConfig.anthropic.defaultMaxTokens) */
  maxTokens?: number;
  /** Temperature for sampling (0-1, lower = more deterministic) */
  temperature?: number;
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
      ClaudeModel.instance = new ClaudeModel(options?.model);
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
    return new ClaudeModel(options?.model);
  }

  /**
   * Private constructor to enforce factory method usage
   * 
   * Part of the Component Interface Standardization pattern.
   * Users should call getInstance() or createFresh() instead.
   * 
   * @param model Model to use (defaults to aiConfig.anthropic.defaultModel)
   */
  private constructor(model = aiConfig.anthropic.defaultModel) {
    this.model = model;
    logger.debug(`Claude model initialized with model: ${this.model}`);
  }

  /**
   * Send a completion request to Claude for free-form text responses
   * 
   * @param options Completion options (systemPrompt, userPrompt, maxTokens, temperature)
   * @returns Model response with text and token usage
   */
  async complete(options: CompleteOptions): Promise<ModelResponse> {
    try {
      // Generate text using the Vercel AI SDK
      const { text, usage } = await generateText({
        model: anthropic(this.model),
        system: options.systemPrompt,
        prompt: options.userPrompt,
        maxTokens: options.maxTokens ?? aiConfig.anthropic.defaultMaxTokens,
        temperature: options.temperature ?? aiConfig.anthropic.temperature,
      });
      
      // Map usage from the AI SDK to our internal format
      const mappedUsage = this.mapUsage(usage);
      
      return {
        response: text,
        usage: mappedUsage,
      };
    } catch (error) {
      logger.error(`Error calling Claude API: ${error}`);
      throw error;
    }
  }

  /**
   * Send a completion request to Claude to generate structured data according to a schema
   * 
   * @param options Schema-based completion options
   * @returns Model response with structured object and token usage
   */
  async completeWithSchema<T, Schema extends z.ZodType<T>>(
    options: CompleteWithSchemaOptions<Schema>
  ): Promise<ModelObjectResponse<T>> {
    try {
      // Generate structured object using the Vercel AI SDK
      const response = await generateObject({
        model: anthropic(this.model),
        system: options.systemPrompt,
        prompt: options.userPrompt,
        schema: options.schema,
        temperature: options.temperature ?? aiConfig.anthropic.temperature,
        maxTokens: options.maxTokens ?? aiConfig.anthropic.defaultMaxTokens,
      });
      
      // Map usage from the AI SDK to our internal format
      const mappedUsage = this.mapUsage(response.usage);
      
      return {
        object: response.object,
        usage: mappedUsage,
      };
    } catch (error) {
      logger.error(`Error calling Claude API with schema: ${error}`);
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