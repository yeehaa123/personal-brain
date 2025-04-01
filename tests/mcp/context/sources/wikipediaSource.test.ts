import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { WikipediaSource } from '@/mcp/contexts/externalSources/sources';

// Save the original fetch
const originalFetch = globalThis.fetch;
let mockFetch: typeof fetch;

describe('Wikipedia Source Tests', () => {
  beforeEach(() => {
    // Create a new mock for each test
    mockFetch = mock((): Promise<Response> => 
      Promise.resolve({
        ok: true,
        status: 200, 
        json: () => Promise.resolve({ status: 'ok' }),
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'basic',
        url: 'https://example.com',
        clone: function(): Response { return this; },
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        text: () => Promise.resolve(''),
      } as Response));
    
    // Replace global fetch with our mock
    globalThis.fetch = mockFetch;
  });
  
  // Helper function to simplify mock implementation
  function setupFetchMock(response: Partial<Response>) {
    mockFetch = mock((): Promise<Response> => 
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: 'https://example.com',
        clone: function(): Response { return this; },
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        text: () => Promise.resolve(''),
        ...response,
      } as Response));
      
    globalThis.fetch = mockFetch;
  }
  
  afterEach(() => {
    // Restore original fetch after each test
    globalThis.fetch = originalFetch;
  });

  test('should properly handle Wikipedia API response format in checkAvailability', async () => {
    // Create the source
    const source = new WikipediaSource();
    
    // Mock different response formats that could come from Wikipedia
    
    // 1. Test with nested structure (data.query.general)
    setupFetchMock({
      json: () => Promise.resolve({
        query: {
          general: {
            sitename: 'Wikipedia',
            mainpage: 'Main Page',
          },
        },
      }),
    });
    
    let isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(true);
    
    // 2. Test with flat structure (direct general info)
    setupFetchMock({
      json: () => Promise.resolve({
        sitename: 'Wikipedia',
        mainpage: 'Main Page',
        // ... other general properties
      }),
    });
    
    isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(true);
    
    // 3. Test with unexpected structure
    setupFetchMock({
      json: () => Promise.resolve({
        someOtherProperty: 'value',
      }),
    });
    
    isAvailable = await source.checkAvailability();
    expect(isAvailable).toBe(false);
  });
  
  test('should properly search for quantum computing information', async () => {
    const source = new WikipediaSource();
    
    // Mock the fetch call
    
    // Setup a more sophisticated mock that returns different responses for different calls
    mockFetch = mock((url: string | URL | Request, _options?: RequestInit): Promise<Response> => {
      console.log(`MOCK FETCH CALLED WITH URL: ${url}`);
      
      // First call - search API
      if (url.toString().includes('srsearch=What+is+quantum+computing')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: function(): Response { return this; },
          body: null,
          bodyUsed: false,
          json: () => Promise.resolve({
            query: {
              search: [
                {
                  pageid: 123,
                  title: 'Quantum computing',
                  snippet: 'This is a test snippet about quantum computing',
                  size: 50000,
                  wordcount: 5000,
                },
              ],
            },
          }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response);
      }
      // Second call - content API
      else if (url.toString().includes('pageids=123')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: function(): Response { return this; },
          body: null,
          bodyUsed: false,
          json: () => Promise.resolve({
            query: {
              pages: {
                '123': {
                  pageid: 123,
                  title: 'Quantum computing',
                  extract: 'A quantum computer is a computer that exploits quantum mechanical phenomena. On small scales, physical matter exhibits properties of both particles and waves, and quantum computing takes advantage of this behavior using specialized hardware.',
                },
              },
            },
          }),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response);
      }
      // Default response for any other calls
      else {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: typeof url === 'string' ? url : url.toString(),
          clone: function(): Response { return this; },
          body: null,
          bodyUsed: false,
          json: () => Promise.resolve({}),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          blob: () => Promise.resolve(new Blob()),
          formData: () => Promise.resolve(new FormData()),
          text: () => Promise.resolve(''),
        } as Response);
      }
    });
    
    globalThis.fetch = mockFetch;
    
    // Test the search
    const results = await source.search({ 
      query: 'What is quantum computing?',
      limit: 2,
    });
    
    // Verify the results
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Quantum computing');
    expect(results[0].content).toContain('quantum computer');
    expect(results[0].url).toContain('wikipedia.org/wiki/Quantum_computing');
    expect(results[0].source).toBe('Wikipedia');
  });
});