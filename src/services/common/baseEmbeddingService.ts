/**
 * Base embedding service that provides shared functionality for entity-specific embedding services
 * 
 * Derived classes should implement the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import { EmbeddingService } from '@/resources/ai/embedding';
import type { IEmbeddingService } from '@/services/interfaces/IEmbeddingService';
import { ApiError, ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';


/**
 * Base embedding service with common functionality
 */
export abstract class BaseEmbeddingService implements IEmbeddingService {
  /**
   * Logger instance for this class and its derived classes
   * Each instance of BaseEmbeddingService has its own logger
   */
  protected logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  protected embeddingService: EmbeddingService;

  /**
   * Creates a new embedding service instance
   * @param apiKey Optional API key for the embeddings service
   */
  constructor(apiKey?: string) {
    this.embeddingService = EmbeddingService.getInstance(apiKey ? { apiKey } : undefined);
  }

  /**
   * Generate an embedding for the given text
   * @param text The text to generate embedding for
   * @returns The embedding vector
   * @throws ValidationError if text is empty
   * @throws ApiError if embedding generation fails
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!isNonEmptyString(text)) {
        throw new ValidationError('Empty text provided for embedding generation');
      }

      const result = await this.embeddingService.getEmbedding(text);
      
      if (!isDefined(result) || !Array.isArray(result) || result.length === 0) {
        throw new ApiError('Failed to generate valid embedding', undefined, {
          textLength: text.length,
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error generating embedding: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Calculate similarity score between two embeddings
   * @param embedding1 First embedding
   * @param embedding2 Second embedding
   * @returns Similarity score (0 to 1)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    try {
      return this.embeddingService.cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      this.logger.error(`Error calculating similarity: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Get the embedding service instance
   * @returns The embedding service instance
   */
  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }
}