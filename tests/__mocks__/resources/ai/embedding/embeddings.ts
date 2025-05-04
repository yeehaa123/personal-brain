/**
 * Clean mock implementation of EmbeddingService
 * 
 * This implements only the standard public API with no mock-specific methods
 */
import type { EmbeddingConfig, EmbeddingDependencies } from '@/resources/ai/embedding/embeddings';
import type { Logger } from '@/utils/logger';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock service for embeddings
 * 
 * Implements the EmbeddingModelAdapter interface with consistent test outputs.
 */
export class EmbeddingService {
  // Singleton instance
  private static instance: EmbeddingService | null = null;

  // Embedding dimension for consistent output sizes
  private readonly embeddingDimension: number;


  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      // Create the instance with default configuration and dependencies
      const defaultConfig = {} as unknown as EmbeddingConfig;
      const defaultDependencies = {} as unknown as EmbeddingDependencies;
      
      EmbeddingService.instance = new EmbeddingService(defaultConfig, defaultDependencies);
    }

    return EmbeddingService.instance;
  }

  // Dependencies

  /**
   * Get the singleton instance of EmbeddingService
   * 
   * This method retrieves or creates the shared singleton instance using default
   * configuration values from the application config.
   * 
   * @returns The shared EmbeddingService instance
   */
  /**
   * Reset the singleton instance
   * 
   * This method clears the static instance reference. It is primarily used 
   * in testing to ensure a clean state between tests.
   */
  public static resetInstance(): void {
    EmbeddingService.instance = null;
  }

  /**
   * Create a fresh service instance for testing
   * 
   * This method creates a new instance with explicit configuration and dependencies,
   * without affecting the singleton instance.
   * 
   * @param config Configuration for the test instance (optional in tests)
   * @param dependencies Dependencies for the test instance (optional in tests)
   * @returns A new isolated EmbeddingService instance
   */
  public static createFresh(
    _config?: EmbeddingConfig,
    dependencies?: EmbeddingDependencies,
  ): EmbeddingService {
    // Create default dependencies if not provided
    const mockLogger = (dependencies?.logger || MockLogger.getInstance()) as Logger;
    mockLogger.debug('Creating fresh EmbeddingService instance');

    const defaultDependencies = {} as unknown as EmbeddingDependencies;

    // Create default config
    const defaultConfig = {} as unknown as EmbeddingConfig;

    return new EmbeddingService(defaultConfig, defaultDependencies);
  }

  /**
   * Private constructor to enforce factory methods
   * 
   * @param config Configuration options
   * @param dependencies Required dependencies
   */
  private constructor(
    config: EmbeddingConfig,
    _dependencies: EmbeddingDependencies,
  ) {
    this.embeddingDimension = config.embeddingDimension || 1536;
  }

  /**
   * Generate a test embedding for text
   * 
   * Part of the public API defined by EmbeddingModelAdapter
   * 
   * @param text Text to embed
   * @returns A consistent vector representation
   */
  async getEmbedding(text: string): Promise<number[]> {
    return this.createDeterministicVector(text);
  }

  /**
   * Generate embeddings for multiple texts in batch
   * 
   * Part of the public API defined by EmbeddingModelAdapter
   * 
   * @param texts Array of texts to generate embeddings for
   * @returns An array of embedding vectors
   */
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map(text => this.createDeterministicVector(text));
  }

  /**
   * Calculate similarity between two vectors
   * 
   * Part of the public API defined by EmbeddingModelAdapter
   * 
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score between -1 and 1
   */
  calculateSimilarity(_vec1: number[], _vec2: number[]): number {
    // Return a fixed value for predictable testing
    return 0.85;
  }

  /**
   * Chunk text into smaller pieces for embedding
   * 
   * Part of the public API defined by EmbeddingModelAdapter
   * 
   * @param text Text to chunk
   * @param _chunkSize Approximate chunk size (ignored in mock)
   * @param _overlap Overlap between chunks (ignored in mock)
   * @returns Array of text chunks
   */
  chunkText(text: string, _chunkSize = 1000, _overlap = 200): string[] {
    // Simple deterministic chunking for testing
    const chunks = text.split(/[.!?]\s+/);

    // If there are too few sentences, just return the whole text
    if (chunks.length <= 2) {
      return [text];
    }

    // Otherwise, create two chunks for testing
    return [
      chunks.slice(0, Math.ceil(chunks.length / 2)).join('. ') + '.',
      chunks.slice(Math.floor(chunks.length / 2)).join('. ') + '.',
    ];
  }

  /**
   * Generate embeddings for chunks of text
   * 
   * Part of the public API defined by EmbeddingModelAdapter
   * 
   * @param textChunks Array of text chunks
   * @returns Promise resolving to array of embedding vectors
   */
  async getChunkedEmbeddings(textChunks: string[]): Promise<number[][]> {
    return this.getBatchEmbeddings(textChunks);
  }

  /**
   * Helper for creating consistent embeddings
   * 
   * This is a private implementation detail, not part of the public API.
   * 
   * @param text Text to embed
   * @returns A deterministic vector representation
   */
  private createDeterministicVector(text: string): number[] {
    // Create a hash of the text for consistent output
    const hash = this.hashString(text);

    // Create a deterministic vector based on the hash
    const vector = Array(this.embeddingDimension).fill(0).map((_, i) => {
      const x = Math.sin(hash + i * 0.1) * 10000;
      return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
    });

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  /**
   * Simple hash function for text
   * 
   * This is a private implementation detail, not part of the public API.
   * 
   * @param text Text to hash
   * @returns Numeric hash value
   */
  private hashString(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}
