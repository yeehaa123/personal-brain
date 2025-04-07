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