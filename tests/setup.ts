/**
 * Global test setup for the personal-brain application
 * This file is automatically loaded by Bun when running tests
 * 
 * This file centralizes all the global setup and mocking required for tests.
 * It ensures consistent behavior across all test suites.
 */

// Set the environment to test
import { afterAll, afterEach, beforeAll, beforeEach, mock } from 'bun:test';

// Import singleton reset functions and mocks
import { ExternalSourceContext } from '@/mcp/contexts/externalSources/externalSourceContext';
import { NoteContext } from '@/mcp/contexts/notes/noteContext';
import { ProfileContext } from '@/mcp/contexts/profiles/profileContext';
import { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import { resetServiceRegistration } from '@/services/serviceRegistry';

import { setupMcpServerMocks } from './mcp/contexts/__mocks__/mcpMocks';
import { setupEmbeddingMocks } from './utils/embeddingUtils';
import { setTestEnv } from './utils/envUtils';
import { setupMockFetch } from './utils/fetchUtils';

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
  
  // Set up global mocks for BrainProtocol and related classes
  setupMcpServerMocks(mock);
});

// Per-test setup - runs before each test
beforeEach(() => {
  // Reset all singletons for test isolation
  BrainProtocol.resetInstance();
  NoteContext.resetInstance();
  ProfileContext.resetInstance();
  ExternalSourceContext.resetInstance();
  resetServiceRegistration();
  
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