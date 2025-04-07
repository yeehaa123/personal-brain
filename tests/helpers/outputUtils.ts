/**
 * Output and mocking utilities for testing
 * 
 * This file provides utilities for capturing console output and mocking functions
 * for use in tests.
 */
import { mock } from 'bun:test';

/**
 * Helper to capture console output
 * @returns Object with getOutput and restore methods
 */
export function captureOutput() {
  let output = '';
  const originalWrite = process.stdout.write;
  
  process.stdout.write = function(str) {
    output += str.toString();
    return true;
  };
  
  return {
    getOutput: () => output,
    restore: () => {
      process.stdout.write = originalWrite;
    },
  };
}

/**
 * Mock a module function and track calls
 * @param module The module containing the function
 * @param functionName The name of the function to mock
 * @param mockImpl The mock implementation
 * @returns Original function for restoration
 */
export function mockFunction(
  module: Record<string, unknown>, 
  functionName: string, 
  mockImpl: (...args: unknown[]) => unknown,
): unknown {
  const originalFn = module[functionName];
  module[functionName] = mockImpl;
  return originalFn;
}

/**
 * Mock the global fetch function for tests
 * @returns A function to restore the original fetch
 */
export function mockFetch(): () => void {
  const originalFetch = globalThis.fetch;
  
  // Create a mock that handles common test cases
  const mockFn = mock((url: string | URL | Request, _options?: RequestInit): Promise<Response> => {
    const urlString = url.toString();
    
    // Create a base response object
    const baseResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic' as unknown,
      url: urlString,
      clone: function(): Response { return this as unknown as Response; },
      body: null as ReadableStream<Uint8Array> | null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve(''),
    };
    
    // Handle different URLs differently
    if (urlString.includes('news') || urlString.includes('newsapi.org')) {
      return Promise.resolve({
        ...baseResponse,
        json: () => Promise.resolve({
          status: 'ok',
          articles: [
            {
              title: 'Test News Article',
              description: 'Test description',
              content: 'Test content',
              url: 'https://example.com/news',
              publishedAt: new Date().toISOString(),
              source: { name: 'Test Source' },
            },
          ],
        }),
      } as Response);
    } else if (urlString.includes('wikipedia') || urlString.includes('wiki')) {
      if (urlString.includes('list=search')) {
        // Search API
        return Promise.resolve({
          ...baseResponse,
          json: () => Promise.resolve({
            query: {
              search: [
                {
                  pageid: 123,
                  title: 'Test Article',
                  snippet: 'Test snippet',
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          }),
        } as Response);
      } else if (urlString.includes('pageids') || urlString.includes('extracts')) {
        // Content API
        return Promise.resolve({
          ...baseResponse,
          json: () => Promise.resolve({
            query: {
              pages: {
                '123': {
                  pageid: 123,
                  title: 'Test Article',
                  extract: 'Test content extract',
                },
              },
            },
          }),
        } as Response);
      } else {
        // Metadata API (for availability check)
        return Promise.resolve({
          ...baseResponse,
          json: () => Promise.resolve({
            query: {
              general: {
                sitename: 'Wikipedia',
                mainpage: 'Main Page',
              },
            },
          }),
        } as Response);
      }
    } else {
      // Default response for any other URL
      return Promise.resolve({
        ...baseResponse,
        json: () => Promise.resolve({ status: 'ok' }),
      } as Response);
    }
  });
  
  // Replace the global fetch
  globalThis.fetch = mockFn;
  
  // Return a function to restore the original fetch
  return () => {
    globalThis.fetch = originalFetch;
  };
}