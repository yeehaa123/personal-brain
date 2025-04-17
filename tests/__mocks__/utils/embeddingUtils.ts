/**
 * Mock Embedding Utilities
 * 
 * This file provides utilities for creating mock embeddings
 * for use in tests across the codebase.
 * 
 * Usage:
 * ```typescript
 * import { createMockEmbedding, setupEmbeddingMocks } from '@test/__mocks__/utils/embeddingUtils';
 * 
 * // Create a deterministic embedding for testing
 * const embedding = createMockEmbedding('test input');
 * 
 * // Setup mocks for the embedding service
 * setupEmbeddingMocks(mock);
 * ```
 */

/**
 * Create a deterministic embedding based on input string
 * 
 * @param input String to hash for embedding seed
 * @param dimensions Number of dimensions for the embedding (default: 1536)
 * @returns Normalized embedding vector with the specified dimensions
 */
/**
 * Set up embedding mocks for tests
 * 
 * @param mockFn Bun's mock function
 */
// Import the MockEmbeddingService for use in setupEmbeddingMocks
import { MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

export function createMockEmbedding(input: string, dimensions: number = 1536): number[] {
  // Create a deterministic embedding based on the input
  const seed = hashString(input);
  const embedding = Array(dimensions).fill(0).map((_, i) => {
    const x = Math.sin(seed + i * 0.1) * 10000;
    return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Simple hash function for strings
 * 
 * @param str Input string to hash
 * @returns Numeric hash value
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export function setupEmbeddingMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  // Mock the embedding module with our MockEmbeddingService class
  mockFn.module('@/resources/ai/embedding', () => {
    return {
      EmbeddingService: MockEmbeddingService,
    };
  });
  
  // Mock Vercel AI SDK embedding functions
  mockFn.module('ai', () => {
    return {
      cosineSimilarity: (_vec1: number[], _vec2: number[]) => {
        // Simple deterministic similarity calculation for tests
        return 0.85;
      },
      
      embed: async ({ value }: { value: string }) => {
        return {
          embedding: createMockEmbedding(value),
          usage: { tokens: 50 },
        };
      },
      
      embedMany: async ({ values }: { values: string[] }) => {
        return {
          embeddings: values.map(text => createMockEmbedding(text)),
          usage: { tokens: values.length * 50 },
        };
      },
    };
  });
  
  // Mock the OpenAI SDK
  mockFn.module('@ai-sdk/openai', () => {
    return {
      openai: {
        embedding: (model: string) => ({ 
          id: model,
          provider: 'openai',
        }),
      },
    };
  });
}

/**
 * Embedding-related mock utilities
 */
export const EmbeddingUtils = {
  createMockEmbedding,
  hashString,
  setupEmbeddingMocks,
};