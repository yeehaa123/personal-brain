# Context Interface Implementation Example

This document provides a concrete example of how to implement the standardized interfaces for a context class. Use this as a reference when updating existing contexts.

## Example Context Implementation

Below is an example of how a complete context implementation should look after implementing all the standardized interfaces:

```typescript
/**
 * Example context implementing all standardized interfaces
 * 
 * This shows how to properly implement:
 * - StorageAccess
 * - FormatterAccess
 * - ServiceAccess
 * - ExtendedContextInterface
 * - FullContextInterface
 */
export class ExampleContext extends BaseContext<
  ExampleStorage,
  ExampleFormatter,
  ExampleData,
  FormattedExampleData
> implements FullContextInterface<
  ExampleStorage,
  ExampleFormatter,
  ExampleData,
  FormattedExampleData
> {
  // Singleton instance
  private static instance: ExampleContext | null = null;
  
  // Internal dependencies
  private storage: ExampleStorage;
  private formatter: ExampleFormatter;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options: ExampleContextConfig = {}): ExampleContext {
    if (!ExampleContext.instance) {
      ExampleContext.instance = new ExampleContext(options);
    }
    return ExampleContext.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    ExampleContext.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(options: ExampleContextConfig = {}): ExampleContext {
    return new ExampleContext(options);
  }
  
  /**
   * Create a new instance with explicit dependencies
   * Implements ExtendedContextInterface
   */
  static createWithDependencies(
    dependencies: ContextDependencies<ExampleStorage, ExampleFormatter>
  ): ExampleContext {
    return new ExampleContext({}, dependencies);
  }
  
  /**
   * Protected constructor to enforce singleton pattern
   */
  protected constructor(
    config: ExampleContextConfig = {},
    dependencies?: ContextDependencies<ExampleStorage, ExampleFormatter>
  ) {
    super(config, dependencies);
    
    // Initialize from dependencies or create default instances
    this.storage = dependencies?.storage || ExampleStorage.getInstance();
    this.formatter = dependencies?.formatter || ExampleFormatter.getInstance();
    
    // Any additional initialization...
  }
  
  /**
   * Get the context name
   * Required by BaseContext
   */
  getContextName(): string {
    return 'ExampleContext';
  }
  
  /**
   * Get the context version
   * Required by BaseContext
   */
  getContextVersion(): string {
    return '1.0.0';
  }
  
  /**
   * Initialize MCP components
   * Required by BaseContext
   */
  protected initializeMcpComponents(): void {
    // Register resources and tools...
    this.resources = [
      // Resource definitions...
    ];
    
    this.tools = [
      // Tool definitions...
    ];
  }
  
  /**
   * Get the storage implementation
   * Implements StorageAccess interface
   */
  override getStorage(): ExampleStorage {
    return this.storage;
  }
  
  /**
   * Get the formatter implementation
   * Implements FormatterAccess interface
   */
  override getFormatter(): ExampleFormatter {
    return this.formatter;
  }
  
  // The format method is inherited from BaseContext
  // The getService method is inherited from BaseContext
  
  /**
   * Example-specific functionality
   */
  async getExampleData(id: string): Promise<ExampleData | null> {
    return this.storage.get(id);
  }
  
  async saveExampleData(data: ExampleData): Promise<void> {
    await this.storage.set(data.id, data);
  }
  
  // Other context-specific methods...
}
```

## Example Formatter Implementation

The formatter should implement the `FormatterInterface`:

```typescript
/**
 * Example formatter implementing FormatterInterface
 */
export class ExampleFormatter implements FormatterInterface<ExampleData, FormattedExampleData> {
  // Singleton instance
  private static instance: ExampleFormatter | null = null;
  
  /**
   * Get the singleton instance
   */
  static getInstance(): ExampleFormatter {
    if (!ExampleFormatter.instance) {
      ExampleFormatter.instance = new ExampleFormatter();
    }
    return ExampleFormatter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    ExampleFormatter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(): ExampleFormatter {
    return new ExampleFormatter();
  }
  
  /**
   * Format the data
   * Implements FormatterInterface
   */
  format(data: ExampleData, options?: FormattingOptions): FormattedExampleData {
    // Format the data...
    return {
      id: data.id,
      title: data.title,
      // Other formatted properties...
      formattedAt: new Date().toISOString(),
    };
  }
}
```

## Example Mock Implementation

The mock implementation should follow the same interfaces:

```typescript
/**
 * Mock context for testing
 */
export class MockExampleContext extends BaseContext<
  MockExampleStorage,
  MockExampleFormatter,
  MockExampleData,
  MockFormattedExampleData
> implements FullContextInterface<
  MockExampleStorage,
  MockExampleFormatter,
  MockExampleData,
  MockFormattedExampleData
> {
  // Singleton instance
  private static instance: MockExampleContext | null = null;
  
  // Mock dependencies
  private mockStorage: MockExampleStorage;
  private mockFormatter: MockExampleFormatter;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options: Record<string, unknown> = {}): MockExampleContext {
    if (!MockExampleContext.instance) {
      MockExampleContext.instance = new MockExampleContext(options);
    }
    return MockExampleContext.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockExampleContext.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options: Record<string, unknown> = {}): MockExampleContext {
    return new MockExampleContext(options);
  }
  
  /**
   * Create with dependencies
   */
  static createWithDependencies(
    dependencies: ContextDependencies<MockExampleStorage, MockExampleFormatter>
  ): MockExampleContext {
    return new MockExampleContext({}, dependencies);
  }
  
  /**
   * Constructor
   */
  private constructor(
    options: Record<string, unknown> = {},
    dependencies?: ContextDependencies<MockExampleStorage, MockExampleFormatter>
  ) {
    super(options, dependencies);
    
    // Initialize mock dependencies
    this.mockStorage = dependencies?.storage || MockExampleStorage.createFresh();
    this.mockFormatter = dependencies?.formatter || MockExampleFormatter.createFresh();
  }
  
  // Required BaseContext implementations
  getContextName(): string {
    return 'MockExampleContext';
  }
  
  getContextVersion(): string {
    return '1.0.0';
  }
  
  protected initializeMcpComponents(): void {
    // No-op for testing
  }
  
  // Interface implementations
  override getStorage(): MockExampleStorage {
    return this.mockStorage;
  }
  
  override getFormatter(): MockExampleFormatter {
    return this.mockFormatter;
  }
  
  // Mock-specific functionality
  setupMockData(data: MockExampleData[]): void {
    for (const item of data) {
      this.mockStorage.set(item.id, item);
    }
  }
}
```

## Implementation Checklist

For each context you update, follow this checklist:

1. [ ] Update class definition with proper type parameters
2. [ ] Implement all required abstract methods from BaseContext
3. [ ] Override getStorage() to return the correct storage type
4. [ ] Override getFormatter() to return the correct formatter type
5. [ ] Update static factory methods (getInstance, resetInstance, createFresh)
6. [ ] Implement createWithDependencies static method
7. [ ] Update constructor to use dependencies if provided
8. [ ] Ensure all tests pass after implementing the interfaces