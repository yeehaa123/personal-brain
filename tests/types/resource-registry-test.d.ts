/**
 * Type declaration extensions for ResourceRegistry in tests
 *
 * This module uses TypeScript's declaration merging to extend 
 * the ResourceRegistry interface in test environments without
 * modifying the actual ResourceRegistry class.
 */

import { ResourceRegistry } from '@/resources';

// Extend the ResourceRegistry interface with mock properties for testing
declare module '@/resources' {
  interface ResourceRegistry {
    // Mock properties and methods for testing
    mockModelResponse?: {
      object: unknown;
      usage: { inputTokens: number; outputTokens: number };
    };
    
    mockEmbedding?: number[];
    mockSimilarity?: number;
    
    // Other mock methods that might be needed
    setMockModelResponse?(response: unknown): void;
    setMockEmbedding?(embedding: number[]): void;
    setMockSimilarity?(similarity: number): void;
  }
}