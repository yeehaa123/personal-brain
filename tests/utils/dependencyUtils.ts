/**
 * Dependency container utilities for tests
 */

// Mock dependency container
export function setupDependencyContainerMocks(
  mockFn: { module: (name: string, factory: () => unknown) => void }, 
  services: Record<string, unknown> = {},
): void {
  mockFn.module('@utils/dependencyContainer', () => {
    return {
      DependencyContainer: {
        registerSingleton: () => {},
        get: (serviceId: string) => services[serviceId] || {},
      },
    };
  });
}

// Helper function to set up and tear down DI test suite
export function setupDITestSuite(
  beforeAllFn: () => void, 
  afterAllFn: () => void,
): void {
  // Container setup
  beforeAllFn();
  
  // Container teardown
  afterAllFn();
}