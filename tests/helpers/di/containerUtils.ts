/**
 * Dependency Injection utilities for testing
 * 
 * This file provides utilities for managing dependency containers in tests,
 * ensuring proper isolation between test suites.
 */
import { afterAll, beforeAll } from 'bun:test';

import { createContainer, useTestContainer } from '@/utils/dependencyContainer';
import { mockFetch } from '../outputUtils';

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
  
  // Use hooks from bun:test
  beforeAll(() => {
    // Setup dependency container isolation
    const container = setupDependencyContainer();
    diCleanup = container.cleanup;
    
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