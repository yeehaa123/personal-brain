import { beforeEach, describe, expect, test } from 'bun:test';

import type { EmbeddingConfig, EmbeddingDependencies } from '@/resources/ai/embedding/embeddings';
import { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import type { Logger } from '@/utils/logger';
import { TextUtils } from '@/utils/textUtils';
import { MockLogger } from '@test/__mocks__/core/logger';


describe('EmbeddingService', () => {
  describe('Component Interface Standardization pattern', () => {
    beforeEach(() => {
      // Reset the singleton instance
      EmbeddingService.resetInstance();
    });

    // Tests for the EmbeddingService's public API
    describe('Embedding functionality', () => {
      let service: EmbeddingService;

      beforeEach(() => {
        // Reset for each test
        EmbeddingService.resetInstance();

        // Create a service instance with test configuration and dependencies
        const testConfig: EmbeddingConfig = {
          apiKey: 'test-api-key',
          embeddingModel: 'text-embedding-3-small',
          embeddingDimension: 1536,
        };

        const testDependencies: EmbeddingDependencies = {
          logger: MockLogger.createFresh() as unknown as Logger,
          textUtils: TextUtils.createFresh(),
        };

        service = EmbeddingService.createFresh(testConfig, testDependencies);
      });

      test('should provide embedding generation', async () => {
        const text = 'This is a test text';
        const result = await service.getEmbedding(text);

        // Verify interface/shape - we're only testing the API shape, not implementation
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      test('should provide batch embedding generation', async () => {
        const texts = ['Text 1', 'Text 2', 'Text 3'];
        const results = await service.getBatchEmbeddings(texts);

        // Verify interface/shape
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
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

        // Verify interface/shape
        expect(typeof similarity).toBe('number');
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
      });

      test('should chunk text correctly', () => {
        const longText = 'This is a long text. It has multiple sentences. ' +
          'Each sentence should be processed correctly. ' +
          'The text should be split into multiple chunks based on size.';

        const chunks = service.chunkText(longText);

        // Verify interface/shape
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

        // Verify interface/shape
        expect(embeddings).toBeDefined();
        expect(Array.isArray(embeddings)).toBe(true);
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
});
