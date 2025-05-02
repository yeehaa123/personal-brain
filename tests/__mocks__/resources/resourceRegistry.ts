/**
 * Mock ResourceRegistry
 */
import type { ModelResponse } from '@/resources/ai/interfaces';

// Create mock interfaces that match the real implementations
export interface MockLanguageModelAdapter {
  complete<T>(options: Record<string, unknown>): Promise<ModelResponse<T>>;
}

export interface MockEmbeddingModelAdapter {
  getEmbedding(text: string): Promise<number[]>;
  getBatchEmbeddings(texts: string[]): Promise<number[][]>;
  calculateSimilarity(vec1: number[], vec2: number[]): number;
}

/**
 * Mock ResourceRegistry for testing
 */
export class MockResourceRegistry {
  private static instance: MockResourceRegistry | null = null;

  // Mock response to return from language model
  public mockModelResponse: ModelResponse<unknown> = {
    object: { answer: 'This is a mock response', tags: ['ecosystem-architecture', 'regenerative-systems', 'decentralized', 'collaboration', 'interconnected-communities'] },
    usage: { inputTokens: 10, outputTokens: 20 },
  };

  // Mock embedding to return
  public mockEmbedding: number[] = [0.1, 0.2, 0.3, 0.4, 0.5];

  // Mock similarity score to return
  public mockSimilarity: number = 0.75;

  /**
   * Mock language model adapter
   */
  private mockLanguageModel: MockLanguageModelAdapter = {
    complete: async <T>(_options: Record<string, unknown>): Promise<ModelResponse<T>> => {
      return this.mockModelResponse as ModelResponse<T>;
    },
  };

  /**
   * Mock embedding model adapter
   */
  private mockEmbeddingModel: MockEmbeddingModelAdapter = {
    getEmbedding: async (_text: string): Promise<number[]> => {
      return [...this.mockEmbedding];
    },

    getBatchEmbeddings: async (_texts: string[]): Promise<number[][]> => {
      return _texts.map(() => [...this.mockEmbedding]);
    },

    calculateSimilarity: (_vec1: number[], _vec2: number[]): number => {
      return this.mockSimilarity;
    },
  };

  /**
   * Get the singleton instance
   */
  public static getInstance(options?: Record<string, unknown>): MockResourceRegistry {
    if (!MockResourceRegistry.instance) {
      MockResourceRegistry.instance = new MockResourceRegistry();
      
      // Store API keys if provided in options
      if (options && typeof options === 'object') {
        if (options['anthropicApiKey']) {
          MockResourceRegistry.instance.anthropicApiKey = options['anthropicApiKey'] as string;
        }
        if (options['openAiApiKey']) {
          MockResourceRegistry.instance.openAiApiKey = options['openAiApiKey'] as string;
        }
      }
    }
    return MockResourceRegistry.instance;
  }
  
  // Mock API keys for testing
  private anthropicApiKey: string = 'mock-anthropic-api-key';
  private openAiApiKey: string = 'mock-openai-api-key';

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockResourceRegistry.instance = null;
  }

  /**
   * Create a fresh instance
   */
  public static createFresh(_options?: Record<string, unknown>): MockResourceRegistry {
    return new MockResourceRegistry();
  }
  
  /**
   * Create an instance with explicit dependencies
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    _dependencies: Record<string, unknown> = {},
  ): MockResourceRegistry {
    return new MockResourceRegistry();
  }

  /**
   * Get the language model
   */
  public getClaudeModel(): MockLanguageModelAdapter {
    return this.mockLanguageModel;
  }

  /**
   * Get the embedding model
   */
  public getEmbeddingService(): MockEmbeddingModelAdapter {
    return this.mockEmbeddingModel;
  }

  /**
   * Update configuration options
   */
  public updateOptions(_options: Record<string, unknown>): void {
    // No-op in mock
  }
  
  /**
   * Check if the registry is initialized
   * @returns true in mock implementation
   */
  public isInitialized(): boolean {
    return true;
  }
  
  /**
   * Initialize the registry
   * @returns true in mock implementation
   */
  public initialize(): boolean {
    return true;
  }
  
  /**
   * Mock API key validation that always succeeds
   * This is critical to prevent tests from requiring actual API keys
   * @param keyType Type of API key (anthropic or openai)
   * @returns The mock API key
   */
  public validateApiKey(keyType: 'anthropic' | 'openai'): string {
    // Return the appropriate mock API key based on type
    return keyType === 'anthropic' ? this.anthropicApiKey : this.openAiApiKey;
  }
}
