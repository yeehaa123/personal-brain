/**
 * Dependency Injection utilities for testing
 * 
 * This file provides utilities for managing dependency containers in tests,
 * ensuring proper isolation between test suites.
 */
import { afterAll, beforeAll } from 'bun:test';

import { SimpleContainer } from '@/utils/registry';

import { mockFetch } from '../outputUtils';

/**
 * Manage a test container for unit tests
 * This ensures clean isolation between test suites that use DI
 */
export function setupDependencyContainer(): { 
  container: SimpleContainer;
  cleanup: () => void; 
  } {
  // Create a fresh container for this test suite
  const testContainer = new SimpleContainer();
  
  return {
    container: testContainer,
    // Provide cleanup that clears the test container
    cleanup: () => {
      // Clear the test container
      testContainer.clear();
    },
  };
}

/**
 * Setup and teardown utilities for test suites using dependency injection
 * @param options Additional setup options
 */
export function setupDITestSuite(
  options: { mockFetch?: boolean } = { mockFetch: true },
): { container: SimpleContainer } {
  let diContainer: SimpleContainer | null = null;
  let fetchCleanup: (() => void) | null = null;
  
  // Use hooks from bun:test
  beforeAll(() => {
    // Setup dependency container isolation
    const { container, cleanup } = setupDependencyContainer();
    diContainer = container;
    
    // Setup fetch mocking if requested
    if (options.mockFetch) {
      const [restoreFn] = mockFetch();
      fetchCleanup = restoreFn;
    }
    
    // Ensure cleanup runs after the test suite
    afterAll(() => {
      // Clean up in reverse order
      if (fetchCleanup) {
        fetchCleanup();
      }
      
      if (cleanup) {
        cleanup();
      }
    });
  });
  
  return {
    // Expose the container to test suites
    get container(): SimpleContainer {
      if (!diContainer) {
        throw new Error('Container not initialized. Make sure to use this within a test suite.');
      }
      return diContainer;
    },
  };
}