/**
 * Embedding service for generating vector representations of text
 * Uses the Vercel AI SDK for embedding generation
 */

import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embed, embedMany } from 'ai';

import { aiConfig, textConfig } from '@/config';
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
 */
export class EmbeddingService {
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
   * @param text The text to embed
   * @returns A promise resolving to the embedding result
   */
  async getEmbedding(text: string): Promise<EmbeddingResult> {
    // Handle invalid input
    if (!isDefined(text)) {
      this.logger.warn('Received undefined or null text in getEmbedding');
      return {
        embedding: Array(this.embeddingDimension).fill(0),
        truncated: false,
      };
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

      return {
        embedding: response.embedding,
        truncated: false,
      };
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
      return {
        embedding: Array(this.embeddingDimension).fill(0),
        truncated: false,
      };
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts An array of texts to generate embeddings for
   * @param options Optional batch processing options
   * @returns A promise resolving to an array of embedding results
   */
  async getBatchEmbeddings(
    texts: string[],
    options?: BatchProcessingOptions,
  ): Promise<EmbeddingResult[]> {
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

      return response.embeddings.map(embedding => ({
        embedding,
        truncated: false,
      }));
    } catch (error) {
      // If batch processing fails, try individual processing
      this.logger.error(`Error using batch embedding API, falling back to individual processing: ${error instanceof Error ? error.message : String(error)}`);

      try {
        return await this.processEmbeddingsInSmallBatches(texts, options);
      } catch (processingError) {
        this.logger.error(`Individual processing also failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`);

        // Return empty embeddings as a last resort
        return texts.map(() => ({
          embedding: Array(this.embeddingDimension).fill(0),
          truncated: false,
        }));
      }
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (-1 to 1)
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    // Handle null/undefined vectors
    if (!isDefined(vec1) || !isDefined(vec2)) {
      this.logger.warn('Received undefined or null vector in cosineSimilarity');
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
   * Process a list of embeddings for text chunks and combine them
   * @param textChunks Array of text chunks to embed
   * @returns Promise resolving to array of embedding results
   */
  async getChunkedEmbeddings(textChunks: string[]): Promise<EmbeddingResult[]> {
    return this.getBatchEmbeddings(textChunks);
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
          batch.map(text => this.getEmbedding(text)),
        );

        results.push(...batchResults);
      } catch (error) {
        // If parallel processing fails, try sequential as a last resort
        this.logger.warn(`Parallel batch processing failed, falling back to sequential processing: ${error instanceof Error ? error.message : String(error)}`);

        for (const text of batch) {
          try {
            const result = await this.getEmbedding(text);
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
