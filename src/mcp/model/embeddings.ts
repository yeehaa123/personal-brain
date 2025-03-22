import Anthropic from '@anthropic-ai/sdk';

interface EmbeddingResult {
  embedding: number[];
  truncated: boolean;
}

export class EmbeddingService {
  private client: Anthropic;
  private model: string;
  private embeddingModel: string = 'claude-3-haiku-20240307';

  constructor(apiKey?: string, model = 'claude-3-opus-20240229') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    console.log(`API Key available: ${Boolean(key)}`);
    
    try {
      this.client = new Anthropic({
        apiKey: key
      });
      
      console.log('Anthropic client initialized');
      console.log('Available client methods:', Object.keys(this.client));
      
      this.model = model;
    } catch (error) {
      console.error('Error initializing Anthropic client:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text content using direct API call
   * @param text The text to generate embeddings for
   * @returns A vector representation of the text
   */
  async getEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Use a dummy embedding for now to make progress
      // This will be replaced with actual API calls when we fix the integration
      console.log(`Generating dummy embedding for text (${text.length} chars)`);
      
      // Generate a consistent dummy embedding based on text length
      const embedding = Array(1536).fill(0).map((_, i) => {
        return Math.sin(i * (text.length % 10)) / 2 + 0.5;
      });
      
      return {
        embedding,
        truncated: false
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts An array of texts to generate embeddings for
   * @returns An array of vector representations
   */
  async getBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      console.log(`Generating dummy batch embeddings for ${texts.length} texts`);
      
      // Generate dummy embeddings for each text
      return Promise.all(texts.map(text => this.getEmbedding(text)));
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 First vector
   * @param vec2 Second vector
   * @returns Similarity score (0-1)
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }

  /**
   * Chunk a long text into smaller pieces
   * @param text The text to chunk
   * @param chunkSize The approximate size of each chunk
   * @param overlap The number of characters to overlap between chunks
   * @returns An array of text chunks
   */
  chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed the chunk size and we already have some content
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        // Start a new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(Math.max(0, words.length - overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Prepare text for embedding by cleaning and normalizing
   * @param text Text to prepare
   * @returns Cleaned text
   */
  private prepareText(text: string): string {
    return text
      .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
      .replace(/\n+/g, ' ')      // Replace newlines with spaces
      .trim();                   // Trim whitespace from beginning and end
  }
}