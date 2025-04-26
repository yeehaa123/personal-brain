/**
 * Mock implementation for BaseEmbeddingService
 * 
 * Provides a standardized mock that follows the Component Interface Standardization pattern.
 */

import type { EmbeddingService } from '@/resources/ai/embedding';

/**
 * Standardized mock implementation for BaseEmbeddingService
 * Implements the Component Interface Standardization pattern
 */
export class MockBaseEmbeddingService {
  /** Singleton instance */
  private static instance: MockBaseEmbeddingService | null = null;

  /** Mock embedding service */
  protected embeddingService: EmbeddingService | undefined;

  /**
   * Get the singleton instance
   */
  public static getInstance(embeddingService?: EmbeddingService): MockBaseEmbeddingService {
    if (!MockBaseEmbeddingService.instance) {
      MockBaseEmbeddingService.instance = new MockBaseEmbeddingService(embeddingService);
    }
    return MockBaseEmbeddingService.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockBaseEmbeddingService.instance = null;
  }

  /**
   * Create a fresh instance
   */
  public static createFresh(embeddingService?: EmbeddingService): MockBaseEmbeddingService {
    return new MockBaseEmbeddingService(embeddingService);
  }

  /**
   * Constructor
   */
  constructor(embeddingService?: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Generate an embedding for a text
   */
  async generateEmbedding(_text: string): Promise<number[]> {
    return [0.1, 0.2, 0.3, 0.4, 0.5];
  }

  /**
   * Generate embeddings for multiple texts
   */
  async getBatchEmbeddings(_texts: string[]): Promise<number[][]> {
    return Array.from({ length: _texts.length }, () => [0.1, 0.2, 0.3, 0.4, 0.5]);
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(_embedding1: number[], _embedding2: number[]): number {
    return 0.85; // Mock similarity score
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text: string, chunkSize = 1000, _overlap = 200): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
}