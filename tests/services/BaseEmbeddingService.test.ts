/**
 * Tests for BaseEmbeddingService
 */
import { describe, expect, mock, test } from 'bun:test';

import type { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import { ValidationError } from '@/utils/errorUtils';
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

  test('should generate embeddings for valid text', async () => {
    const embedding = await service.generateEmbedding('test text');
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
  });

  test('should throw ValidationError for empty text', async () => {
    expect(service.generateEmbedding('')).rejects.toThrow(ValidationError);
  });

  test('should calculate similarity between embeddings', () => {
    const embedding1 = [0.1, 0.2, 0.3];
    const embedding2 = [0.2, 0.3, 0.4];

    const similarity = service.calculateSimilarity(embedding1, embedding2);
    expect(typeof similarity).toBe('number');
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  test('should return the embedding service instance', () => {
    const embeddingService = service.getEmbeddingService();
    expect(embeddingService).toBeDefined();
  });

  test('should handle error in similarity calculation', () => {
    // Get the embedding service to mock calculateSimilarity
    const embeddingService = service.getEmbeddingService();
    const originalCalculateSimilarity = embeddingService.calculateSimilarity;

    // Make it throw an error
    embeddingService.calculateSimilarity = mock(() => {
      throw new Error('Similarity calculation error');
    });

    // Calculate similarity should return 0 instead of throwing
    const similarity = service.calculateSimilarity([0.1], [0.2]);
    expect(similarity).toBe(0);

    // Restore original method
    embeddingService.calculateSimilarity = originalCalculateSimilarity;
  });
});
