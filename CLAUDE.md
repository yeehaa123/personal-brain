# CLAUDE.md - Guidelines for Personal Brain Repository

## Allowed External URLs
- https://blog.hubspot.com/
- https://www.hubspot.com/
- https://webflow.com/blog/
- https://www.smashingmagazine.com/
- https://www.notion.so/

## Development Commands
- **Install**: `bun install`
- **Run**: `bun run src/index.ts`
- **Typecheck**: `bun run typecheck` (alias for `tsc --noEmit`)
- **Format**: `bun run fmt` (uses Biome or Prettier)
- **Lint**: `bun run lint`
- **Lint and Fix**: `bun run lint:fix` (automatically fixes many linting issues)
- **Test**: `bun test` (for all tests)
- **Single Test**: `bun test path/to/test.ts`

## Code Style Guidelines
- **TypeScript**: Use strict typing (noImplicitAny, strictNullChecks)
- **Imports**: Group by 1) built-in, 2) external, 3) internal; sort alphabetically
- **Import Pattern**: Always use barrel files (index.ts) for imports:
  - Use highest-level barrel exports: `import { NoteContext } from '@/contexts'` instead of `from '@/contexts/notes/core/noteContext'`
  - Only use direct file imports for dynamic imports (to avoid circular dependencies)
  - Group related imports from the same barrel: `import { Type1, Type2, Type3 } from '@/module'`
- **Formatting**: 2-space indentation, single quotes, trailing comma
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Use explicit try/catch; avoid throwing in async functions
- **Async**: Prefer async/await over raw promises
- **Comments**: JSDoc for exported functions and complex logic
- **File Structure**: One responsibility per file, max ~300 lines
- **Exports**: Prefer named over default exports

## Project-Specific Patterns
- Use Bun as the runtime environment
- ESM modules preferred (type: "module" in package.json)
- Follow React function component patterns for UI
- Run `lint:fix` frequently during refactoring to prevent import ordering issues
- Use TypeScript path aliases (@/ prefix) consistently for internal imports

## Registry Standardization Pattern

The project uses standardized Registry classes for dependency management:

```typescript
// Registry interface to ensure consistent implementation
export interface IRegistry<T extends RegistryOptions = RegistryOptions> {
  // Core methods
  initialize(): boolean;
  isInitialized(): boolean;
  
  // Component management
  register<C>(id: string, factory: RegistryFactory<C>, singleton?: boolean): void;
  resolve<C>(id: string): C;
  has(id: string): boolean;
  unregister(id: string): void;
  clear(): void;
  
  // Configuration
  updateOptions(options: Partial<T>): void;
}

// Registry base class implementation
export abstract class Registry<TOptions extends RegistryOptions = RegistryOptions> implements IRegistry<TOptions> {
  // Initialization tracking
  private initialized = false;
  
  // Registry type for context-specific operations
  protected abstract readonly registryType: 'resource' | 'service';
  
  // Standard initialization method
  public initialize(): boolean {
    if (this.initialized) return true;
    
    try {
      // Call the abstract method implemented by derived classes
      this.registerComponents();
      this.initialized = true;
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Abstract method to be implemented by derived classes
  protected abstract registerComponents(): void;
  
  // Check initialization state
  public isInitialized(): boolean {
    return this.initialized;
  }
}
```

Key aspects of this pattern:
1. Explicit initialization tracking with isInitialized()
2. Standardized component registration via abstract registerComponents()
3. Consistent error handling for dependency resolution
4. Auto-initialization on getInstance()
5. Dependency validation between registries

When extending Registry:
```typescript
export class ServiceRegistry extends Registry<ServiceRegistryOptions> {
  protected readonly registryType = 'service';
  
  // Implementation of abstract method
  protected registerComponents(): void {
    // Register standard services
  }
  
  // Helper for registering with dependency validation
  private registerService<T>(
    id: string, 
    factory: (container: SimpleContainer) => T,
    dependencies: string[] = []
  ): void {
    // Validate dependencies before registration
    // Register with validated factory
  }
}
```

## Testing Guidelines

### Test Organization

The test directory structure follows a clear separation of concerns:

```
tests/
├── __mocks__/             # Centralized mock implementations
│   ├── contexts/          # Context mock implementations
│   ├── core/              # Core service mock implementations
│   ├── models/            # Model mock implementations
│   ├── protocol/          # Protocol component mock implementations
│   ├── repositories/      # Repository mock implementations
│   ├── services/          # Service mock implementations
│   ├── storage/           # Storage mock implementations
│   └── utils/             # Utility mock implementations
├── helpers/               # Test helper functions
│   ├── di/                # Dependency injection helpers
│   ├── envUtils.ts        # Environment variable test utilities
│   ├── index.ts           # Main helper exports
│   └── outputUtils.ts     # Console/output capture utilities
├── [test modules...]      # Actual test files
```

### Import Patterns

Always use barrel files for imports, and use standardized import paths for test utilities:

```typescript
// GOOD: Standardized import paths with TypeScript path aliases
import { createMockNote } from '@test/__mocks__/models/note';
import { setMockEnv, clearMockEnv } from '@test/helpers/envUtils';
import { mockFetch } from '@test/helpers/outputUtils';

// BAD: Relative import paths that are fragile to refactoring
import { createMockNote } from '../../../__mocks__/models/note';
```

### Mock Implementation Patterns

This codebase uses two primary patterns for mock implementations:

1. **Mock Classes** - For services, repositories, and components that follow the Component Interface Standardization pattern:

```typescript
// In @test/__mocks__/services/mockSearchService.ts
export class MockSearchService implements SearchService {
  // Singleton pattern implementation
  private static instance: MockSearchService | null = null;
  
  static getInstance(): MockSearchService {
    if (!MockSearchService.instance) {
      MockSearchService.instance = new MockSearchService();
    }
    return MockSearchService.instance;
  }
  
  static resetInstance(): void {
    MockSearchService.instance = null;
  }
  
  static createFresh(options?: MockOptions): MockSearchService {
    const service = new MockSearchService();
    // Set up the mock with options if provided
    if (options?.results) {
      service.mockResults = options.results;
    }
    return service;
  }
  
  // Mock state
  private mockResults: SearchResult[] = [];
  
  // Implement interface methods
  async search(query: string): Promise<SearchResult[]> {
    return this.mockResults;
  }
}
```

2. **Factory Functions** - For simpler data objects that don't need state management:

```typescript
// In @test/__mocks__/models/mockNote.ts
export function createMockNote(
  id = 'mock-note-id',
  title = 'Mock Note Title',
  tags = ['mock', 'test'],
  content = 'Mock note content'
): Note {
  return {
    id,
    title,
    tags,
    content,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}
```

### Environment Setup

Use standard environment helpers for test setup/teardown:

```typescript
import { setMockEnv, clearMockEnv } from '@test/helpers/envUtils';

describe('Your Test Suite', () => {
  beforeAll(() => {
    // Standard environment setup with API keys, etc.
    setMockEnv();
    // Add any custom environment variables needed
    setTestEnv('CUSTOM_VAR', 'value');
  });
  
  afterAll(() => {
    // Clean up environment
    clearMockEnv();
  });
});
```

### Test Isolation Patterns

This codebase uses a standardized pattern for test isolation that ensures components and their dependencies are properly reset between tests:

#### 1. Reset Singletons in beforeEach

Always reset singleton instances before each test to prevent test interference:

```typescript
import { beforeEach, describe, test } from 'bun:test';
import { MyService } from '@/services/myService';

describe('My Service Tests', () => {
  // Reset singleton before each test
  beforeEach(() => {
    MyService.resetInstance();
    // Reset other related singletons if needed
    DependencyService.resetInstance();
  });
  
  test('should perform some operation', () => {
    // Get a clean instance for this test
    const service = MyService.getInstance();
    // Test with a clean state...
  });
});
```

#### 2. Use createFresh for Isolated Testing

When you need special configurations that shouldn't affect the singleton:

```typescript
test('should handle special configuration', () => {
  // Create an isolated instance with special config
  const service = MyService.createFresh({
    specialMode: true,
    customTimeout: 5000,
  });
  
  // Test this specific configuration without affecting the singleton
  expect(service.getTimeout()).toBe(5000);
});
```

#### 3. Use Dependency Injection

For testing interaction between components:

```typescript
import { setupDependencyContainer } from '@test/helpers/di/containerUtils';

test('component with isolated dependencies', () => {
  const { container, cleanup } = setupDependencyContainer();
  
  try {
    // Register mock dependencies
    container.register('logger', MockLogger.createFresh());
    container.register('repository', MockRepository.createFresh(initialData));
    
    // Create component under test
    const service = MyService.createFresh({ container });
    
    // Test with controlled dependencies...
  } finally {
    // Clean up dependencies
    cleanup();
  }
});
```

## Architecture Patterns & Anti-patterns

### Recommended Patterns

1. **Component Interface Standardization Pattern**: Use a consistent pattern for all singleton components with getInstance/resetInstance/createFresh methods.
   ```typescript
   /**
    * Your class documentation
    */
   export class MyClass {
     // Singleton instance, always null initially
     private static instance: MyClass | null = null;
     
     // Private constructor to enforce getInstance() usage
     private constructor(options?: Options) {
       // Implementation...
     }
     
     /**
      * Get the singleton instance of the component
      * @param options Configuration options
      * @returns The shared instance
      */
     public static getInstance(options?: Options): MyClass {
       if (!MyClass.instance) {
         MyClass.instance = new MyClass(options);
         // Auto-initialize for components with initialize method
         if ('initialize' in MyClass.instance && typeof MyClass.instance.initialize === 'function') {
           MyClass.instance.initialize();
         }
       }
       return MyClass.instance;
     }
     
     /**
      * Reset the singleton instance (primarily for testing)
      * This clears the instance and any resources it holds
      */
     public static resetInstance(): void {
       // Clean up any resources if needed
       if (MyClass.instance) {
         // MyClass.instance.cleanup();
       }
       MyClass.instance = null;
     }
     
     /**
      * Create a fresh instance (primarily for testing)
      * This creates a new instance without affecting the singleton
      * @param options Configuration options
      * @returns A new instance
      */
     public static createFresh(options?: Options): MyClass {
       const instance = new MyClass(options);
       // Auto-initialize for components with initialize method
       if ('initialize' in instance && typeof instance.initialize === 'function') {
         instance.initialize();
       }
       return instance;
     }
     
     /**
      * Initialize the component (if applicable)
      * This performs any required setup like registering components
      * @returns Success status
      */
     public initialize(): boolean {
       // Initialization logic (for components that need it)
       return true;
     }
     
     /**
      * Check if the component is initialized
      * @returns Initialization status
      */
     public isInitialized(): boolean {
       // Return initialization state
       return true;
     }
   }
   ```

   This pattern has been implemented in several categories of components:
   
   1. **Contexts**: BaseContext, ConversationContext, NoteContext, ProfileContext, ExternalSourceContext
   2. **Managers**: ContextManager, ConversationManager, ProfileManager, ExternalSourceManager
   3. **Services**: All repository and service classes in services/ directory
   4. **Protocol**: BrainProtocol
   5. **Transport**: HeartbeatSSETransport
   6. **Registries**: ResourceRegistry, ServiceRegistry
   
   Using this pattern consistently provides several benefits:
   
   - **Singletons with controlled access**: Components that should have only one instance
   - **Testability**: The resetInstance() method enables proper test isolation
   - **Flexibility**: createFresh() enables creating instances for special test cases
   - **Clear configuration**: Config interfaces provide type safety for initialization options
   - **Consistent API**: All components have the same interface for instantiation
   - **Explicit initialization**: Components with complex setup use initialize/isInitialized methods
   - **Auto-initialization**: getInstance() and createFresh() handle initialization automatically

   > Note: An ESLint rule enforces that any class with getInstance() must also include resetInstance() and createFresh() methods.

2. **Interface-First Design**: Define clear interfaces before implementing classes to ensure proper separation of concerns.
   ```typescript
   // Define interface
   export interface Storage {
     get(id: string): Promise<T | null>;
     set(id: string, value: T): Promise<void>;
   }
   
   // Implement interface
   export class InMemoryStorage implements Storage {
     // Implementation...
   }
   ```

3. **Facade Pattern**: Use context classes as facades that coordinate between specialized components.
   ```typescript
   export class Context {
     private storage: Storage;
     private formatter: Formatter;
     
     // Public methods that delegate to specialized components
   }
   ```

4. **Temporary Adapters for Refactoring**: When moving code, create temporary adapters to maintain backward compatibility.
   ```typescript
   // In old location: protocol/components/index.ts
   export { 
     ContextComponent, 
     ComponentManager 
   } from '@/mcp/contexts/core';
   ```

5. **Incremental Refactoring**: Refactor in small, testable increments rather than big-bang rewrites.

### Anti-patterns to Avoid

1. **Duplicate Implementations**: Don't implement the same functionality in multiple places. Consolidate and share code.
   ```typescript
   // AVOID: Having two very similar adapter classes in different directories
   ```

2. **Direct Dependency on Concrete Classes**: Depend on interfaces instead of concrete implementations.
   ```typescript
   // BAD: constructor(storage: InMemoryStorage)
   // GOOD: constructor(storage: StorageInterface)
   ```

3. **Mixed Responsibilities**: Keep classes focused on a single responsibility.
   ```typescript
   // BAD: class that handles storage, formatting, and API requests
   // GOOD: separate classes for each responsibility
   ```

4. **Inconsistent Error Handling**: Standardize error handling across the codebase.
   ```typescript
   // BAD: mixture of throwing errors and returning null
   // GOOD: consistent approach with AppError types
   ```

5. **Unclear Module Boundaries**: Don't spread related functionality across distant parts of the codebase.

### Refactoring Guidelines

1. **Update Tests First**: When refactoring, update tests to use the new structure first.
2. **Run Tests Frequently**: Verify functionality after each significant change.
3. **Run lint:fix Frequently**: Prevent import ordering and other style issues automatically.
4. **Update One Direction at a Time**: When moving code between directories, update all imports to the new location before removing old code.
5. **Document Architectural Decisions**: Update documentation to reflect major architectural changes.
6. **Use Type Checking**: Run the TypeScript compiler frequently to catch interface mismatches early.
7. **Commit Logical Units**: Make commits focused on specific logical changes rather than many unrelated changes.

## Mock Implementation Standards

1. **Standardized Mock System**: All mocks should follow a consistent pattern:
   - **Singleton Pattern**: Use getInstance(), resetInstance(), and createFresh() methods
   - **Centralized Location**: Define mocks in the tests/__mocks__ directory
   - **Type Compliance**: Implement the same interface as the real implementation
   - **Reset Functionality**: Provide clear method to reset state between tests

2. **Standardized Mock Structure**:
   ```typescript
   export class MockComponent implements ComponentInterface {
     private static instance: MockComponent | null = null;
     
     // Singleton getInstance method
     public static getInstance(options?: Record<string, unknown>): MockComponent {
       if (!MockComponent.instance) {
         MockComponent.instance = new MockComponent(options);
       }
       return MockComponent.instance;
     }
     
     // Reset instance for test isolation
     public static resetInstance(): void {
       MockComponent.instance = null;
     }
     
     // Create fresh instance for test isolation
     public static createFresh(options?: Record<string, unknown>): MockComponent {
       return new MockComponent(options);
     }
     
     // Component implementation...
   }
   ```

3. **Mock Implementation Patterns**:

   **Class-based Mocks**: For services, repositories, and contexts:
   ```typescript
   // In @test/__mocks__/repositories/noteRepository.ts
   export class MockNoteRepository implements NoteRepository {
     private static instance: MockNoteRepository | null = null;
     private notes: Note[] = [];
     
     static getInstance(): MockNoteRepository {
       if (!MockNoteRepository.instance) {
         MockNoteRepository.instance = new MockNoteRepository();
       }
       return MockNoteRepository.instance;
     }
     
     static resetInstance(): void {
       MockNoteRepository.instance = null;
     }
     
     static createFresh(initialNotes: Note[] = []): MockNoteRepository {
       const repo = new MockNoteRepository();
       repo.notes = [...initialNotes];
       return repo;
     }
     
     // Repository methods...
   }
   ```

   **Factory Functions**: For models and simple objects:
   ```typescript
   // In @test/__mocks__/models/note.ts
   export function createMockNote(
     id = 'mock-note-id',
     title = 'Mock Note Title',
     tags = ['mock', 'test'],
     content = 'Mock note content'
   ): Note {
     return {
       id,
       title,
       tags,
       content,
       created: new Date().toISOString(),
       updated: new Date().toISOString(),
       embedding: createMockEmbedding(content),
     };
   }
   
   export function createMockNotes(count = 3): Note[] {
     return Array.from({ length: count }, (_, i) => 
       createMockNote(`note-${i}`, `Note ${i}`, ['mock', `tag-${i}`])
     );
   }
   ```

4. **Helper Utilities**:

   **Environment Helpers**: For setting up test environments:
   ```typescript
   // In @test/helpers/envUtils.ts
   export function setMockEnv(): void {
     // Sets up standard API keys and other environment variables
     setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
     setTestEnv('OPENAI_API_KEY', 'mock-openai-key');
     // ...
   }
   
   export function clearMockEnv(): void {
     // Cleans up environment variables after tests
     clearTestEnv('ANTHROPIC_API_KEY');
     clearTestEnv('OPENAI_API_KEY');
     // ...
   }
   ```

   **Output Capture**: For testing console output:
   ```typescript
   // In @test/helpers/outputUtils.ts
   export function captureOutput() {
     let output = '';
     const originalWrite = process.stdout.write;
     
     process.stdout.write = function(str) {
       output += str.toString();
       return true;
     };
     
     return {
       getOutput: () => output,
       restore: () => {
         process.stdout.write = originalWrite;
       },
     };
   }
   ```

5. **Test Isolation Principles**:
   - Reset all mocks between tests using resetInstance()
   - Use createFresh() for unique test requirements
   - Maintain test purity by avoiding shared state
   - Use helper functions for consistent environment setup
   - Isolate dependencies with setupDependencyContainer()

6. **Mock Anti-Patterns and Best Practices**:
   - **Avoid Utility-Based Mocks**: Don't create separate utility functions for mock functionality that should be part of the standardized mock implementation.
   - **Centralize Mock Logic**: Keep related mock functionality within the mock class itself rather than separating it into utility files.
   - **Avoid Barrel Files in Tests**: Don't use barrel files (index.ts) for test mocks; import mock implementations directly.
   - **Standardized Mock Structure**: Use the Component Interface Standardization pattern consistently (getInstance/resetInstance/createFresh) for all mocks.
   - **Direct Dependencies**: When mocking in test files, only mock direct dependencies of the unit under test, not the unit itself.
   - **Inline Mock Setup**: Define mocks directly in the test files where they're needed, rather than relying on external setup utilities.
   - **Static vs. Instance Methods**: Prefer static methods for utility functions and instance methods for behavior that simulates the real implementation.