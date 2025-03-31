import { cosineSimilarity, normalizeVector } from '../../utils/vectorUtils';
import { prepareText, chunkText } from '../../utils/textUtils';
import logger from '../../utils/logger';

export interface EmbeddingResult {
  embedding: number[];
  truncated: boolean;
}

export interface EmbeddingConfig {
  apiKey?: string;
  embeddingModel?: string;
  embeddingDimension?: number;
}

export class EmbeddingService {
  private apiKey: string;
  private embeddingModel: string;
  private embeddingDimension: number;

  constructor(config?: EmbeddingConfig) {
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.embeddingModel = config?.embeddingModel || 'text-embedding-3-small';
    this.embeddingDimension = config?.embeddingDimension || 1536;
    
    logger.info(`Embedding service initialized (API key available: ${Boolean(this.apiKey)})`);
    
    if (this.apiKey) {
      logger.info(`Using OpenAI model: ${this.embeddingModel}`);
    } else {
      logger.warn('No API key available, will use fallback embeddings');
    }
  }

  /**
   * Generate AI embeddings for text content using OpenAI's embedding API
   * @param text The text to generate embeddings for
   * @returns A vector representation of the text
   */
  async getEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      logger.debug('No API key available, using fallback embeddings');
      return this.getFallbackEmbedding(text);
    }

    const preparedText = this.prepareText(text);
    
    try {
      logger.debug('Generating embedding via OpenAI API');
      const result = await this.callOpenAIEmbeddingAPI(preparedText);
      return result;
    } catch (error) {
      logger.error('Error using OpenAI API, using fallback embedding:', error);
      return this.getFallbackEmbedding(text);
    }
  }
  
  /**
   * Makes the actual API call to OpenAI for embeddings
   * @param text Prepared text to embed
   * @returns Embedding result
   */
  private async callOpenAIEmbeddingAPI(text: string): Promise<EmbeddingResult> {
    // Use standard OpenAI library
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.apiKey });
    
    const result = await client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    
    logger.debug(`Generated embedding with model: ${this.embeddingModel}`);
    
    return {
      embedding: result.data[0].embedding,
      truncated: false,
    };
  }
  
  /**
   * Create a simple hash from a string
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

  /**
   * Generate a fallback embedding when no API key is available
   * @param text The text to base the embedding on
   * @returns A consistent embedding based on text content
   */
  private getFallbackEmbedding(text: string): EmbeddingResult {
    logger.debug(`Generating fallback embedding for text (${text.length} chars)`);
    
    // Create a deterministic embedding based on text hash
    const hash = this.hashString(text);
    const embedding = Array(this.embeddingDimension).fill(0).map((_, i) => {
      const x = Math.sin(hash + i * 0.1) * 10000;
      return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
    });
    
    // Normalize to unit length as OpenAI embeddings are normalized
    const normalizedEmbedding = normalizeVector(embedding);
    
    return {
      embedding: normalizedEmbedding,
      truncated: false,
    };
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts An array of texts to generate embeddings for
   * @returns An array of vector representations
   */
  async getBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.apiKey) {
      logger.warn('No API key available, using fallback batch embeddings');
      return Promise.all(texts.map(text => this.getFallbackEmbedding(text)));
    }

    logger.info(`Generating embeddings for ${texts.length} texts using OpenAI API`);
    
    try {
      // Prepare the texts
      const preparedTexts = texts.map(text => this.prepareText(text));
      return await this.callOpenAIBatchEmbeddingAPI(preparedTexts);
    } catch (batchError) {
      logger.error('Error using batch embedding API, falling back to individual processing:', batchError);
      return this.processEmbeddingsInSmallBatches(texts);
    }
  }

  /**
   * Makes the actual API call to OpenAI for batch embeddings
   * @param texts Array of prepared texts to embed
   * @returns Array of embedding results
   */
  private async callOpenAIBatchEmbeddingAPI(texts: string[]): Promise<EmbeddingResult[]> {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.apiKey });
    
    // Use the batch endpoint
    const result = await client.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });
    
    logger.debug(`Generated ${result.data.length} embeddings`);
    
    // Convert to our internal format
    return result.data.map((item) => ({
      embedding: item.embedding,
      truncated: false,
    }));
  }

  /**
   * Process embeddings in smaller batches when the main batch API fails
   * @param texts The texts to process
   * @returns Array of embedding results
   */
  private async processEmbeddingsInSmallBatches(texts: string[]): Promise<EmbeddingResult[]> {
    const batchSize = 10;
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
   * Prepare text for embedding by cleaning and normalizing
   * @param text Text to prepare
   * @returns Cleaned text
   */
  private prepareText(text: string): string {
    return prepareText(text);
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
   * Chunk a long text into smaller pieces
   * @param text The text to chunk
   * @param chunkSize The approximate size of each chunk
   * @param overlap The number of characters to overlap between chunks
   * @returns An array of text chunks
   */
  chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
    return chunkText(text, chunkSize, overlap);
  }
}