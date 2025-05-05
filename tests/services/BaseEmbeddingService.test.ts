/**
 * Tests for BaseEmbeddingService
 */
import { describe, expect, mock, test } from 'bun:test';

import type { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';


// Concrete implementation of BaseEmbeddingService for testing
class TestEmbeddingService extends BaseEmbeddingService {
  private static instance: TestEmbeddingService | null = null;
  
  // Implement the Component Interface Standardization pattern
  public static getInstance(): TestEmbeddingService {
    if (!TestEmbeddingService.instance) {
      TestEmbeddingService.instance = new TestEmbeddingService();
    }
    return TestEmbeddingService.instance;
  }
  
  public static resetInstance(): void {
    TestEmbeddingService.instance = null;
  }
  
  public static createFresh(): TestEmbeddingService {
    return new TestEmbeddingService();
  }
  
  // Private constructor to enforce getInstance() usage
  private constructor() {
    // Inject our mock embedding service using dependency injection
    // Create a fresh instance to avoid singleton issues
    // Use type assertion to match the expected EmbeddingService type
    super(MockEmbeddingService.createFresh() as unknown as EmbeddingService);
  }
}

describe('BaseEmbeddingService', () => {
  // Reset the singleton instances before tests
  TestEmbeddingService.resetInstance();
  MockEmbeddingService.resetInstance();
  
  // Get a fresh instance for testing, following the Component Interface Standardization pattern
  const service = TestEmbeddingService.createFresh();

  test('embedding operations work correctly', async () => {
    // Test generating embeddings
    const embedding = await service.generateEmbedding('test text');
    expect(Array.isArray(embedding)).toBe(true);
    
    // Test validation error handling - verify it throws but don't validate message
    let errorThrown = false;
    try {
      await service.generateEmbedding('');
    } catch (_error) {
      // Expected error - success
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
    
    // Test similarity calculation with normal inputs
    const embedding1 = [0.1, 0.2, 0.3];
    const embedding2 = [0.2, 0.3, 0.4];
    const similarity = service.calculateSimilarity(embedding1, embedding2);
    expect(typeof similarity).toBe('number');
    
    // Test error handling in similarity calculation
    const embeddingService = service.getEmbeddingService();
    const originalCalculateSimilarity = embeddingService.calculateSimilarity;
    
    embeddingService.calculateSimilarity = mock(() => {
      throw new Error('Similarity calculation error');
    });
    
    // Should return 0 instead of throwing
    expect(service.calculateSimilarity([0.1], [0.2])).toBe(0);
    
    // Restore original method
    embeddingService.calculateSimilarity = originalCalculateSimilarity;
  });
});
