# CLAUDE.md - Guidelines for Personal Brain Repository

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

Always use standardized import paths for test utilities:

```typescript
// GOOD: Standardized import paths with TypeScript path aliases
import { createMockNote } from '@test/__mocks__/models/note';
import { setMockEnv, clearMockEnv } from '@test/helpers/envUtils';
import { mockFetch } from '@test/helpers/outputUtils';

// BAD: Relative import paths that are fragile to refactoring
import { createMockNote } from '../../../__mocks__/models/note';
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

- Reset singletons between test suites with `resetInstance()`
- Create isolated components with `createFresh()`
- Use `setupDependencyContainer()` for dependency isolation

```typescript
import { setupDependencyContainer } from '@test/helpers/di/containerUtils';

test('component with isolated dependencies', () => {
  const { cleanup } = setupDependencyContainer();
  try {
    // Test with isolated dependencies
  } finally {
    // Clean up dependencies
    cleanup();
  }
});
```

## Architecture Patterns & Anti-patterns

### Recommended Patterns

1. **Singleton with getInstance()**: Use static getInstance() method for components that should have a single instance, but allow createFresh() for testing.
   ```typescript
   public static getInstance(options?: Options): MyClass {
     if (!MyClass.instance) {
       MyClass.instance = new MyClass(options);
     }
     return MyClass.instance;
   }
   ```

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