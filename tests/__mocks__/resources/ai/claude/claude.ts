/**
 * Mock Claude Language Model Adapter
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh() methods
 * 
 * This mock allows flexible method overriding to support various test scenarios
 */
import type { z } from 'zod';

import type { QueryResult } from '@/protocol/types';
import type { ModelResponse } from '@/resources/ai/interfaces';

export interface ClaudeModelOptions {
  model?: string;
}

/**
 * Options for completion requests
 */
export interface CompleteOptions<T = unknown> {
  schema?: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Mock ClaudeModel for testing
 * 
 * This class provides both the original mock interface for backward compatibility
 * and new methods for more advanced testing scenarios
 */
export class ClaudeModel {
  private static instance: ClaudeModel | null = null;
  
  /**
   * Standard mock response for testing (backward compatibility)
   */
  public mockResponse: ModelResponse<{ answer: string }> = {
    object: { answer: 'This is a mock Claude response' },
    usage: { inputTokens: 10, outputTokens: 20 },
  };
  
  /**
   * Customizable responses for different queries
   */
  private queryResponses: Record<string, QueryResult> = {};
  
  /**
   * Default response for QueryResult-based methods
   */
  private defaultQueryResponse: QueryResult = {
    answer: 'This is a mock Claude response',
    citations: [],
    relatedNotes: [],
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
   * Create a fresh instance without affecting the singleton
   */
  public static createFresh(_options?: ClaudeModelOptions): ClaudeModel {
    return new ClaudeModel();
  }
  
  /**
   * Complete method for backward compatibility
   * Can be overridden in tests
   */
  public async complete<T = { answer: string }>(
    options: CompleteOptions<T>,
  ): Promise<ModelResponse<T>> {
    // Check if we have a custom response for this prompt
    const query = options.userPrompt;
    const queryResult = this.queryResponses[query] || this.defaultQueryResponse;
    
    // If schema is provided, try to match it
    if (options.schema && queryResult.object) {
      try {
        const validatedObject = options.schema.parse(queryResult.object);
        return {
          object: validatedObject,
          usage: { inputTokens: 10, outputTokens: 20 },
        };
      } catch {
        // Fall back to the mockResponse if validation fails
        return this.mockResponse as ModelResponse<T>;
      }
    }
    
    // Return the default mock response or a transformed version
    return {
      object: (queryResult.object || { answer: queryResult.answer }) as T,
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }
  
  /**
   * Process a query and return the appropriate mock response
   * This method is added for the new testing pattern
   */
  public async processQuery(query: string, _options?: Record<string, unknown>): Promise<QueryResult> {
    // Check if we have a specific response for this query
    if (this.queryResponses[query]) {
      return this.queryResponses[query];
    }
    
    // Return the default response
    return this.defaultQueryResponse;
  }
  
  /**
   * Process a query with schema
   */
  public async processQueryWithSchema<T>(query: string, options?: { schema?: z.ZodType<unknown> }): Promise<QueryResult<T>> {
    // Get the base response
    const response = await this.processQuery(query, options);
    
    // If the response has an object and a schema is provided, ensure it matches
    if (response.object && options?.schema) {
      try {
        const validatedObject = options.schema.parse(response.object);
        return {
          ...response,
          object: validatedObject,
        };
      } catch {
        // If validation fails, return without object
        return {
          ...response,
          object: undefined,
        };
      }
    }
    
    return response as QueryResult<T>;
  }
  
  /**
   * Set the default mock response (backward compatibility)
   */
  public setMockResponse<T>(response: ModelResponse<T>): void {
    this.mockResponse = response as ModelResponse<{ answer: string }>;
  }
  
  /**
   * Set a custom response for a specific query
   */
  public setQueryResponse(query: string, response: QueryResult): void {
    this.queryResponses[query] = response;
  }
  
  /**
   * Set the default query response
   */
  public setDefaultQueryResponse(response: QueryResult): void {
    this.defaultQueryResponse = response;
  }
  
  /**
   * Clear all custom query responses
   */
  public clearQueryResponses(): void {
    this.queryResponses = {};
  }
  
  /**
   * Reset all responses to defaults
   */
  public resetResponses(): void {
    this.clearQueryResponses();
    this.mockResponse = {
      object: { answer: 'This is a mock Claude response' },
      usage: { inputTokens: 10, outputTokens: 20 },
    };
    this.defaultQueryResponse = {
      answer: 'This is a mock Claude response',
      citations: [],
      relatedNotes: [],
    };
  }
}

/**
 * Mock ClaudeModel with advanced configuration
 * This is the new preferred mock for tests that need more control
 */
export class MockClaudeModel extends ClaudeModel {
  private static mockInstance: MockClaudeModel | null = null;
  
  /**
   * Private constructor accepting configuration options
   */
  private constructor(options?: {
    defaultResponse?: QueryResult;
    queryResponses?: Record<string, QueryResult>;
  }) {
    super();
    
    if (options?.defaultResponse) {
      this.setDefaultQueryResponse(options.defaultResponse);
    }
    
    if (options?.queryResponses) {
      Object.entries(options.queryResponses).forEach(([query, response]) => {
        this.setQueryResponse(query, response);
      });
    }
  }
  
  /**
   * Get the singleton instance of MockClaudeModel
   */
  public static override getInstance(_options?: ClaudeModelOptions): MockClaudeModel {
    if (!MockClaudeModel.mockInstance) {
      MockClaudeModel.mockInstance = new MockClaudeModel();
    }
    return MockClaudeModel.mockInstance;
  }

  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockClaudeModel.mockInstance = null;
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   */
  public static override createFresh(_options?: ClaudeModelOptions): MockClaudeModel {
    return new MockClaudeModel();
  }
}