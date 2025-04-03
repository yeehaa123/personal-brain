/**
 * Main exports for the test directory
 * 
 * This file centralizes all test utilities and mocks, providing a single import point
 * for test files. This helps maintain a cleaner and more organized test suite.
 * 
 * Import pattern: import { functionName } from '@test';
 */

// Core test utilities
export * from './test-utils';
export * from './utils';

// Mock data and factories
export {
  // Mock data generators
  createMockNotes,
  createMockNote,
  createMockProfile,
  
  // Mock utility functions
  createTrackers,
  mockLogger,
  restoreLogger,
  mockEnv,
  resetMocks,
} from './mocks';

// Service mocks
export { MockProfileRepository } from './services/profiles/profileRepository.test';
export { MockNoteRepository } from './services/notes/noteRepository.test';

// MCP mocks
export { 
  setupAnthropicMocks,
  setupMcpServerMocks,
  createMockMcpServer,
} from './mcp/contexts/__mocks__/mcpMocks';

// External sources mocks
export { 
  MockNewsApiSource,
  MockWikipediaSource,
  setupMockFetch,
  setupMockFetch as setupExternalSourceMocks,
} from './mcp/contexts/externalSources/__mocks__/externalSourceMocks';

// Component mocks
export * from './mcp/protocol/components/__mocks__/noteServiceMocks';