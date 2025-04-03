/**
 * Main exports for the test directory
 */

// Re-export everything from test-utils
export * from './test-utils';

// Export mocks but avoid duplicates
export { 
  createMockNotes,
  createMockNote,
  createMockProfile,
  createMockEmbedding,
  hashString,
  createTrackers,
  mockLogger,
  restoreLogger,
  mockEnv,
  resetMocks,
} from './mocks';

// Export test utilities
import { setupEmbeddingMocks } from './utils/embeddingUtils';
import { setupMockFetch } from './utils/fetchUtils';
import { 
  setupAnthropicMocks, 
  setupMcpServerMocks, 
  setupDependencyContainerMocks,
  setupDITestSuite,
} from './utils/mcpUtils';

export { 
  setupEmbeddingMocks,
  setupMockFetch,
  setupAnthropicMocks,
  setupMcpServerMocks,
  setupDependencyContainerMocks,
  setupDITestSuite,
};

// Export mock repositories
export { MockProfileRepository } from './services/profiles/profileRepository.test';
export { MockNoteRepository } from './services/notes/noteRepository.test';

// Export additional test utilities
export * from './utils/envUtils';