/**
 * Mock Registry
 * 
 * This file serves as the central registry for all mocks in the personal-brain project.
 * Import mocks from this file to ensure you're using the standardized implementations.
 * 
 * Usage:
 * ```typescript
 * // In your test file
 * import { MockLogger, createMockLogger, setupLoggerMocks } from '@test/__mocks__';
 * 
 * // Use the mock directly
 * const logger = createMockLogger();
 * 
 * // Or set up global mocking
 * setupLoggerMocks(mock);
 * ```
 */

// Core mocks
export * from './core/logger';

// Model mocks
export * from './models/note';
export * from './models/profile';

// Utility mocks
export * from './utils/embeddingUtils';

// Add additional exports as you create more mock files:
// export * from './services/repository';
// etc.