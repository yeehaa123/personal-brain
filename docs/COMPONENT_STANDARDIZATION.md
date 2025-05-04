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

#### TypeScript Interfaces

Each component should define both configuration and dependencies interfaces:

```typescript
/**
 * Configuration options for MyService
 */
export interface MyServiceConfig {
  /** Maximum number of items to process */
  maxItems: number;
  /** Enable detailed logging */
  verbose: boolean;
  /** API timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Dependencies required by MyService
 */
export interface MyServiceDependencies {
  /** Repository for data access */
  repository: Repository;
  /** Logger for service logging */
  logger: Logger;
  /** Text utilities for processing */
  textUtils: TextUtils;
}
```

This clear separation between configuration (values) and dependencies (services) makes components more maintainable and easier to test.

#### Static Methods

```typescript
export class MyService {
  // Singleton instance - always null initially
  private static instance: MyService | null = null;

  /**
   * Get the singleton instance
   * 
   * This method retrieves or creates the shared singleton instance using default
   * configuration values from the application config. In production code, prefer
   * accessing this service through the ServiceRegistry.
   * 
   * @returns The shared instance, creating it if needed
   */
  public static getInstance(): MyService {
    if (!MyService.instance) {
      const logger = Logger.getInstance();
      logger.debug('Creating MyService singleton instance');
      
      // Get default configuration from environment/config
      const config: MyServiceConfig = {
        maxItems: getEnvAsInt('MY_SERVICE_MAX_ITEMS', 100),
        verbose: getEnv('MY_SERVICE_VERBOSE', 'false') === 'true',
        timeoutMs: getEnvAsInt('MY_SERVICE_TIMEOUT_MS', 5000),
      };
      
      // Get default dependencies
      const dependencies: MyServiceDependencies = {
        repository: Repository.getInstance(),
        logger: logger,
        textUtils: TextUtils.getInstance(),
      };
      
      // Create instance with default config and dependencies
      MyService.instance = new MyService(config, dependencies);
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
   * Create a fresh instance for testing
   * 
   * This method creates a new instance with explicit configuration and dependencies,
   * without affecting the singleton instance. It is primarily used in tests to create
   * isolated instances with controlled dependencies.
   * 
   * @param config Required configuration for the test instance
   * @param dependencies Required dependencies for the test instance
   * @returns A new isolated MyService instance
   */
  public static createFresh(
    config: MyServiceConfig,
    dependencies: MyServiceDependencies
  ): MyService {
    dependencies.logger.debug('Creating fresh MyService instance');
    return new MyService(config, dependencies);
  }

  /**
   * Private constructor to enforce factory methods
   * 
   * The constructor is private to ensure that instances are only created through
   * the static factory methods (getInstance, createFresh), which provide proper
   * initialization and configuration.
   * 
   * @param config Configuration options
   * @param dependencies Required dependencies
   */
  private constructor(
    config: MyServiceConfig,
    dependencies: MyServiceDependencies
  ) {
    // Store dependencies as instance properties
    this.repository = dependencies.repository;
    this.logger = dependencies.logger;
    this.textUtils = dependencies.textUtils;
    
    // Apply configuration values to instance properties
    this.maxItems = config.maxItems;
    this.verbose = config.verbose;
    this.timeoutMs = config.timeoutMs;
    
    this.logger.debug(`MyService instance created with maxItems: ${this.maxItems}`);
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
9. **Registry Integration**: Register and access components through ResourceRegistry or ServiceRegistry
10. **Clear Documentation**: Document the component's registry integration and usage patterns
11. **Separate Config from Dependencies**: Keep configuration values separate from service dependencies

### Registry-Registered Components

For components that are registered in either ResourceRegistry or ServiceRegistry:

1. The `getInstance()` method should NOT accept parameters - it should get configuration from:
   - Environment variables (via `getEnv()`, `getEnvAsInt()`, etc.)
   - Configuration files (e.g., `config.ts`)
   - Default values as fallbacks

2. Registry registration should validate requirements but NOT pass configuration:
   ```typescript
   this.registerResource(ResourceIdentifiers.MyComponent, () => {
     // Just validate requirements first
     this.validateSomeRequirement();
     // Return the singleton instance without passing config
     return MyComponent.getInstance();
   });
   ```

3. The `getXxx()` methods in registries should return the specific component type:
   ```typescript
   public getMyComponent(): MyComponent {
     return this.resolve<MyComponent>(ResourceIdentifiers.MyComponent);
   }
   ```

## Testing Pattern

```typescript
describe('MyService', () => {
  beforeEach(() => {
    // Reset all singleton instances before each test
    MyService.resetInstance();
    Repository.resetInstance();
    Logger.resetInstance();
    TextUtils.resetInstance();
  });
  
  test('getInstance returns singleton instance', () => {
    const instance1 = MyService.getInstance();
    const instance2 = MyService.getInstance();
    
    expect(instance1).toBe(instance2); // Same instance
  });
  
  test('createFresh creates isolated instance with custom config', () => {
    // Setup test configuration
    const testConfig: MyServiceConfig = {
      maxItems: 50,  // Different from default
      verbose: true, // Different from default
      timeoutMs: 1000, // Different from default
    };
    
    // Setup test dependencies
    const mockDependencies: MyServiceDependencies = {
      repository: Repository.getInstance(),
      logger: Logger.getInstance(),
      textUtils: TextUtils.getInstance(),
    };
    
    // Create instance with test config
    const instance1 = MyService.getInstance(); // Singleton with default config
    const instance2 = MyService.createFresh(testConfig, mockDependencies);
    
    expect(instance1).not.toBe(instance2); // Different instances
    // Can test that the config values were properly applied
  });
  
  test('custom dependencies injection with mocks', () => {
    // Create mock dependencies for testing
    const mockRepo = MockRepository.createFresh() as unknown as Repository;
    const mockLogger = MockLogger.createFresh() as unknown as Logger;
    const mockTextUtils = MockTextUtils.createFresh() as unknown as TextUtils;
    
    // Setup minimal test config
    const testConfig: MyServiceConfig = {
      maxItems: 10,
      verbose: false,
      timeoutMs: 500,
    };
    
    // Create service with mock dependencies
    const service = MyService.createFresh(testConfig, {
      repository: mockRepo,
      logger: mockLogger,
      textUtils: mockTextUtils,
    });
    
    // Interact with the service
    service.doSomething();
    
    // Verify interactions with mocks
    expect(mockRepo.findItem).toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('doSomething'));
  });
  
  test('integration with ServiceRegistry', () => {
    // Create mock registry
    const mockRegistry = MockServiceRegistry.createFresh();
    
    // Register component with registry
    mockRegistry.registerMyService();
    
    // Get component through registry
    const myService = mockRegistry.getMyService();
    
    // Test component functionality
    expect(myService).toBeDefined();
    expect(myService.doSomething()).toBeTruthy();
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

### Reference Implementation

`EmbeddingService` in `src/resources/ai/embedding/embeddings.ts` serves as the canonical reference implementation for this pattern, demonstrating:

- Clear separation of configuration and dependencies
- Proper factory methods (getInstance/resetInstance/createFresh)
- ResourceRegistry integration
- Comprehensive JSDocs explaining usage patterns
- Type-safe dependency interfaces

Other examples:
- `ProfileTagService` - `src/services/profiles/profileTagService.ts`
- `ProfileSearchService` - `src/services/profiles/profileSearchService.ts`
- `TagExtractor` - `src/utils/tagExtractor.ts`

For mock implementations:
- `MockLogger` - `tests/__mocks__/core/logger.ts`
- `MockResourceRegistry` - `tests/__mocks__/resources/resourceRegistry.ts`
- Resource Registry type extension - `tests/types/resource-registry-test.d.ts`

## Integration with Registries

Components should be registered with and accessed through either the ResourceRegistry or ServiceRegistry:

```typescript
// In production code, access components through the registry:
const resourceRegistry = ResourceRegistry.getInstance();
const embeddingService = resourceRegistry.getEmbeddingService();

// NOT recommended in production code (except for special cases):
const embeddingService = EmbeddingService.getInstance();

// For testing only:
const mockDependencies = { 
  logger: MockLogger.createFresh(),
  textUtils: MockTextUtils.createFresh() 
};
const embeddingService = EmbeddingService.createFresh(mockConfig, mockDependencies);
```

This approach ensures proper dependency initialization, configuration management, and simplifies mocking for tests.