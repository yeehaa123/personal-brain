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
import { MockEmbeddingService } from '@test/__mocks__/model/embeddings';

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
  mockFn.module('@/mcp/model/embeddings', () => {
    return {
      EmbeddingService: MockEmbeddingService,
    };
  });
  
  // Also mock the OpenAI module that's used by BaseEmbeddingService
  mockFn.module('openai', () => {
    return {
      OpenAI: class MockOpenAI {
        constructor() {}
        embeddings = {
          create: async ({ input }: { input: string | string[] }) => {
            if (Array.isArray(input)) {
              return {
                data: input.map(text => ({
                  embedding: createMockEmbedding(text),
                  object: 'embedding',
                  index: 0,
                })),
                model: 'text-embedding-3-small',
                object: 'list',
                usage: {
                  prompt_tokens: 100,
                  total_tokens: 100,
                },
              };
            } else {
              return {
                data: [{
                  embedding: createMockEmbedding(input),
                  object: 'embedding',
                  index: 0,
                }],
                model: 'text-embedding-3-small',
                object: 'list',
                usage: {
                  prompt_tokens: 50,
                  total_tokens: 50,
                },
              };
            }
          },
        };
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