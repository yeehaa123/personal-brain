# Component Interface Standardization Pattern

This document outlines the standardized pattern for component initialization and lifecycle management across the codebase.

> **Important**: This document represents the latest standardization pattern agreed upon during refactoring. All components should be gradually updated to follow these patterns.

## Core Pattern

The Component Interface Standardization pattern establishes a consistent API for all service, context, and utility classes. This pattern ensures proper dependency injection, testability, and singleton management.

### Key Methods

Each component should implement the following methods:

1. **`getInstance()`**: Returns the singleton instance, initializing it if needed
2. **`resetInstance()`**: Resets the singleton instance (primarily for testing)
3. **`createFresh()`**: Creates a new instance without affecting the singleton

### Implementation Details

#### Dependencies Interface

Each component should define a typed dependencies interface:

```typescript
export interface MyServiceDependencies {
  repository: Repository;  // Required dependency
  logger: Logger;         // Required dependency 
  config: Config;         // Required dependency
}
```

#### Static Methods

```typescript
export class MyService {
  // Singleton instance - always null initially
  private static instance: MyService | null = null;

  /**
   * Get the singleton instance
   * @returns The shared instance, creating it if needed
   */
  public static getInstance(): MyService {
    if (!MyService.instance) {
      // Create with default dependencies
      MyService.instance = new MyService({
        repository: Repository.getInstance(),
        logger: Logger.getInstance(),
        config: Config.getInstance(),
      });
      
      Logger.getInstance().debug('MyService singleton instance created');
    }
    
    return MyService.instance;
  }

  /**
   * Reset the singleton instance
   * Primarily used for testing to ensure a clean state
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (MyService.instance) {
        // Cleanup code here if needed
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during MyService instance reset:', error);
    } finally {
      MyService.instance = null;
      Logger.getInstance().debug('MyService singleton instance reset');
    }
  }

  /**
   * Create a fresh instance
   * Creates a new instance without affecting the singleton
   * 
   * @param config Optional configuration (unused but kept for pattern consistency)
   * @param dependencies Optional dependencies object (required dependencies)
   * @returns A new MyService instance
   */
  public static createFresh(
    _config?: Record<string, unknown>,
    dependencies?: MyServiceDependencies
  ): MyService {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh MyService instance');
    
    if (dependencies) {
      // Use provided dependencies
      return new MyService(dependencies);
    } else {
      // Use default dependencies
      return new MyService({
        repository: Repository.getInstance(),
        logger: logger,
        config: Config.getInstance(),
      });
    }
  }

  /**
   * Private constructor to enforce factory methods
   * @param dependencies The required dependencies
   */
  private constructor(private dependencies: MyServiceDependencies) {
    // Initialize properties from dependencies
    this.repository = dependencies.repository;
    this.logger = dependencies.logger;
    this.config = dependencies.config;
    
    this.logger.debug('MyService instance created');
  }
}
```

## Best Practices

1. **Required Dependencies**: Make all dependencies required in the dependencies interface
2. **Type Safety**: Use TypeScript interfaces for dependency contracts
3. **Private Constructor**: Always use a private constructor to enforce factory method usage
4. **Consistent Naming**: Use consistent parameter names across all implementations
5. **Logging**: Include debug logs for instance creation and reset
6. **Error Handling**: Use try/catch/finally in the resetInstance method
7. **Default Implementation**: Provide sensible defaults in getInstance and createFresh methods
8. **Config Parameter**: Include a config parameter in createFresh for consistency, even if unused

## Testing Pattern

```typescript
describe('MyService', () => {
  beforeEach(() => {
    // Reset all singleton instances before each test
    MyService.resetInstance();
    Repository.resetInstance();
    Logger.resetInstance();
  });
  
  test('getInstance returns singleton instance', () => {
    const instance1 = MyService.getInstance();
    const instance2 = MyService.getInstance();
    
    expect(instance1).toBe(instance2); // Same instance
  });
  
  test('createFresh creates isolated instance', () => {
    const instance1 = MyService.getInstance();
    const instance2 = MyService.createFresh();
    
    expect(instance1).not.toBe(instance2); // Different instances
  });
  
  test('custom dependencies injection', () => {
    const mockRepo = MockRepository.createFresh();
    const mockLogger = MockLogger.createFresh();
    
    const service = MyService.createFresh({}, {
      repository: mockRepo,
      logger: mockLogger,
      config: MockConfig.createFresh()
    });
    
    // Test with custom dependencies
  });
});
```

## Benefits Over Previous Pattern

1. **Removes Inconsistent `createWithDependencies`**: The previous pattern included an inconsistently implemented `createWithDependencies` method, which has been consolidated into the `createFresh` method with an optional dependencies parameter.

2. **Stronger Type Safety**: By using a dedicated dependencies interface, we ensure all required dependencies are properly passed and typed.

3. **Simplified API**: The new pattern reduces the number of factory methods from 4 to 3, making the API more consistent and easier to understand.

4. **More Explicit Dependencies**: Dependencies are now explicitly defined in an interface rather than through a generic Record<string, unknown>.

5. **Better Error Handling**: Standardized error handling in resetInstance method.

## Mock Implementation Pattern

Mock implementations should follow the same standardized pattern as their real counterparts, but with the following additional considerations:

### Type Casting in Factory Methods

Mock classes should handle type casting to the interface they're implementing in their factory methods:

```typescript
export class MockLogger {
  private static instance: MockLogger | null = null;
  
  // Messages store for test assertions
  messages: { info: string[], debug: string[], warn: string[], error: string[] };
  
  constructor(config: MockLoggerConfig = {}) {
    // Initialize mock state
    this.messages = { info: [], debug: [], warn: [], error: [] };
  }
  
  /**
   * Get singleton instance
   * @returns Typed as the interface the mock implements
   */
  public static getInstance(config?: MockLoggerConfig): Logger {
    if (!MockLogger.instance) {
      MockLogger.instance = new MockLogger(config);
    }
    return MockLogger.instance as unknown as Logger;
  }
  
  /**
   * Create fresh instance
   * @returns Typed as the interface the mock implements
   */
  public static createFresh(config?: MockLoggerConfig): Logger {
    return new MockLogger(config) as unknown as Logger;
  }
  
  // Mock implementations of interface methods...
}
```

### Extending Interface for Mocks

To add mock-specific properties without changing the public API, use TypeScript's declaration merging in the tests:

1. Create a test-specific type declaration file (e.g., `tests/types/resource-registry-test.d.ts`):

```typescript
// Add mock properties to the interface in test context
declare module '@/resources' {
  interface ResourceRegistry {
    // Mock properties for testing
    mockModelResponse?: {
      object: unknown;
      usage: { inputTokens: number; outputTokens: number };
    };
    
    // Other mock properties...
  }
}
```

2. Ensure the type declaration is included in `tsconfig.json`:

```json
{
  "include": ["src/**/*", "tests/**/*"]
}
```

This approach allows test code to access mock-specific properties without type casting while keeping the real implementations clean.

## Migration Guide

When updating components to the new pattern:

1. Create a typed dependencies interface for the component
2. Update the constructor to accept this typed interface
3. Update getInstance to use the typed dependencies
4. Update createFresh to accept both config and dependencies parameters
5. Remove any createWithDependencies methods
6. Update tests to use the new pattern
7. If needed, create type extensions for mock properties

## Examples

See the following implementations for examples:
- `ProfileTagService` - `src/services/profiles/profileTagService.ts`
- `ProfileSearchService` - `src/services/profiles/profileSearchService.ts`
- `TagExtractor` - `src/utils/tagExtractor.ts`

For mock implementations:
- `MockLogger` - `tests/__mocks__/core/logger.ts`
- `MockResourceRegistry` - `tests/__mocks__/resources/resourceRegistry.ts`
- Resource Registry type extension - `tests/types/resource-registry-test.d.ts`