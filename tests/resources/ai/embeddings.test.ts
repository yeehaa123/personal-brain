import { afterAll, beforeEach, describe, expect, test } from 'bun:test';

import { EmbeddingService } from '@/resources/ai/embedding/embeddings';
// Import the mock service using its actual export name
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('EmbeddingService', () => {
  // Define the group for Component Interface Standardization pattern tests
  describe('Component Interface Standardization pattern', () => {
    beforeEach(() => {
      // Reset both real and mock implementations
      EmbeddingService.resetInstance();
      MockEmbeddingService.resetInstance();
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = EmbeddingService.getInstance();
      EmbeddingService.resetInstance();
      const instance2 = EmbeddingService.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('createFresh should create a new instance each time', () => {
      const instance1 = EmbeddingService.createFresh();
      const instance2 = EmbeddingService.createFresh();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('createWithDependencies should create a configured instance', () => {
      const mockApiKey = 'test-api-key-123';
      const mockModel = 'test-embedding-model';
      
      const instance = EmbeddingService.createWithDependencies({
        apiKey: mockApiKey,
        embeddingModel: mockModel,
      });
      
      // We can't test private properties directly, so we verify by behavior
      expect(instance).toBeInstanceOf(EmbeddingService);
    });
  });
  
  // Define the group for functional tests using MockEmbeddingService
  describe('Embedding functionality', () => {
    let service: EmbeddingService;
    
    beforeEach(() => {
      // Use our mock implementation for testing
      MockEmbeddingService.resetInstance();
      // Use type assertion since we know the mock implements the same interface
      service = MockEmbeddingService.createFresh() as unknown as EmbeddingService;
    });
    
    afterAll(() => {
      // Ensure cleanup
      MockEmbeddingService.resetInstance();
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
    
    test('should calculate similarity between vectors', () => {
      const vec1 = Array(5).fill(0).map((_, i) => i * 0.1);
      const vec2 = Array(5).fill(0).map((_, i) => i * 0.2);
      
      const similarity = service.calculateSimilarity(vec1, vec2);
      
      expect(typeof similarity).toBe('number');
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
    
    test('should chunk text correctly', () => {
      const longText = 'This is a long text. It has multiple sentences. ' +
        'Each sentence should be processed correctly. ' + 
        'The text should be split into multiple chunks based on size.';
      
      const chunks = service.chunkText(longText);
      
      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
    });
    
    test('should generate embeddings for chunks', async () => {
      const longText = 'This is a long text. It has multiple sentences. ' +
        'Each sentence should be processed correctly. ' + 
        'The text should be split into multiple chunks based on size.';
      
      const chunks = service.chunkText(longText);
      const embeddings = await service.getChunkedEmbeddings(chunks);
      
      expect(embeddings.length).toBe(chunks.length);
      
      // Each embedding should have the expected shape
      for (const embedding of embeddings) {
        expect(embedding).toBeDefined();
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBeGreaterThan(0);
      }
    });
  });
});
