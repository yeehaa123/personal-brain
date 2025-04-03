/**
 * Global test setup for the personal-brain application
 * This file is automatically loaded by Bun when running tests
 * 
 * This file centralizes all the global setup and mocking required for tests.
 * It ensures consistent behavior across all test suites.
 */

// Set the environment to test
import { setTestEnv } from './utils/envUtils';
import { setupEmbeddingMocks } from './utils/embeddingUtils';
import { setupMockFetch } from './utils/fetchUtils';
import { mock, beforeAll, beforeEach, afterEach, afterAll } from 'bun:test';

// Set test environment
setTestEnv('NODE_ENV', 'test');

// Define mock logger for silent operation during tests
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  child: () => mockLogger,
};

// Global setup - runs once before all tests
beforeAll(() => {
  // Mock the logger to prevent console noise during tests
  mock.module('@utils/logger', () => ({
    default: mockLogger,
    createLogger: () => mockLogger,
  }));
});

// Per-test setup - runs before each test
beforeEach(() => {
  // Setup embedding mocks for consistent vector operations
  setupEmbeddingMocks(mock);
  
  // Setup default fetch mock for network isolation
  global.fetch = setupMockFetch({});
});

// Cleanup after each test
afterEach(() => {
  // Reset any per-test state that needs cleaning
});

// Final cleanup - runs once after all tests
afterAll(() => {
  // Any final cleanup
});