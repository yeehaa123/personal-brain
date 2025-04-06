/**
 * Embedding service for generating vector representations of text
 * Provides both OpenAI API-based embeddings and fallback local embeddings
 */

import type { OpenAI } from 'openai';

import { aiConfig, textConfig } from '@/config';
import { ApiError, ValidationError } from '@/utils/errorUtils';
import logger from '@/utils/logger';
import { isDefined, safeArrayAccess } from '@/utils/safeAccessUtils';
import { chunkText, prepareText } from '@/utils/textUtils';
import { cosineSimilarity, normalizeVector } from '@/utils/vectorUtils';




// Type definitions for OpenAI API responses with safer runtime validation
interface OpenAIEmbeddingData {
  embedding: number[];
  index: number;
  object: string;
}

interface OpenAIEmbeddingResponse {
  data: OpenAIEmbeddingData[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// We'll keep this comment for documentation but remove the unused function
// /**
//  * Type guard to check if a value is an OpenAI embedding data object
//  * @param value The value to check
//  * @returns True if the value is a valid OpenAIEmbeddingData
//  */
// function isOpenAIEmbeddingData(value: unknown): value is OpenAIEmbeddingData {
//   if (!value || typeof value !== 'object') {
//     return false;
//   }
//   
//   // Check for required properties and their types
//   return (
//     hasProperty(value, 'embedding') && 
//     Array.isArray(value.embedding) && 
//     value.embedding.every(val => typeof val === 'number') &&
//     hasProperty(value, 'index') && 
//     typeof value.index === 'number' &&
//     hasStringProperty(value, 'object')
//   );
// }

/**
 * Validates that an API response has the expected structure of an embedding response
 * @param response The response to validate
 * @returns The validated response, or throws an ApiError if invalid
 */
function validateEmbeddingResponse(response: unknown): OpenAIEmbeddingResponse {
  if (!response || typeof response !== 'object') {
    throw new ValidationError('Invalid embedding response: response is not an object', 
      { responseType: typeof response });
  }
  
  // Check required properties exist
  const typedResponse = response as Record<string, unknown>;
  
  // Validate data array
  if (!Array.isArray(typedResponse['data'])) {
    throw new ValidationError('Invalid embedding response: data property missing or not an array', 
      { foundType: typeof typedResponse['data'] });
  }
  
  // Validate model field
  if (typeof typedResponse['model'] !== 'string') {
    throw new ValidationError('Invalid embedding response: model property missing or not a string', 
      { foundType: typeof typedResponse['model'] });
  }
  
  // Validate object field
  if (typeof typedResponse['object'] !== 'string') {
    throw new ValidationError('Invalid embedding response: object property missing or not a string', 
      { foundType: typeof typedResponse['object'] });
  }
  
  // Validate usage object
  if (!typedResponse['usage'] || typeof typedResponse['usage'] !== 'object') {
    throw new ValidationError('Invalid embedding response: usage property missing or not an object', 
      { foundType: typeof typedResponse['usage'] });
  }
  
  // For each data item, validate it has an embedding that's an array of numbers
  for (let i = 0; i < typedResponse['data'].length; i++) {
    // Directly access the array element since we've already validated data is an array
    const dataArray = typedResponse['data'] as Array<Record<string, unknown>>;
    const item = dataArray[i] || {};
    
    if (!Array.isArray(item['embedding'])) {
      throw new ValidationError(`Invalid embedding response: item ${i} missing embedding array`, 
        { itemIndex: i, foundType: typeof item['embedding'] });
    }
    
    // Check if all embedding values are numbers
    const embeddingArray = item['embedding'] as unknown[];
    if (embeddingArray.some(val => typeof val !== 'number')) {
      throw new ValidationError(`Invalid embedding response: item ${i} has non-numeric values in embedding`, 
        { itemIndex: i });
    }
  }
  
  // If we got here, basic validation passed
  return response as OpenAIEmbeddingResponse;
}

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
 * OpenAI API embedding creation parameters
 */
interface OpenAIEmbeddingParams {
  model: string;
  input: string | string[];
}

/**
 * Service for generating and working with text embeddings
 */
export class EmbeddingService {
  private readonly apiKey: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimension: number;
  private readonly batchSize: number;
  
  // Singleton instance
  private static instance: EmbeddingService | null = null;
  
  /**
   * Get the singleton instance of EmbeddingService
   * @param config Optional configuration to override defaults
   * @returns The singleton EmbeddingService instance
   */
  public static getInstance(config?: EmbeddingConfig): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(config);
      logger.info(`Embedding service initialized (API key available: ${Boolean(EmbeddingService.instance.apiKey)})`);
      
      if (EmbeddingService.instance.apiKey) {
        logger.info(`Using OpenAI model: ${EmbeddingService.instance.embeddingModel}`);
      } else {
        logger.warn('No API key available, will use fallback embeddings');
      }
    }
    return EmbeddingService.instance;
  }

  /**
   * Create a new embedding service
   * @param config Optional configuration to override defaults
   * @private Use getInstance() instead of constructor directly
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
      logger.warn('Received undefined or null text in getEmbedding');
      return {
        embedding: Array(this.embeddingDimension).fill(0),
        truncated: false,
      };
    }
    
    // Check for API key
    if (!isDefined(this.apiKey)) {
      logger.debug('No API key available, using fallback embeddings');
      return this.generateFallbackEmbedding(text);
    }

    // Prepare the text for embedding
    const preparedText = prepareText(text);
    
    try {
      logger.debug('Generating embedding via OpenAI API');
      return await this.callOpenAIEmbeddingAPI(preparedText);
    } catch (error) {
      // Log detailed error information
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error);
        
      logger.error(`Error using OpenAI API, using fallback embedding: ${errorMessage}`);
      
      // Provide additional context if it's an API error
      if (error instanceof ApiError) {
        logger.debug(`API Error details: ${error.toLogString()}`);
      }
      
      return this.generateFallbackEmbedding(text);
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
      logger.warn('Received undefined or null texts array in getBatchEmbeddings');
      return [];
    }
    
    if (texts.length === 0) {
      logger.debug('Received empty texts array in getBatchEmbeddings');
      return [];
    }
    
    // Check for API key availability
    if (!isDefined(this.apiKey)) {
      logger.warn('No API key available, using fallback batch embeddings');
      return this.generateFallbackBatchEmbeddings(texts);
    }

    logger.info(`Generating embeddings for ${texts.length} texts using OpenAI API`);
    
    try {
      // Prepare the texts and filter out any null/undefined/empty values
      const preparedTexts = texts
        .filter(isDefined)
        .map(text => prepareText(text));
      
      // If all texts were invalid and we have no prepared texts, return empty result
      if (preparedTexts.length === 0) {
        logger.warn('No valid texts remained after filtering in getBatchEmbeddings');
        return [];
      }
      
      // Try batch API first
      return await this.callOpenAIBatchEmbeddingAPI(preparedTexts);
    } catch (batchError) {
      // Log detailed error information
      const errorMessage = batchError instanceof Error 
        ? batchError.message 
        : String(batchError);
        
      logger.error(`Error using batch embedding API, falling back to individual processing: ${errorMessage}`);
      
      // Try processing in smaller batches
      try {
        return await this.processEmbeddingsInSmallBatches(texts, options);
      } catch (smallBatchError) {
        // If even small batches fail, log and use fallback
        logger.error(`Small batch processing also failed, using fallback embeddings: ${smallBatchError instanceof Error ? smallBatchError.message : String(smallBatchError)}`);
        return this.generateFallbackBatchEmbeddings(texts);
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
      logger.warn('Received undefined or null vector in cosineSimilarity');
      return 0;
    }
    
    try {
      return cosineSimilarity(vec1, vec2);
    } catch (error) {
      // Handle errors gracefully (e.g., different vector dimensions)
      logger.error(`Error calculating cosine similarity: ${error instanceof Error ? error.message : String(error)}`);
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
   * Create an OpenAI client instance
   * @returns Promise resolving to an OpenAI client
   */
  private async createOpenAIClient(): Promise<OpenAI> {
    const { OpenAI } = await import('openai');
    return new OpenAI({ apiKey: this.apiKey });
  }

  /**
   * Makes the API call to OpenAI for a single embedding
   * @param text Prepared text to embed
   * @returns Promise resolving to the embedding result
   * @throws ApiError When API call fails
   * @throws ValidationError When response validation fails
   */
  private async callOpenAIEmbeddingAPI(text: string): Promise<EmbeddingResult> {
    try {
      const client = await this.createOpenAIClient();
      
      const params: OpenAIEmbeddingParams = {
        model: this.embeddingModel,
        input: text,
      };
      
      // Get the raw response
      const rawResponse = await client.embeddings.create(params)
        .catch(err => {
          throw new ApiError(
            `OpenAI embedding API request failed: ${err.message}`, 
            err.status || 500, 
            { model: this.embeddingModel, textLength: text.length },
          );
        });
      
      // Validate the response
      const validatedResponse = validateEmbeddingResponse(rawResponse);
      
      logger.debug(`Generated embedding with model: ${this.embeddingModel}`);
      
      // Ensure safe array access with a fallback
      // Create a proper fallback with all required properties
      const fallbackData: OpenAIEmbeddingData = { 
        embedding: [], 
        index: 0, 
        object: 'embedding', 
      };
      
      const firstData = safeArrayAccess(validatedResponse.data, 0, fallbackData);
      
      return {
        embedding: firstData.embedding,
        truncated: false,
      };
    } catch (error) {
      // Rethrow ValidationErrors (already formatted properly)
      if (error instanceof ValidationError) {
        logger.error(`OpenAI embedding response validation error: ${error.toLogString()}`);
        throw error;
      }
      
      // Rethrow ApiErrors (already formatted properly)
      if (error instanceof ApiError) {
        logger.error(`OpenAI API error: ${error.toLogString()}`);
        throw error;
      }
      
      // For other errors, wrap in ApiError
      const apiError = new ApiError(
        `Unexpected error during embedding generation: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { model: this.embeddingModel },
      );
      logger.error(apiError.toLogString());
      throw apiError;
    }
  }

  /**
   * Makes the API call to OpenAI for batch embeddings
   * @param texts Array of prepared texts to embed
   * @returns Promise resolving to array of embedding results
   * @throws ApiError When API call fails
   * @throws ValidationError When response validation fails
   */
  private async callOpenAIBatchEmbeddingAPI(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const client = await this.createOpenAIClient();
      
      const params: OpenAIEmbeddingParams = {
        model: this.embeddingModel,
        input: texts,
      };
      
      // Get the raw response
      const rawResponse = await client.embeddings.create(params)
        .catch(err => {
          throw new ApiError(
            `OpenAI batch embedding API request failed: ${err.message}`, 
            err.status || 500, 
            { 
              model: this.embeddingModel, 
              batchSize: texts.length,
              totalTextLength: texts.reduce((sum, text) => sum + text.length, 0),
            },
          );
        });
      
      // Validate the response
      const validatedResponse = validateEmbeddingResponse(rawResponse);
      
      logger.debug(`Generated ${validatedResponse.data.length} embeddings in batch`);
      
      return this.convertOpenAIResponseToResults(validatedResponse);
    } catch (error) {
      // Rethrow ValidationErrors (already formatted properly)
      if (error instanceof ValidationError) {
        logger.error(`OpenAI batch embedding response validation error: ${error.toLogString()}`);
        throw error;
      }
      
      // Rethrow ApiErrors (already formatted properly)
      if (error instanceof ApiError) {
        logger.error(`OpenAI batch embedding API error: ${error.toLogString()}`);
        throw error;
      }
      
      // For other errors, wrap in ApiError
      const apiError = new ApiError(
        `Unexpected error during batch embedding generation: ${error instanceof Error ? error.message : String(error)}`,
        500,
        { 
          model: this.embeddingModel,
          batchSize: texts.length,
        },
      );
      logger.error(apiError.toLogString());
      throw apiError;
    }
  }

  /**
   * Convert OpenAI API response to our internal EmbeddingResult format
   * @param response The response from OpenAI API
   * @returns Array of embedding results
   */
  private convertOpenAIResponseToResults(response: OpenAIEmbeddingResponse): EmbeddingResult[] {
    if (!isDefined(response) || !isDefined(response.data)) {
      logger.warn('Empty or undefined response in convertOpenAIResponseToResults');
      return [];
    }
    
    return response.data.map((item) => {
      // Ensure embedding is always defined
      const embedding = isDefined(item) && isDefined(item.embedding) ? item.embedding : [];
      
      return {
        embedding,
        truncated: false,
      };
    });
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
      const batchNumber = Math.floor(i/safeBatchSize) + 1;
      logger.debug(`Processing batch ${batchNumber} of ${totalBatches}`);
      
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
        logger.warn(`Parallel batch processing failed, falling back to sequential processing: ${error instanceof Error ? error.message : String(error)}`);
        
        for (const text of batch) {
          try {
            const result = await this.getEmbedding(text);
            results.push(result);
          } catch (singleError) {
            // If even sequential processing fails for this item, log and add a placeholder
            logger.error(`Failed to generate embedding: ${singleError instanceof Error ? singleError.message : String(singleError)}`);
            
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

  /**
   * Generate a single fallback embedding when API isn't available
   * @param text The text to base the embedding on
   * @returns A deterministic embedding based on text content
   */
  private generateFallbackEmbedding(text: string): EmbeddingResult {
    // Handle null/undefined text
    const safeText = isDefined(text) ? text : '';
    
    logger.debug(`Generating fallback embedding for text (${safeText.length} chars)`);
    
    try {
      // Create a deterministic embedding based on text hash
      const hash = this.hashString(safeText);
      const embedding = this.createDeterministicVector(hash);
      
      // Normalize to unit length as OpenAI embeddings are normalized
      const normalizedEmbedding = normalizeVector(embedding);
      
      return {
        embedding: normalizedEmbedding,
        truncated: false,
      };
    } catch (error) {
      // Handle any errors in the fallback process
      logger.error(`Error generating fallback embedding: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return a zero vector as a last resort
      return {
        embedding: Array(this.embeddingDimension).fill(0),
        truncated: false,
      };
    }
  }

  /**
   * Generate fallback embeddings for a batch of texts
   * @param texts Array of texts to embed
   * @returns Promise resolving to array of embedding results
   */
  private async generateFallbackBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    // Handle null/undefined texts array
    if (!isDefined(texts)) {
      logger.warn('Received undefined or null texts array in generateFallbackBatchEmbeddings');
      return [];
    }
    
    // Filter out any null/undefined array items
    const safeTexts = texts.filter(isDefined);
    
    try {
      // Generate embeddings in parallel
      return await Promise.all(safeTexts.map(text => this.generateFallbackEmbedding(text)));
    } catch (error) {
      // Handle any errors in parallel processing
      logger.error(`Error in fallback batch processing: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fall back to sequential processing
      const results: EmbeddingResult[] = [];
      
      for (const text of safeTexts) {
        try {
          results.push(this.generateFallbackEmbedding(text));
        } catch (singleError) {
          // Add a zero vector for failed items
          logger.debug(`Failed to generate fallback embedding for text: ${singleError instanceof Error ? singleError.message : String(singleError)}`);
          results.push({
            embedding: Array(this.embeddingDimension).fill(0),
            truncated: false,
          });
        }
      }
      
      return results;
    }
  }

  /**
   * Create a deterministic vector from a hash value
   * @param hash The hash value to base the vector on
   * @returns An array of numbers representing the vector
   */
  private createDeterministicVector(hash: number): number[] {
    // Ensure we have valid configuration values with safe defaults
    const fallbackSeed = isDefined(aiConfig.openAI.fallbackSeed) ? aiConfig.openAI.fallbackSeed : 42;
    const fallbackMultiplier = isDefined(aiConfig.openAI.fallbackMultiplier) ? aiConfig.openAI.fallbackMultiplier : 10000;
    const fallbackScaleFactor = isDefined(aiConfig.openAI.fallbackScaleFactor) ? aiConfig.openAI.fallbackScaleFactor : 2;
    const fallbackOffset = isDefined(aiConfig.openAI.fallbackOffset) ? aiConfig.openAI.fallbackOffset : 1;
    
    // Create an array of the correct dimension
    return Array(this.embeddingDimension).fill(0).map((_, i) => {
      // Deterministically generate vector components
      const x = Math.sin(hash + i * fallbackSeed) * fallbackMultiplier;
      return (x - Math.floor(x)) * fallbackScaleFactor - fallbackOffset;
    });
  }

  /**
   * Create a simple hash from a string
   * @param str The string to hash
   * @returns A numeric hash value
   */
  private hashString(str: string): number {
    // Handle null/undefined case
    const safeStr = isDefined(str) ? str : '';
    
    let hash = 0;
    // Implement a simple, deterministic hash function
    for (let i = 0; i < safeStr.length; i++) {
      // Safely access characters
      const char = safeStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}