/**
 * Base embedding service that provides shared functionality for entity-specific embedding services
 */
import { EmbeddingService } from '@/mcp/model/embeddings';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import { ApiError, ValidationError } from '@/utils/errorUtils';

/**
 * Base embedding service with common functionality
 */
export abstract class BaseEmbeddingService {
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
      
      if (!isDefined(result) || !Array.isArray(result.embedding) || result.embedding.length === 0) {
        throw new ApiError('Failed to generate valid embedding', undefined, {
          textLength: text.length,
        });
      }
      
      return result.embedding;
    } catch (error) {
      logger.error(`Error generating embedding: ${error instanceof Error ? error.message : String(error)}`);
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
      logger.error(`Error calculating similarity: ${error instanceof Error ? error.message : String(error)}`);
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