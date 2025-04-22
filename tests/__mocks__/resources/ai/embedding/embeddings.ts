/**
 * Mock implementation of EmbeddingService
 * Following the Component Interface Standardization pattern
 */
import type { EmbeddingConfig } from '@/resources/ai/embedding/embeddings';
import type { EmbeddingModelAdapter } from '@/resources/ai/interfaces';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock service for embeddings
 * 
 * Implements the Component Interface Standardization pattern.
 */
export class EmbeddingService implements EmbeddingModelAdapter<EmbeddingConfig> {
  // Properties needed for mock functionality
  // This private property is required to match the structure of the real EmbeddingService
  // but we're not using it in the mock implementation
  // @ts-expect-error - The property is intentionally unused but needed for type compatibility
  private readonly apiKey: string = 'mock-api-key';
  readonly embeddingModel: string = 'mock-embedding-model';
  readonly embeddingDimension: number = 1536;
  readonly batchSize: number = 20;
  readonly logger = MockLogger.getInstance();
  private static instance: EmbeddingService | null = null;
  
  /**
   * Get the singleton instance of EmbeddingService
   * @param config Optional configuration
   * @returns The shared instance
   */
  public static getInstance(_config?: EmbeddingConfig): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    EmbeddingService.instance = null;
  }

  /**
   * Create a fresh instance (primarily for testing)
   * @param config Optional configuration
   * @returns A new instance
   */
  public static createFresh(_config?: EmbeddingConfig): EmbeddingService {
    return new EmbeddingService();
  }
  
  /**
   * Simple hash function for strings
   * @param str Input string to hash
   * @returns Numeric hash value
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  /**
   * Create a deterministic embedding based on input string
   * @param input String to hash for embedding seed
   * @param dimensions Number of dimensions for the embedding (default: 1536)
   * @returns Normalized embedding vector with the specified dimensions
   */
  static createMockEmbedding(input: string, dimensions: number = 1536): number[] {
    // Create a deterministic embedding based on the input
    const seed = EmbeddingService.hashString(input);
    const embedding = Array(dimensions).fill(0).map((_, i) => {
      const x = Math.sin(seed + i * 0.1) * 10000;
      return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
  
  /**
   * Generate a deterministic embedding for text
   * @param text The text to embed
   * @returns Promise resolving to embedding vector
   */
  async getEmbedding(text: string): Promise<number[]> {
    return EmbeddingService.createMockEmbedding(text);
  }
  
  /**
   * Generate embeddings for multiple texts
   * @param texts The texts to embed
   * @returns Promise resolving to array of embedding vectors
   */
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(text => EmbeddingService.createMockEmbedding(text));
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
   * Get the full embedding result with metadata
   * @param text The text to embed
   * @returns A promise resolving to the embedding result with metadata
   */
  async getEmbeddingWithMetadata(text: string): Promise<{ embedding: number[], truncated: boolean }> {
    const embedding = await this.getEmbedding(text);
    return {
      embedding,
      truncated: false,
    };
  }
  
  /**
   * Get batch embeddings with metadata
   * @param texts Array of texts to embed
   * @returns Array of embedding results with metadata
   */
  async getBatchEmbeddingsWithMetadata(texts: string[]): Promise<Array<{ embedding: number[], truncated: boolean }>> {
    const embeddings = await this.getBatchEmbeddings(texts);
    return embeddings.map(embedding => ({
      embedding,
      truncated: false,
    }));
  }
  
  /**
   * Process embeddings in small batches
   * @param texts Array of texts to process
   * @param options Batch processing options
   * @returns Array of embedding results
   */
  async processEmbeddingsInSmallBatches(
    texts: string[],
    _options?: { batchSize?: number, parallel?: boolean },
  ): Promise<Array<{ embedding: number[], truncated: boolean }>> {
    return this.getBatchEmbeddingsWithMetadata(texts);
  }
  
  /**
   * Calculate similarity between two vectors (alias for ResourceRegistry interface)
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (-1 to 1)
   */
  calculateSimilarity(vec1: number[], vec2: number[]): number {
    return this.cosineSimilarity(vec1, vec2);
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