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
  public mockModelResponse: ModelResponse<{ answer: string }> = {
    object: { answer: 'This is a mock response' },
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
  public static getInstance(_options?: Record<string, unknown>): MockResourceRegistry {
    if (!MockResourceRegistry.instance) {
      MockResourceRegistry.instance = new MockResourceRegistry();
    }
    return MockResourceRegistry.instance;
  }
  
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
}

// Export the mock as the default export
export default MockResourceRegistry;