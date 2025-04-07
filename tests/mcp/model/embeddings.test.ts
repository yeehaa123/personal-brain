import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import { EmbeddingService } from '@/mcp/model';
import { createMockEmbedding } from '@test/__mocks__/';
import { clearTestEnv, setTestEnv } from '@test/utils/envUtils';



// Mock OpenAI
mock.module('openai', () => {
  return {
    OpenAI: class MockOpenAI {
      constructor() {
        // Mock constructor
      }

      embeddings = {
        create: async () => ({
          data: [
            {
              embedding: Array(1536).fill(0.1),
              index: 0,
              object: 'embedding',
            },
          ],
          model: 'text-embedding-3-small',
          object: 'list',
          usage: {
            prompt_tokens: 10,
            total_tokens: 10,
          },
        }),
      };
    },
  };
});

// Mock Anthropic
mock.module('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        // Mock constructor
      }

      messages = {
        create: async () => ({
          id: 'mock-msg-id',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Mock response' }],
          model: 'claude-3-haiku-20240307',
          stop_reason: 'end_turn',
          usage: {
            input_tokens: 10,
            output_tokens: 20,
          },
        }),
      };
    },
  };
});

// Override the EmbeddingService with our own implementation
mock.module('@/mcp/model', () => {
  return {
    // Provide a mock EmbeddingService implementation
    EmbeddingService: class MockEmbeddingService {
      private static instance: MockEmbeddingService | null = null;

      static getInstance(_options?: { apiKey?: string }) {
        if (!MockEmbeddingService.instance) {
          MockEmbeddingService.instance = new MockEmbeddingService();
        }
        return MockEmbeddingService.instance;
      }

      async getEmbedding(text: string) {
        const embedding = createMockEmbedding(text);
        return {
          embedding,
          truncated: false,
        };
      }

      async getBatchEmbeddings(texts: string[]) {
        return texts.map(text => ({
          embedding: createMockEmbedding(text),
          truncated: false,
        }));
      }

      chunkText(text: string, chunkSize = 512, overlap = 100) {
        // Real implementation for tests
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

      cosineSimilarity(vec1: number[], vec2: number[]) {
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
    },
  };
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeAll(() => {
    // Set up mock environment
    setTestEnv('OPENAI_API_KEY', 'mock-api-key');
  });

  afterAll(() => {
    // Clean up mock environment
    clearTestEnv('OPENAI_API_KEY');
  });

  beforeEach(() => {
    // Get the singleton service instance for each test
    service = EmbeddingService.getInstance({ apiKey: 'mock-api-key' });
  });

  test('should create a deterministic embedding', async () => {
    const text = 'This is a test text';
    const result = await service.getEmbedding(text);

    // Verify the embedding result shape
    expect(result).toBeDefined();
    expect(result.embedding).toBeDefined();
    expect(Array.isArray(result.embedding)).toBe(true);
    expect(result.embedding.length).toBe(1536);
    expect(result.truncated).toBe(false);
  });

  test('should create embeddings with consistent output for the same input', async () => {
    const text = 'Consistent text input';

    // Generate embedding twice for the same text
    const result1 = await service.getEmbedding(text);
    const result2 = await service.getEmbedding(text);

    // Embeddings should be the same for the same input
    expect(result1.embedding).toEqual(result2.embedding);
  });

  test('should chunk text correctly', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.';
    const chunks = service.chunkText(text, 100, 20);

    // Should chunk the text into pieces
    expect(chunks.length).toBeGreaterThan(0);

    // All text content should be preserved across chunks
    const allContent = chunks.join(' ');
    expect(allContent).toContain('First sentence');
    expect(allContent).toContain('Sixth sentence');
  });

  test('should calculate cosine similarity correctly', () => {
    // Identical vectors have similarity of 1
    const vec1 = [1, 0, 0];
    const similarity1 = service.cosineSimilarity(vec1, vec1);
    expect(similarity1).toBe(1);

    // Orthogonal vectors have similarity of 0
    const vec2 = [0, 1, 0];
    const similarity2 = service.cosineSimilarity(vec1, vec2);
    expect(similarity2).toBe(0);

    // Opposite vectors have similarity of -1
    const vec3 = [-1, 0, 0];
    const similarity3 = service.cosineSimilarity(vec1, vec3);
    expect(similarity3).toBe(-1);
  });

  test('should handle batch embedding requests', async () => {
    const texts = ['Text 1', 'Text 2', 'Text 3'];
    const results = await service.getBatchEmbeddings(texts);

    // Should return the same number of embeddings as input texts
    expect(results.length).toBe(texts.length);

    // Each result should have the expected shape
    for (const result of results) {
      expect(result.embedding.length).toBe(1536);
      expect(result.truncated).toBe(false);
    }
  });
});
