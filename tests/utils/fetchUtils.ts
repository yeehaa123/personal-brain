/**
 * Fetch mock utilities for tests
 */

/**
 * Sets up a mock fetch implementation for tests
 * 
 * @param mockData Optional default mock data to return for any request
 * @returns A mock fetch function that can be used to replace global.fetch
 */
export function setupMockFetch(mockData: Record<string, unknown> | null = null) {
  return async (url: string | URL | Request, _options?: RequestInit): Promise<Response> => {
    // Get the URL as a string for pattern matching
    const urlString = url instanceof URL ? url.toString() : 
      url instanceof Request ? url.url : url;
    
    // Allow different mock responses based on URL patterns
    let responseData: Record<string, unknown>;
    
    if (urlString.includes('newsapi.org')) {
      responseData = mockNewsApiResponse();
    } else if (urlString.includes('api.wikipedia.org')) {
      responseData = mockWikipediaResponse(urlString);
    } else {
      // Default mock data if not matched
      responseData = mockData || { status: 'ok', message: 'Mock response' };
    }
    
    // Convert data to a Response object
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
}

/**
 * Create a mock NewsAPI response
 */
function mockNewsApiResponse() {
  return {
    status: 'ok',
    totalResults: 2,
    articles: [
      {
        source: {
          id: 'test-source',
          name: 'Test News Source',
        },
        author: 'Mock Author',
        title: 'Mock Article Title',
        description: 'This is a mock news article description',
        url: 'https://example.com/article/123',
        urlToImage: 'https://example.com/images/123.jpg',
        publishedAt: '2023-01-01T12:00:00Z',
        content: 'This is the full content of the mock article. It contains important information.',
      },
      {
        source: {
          id: 'test-source-2',
          name: 'Another Test Source',
        },
        author: 'Another Author',
        title: 'Another Mock Article',
        description: 'Another mock article description',
        url: 'https://example.com/article/456',
        urlToImage: 'https://example.com/images/456.jpg',
        publishedAt: '2023-01-02T12:00:00Z',
        content: 'More mock content for testing purposes.',
      },
    ],
  };
}

/**
 * Create a mock Wikipedia API response
 */
function mockWikipediaResponse(url: string) {
  // Search endpoint
  if (url.includes('/w/api.php') && url.includes('action=query') && url.includes('list=search')) {
    return {
      batchcomplete: '',
      continue: {
        sroffset: 10,
        continue: '-||',
      },
      query: {
        searchinfo: {
          totalhits: 2,
        },
        search: [
          {
            ns: 0,
            title: 'Mock Wikipedia Article',
            pageid: 12345,
            size: 10000,
            wordcount: 1500,
            snippet: 'This is a <span class="searchmatch">mock</span> Wikipedia article',
            timestamp: '2023-01-01T12:00:00Z',
          },
          {
            ns: 0,
            title: 'Another Wikipedia Article',
            pageid: 54321,
            size: 5000,
            wordcount: 750,
            snippet: 'This is another <span class="searchmatch">mock</span> article',
            timestamp: '2023-01-02T12:00:00Z',
          },
        ],
      },
    };
  }
  
  // Content endpoint
  if (url.includes('/w/api.php') && url.includes('action=query') && url.includes('prop=extracts')) {
    return {
      batchcomplete: '',
      query: {
        pages: {
          '12345': {
            pageid: 12345,
            ns: 0,
            title: 'Mock Wikipedia Article',
            extract: '<p>This is the full extract of a mock Wikipedia article. It contains multiple paragraphs of information.</p><p>Second paragraph with more details.</p>',
          },
        },
      },
    };
  }
  
  // Default Wikipedia response
  return {
    batchcomplete: '',
    query: {
      pages: {},
    },
  };
}