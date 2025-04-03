/**
 * External Source Mocks
 */
import { createMockEmbedding } from '@test/utils/embeddingUtils';

// Mock response types that match Wikipedia and NewsAPI response structure
interface MockWikipediaResponse {
  query: {
    search: Array<{
      pageid: number;
      title: string;
      snippet: string;
    }>;
  };
}

interface MockNewsApiResponse {
  status: string;
  articles: Array<{
    title: string;
    description: string;
    content: string;
    url: string;
  }>;
}

// Setup fetch mock for external sources
export function setupMockFetch(_unused: unknown): typeof fetch {
  return (async (url: URL | string, _options?: RequestInit) => {
    if (typeof url === 'string' && url.includes('wikipedia')) {
      // Wikipedia API response
      const responseData: MockWikipediaResponse = {
        query: {
          search: [
            {
              pageid: 12345,
              title: 'Mock Wikipedia Result',
              snippet: 'This is a mock Wikipedia result',
            },
          ],
        },
      };
      return new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    } else if (typeof url === 'string' && url.includes('newsapi')) {
      // NewsAPI response
      const responseData: MockNewsApiResponse = {
        status: 'ok',
        articles: [
          {
            title: 'Mock News Result',
            description: 'News description',
            content: 'This is a mock news result',
            url: 'https://news.example.com/article/1',
          },
        ],
      };
      return new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    } else {
      // Default response
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    }
  }) as unknown as typeof fetch;
}

// Mock external sources
export class MockWikipediaSource {
  name = 'Wikipedia';
  search = async () => ([{
    title: 'Mock Wikipedia Result',
    content: 'This is a mock Wikipedia result',
    url: 'https://en.wikipedia.org/wiki/Mock',
    source: 'Wikipedia',
    embedding: createMockEmbedding('Wikipedia test'),
  }]);
  checkAvailability = async () => true;
  getSourceMetadata = async () => ({ name: 'Wikipedia', description: 'Mock Wikipedia Source' });
}

export class MockNewsApiSource {
  name = 'NewsAPI';
  search = async () => ([{
    title: 'Mock News Result',
    content: 'This is a mock news result',
    url: 'https://news.example.com/article/1',
    source: 'NewsAPI',
    embedding: createMockEmbedding('NewsAPI test'),
  }]);
  checkAvailability = async () => true;
  getSourceMetadata = async () => ({ name: 'NewsAPI', description: 'Mock News API Source' });
}