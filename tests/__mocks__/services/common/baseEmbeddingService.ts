/**
 * Mock BaseEmbeddingService Implementation
 * 
 * This file provides a standardized mock implementation of the BaseEmbeddingService
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';

import type { BaseEmbeddingService as IBaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import type { MockEntity } from '@test/__mocks__/services/BaseRepository';

/**
 * MockBaseEmbeddingService class with standardized interface
 * 
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockBaseEmbeddingService<
  TEntity extends MockEntity = MockEntity
> implements Partial<IBaseEmbeddingService> {
  private static instance: MockBaseEmbeddingService | null = null;
  
  // Mock configuration
  public mockEmbeddingDimension = 3;
  public mockEmbeddings: Record<string, number[]> = {};
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockBaseEmbeddingService {
    if (!MockBaseEmbeddingService.instance) {
      MockBaseEmbeddingService.instance = new MockBaseEmbeddingService();
    }
    return MockBaseEmbeddingService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockBaseEmbeddingService.instance = null;
  }
  
  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(): MockBaseEmbeddingService {
    return new MockBaseEmbeddingService();
  }
  
  // Mock methods
  generateEmbedding = mock(async (text: string): Promise<number[]> => {
    // Check if we have a pre-configured embedding for this text
    if (this.mockEmbeddings[text]) {
      return this.mockEmbeddings[text];
    }
    
    // Generate a deterministic but random-looking embedding based on the text content
    const hash = Array.from(text).reduce((h, c) => 
      Math.imul(31, h) + c.charCodeAt(0) | 0, 0);
    
    return Array.from({ length: this.mockEmbeddingDimension }, (_, i) => {
      // Generate values between 0 and 1 based on the hash and position
      return ((hash + i * 7) % 1000) / 1000;
    });
  });
  
  calculateSimilarity = mock((embedding1: number[], embedding2: number[]): number => {
    // Simple mock implementation that checks if dimensions match
    if (embedding1.length !== embedding2.length) {
      return 0;
    }
    
    // Return a value between 0.1 and 0.9 based on the first element of each embedding
    return 0.5 + (embedding1[0] - embedding2[0]) * 0.4;
  });
  
  searchSimilar = mock(async (_embedding: number[]): Promise<TEntity[]> => {
    return [
      { id: '5', name: 'Similar 1', embedding: [0.1, 0.2, 0.3] } as TEntity,
      { id: '6', name: 'Similar 2', embedding: [0.2, 0.3, 0.4] } as TEntity,
    ];
  });
  
  // Helper method to set up mock embeddings for specific text
  public setMockEmbedding(text: string, embedding: number[]): void {
    this.mockEmbeddings[text] = embedding;
  }
}