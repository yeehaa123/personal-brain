import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { EmbeddingService } from '@/resources/ai/embedding';
import { setupEmbeddingMocks } from '@test/__mocks__/';

// Set up all embedding-related mocks
setupEmbeddingMocks(mock);

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    // Reset singleton and get a fresh instance
    EmbeddingService.resetInstance();
    service = EmbeddingService.getInstance({ apiKey: 'mock-api-key' });
  });

  test('should follow the Component Interface Standardization pattern', () => {
    // Test singleton pattern
    const instance1 = EmbeddingService.getInstance();
    const instance2 = EmbeddingService.getInstance();
    expect(instance1).toBe(instance2);
    
    // Test createFresh
    const freshInstance = EmbeddingService.createFresh();
    expect(freshInstance).not.toBe(instance1);
    
    // Test resetInstance
    EmbeddingService.resetInstance();
    const instance3 = EmbeddingService.getInstance();
    expect(instance3).not.toBe(instance1);
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
