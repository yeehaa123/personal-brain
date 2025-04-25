/**
 * Embedding service for generating vector representations of text
 * Uses the Vercel AI SDK for embedding generation
 *
 * Implements the EmbeddingModelAdapter interface for consistent integration
 * across the application.
 */

import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embed, embedMany } from 'ai';

import { aiConfig, textConfig } from '@/config';
import type { EmbeddingModelAdapter } from '@/resources/ai/interfaces';
import { ApiError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';
import { chunkText, prepareText } from '@/utils/textUtils';

/**
 * Configuration options for the embedding service
 */
export interface EmbeddingConfig {
  /** OpenAI API key */
  apiKey?: string;
  /** Model to use for embeddings (default: text-embedding-3-small) */
  embeddingModel?: string;
  /** Dimension of the embedding vectors */
  embeddingDimension?: number;
}

/**
 * Dependencies interface for EmbeddingService
 */
export interface EmbeddingDependencies {
  /** Logger instance */
  logger?: Logger;
}

/**
 * Service for generating and working with text embeddings
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates an instance with explicit dependencies
 * 
 * Implements the EmbeddingModelAdapter interface for consistent integration.
 */
export class EmbeddingService implements EmbeddingModelAdapter<EmbeddingConfig> {
  /** Configuration values - used in methods */
  // apiKey is used by the AI SDK internally
  // @ts-expect-error Property is used by the AI SDK
  private readonly apiKey: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimension: number;

  /** Logger instance for this class */
  private readonly logger: Logger;

  /** Singleton instance */
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
   * Create a new embedding service
   * 
   * @param config Optional configuration to override defaults
   * @param deps Optional dependencies 
   * @private Use factory methods instead of constructor directly
   */
  private constructor(
    config?: EmbeddingConfig,
    deps: EmbeddingDependencies = {},
  ) {
    this.apiKey = config?.apiKey || aiConfig.openAI.apiKey;
    this.embeddingModel = config?.embeddingModel || aiConfig.openAI.embeddingModel;
    this.embeddingDimension = config?.embeddingDimension || aiConfig.openAI.embeddingDimension;
    this.logger = deps.logger || Logger.getInstance();
  }

  /**
   * Generate an embedding for a single text
   * Implements EmbeddingModelAdapter.getEmbedding
   * 
   * @param text The text to embed
   * @returns A promise resolving to the embedding vector
   */
  async getEmbedding(text: string): Promise<number[]> {
    // Handle invalid input
    if (!isDefined(text)) {
      this.logger.warn('Received undefined or null text in getEmbedding');
      return Array(this.embeddingDimension).fill(0);
    }

    try {
      // Prepare the text for embedding
      const preparedText = prepareText(text);
      this.logger.debug('Generating embedding via AI SDK');

      // Use the Vercel AI SDK to generate the embedding
      const response = await embed({
        model: openai.embedding(this.embeddingModel),
        value: preparedText,
        maxRetries: 3,
      });

      this.logger.debug(`Generated embedding with model: ${this.embeddingModel}`);

      return response.embedding;
    } catch (error) {
      // Log detailed error information
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      this.logger.error(`Error generating embedding: ${errorMessage}`);

      // Provide additional context if it's an API error
      if (error instanceof ApiError) {
        this.logger.debug(`API Error details: ${error.toLogString()}`);
      }

      // Create zero embedding as a last resort
      return Array(this.embeddingDimension).fill(0);
    }
  }


  /**
   * Generate embeddings for multiple texts in batch
   * Implements EmbeddingModelAdapter.getBatchEmbeddings
   * 
   * @param texts An array of texts to generate embeddings for
   * @returns A promise resolving to an array of embedding vectors
   */
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // Handle invalid or empty input cases
    if (!isDefined(texts)) {
      this.logger.warn('Received undefined or null texts array in getBatchEmbeddings');
      return [];
    }

    if (texts.length === 0) {
      this.logger.debug('Received empty texts array in getBatchEmbeddings');
      return [];
    }

    this.logger.info(`Generating embeddings for ${texts.length} texts using AI SDK`);

    try {
      // Prepare the texts and filter out any null/undefined/empty values
      const preparedTexts = texts
        .filter(isDefined)
        .map(text => prepareText(text));

      // If all texts were invalid and we have no prepared texts, return empty result
      if (preparedTexts.length === 0) {
        this.logger.warn('No valid texts remained after filtering in getBatchEmbeddings');
        return [];
      }

      // Use the Vercel AI SDK to generate batch embeddings
      const response = await embedMany({
        model: openai.embedding(this.embeddingModel),
        values: preparedTexts,
        maxRetries: 3,
      });

      this.logger.debug(`Generated ${response.embeddings.length} embeddings in batch`);

      return response.embeddings;
    } catch (error) {
      // If batch processing fails, try individual processing
      this.logger.error(`Error using batch embedding API, falling back to individual processing: ${error instanceof Error ? error.message : String(error)}`);

      try {
        // Process each text individually as a fallback
        const embeddings = await Promise.all(
          texts.map(text => this.getEmbedding(text)),
        );
        return embeddings;
      } catch (processingError) {
        this.logger.error(`Individual processing also failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`);

        // Return empty embeddings as a last resort
        return texts.map(() => Array(this.embeddingDimension).fill(0));
      }
    }
  }


  /**
   * Calculate similarity between two embedding vectors
   * Implements EmbeddingModelAdapter.calculateSimilarity
   * 
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (-1 to 1)
   */
  calculateSimilarity(vec1: number[], vec2: number[]): number {
    // Handle null/undefined vectors
    if (!isDefined(vec1) || !isDefined(vec2)) {
      this.logger.warn('Received undefined or null vector in calculateSimilarity');
      return 0;
    }

    try {
      return cosineSimilarity(vec1, vec2);
    } catch (error) {
      // Handle errors gracefully (e.g., different vector dimensions)
      this.logger.error(`Error calculating cosine similarity: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }


  /**
   * Chunk a long text into smaller pieces for embedding
   * @param text The text to chunk
   * @param chunkSize The approximate size of each chunk
   * @param overlap The number of characters to overlap between chunks
   * @returns An array of text chunks
   */
  chunkText(
    text: string,
    chunkSize = textConfig.defaultChunkSize,
    overlap = textConfig.defaultChunkOverlap,
  ): string[] {
    return chunkText(text, chunkSize, overlap);
  }

  /**
   * Get embeddings for text chunks
   * @param textChunks Array of text chunks to embed
   * @returns Promise resolving to array of embedding vectors
   */
  async getChunkedEmbeddings(textChunks: string[]): Promise<number[][]> {
    return this.getBatchEmbeddings(textChunks);
  }

}
