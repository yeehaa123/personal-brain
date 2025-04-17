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
 * Result of generating an embedding
 */
export interface EmbeddingResult {
  /** The vector representation of the text */
  embedding: number[];
  /** Whether the input was truncated before embedding */
  truncated: boolean;
}

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
 * Options for batch processing embeddings
 */
export interface BatchProcessingOptions {
  /** Size of each batch when processing large requests */
  batchSize?: number;
  /** Whether to run requests in parallel */
  parallel?: boolean;
}

/**
 * Service for generating and working with text embeddings
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * 
 * Implements the EmbeddingModelAdapter interface for consistent integration.
 */
export class EmbeddingService implements EmbeddingModelAdapter<EmbeddingConfig> {
  /** Configuration values */
  private readonly apiKey: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimension: number;
  private readonly batchSize: number;

  /** Logger instance for this class */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });

  /** Singleton instance */
  private static instance: EmbeddingService | null = null;

  /**
   * Get the singleton instance of EmbeddingService
   * 
   * @param config Optional configuration to override defaults
   * @returns The shared EmbeddingService instance
   */
  public static getInstance(config?: EmbeddingConfig): EmbeddingService {
    // Use a static logger for static methods
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });

    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(config);
      logger.info(`Embedding service initialized (API key available: ${Boolean(EmbeddingService.instance.apiKey)})`);
      logger.info(`Using OpenAI model: ${EmbeddingService.instance.embeddingModel}`);
    } else if (config) {
      // Log a warning if trying to get instance with different config
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
    }
    return EmbeddingService.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    // Use a static logger for static methods
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });

    // No special cleanup needed for this service
    EmbeddingService.instance = null;
    logger.debug('EmbeddingService singleton instance reset');
  }

  /**
   * Create a fresh service instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param config Optional configuration to override defaults
   * @returns A new EmbeddingService instance
   */
  public static createFresh(config?: EmbeddingConfig): EmbeddingService {
    // Use a static logger for static methods
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh EmbeddingService instance');

    return new EmbeddingService(config);
  }

  /**
   * Create a new embedding service
   * 
   * @param config Optional configuration to override defaults
   * @private Use getInstance() or createFresh() instead of constructor directly
   */
  private constructor(config?: EmbeddingConfig) {
    this.apiKey = config?.apiKey || aiConfig.openAI.apiKey;
    this.embeddingModel = config?.embeddingModel || aiConfig.openAI.embeddingModel;
    this.embeddingDimension = config?.embeddingDimension || aiConfig.openAI.embeddingDimension;
    this.batchSize = aiConfig.openAI.batchSize;
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
   * Get the full embedding result with metadata
   * This method is kept for backward compatibility
   * 
   * @param text The text to embed
   * @returns A promise resolving to the embedding result with metadata
   */
  async getEmbeddingWithMetadata(text: string): Promise<EmbeddingResult> {
    const embedding = await this.getEmbedding(text);
    return {
      embedding,
      truncated: false,
    };
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
        const results = await this.processEmbeddingsInSmallBatches(texts);
        return results.map(result => result.embedding);
      } catch (processingError) {
        this.logger.error(`Individual processing also failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`);

        // Return empty embeddings as a last resort
        return texts.map(() => Array(this.embeddingDimension).fill(0));
      }
    }
  }

  /**
   * Get batch embeddings with metadata
   * This method is kept for backward compatibility
   * 
   * @param texts Array of texts to embed
   * @param options Optional batch processing options
   * @returns Promise resolving to array of embedding results with metadata
   */
  async getBatchEmbeddingsWithMetadata(
    texts: string[],
    options?: BatchProcessingOptions,
  ): Promise<EmbeddingResult[]> {
    try {
      const embeddings = await this.getBatchEmbeddings(texts);
      return embeddings.map(embedding => ({
        embedding,
        truncated: false,
      }));
    } catch (_error) {
      // If the new method fails, try the old implementation
      return this.processEmbeddingsInSmallBatches(texts, options);
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
   * Backward compatibility method for cosineSimilarity
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    return this.calculateSimilarity(vec1, vec2);
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
   * Process a list of embeddings for text chunks and combine them
   * @param textChunks Array of text chunks to embed
   * @returns Promise resolving to array of embedding results
   */
  async getChunkedEmbeddings(textChunks: string[]): Promise<EmbeddingResult[]> {
    const embeddings = await this.getBatchEmbeddings(textChunks);
    return embeddings.map(embedding => ({
      embedding,
      truncated: false,
    }));
  }

  /**
   * Process embeddings in smaller batches when the main batch API fails
   * @param texts The texts to process
   * @param options Optional batch processing options
   * @returns Promise resolving to array of embedding results
   */
  private async processEmbeddingsInSmallBatches(
    texts: string[],
    options?: BatchProcessingOptions,
  ): Promise<EmbeddingResult[]> {
    // Handle empty input
    if (!isDefined(texts) || texts.length === 0) {
      return [];
    }

    // Set batch size with safe defaults
    const batchSize = isDefined(options?.batchSize) ? options.batchSize : this.batchSize;
    const safeBatchSize = Math.max(1, batchSize); // Ensure batch size is at least 1

    const results: EmbeddingResult[] = [];
    const totalBatches = Math.ceil(texts.length / safeBatchSize);

    for (let i = 0; i < texts.length; i += safeBatchSize) {
      const batchNumber = Math.floor(i / safeBatchSize) + 1;
      this.logger.debug(`Processing batch ${batchNumber} of ${totalBatches}`);

      // Safely slice the array to get current batch
      const batch = texts.slice(i, i + safeBatchSize);

      try {
        // Process each text in the batch in parallel
        const batchResults = await Promise.all(
          batch.map(text => this.getEmbeddingWithMetadata(text)),
        );

        results.push(...batchResults);
      } catch (error) {
        // If parallel processing fails, try sequential as a last resort
        this.logger.warn(`Parallel batch processing failed, falling back to sequential processing: ${error instanceof Error ? error.message : String(error)}`);

        for (const text of batch) {
          try {
            const result = await this.getEmbeddingWithMetadata(text);
            results.push(result);
          } catch (singleError) {
            // If even sequential processing fails for this item, log and add a placeholder
            this.logger.error(`Failed to generate embedding: ${singleError instanceof Error ? singleError.message : String(singleError)}`);

            // Add a placeholder embedding to maintain position in results array
            results.push({
              embedding: Array(this.embeddingDimension).fill(0),
              truncated: false,
            });
          }
        }
      }
    }

    return results;
  }
}
