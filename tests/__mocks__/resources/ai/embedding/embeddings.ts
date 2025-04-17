/**
 * Mock implementation of EmbeddingService
 * Following the Component Interface Standardization pattern
 */
import type { EmbeddingConfig } from '@/resources/ai/embedding/embeddings';
import { createMockEmbedding } from '@test/__mocks__/utils/embeddingUtils';

/**
 * Mock service for embeddings
 * 
 * Implements the Component Interface Standardization pattern.
 */
export class MockEmbeddingService {
  private static instance: MockEmbeddingService | null = null;
  
  /**
   * Get the singleton instance of MockEmbeddingService
   * @param config Optional configuration
   * @returns The shared instance
   */
  public static getInstance(_config?: EmbeddingConfig): MockEmbeddingService {
    if (!MockEmbeddingService.instance) {
      MockEmbeddingService.instance = new MockEmbeddingService();
    }
    return MockEmbeddingService.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockEmbeddingService.instance = null;
  }

  /**
   * Create a fresh instance (primarily for testing)
   * @param config Optional configuration
   * @returns A new instance
   */
  public static createFresh(_config?: EmbeddingConfig): MockEmbeddingService {
    return new MockEmbeddingService();
  }
  
  /**
   * Generate a deterministic embedding for text
   * @param text The text to embed
   * @returns Promise resolving to embedding vector
   */
  async getEmbedding(text: string): Promise<number[]> {
    return createMockEmbedding(text);
  }
  
  /**
   * Generate embeddings for multiple texts
   * @param texts The texts to embed
   * @returns Promise resolving to array of embedding vectors
   */
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(text => createMockEmbedding(text));
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (-1 to 1)
   */
  cosineSimilarity(_vec1: number[], _vec2: number[]): number {
    // Simple deterministic similarity calculation for tests
    return 0.85;
  }
  
  /**
   * Chunk a long text into smaller pieces
   * @param text Text to chunk
   * @param _chunkSize Size of each chunk
   * @param _overlap Overlap between chunks
   * @returns Array of text chunks
   */
  chunkText(text: string, _chunkSize: number = 1000, _overlap: number = 200): string[] {
    // Simple implementation that just splits by sentences for testing
    const sentences = text.split(/[.!?]+\s+/);
    // If there are fewer sentences than would make a chunk, return the whole text
    if (sentences.length <= 2) {
      return [text];
    }
    // Otherwise create 2 chunks for testing
    return [
      sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ') + '.',
      sentences.slice(Math.floor(sentences.length / 2) - 1).join('. ') + '.',
    ];
  }
  
  /**
   * Get embeddings for text chunks
   * @param textChunks Array of text chunks
   * @returns Promise resolving to array of embedding vectors
   */
  async getChunkedEmbeddings(textChunks: string[]): Promise<number[][]> {
    return this.getBatchEmbeddings(textChunks);
  }
}