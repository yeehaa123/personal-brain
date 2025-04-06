# Context Standardization Guide

This document provides a guide for standardizing and refactoring context implementations in the Personal Brain project. It outlines the architecture, implementation patterns, and step-by-step process for converting existing contexts to use the new standardized approach.

## Architecture Overview

The standardized context architecture consists of several key components:

1. **Base Interfaces**
   - `ContextInterface`: Core interface that all contexts implement
   - `StorageInterface`: Interface for data persistence operations
   - `FormatterInterface`: Interface for data formatting operations

2. **BaseContext Abstract Class**
   - Base implementation of `ContextInterface`
   - Provides standard singleton pattern support
   - Handles MCP server integration
   - Manages resources and tools

3. **Storage Adapters**
   - Adapt existing repositories to the `StorageInterface`
   - Allow gradual migration without breaking existing code

4. **Specialized Context Implementations**
   - Extend `BaseContext` with domain-specific functionality
   - Implement abstract methods defined in `BaseContext`

## Implementation Process

Follow these steps when refactoring an existing context to use the standardized architecture:

### 1. Create a Storage Adapter

Create an adapter that implements `StorageInterface` and wraps the existing repository:

```typescript
export class ExampleStorageAdapter implements StorageInterface<ExampleEntity> {
  constructor(private repository: ExampleRepository) {}
  
  async create(item: Partial<ExampleEntity>): Promise<string> {
    // Implement using the wrapped repository
  }
  
  async read(id: string): Promise<ExampleEntity | null> {
    // Implement using the wrapped repository
  }
  
  // Implement other methods from StorageInterface
}
```

### 2. Create a Configuration Interface

Define a configuration interface for the context:

```typescript
export interface ExampleContextConfig {
  // Context-specific configuration options
  name?: string;
  version?: string;
  apiKey?: string;
}
```

### 3. Implement the Context Class

Create a new context class that extends `BaseContext`:

```typescript
export class ExampleContext extends BaseContext {
  // Storage adapter 
  private storage: StorageInterface<ExampleEntity>;
  
  // Domain-specific services and formatters
  private specialService: ExampleSpecialService;
  private formatter: ExampleFormatter;
  
  // Singleton instance
  private static instance: ExampleContext | null = null;
  
  // Static getInstance method (required)
  static override getInstance(config: ExampleContextConfig = {}): ExampleContext {
    if (!ExampleContext.instance) {
      ExampleContext.instance = new ExampleContext(config);
    }
    return ExampleContext.instance;
  }
  
  // Create a fresh instance (for testing)
  static createFresh(config: ExampleContextConfig = {}): ExampleContext {
    return new ExampleContext(config);
  }
  
  // Reset the singleton instance (required)
  static override resetInstance(): void {
    ExampleContext.instance = null;
  }
  
  // Constructor
  constructor(config: ExampleContextConfig = {}) {
    super(config as Record<string, unknown>);
    
    // Initialize dependencies
    this.specialService = new ExampleSpecialService();
    this.formatter = new ExampleFormatter();
    
    // Create storage adapter
    const repository = getService<ExampleRepository>(ServiceIdentifiers.ExampleRepository);
    this.storage = new ExampleStorageAdapter(repository);
  }
  
  // Required BaseContext abstract methods
  override getContextName(): string {
    return (this.config['name'] as string) || 'ExampleContext';
  }
  
  override getContextVersion(): string {
    return (this.config['version'] as string) || '1.0.0';
  }
  
  protected override initializeMcpComponents(): void {
    // Register resources and tools
    this.resources.push({
      protocol: 'example',
      path: 'get',
      handler: async () => {
        const entity = await this.getEntity();
        return { entity };
      },
      name: 'Get Example',
      description: 'Retrieve example entity',
    });
    
    // Register tools
    this.tools.push({
      protocol: 'example',
      path: 'update',
      handler: async (params: Record<string, unknown>) => {
        // Implementation
      },
      name: 'Update Example',
      description: 'Update example entity',
    });
  }
  
  // Domain-specific methods
  async getEntity(): Promise<ExampleEntity | undefined> {
    // Implementation
  }
  
  // Other domain-specific methods...
}
```

### 4. Update Context Index File

Update the context's index file to export the new implementation:

```typescript
// Core implementation using BaseContext
export { ExampleContext } from './core/exampleContext';
export type { ExampleContextConfig } from './core/exampleContext';

// Export adapter for external use if needed
export { ExampleStorageAdapter } from './adapters/exampleStorageAdapter';
```

### 5. Create Tests

Create comprehensive tests for the new implementation:

- Storage adapter tests
- Context class tests
- MCP integration tests

## Migration Strategy

To minimize disruption during migration, follow these steps:

1. **Create New Implementations**
   - Implement the new standardized context in a separate directory structure
   - Do not modify existing imports or usage patterns initially

2. **Update Main Export**
   - Update the main index.ts file to export the new implementation
   - This allows consumers that import from the main entry point to get the new implementation

3. **Gradual Migration**
   - Identify and update direct imports to the old context file
   - Update tests to use the new implementation
   - Update dependent contexts to use the new implementation

4. **Final Cleanup**
   - Once all usages have been migrated, remove the old implementation
   - Update any remaining references

## Example: ProfileContext Implementation

The ProfileContext has been refactored to follow this pattern:

- Storage adapter: `ProfileStorageAdapter` in `/adapters/profileStorageAdapter.ts`
- Context implementation: `ProfileContext` in `/core/profileContext.ts`
- Configuration: `ProfileContextConfig` interface

The key improvements include:

1. Better separation of concerns:
   - Storage adapter handles data persistence
   - Formatter handles data formatting
   - Context coordinates between components

2. Consistent interface patterns:
   - All contexts expose the same core methods
   - Singleton pattern is implemented consistently
   - MCP integration follows a standard approach

3. Improved testability:
   - Each component can be tested independently
   - Storage adapter can be mocked for context tests
   - `createFresh` method allows creating multiple instances in tests

## Next Steps

The remaining contexts should be refactored in this order:

1. **NoteContext** (medium complexity)
2. **ExternalSourceContext** (medium complexity)
3. **ConversationContext** (high complexity)

Follow the same pattern demonstrated in the ProfileContext implementation.

## Troubleshooting

### Common Issues

1. **Circular Dependencies**
   - If you encounter circular dependency errors, consider splitting interfaces into separate files
   - Use dependency injection to break circular dependencies

2. **Type Compatibility**
   - When adapting repositories to `StorageInterface`, you may need to create helper methods
   - Use type assertions carefully to bridge type differences

3. **Test Framework Compatibility**
   - Bun's test framework has some differences from Jest
   - Avoid using `test.before`, `test.after`, etc.
   - Reset singleton instances manually in each test

### Best Practices

1. **Follow Type-Driven Development**
   - Create and test interfaces first
   - Use TypeScript's static checking to guide implementation

2. **Maintain Backward Compatibility**
   - Ensure that existing code continues to work during migration
   - Write comprehensive tests to verify compatibility

3. **Document Implementation Decisions**
   - Add clear JSDoc comments to explain implementation choices
   - Update architecture documentation when patterns change