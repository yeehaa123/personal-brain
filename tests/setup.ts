/**
 * Global test setup for the personal-brain application
 * This file is automatically loaded by Bun when running tests
 */

// Mock the logger to prevent logs during tests
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  child: () => mockLogger,
};

// Set the environment to test
process.env.NODE_ENV = 'test';

// Mock the logger module
import { mock } from 'bun:test';
import { beforeAll } from 'bun:test';

beforeAll(() => {
  // Replace the real logger with our mock
  mock.module('@utils/logger', () => {
    return {
      default: mockLogger,
      createLogger: () => mockLogger,
    };
  });
});