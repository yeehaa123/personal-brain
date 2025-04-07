/**
 * Tests for BaseEmbeddingService
 */
import { describe, expect, mock, test } from 'bun:test';

import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import { ValidationError } from '@/utils/errorUtils';
import { setupEmbeddingMocks } from '@test/utils/embeddingUtils';

// Set up embedding service mocks
setupEmbeddingMocks(mock);

// Concrete implementation of BaseEmbeddingService for testing
class TestEmbeddingService extends BaseEmbeddingService {
  // No need to add methods, we just want to test the base class
}

describe('BaseEmbeddingService', () => {

  const service = new TestEmbeddingService();

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
    // Get the embedding service to mock cosineSimilarity
    const embeddingService = service.getEmbeddingService();
    const originalCosineSimilarity = embeddingService.cosineSimilarity;

    // Make it throw an error
    embeddingService.cosineSimilarity = mock(() => {
      throw new Error('Similarity calculation error');
    });

    // Calculate similarity should return 0 instead of throwing
    const similarity = service.calculateSimilarity([0.1], [0.2]);
    expect(similarity).toBe(0);

    // Restore original method
    embeddingService.cosineSimilarity = originalCosineSimilarity;
  });
});
