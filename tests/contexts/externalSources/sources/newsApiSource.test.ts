import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { NewsApiSource } from '@/contexts/externalSources/sources/newsApiSource';
import type { EmbeddingService } from '@/resources/ai/embedding';

describe('NewsApiSource', () => {
  let source: NewsApiSource;
  let mockEmbeddingService: EmbeddingService;

  beforeEach(() => {
    // Create a mock embedding service
    mockEmbeddingService = {
      getEmbedding: async () => [0.1, 0.2, 0.3],
    } as unknown as EmbeddingService;

    // Create a fresh source instance
    source = NewsApiSource.createFresh({
      apiKey: 'test-api-key',
      embeddingService: mockEmbeddingService,
    });

    // Mock fetch to return test data
    global.fetch = mock(async (url: string | URL | Request) => {
      if (url.toString().includes('newsapi.org')) {
        return new Response(JSON.stringify({
          status: 'ok',
          totalResults: 1,
          articles: [{
            source: { id: 'test-source', name: 'Test News' },
            author: 'Test Author',
            title: 'Test Article',
            description: 'Test description',
            url: 'https://test.com/article',
            publishedAt: '2023-01-01T12:00:00Z',
            content: 'Test content',
          }],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });
  });

  test('should search for articles', async () => {
    const results = await source.search({ query: 'test', limit: 5 });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Test Article');
    expect(results[0].sourceType).toBe('news');
  });

  test('should include embeddings when requested', async () => {
    const results = await source.search({ 
      query: 'test', 
      limit: 5,
      addEmbeddings: true,
    });

    expect(results[0].embedding).toBeDefined();
    expect(Array.isArray(results[0].embedding)).toBe(true);
  });

  test('should return empty results for empty API response', async () => {
    // Mock empty response
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({
        status: 'ok',
        totalResults: 0,
        articles: [],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const results = await source.search({ query: 'test' });
    expect(results).toEqual([]);
  });

  test('should check availability', async () => {
    const available = await source.checkAvailability();
    expect(typeof available).toBe('boolean');
  });

  test('should provide source metadata', async () => {
    const metadata = await source.getSourceMetadata();
    
    expect(metadata['name']).toBe('NewsAPI');
    expect(metadata['type']).toBe('news');
    expect(metadata['hasApiKey']).toBeDefined();
  });
});