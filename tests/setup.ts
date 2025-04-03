/**
 * Global test setup for the personal-brain application
 * This file is automatically loaded by Bun when running tests
 */

// Set the environment to test
import { setTestEnv } from './utils/envUtils';
setTestEnv('NODE_ENV', 'test');

// Mock the logger to prevent logs during tests
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  child: () => mockLogger,
};

// Import Bun test utilities
import { mock, beforeAll, beforeEach, afterEach } from 'bun:test';
import { setupEmbeddingMocks } from './utils/embeddingUtils';
// Add RequestInfo type for fetch
import type { RequestInfo } from 'node-fetch';

// Global setup - runs once before all tests
beforeAll(() => {
  // Replace the real logger with our mock
  mock.module('@utils/logger', () => {
    return {
      default: mockLogger,
      createLogger: () => mockLogger,
    };
  });
});

// Per-test setup - runs before each test
beforeEach(() => {
  // Setup consistent embedding mocks for each test
  setupEmbeddingMocks(mock);
  
  // Reset fetch mocks
  if (global.fetch) {
    global.fetch = (async (_url: URL | RequestInfo) => {
      // Create a proper Response object
      return new Response(JSON.stringify({}), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    }) as unknown as typeof global.fetch;
  }
});

// Cleanup after each test
afterEach(() => {
  // Any global cleanup needed
});