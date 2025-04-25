/**
 * Mock implementation of EmbeddingService
 * Following the Component Interface Standardization pattern
 */
import type { EmbeddingConfig, EmbeddingDependencies } from '@/resources/ai/embedding/embeddings';
import type { EmbeddingModelAdapter } from '@/resources/ai/interfaces';
import type { Logger } from '@/utils/logger';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock service for embeddings
 * 
 * Implements the Component Interface Standardization pattern.
 */
export class EmbeddingService implements EmbeddingModelAdapter<EmbeddingConfig> {
  // Properties needed for mock functionality - used in methods
  // @ts-expect-error Property used for consistent API with the real implementation
  private readonly apiKey: string = 'mock-api-key';
  // @ts-expect-error Property used in real implementation for model identification
  private readonly embeddingModel: string = 'mock-embedding-model';
  // Used in mock embeddings to set dimensions
  private readonly embeddingDimension: number = 1536;
  // @ts-expect-error Property used for batch processing configuration
  private readonly batchSize: number = 20;
  
  // Used for logging in real implementation
  private readonly logger: Logger;
  private static instance: EmbeddingService | null = null;
  
  /**
   * Get the singleton instance of EmbeddingService
   * 
   * @param config Optional configuration to override defaults
   * @returns The shared EmbeddingService instance
   */
  public static getInstance(config?: EmbeddingConfig): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(config);
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
   * Create a fresh service instance (primarily for testing)
   * 
   * @param config Optional configuration to override defaults
   * @returns A new EmbeddingService instance
   */
  public static createFresh(config?: EmbeddingConfig): EmbeddingService {
    return new EmbeddingService(config);
  }
  
  /**
   * Create a new service instance with dependencies
   * 
   * @param config Configuration options
   * @param dependencies External dependencies
   * @returns A new EmbeddingService instance
   */
  public static createWithDependencies(
    config: Record<string, unknown> = {},
    dependencies: Record<string, unknown> = {},
  ): EmbeddingService {
    // Convert generic config to typed config
    const embeddingConfig: EmbeddingConfig = {
      apiKey: config['apiKey'] as string,
      embeddingModel: config['embeddingModel'] as string,
      embeddingDimension: config['embeddingDimension'] as number,
    };
    
    // Create instance with typed dependencies
    return new EmbeddingService(
      embeddingConfig, 
      { 
        logger: dependencies['logger'] as Logger, 
      },
    );
  }
  
  /**
   * Private constructor for enforcing factory method usage
   * @param config Optional configuration to override defaults
   * @param deps Optional dependencies 
   * @private Use factory methods instead of constructor directly
   */
  private constructor(
    _config?: EmbeddingConfig,
    deps: EmbeddingDependencies = {},
  ) {
    // Use type assertion for MockLogger since it doesn't have all the Logger properties
    // This is acceptable for tests since we're only interested in its behavior
    this.logger = deps.logger || (MockLogger.getInstance() as unknown as Logger);
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
   * @param dimensions Number of dimensions for the embedding (defaults to instance dimension)
   * @returns Normalized embedding vector with the specified dimensions
   */
  createMockEmbedding(input: string, dimensions?: number): number[] {
    // Use the instance's embeddingDimension if no dimensions provided
    const dims = dimensions || this.embeddingDimension;
    
    // Create a deterministic embedding based on the input
    const seed = EmbeddingService.hashString(input);
    const embedding = Array(dims).fill(0).map((_, i) => {
      const x = Math.sin(seed + i * 0.1) * 10000;
      return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
  
  /**
   * Static version of createMockEmbedding for use without an instance
   * @param input String to hash for embedding seed
   * @param dimensions Number of dimensions for the embedding (default: 1536)
   * @returns Normalized embedding vector with the specified dimensions
   */
  static createMockEmbedding(input: string, dimensions: number = 1536): number[] {
    // Create a temporary instance to use the instance method
    const service = new EmbeddingService();
    return service.createMockEmbedding(input, dimensions);
  }
  
  /**
   * Generate a deterministic embedding for text
   * Uses the logger to maintain API compatibility with the real implementation
   * @param text The text to embed
   * @returns Promise resolving to embedding vector
   */
  async getEmbedding(text: string): Promise<number[]> {
    // Logger would be used in the real implementation
    this.logger?.debug?.('Generating mock embedding');
    return this.createMockEmbedding(text);
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
   * Calculate similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (-1 to 1)
   */
  calculateSimilarity(_vec1: number[], _vec2: number[]): number {
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