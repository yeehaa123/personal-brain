/**
 * Embedding service for generating vector representations of text
 * Provides both OpenAI API-based embeddings and fallback local embeddings
 */
import { cosineSimilarity, normalizeVector } from '@/utils/vectorUtils';
import { prepareText, chunkText } from '@/utils/textUtils';
import logger from '@/utils/logger';
import { aiConfig, textConfig } from '@/config';
import type { OpenAI } from 'openai';

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

/**
 * Validates that an API response has the expected structure of an embedding response
 * @param response The response to validate
 * @returns The validated response, or throws an error if invalid
 */
function validateEmbeddingResponse(response: unknown): OpenAIEmbeddingResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid embedding response: response is not an object');
  }
  
  // Check required properties exist
  const typedResponse = response as Record<string, unknown>;
  
  if (!Array.isArray(typedResponse.data)) {
    throw new Error('Invalid embedding response: data property missing or not an array');
  }
  
  if (typeof typedResponse.model !== 'string') {
    throw new Error('Invalid embedding response: model property missing or not a string');
  }
  
  if (typeof typedResponse.object !== 'string') {
    throw new Error('Invalid embedding response: object property missing or not a string');
  }
  
  if (!typedResponse.usage || typeof typedResponse.usage !== 'object') {
    throw new Error('Invalid embedding response: usage property missing or not an object');
  }
  
  // For each data item, validate it has an embedding that's an array of numbers
  for (let i = 0; i < typedResponse.data.length; i++) {
    const item = typedResponse.data[i] as Record<string, unknown>;
    
    if (!Array.isArray(item.embedding)) {
      throw new Error(`Invalid embedding response: item ${i} missing embedding array`);
    }
    
    if (item.embedding.some(val => typeof val !== 'number')) {
      throw new Error(`Invalid embedding response: item ${i} has non-numeric values in embedding`);
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

  /**
   * Create a new embedding service
   * @param config Optional configuration to override defaults
   */
  constructor(config?: EmbeddingConfig) {
    this.apiKey = config?.apiKey || aiConfig.openAI.apiKey;
    this.embeddingModel = config?.embeddingModel || aiConfig.openAI.embeddingModel;
    this.embeddingDimension = config?.embeddingDimension || aiConfig.openAI.embeddingDimension;
    this.batchSize = aiConfig.openAI.batchSize;
    
    logger.info(`Embedding service initialized (API key available: ${Boolean(this.apiKey)})`);
    
    if (this.apiKey) {
      logger.info(`Using OpenAI model: ${this.embeddingModel}`);
    } else {
      logger.warn('No API key available, will use fallback embeddings');
    }
  }

  /**
   * Generate an embedding for a single text
   * @param text The text to embed
   * @returns A promise resolving to the embedding result
   */
  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      logger.debug('No API key available, using fallback embeddings');
      return this.generateFallbackEmbedding(text);
    }

    const preparedText = prepareText(text);
    
    try {
      logger.debug('Generating embedding via OpenAI API');
      return await this.callOpenAIEmbeddingAPI(preparedText);
    } catch (error) {
      logger.error(`Error using OpenAI API, using fallback embedding: ${error}`);
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
    // Handle empty input case
    if (texts.length === 0) {
      return [];
    }
    
    if (!this.apiKey) {
      logger.warn('No API key available, using fallback batch embeddings');
      return this.generateFallbackBatchEmbeddings(texts);
    }

    logger.info(`Generating embeddings for ${texts.length} texts using OpenAI API`);
    
    try {
      // Prepare the texts
      const preparedTexts = texts.map(prepareText);
      return await this.callOpenAIBatchEmbeddingAPI(preparedTexts);
    } catch (batchError) {
      logger.error(`Error using batch embedding API, falling back to individual processing: ${batchError}`);
      return this.processEmbeddingsInSmallBatches(texts, options);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (-1 to 1)
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    return cosineSimilarity(vec1, vec2);
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
   */
  private async callOpenAIEmbeddingAPI(text: string): Promise<EmbeddingResult> {
    const client = await this.createOpenAIClient();
    
    const params: OpenAIEmbeddingParams = {
      model: this.embeddingModel,
      input: text,
    };
    
    try {
      // Get the raw response and validate it
      const rawResponse = await client.embeddings.create(params);
      const validatedResponse = validateEmbeddingResponse(rawResponse);
      
      logger.debug(`Generated embedding with model: ${this.embeddingModel}`);
      
      return {
        embedding: validatedResponse.data[0].embedding,
        truncated: false,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid embedding response:')) {
        // For validation errors, add more context
        logger.error(`OpenAI embedding response validation error: ${error.message}`);
      } else {
        // For API errors
        logger.error(`OpenAI embedding API error: ${error}`);
      }
      throw error; // Let the caller handle this
    }
  }

  /**
   * Makes the API call to OpenAI for batch embeddings
   * @param texts Array of prepared texts to embed
   * @returns Promise resolving to array of embedding results
   */
  private async callOpenAIBatchEmbeddingAPI(texts: string[]): Promise<EmbeddingResult[]> {
    const client = await this.createOpenAIClient();
    
    const params: OpenAIEmbeddingParams = {
      model: this.embeddingModel,
      input: texts,
    };
    
    try {
      // Get the raw response and validate it
      const rawResponse = await client.embeddings.create(params);
      const validatedResponse = validateEmbeddingResponse(rawResponse);
      
      logger.debug(`Generated ${validatedResponse.data.length} embeddings in batch`);
      
      return this.convertOpenAIResponseToResults(validatedResponse);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid embedding response:')) {
        // For validation errors, add more context
        logger.error(`OpenAI batch embedding response validation error: ${error.message}`);
      } else {
        // For API errors
        logger.error(`OpenAI batch embedding API error: ${error}`);
      }
      throw error; // Let the caller handle this
    }
  }

  /**
   * Convert OpenAI API response to our internal EmbeddingResult format
   * @param response The response from OpenAI API
   * @returns Array of embedding results
   */
  private convertOpenAIResponseToResults(response: OpenAIEmbeddingResponse): EmbeddingResult[] {
    return response.data.map((item) => ({
      embedding: item.embedding,
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
    const batchSize = options?.batchSize || this.batchSize;
    const results: EmbeddingResult[] = [];
    const totalBatches = Math.ceil(texts.length / batchSize);
    
    for (let i = 0; i < texts.length; i += batchSize) {
      logger.debug(`Processing batch ${Math.floor(i/batchSize) + 1} of ${totalBatches}`);
      const batch = texts.slice(i, i + batchSize);
      
      // Process each text in the batch in parallel
      const batchResults = await Promise.all(
        batch.map(text => this.getEmbedding(text)),
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Generate a single fallback embedding when API isn't available
   * @param text The text to base the embedding on
   * @returns A deterministic embedding based on text content
   */
  private generateFallbackEmbedding(text: string): EmbeddingResult {
    logger.debug(`Generating fallback embedding for text (${text.length} chars)`);
    
    // Create a deterministic embedding based on text hash
    const hash = this.hashString(text);
    const embedding = this.createDeterministicVector(hash);
    
    // Normalize to unit length as OpenAI embeddings are normalized
    const normalizedEmbedding = normalizeVector(embedding);
    
    return {
      embedding: normalizedEmbedding,
      truncated: false,
    };
  }

  /**
   * Generate fallback embeddings for a batch of texts
   * @param texts Array of texts to embed
   * @returns Promise resolving to array of embedding results
   */
  private async generateFallbackBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map(text => this.generateFallbackEmbedding(text)));
  }

  /**
   * Create a deterministic vector from a hash value
   * @param hash The hash value to base the vector on
   * @returns An array of numbers representing the vector
   */
  private createDeterministicVector(hash: number): number[] {
    return Array(this.embeddingDimension).fill(0).map((_, i) => {
      const x = Math.sin(hash + i * aiConfig.openAI.fallbackSeed) * aiConfig.openAI.fallbackMultiplier;
      return (x - Math.floor(x)) * aiConfig.openAI.fallbackScaleFactor - aiConfig.openAI.fallbackOffset;
    });
  }

  /**
   * Create a simple hash from a string
   * @param str The string to hash
   * @returns A numeric hash value
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}