/**
 * Mock Embedding Utilities
 * 
 * This file provides utilities for creating mock embeddings
 * for use in tests across the codebase.
 */

/**
 * Create a deterministic embedding based on input string
 * 
 * @param input String to hash for embedding seed
 * @param dimensions Number of dimensions for the embedding (default: 1536)
 * @returns Normalized embedding vector with the specified dimensions
 */
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

/**
 * Embedding-related mock utilities
 */
export const EmbeddingUtils = {
  createMockEmbedding,
  hashString,
};