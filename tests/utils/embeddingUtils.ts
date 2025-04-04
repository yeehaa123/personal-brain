/**
 * Embedding Utilities for Tests
 * 
 * This file provides utilities for creating and mocking embeddings in tests.
 * It includes functions for generating deterministic mock embeddings and
 * setting up embedding-related mocks.
 * 
 * Usage:
 * ```typescript
 * import { createMockEmbedding, setupEmbeddingMocks, createTestNote } from '@test';
 * 
 * // Create a deterministic embedding for testing
 * const embedding = createMockEmbedding('test input');
 * 
 * // Setup mocks for the embedding service
 * setupEmbeddingMocks(mock);
 * 
 * // Create a note with all required fields for testing
 * const note = createTestNote({ title: 'Test', content: 'Content' });
 * ```
 */

// Simple hash function for strings
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Create a deterministic mock embedding for tests
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

// Setup embedding mocks for the embedding module
/**
 * Create a test note with all required fields for the new Note schema
 * This is helpful for tests that need to work with the updated Note schema
 * that includes source, conversationMetadata, confidence, and verified
 */
export function createTestNote(params: {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  embedding?: number[];
  createdAt?: Date;
  updatedAt?: Date;
  source?: 'import' | 'conversation' | 'user-created';
  confidence?: number | null;
  conversationMetadata?: {
    conversationId: string;
    timestamp: Date;
    userName?: string;
    promptSegment?: string;
  } | null;
  verified?: boolean | null;
}) {
  // Default values aligned with the updated Note schema
  return {
    id: params.id || `note-${Math.random().toString(36).substring(2, 10)}`,
    title: params.title,
    content: params.content,
    tags: params.tags || [],
    embedding: params.embedding || null,
    createdAt: params.createdAt || new Date(),
    updatedAt: params.updatedAt || new Date(),
    source: params.source || 'import',
    confidence: params.confidence !== undefined ? params.confidence : null,
    conversationMetadata: params.conversationMetadata || null,
    verified: params.verified !== undefined ? params.verified : null,
  };
}

export function setupEmbeddingMocks(mockFn: { module: (name: string, factory: () => unknown) => void }): void {
  // Mock the embedding module
  mockFn.module('@/mcp/model/embeddings', () => {
    return {
      getEmbedding: async (text: string) => {
        console.log('Using mocked getEmbedding');
        return {
          embedding: createMockEmbedding(text),
          truncated: false,
        };
      },
      getBatchEmbeddings: async (texts: string[]) => {
        console.log('Using mocked getBatchEmbeddings');
        return texts.map(text => ({
          embedding: createMockEmbedding(text),
          truncated: false,
        }));
      },
      cosineSimilarity: (_vec1: number[], _vec2: number[]) => {
        // Simple deterministic similarity calculation for tests
        return 0.85;
      },
      chunkText: (text: string, _chunkSize: number = 1000, _overlap: number = 200) => {
        // Simple implementation that just splits by sentences for testing
        const sentences = text.split(/[.!?]+\s+/);
        // If there are fewer sentences than would make a chunk, return the whole text
        if (sentences.length <= 2) {
          return [text];
        }
        // Otherwise create 2 chunks for testing
        return [
          sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ') + '.',
          sentences.slice(Math.floor(sentences.length / 2) - 1).join('. ') + '.',
        ];
      },
    };
  });
  
  // Also mock the OpenAI module that's used by BaseEmbeddingService
  mockFn.module('openai', () => {
    return {
      OpenAI: class MockOpenAI {
        constructor() {}
        embeddings = {
          create: async ({ input }: { input: string | string[] }) => {
            console.log('Using mocked OpenAI embeddings.create');
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