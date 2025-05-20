import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { WikipediaSource } from '@/contexts/externalSources/sources/wikipediaSource';
import type { EmbeddingService } from '@/resources/ai/embedding';

describe('WikipediaSource', () => {
  let source: WikipediaSource;
  let mockEmbeddingService: EmbeddingService;

  beforeEach(() => {
    // Create a mock embedding service
    mockEmbeddingService = {
      getEmbedding: async () => [0.1, 0.2, 0.3],
    } as unknown as EmbeddingService;

    // Create a fresh source instance
    source = WikipediaSource.createFresh({
      embeddingService: mockEmbeddingService,
    });

    // Mock fetch to return test data
    global.fetch = mock(async (url: string | URL | Request) => {
      const urlString = url.toString();
      
      if (urlString.includes('action=query') && urlString.includes('list=search')) {
        // Search response
        return new Response(JSON.stringify({
          query: {
            search: [{
              pageid: 12345,
              title: 'Test Article',
              snippet: 'Test snippet',
              size: 5000,
              wordcount: 800,
              timestamp: '2023-01-01T12:00:00Z',
            }],
          },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (urlString.includes('action=query') && urlString.includes('pageids=')) {
        // Article content response
        return new Response(JSON.stringify({
          query: {
            pages: {
              12345: {
                pageid: 12345,
                title: 'Test Article',
                extract: 'This is the test article content.',
              },
            },
          },
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
    expect(results[0].sourceType).toBe('encyclopedia');
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

  test('should return empty results for no search matches', async () => {
    // Mock empty search results
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({
        query: { search: [] },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const results = await source.search({ query: 'nonexistent' });
    expect(results).toEqual([]);
  });

  test('should check availability', async () => {
    const available = await source.checkAvailability();
    expect(typeof available).toBe('boolean');
  });

  test('should provide source metadata', async () => {
    const metadata = await source.getSourceMetadata();
    
    expect(metadata['name']).toBe('Wikipedia');
    expect(metadata['type']).toBe('encyclopedia');
    expect(metadata['requiresAuthentication']).toBe(false);
  });
});