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
import { ExternalSourceContext } from '@/mcp/contexts/externalSources/core/externalSourceContext';
import { NoteContext } from '@/mcp/contexts/notes';
import { ProfileContext } from '@/mcp/contexts/profiles/core/profileContext';
import { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import { resetServiceRegistration } from '@/services/serviceRegistry';

import { setupLoggerMocks } from './__mocks__';
import { setupMcpServerMocks } from './mcp/contexts/__mocks__/mcpMocks';
import { setupContextMocks } from './utils/contextUtils';
import { setupEmbeddingMocks } from './utils/embeddingUtils';
import { setTestEnv } from './utils/envUtils';
import { setupMockFetch } from './utils/fetchUtils';

// Set test environment
setTestEnv('NODE_ENV', 'test');

// Global setup - runs once before all tests
beforeAll(() => {
  // Mock the logger to prevent console noise during tests
  setupLoggerMocks(mock);
  
  // Set up global mocks for BrainProtocol and related classes
  setupMcpServerMocks(mock);
});

// Per-test setup - runs before each test
beforeEach(() => {
  // Reset all singletons for test isolation (checking if methods exist first)
  if (typeof BrainProtocol?.resetInstance === 'function') {
    BrainProtocol.resetInstance();
  }
  
  if (typeof NoteContext?.resetInstance === 'function') {
    NoteContext.resetInstance();
  }
  
  if (typeof ProfileContext?.resetInstance === 'function') {
    ProfileContext.resetInstance();
  }
  
  if (typeof ExternalSourceContext?.resetInstance === 'function') {
    ExternalSourceContext.resetInstance();
  }
  
  resetServiceRegistration();
  
  // BEST PRACTICE FOR TESTING WITH InMemoryStorage:
  // 1. Always use InMemoryStorage.createFresh() in tests to get isolated instances
  // 2. Pass the storage instance explicitly to any component that needs it
  // 3. When testing BrainProtocol, use the memoryStorage option in the constructor
  // 4. DO NOT rely on or reset the singleton instance in tests
  //
  // Example:
  // const storage = InMemoryStorage.createFresh();
  // const protocol = new BrainProtocol({ memoryStorage: storage });
  
  
  // Setup embedding mocks for consistent vector operations
  setupEmbeddingMocks(mock);
  
  // Setup context mocks for consistent conversation context behavior
  setupContextMocks(mock);
  
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