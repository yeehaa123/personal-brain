import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import { EmbeddingService } from '@/resources/ai/embedding';

// Helper function to create deterministic embeddings for testing
function createDeterministicEmbedding(text: string, dimensions: number = 1536): number[] {
  // Simple hash function
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  // Create a deterministic embedding based on the hash
  const seed = hashString(text);
  const embedding = Array(dimensions).fill(0).map((_, i) => {
    const x = Math.sin(seed + i * 0.1) * 10000;
    return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
  });

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Mock the OpenAI SDK dependency
mock.module('@ai-sdk/openai', () => {
  return {
    openai: {
      embedding: (model: string) => ({
        id: model,
        provider: 'openai',
      }),
    },
  };
});

// Mock Vercel AI SDK with direct implementations
mock.module('ai', () => {
  return {
    cosineSimilarity: (_vec1: number[], _vec2: number[]) => {
      return 0.85;
    },

    embed: async ({ value }: { value: string }) => {
      return {
        embedding: createDeterministicEmbedding(value),
        usage: { tokens: 50 },
      };
    },

    embedMany: async ({ values }: { values: string[] }) => {
      return {
        embeddings: values.map(text => createDeterministicEmbedding(text)),
        usage: { tokens: values.length * 50 },
      };
    },
  };
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  // Use beforeAll to ensure this is run once before any test
  beforeAll(() => {
    // Ensure clean state
    EmbeddingService.resetInstance();
  });

  beforeEach(() => {
    // Reset singleton and get a fresh instance
    EmbeddingService.resetInstance();
    service = EmbeddingService.getInstance({ apiKey: 'mock-api-key' });
  });

  // Ensure cleanup after all tests to avoid affecting other test files
  afterAll(() => {
    EmbeddingService.resetInstance();
  });

  test('should provide embedding generation', async () => {
    const text = 'This is a test text';
    const result = await service.getEmbedding(text);

    // Just verify the interface/shape rather than the implementation
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should provide batch embedding generation', async () => {
    const texts = ['Text 1', 'Text 2', 'Text 3'];
    const results = await service.getBatchEmbeddings(texts);

    // Verify interface/shape
    expect(results.length).toBe(texts.length);

    // Each result should have the expected shape
    for (const result of results) {
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
