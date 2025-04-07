/**
 * Test utilities for the personal-brain project
 * 
 * This file provides common test utilities like environment setup/teardown,
 * output capture, dependency injection setup, and function mocking.
 * 
 * NOTE: Mock implementations have been moved to the standardized mock system
 * in the tests/__mocks__ directory.
 */
import { afterAll, beforeAll, mock } from 'bun:test';

import { createContainer, useTestContainer } from '@/utils/dependencyContainer';

import { 
  clearStandardTestEnv, 
  clearTestEnv, 
  setTestEnv,
  setupStandardTestEnv,
} from './utils/envUtils';

// Re-export environment utilities with preferred names
export const setMockEnv = setupStandardTestEnv;
export const clearMockEnv = clearStandardTestEnv;
export { setTestEnv, clearTestEnv };

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

/**
 * Manage the dependency container for tests
 * This ensures clean isolation between test suites that use DI
 */
export function setupDependencyContainer(): { cleanup: () => void } {
  // Create a fresh container for this test suite
  const testContainer = createContainer();
  
  // Use this container for all tests in this suite
  const restoreContainer = useTestContainer(testContainer);
  
  return {
    // Provide cleanup that restores the original container and clears the test container
    cleanup: () => {
      if (testContainer && typeof testContainer.clear === 'function') {
        testContainer.clear();
      }
      restoreContainer();
    },
  };
}

/**
 * Setup and teardown utilities for test suites using dependency injection
 * @param options Additional setup options
 */
export function setupDITestSuite(
  options: { mockFetch?: boolean } = { mockFetch: true },
): void {
  let diCleanup: (() => void) | null = null;
  let fetchCleanup: (() => void) | null = null;
  
  // Use the already imported hooks from the global scope
  // This avoids the require() style import
  
  beforeAll(() => {
    // Setup dependency container isolation
    const container = setupDependencyContainer();
    diCleanup = container.cleanup;
    
    // Ensure the container is properly reset for each test
    // This is critical for test isolation
    // Just use the cleanup function we have
    
    // Setup fetch mocking if requested
    if (options.mockFetch) {
      fetchCleanup = mockFetch();
    }
  });
  
  afterAll(() => {
    // Clean up in reverse order
    if (fetchCleanup) {
      fetchCleanup();
    }
    
    if (diCleanup) {
      diCleanup();
    }
  });
}