# Resource Access Pattern

This document outlines the recommended patterns for accessing external resources (like AI models) throughout the codebase. Following these patterns will ensure consistent resource access, improved testability, and better separation of concerns.

## Recommended Pattern: Direct Dependency Injection

The preferred pattern is to inject specific resources directly as dependencies rather than injecting ResourceRegistry:

### 1. Define Dependencies Interface with Specific Resources

```typescript
/**
 * Dependencies interface for MyComponent
 */
export interface MyComponentDependencies {
  /** Logger for operations */
  logger: Logger;
  /** Claude model for AI operations */
  claudeModel: ClaudeModel;
  /** Any other specific resources needed */
  embeddingService?: EmbeddingService;
}
```

### 2. Access Resources via ServiceRegistry

In the factory methods (`getInstance()` and `createFresh()`), obtain resources through ServiceRegistry:

```typescript
public static getInstance(config?: MyComponentConfig): MyComponent {
  if (!MyComponent.instance) {
    const logger = Logger.getInstance();
    // Get resources through ServiceRegistry
    const serviceRegistry = ServiceRegistry.getInstance();
    const claudeModel = serviceRegistry.getResourceRegistry().getClaudeModel();
    
    MyComponent.instance = new MyComponent({
      logger,
      claudeModel,
    }, config);
  }
  return MyComponent.instance;
}
```

### 3. Store Dependencies as Instance Variables

```typescript
/**
 * Private constructor to enforce factory methods
 */
private constructor(dependencies: MyComponentDependencies, config?: MyComponentConfig) {
  // Initialize dependencies
  this.logger = dependencies.logger;
  this.claudeModel = dependencies.claudeModel;
  
  // Initialize configuration
  this.config = {
    // Apply default values or use provided config
    optionA: config?.optionA ?? defaultOptionA,
    optionB: config?.optionB ?? defaultOptionB,
  };
}
```

### 4. Use Dependencies Directly in Methods

```typescript
async processQuery(query: string): Promise<string> {
  try {
    // Use Claude model directly
    const response = await this.claudeModel.complete({
      systemPrompt: 'You are a helpful assistant',
      userPrompt: query,
    });
    
    return response.object.answer;
  } catch (error) {
    this.logger.error('Error processing query', { error });
    return 'Sorry, an error occurred';
  }
}
```

## Benefits of This Approach

1. **Explicit Dependencies**: Component clearly states what resources it needs
2. **Improved Testability**: Easily mock specific resources without complex registry mocking
3. **Reduced Coupling**: Components depend only on what they use, not the entire registry
4. **Type Safety**: Proper typing for each resource dependency
5. **Consistent Pattern**: Follows the Component Interface Standardization pattern

## Anti-Patterns to Avoid

1. **Directly getting ResourceRegistry in the constructor**:
   ```typescript
   // AVOID THIS
   private constructor() {
     this.resourceRegistry = ResourceRegistry.getInstance();
   }
   ```

2. **Getting resources in methods instead of the constructor**:
   ```typescript
   // AVOID THIS
   async processQuery(query: string): Promise<string> {
     const claude = ResourceRegistry.getInstance().getClaudeModel();
     // ...
   }
   ```

3. **Depending on ResourceRegistry for everything**:
   ```typescript
   // AVOID THIS
   export interface MyComponentDependencies {
     resourceRegistry: ResourceRegistry;
   }
   ```

## Testing Components with Direct Dependencies

```typescript
// Create mock dependencies
const mockLogger = MockLogger.createFresh({ silent: true });
const mockClaudeModel = MockClaudeModel.createFresh();

// Configure mock behavior if needed
mockClaudeModel.complete = async () => ({
  object: { answer: 'This is a mock response' },
  usage: { inputTokens: 10, outputTokens: 20 },
});

// Create component with mocked dependencies
const component = MyComponent.createFresh(
  { optionA: true },
  {
    logger: mockLogger,
    claudeModel: mockClaudeModel,
  },
);

// Test component behavior
const result = await component.processQuery('test query');
expect(result).toBe('This is a mock response');
```

## Example Implementation: TagExtractor

The TagExtractor demonstrates this pattern by:

1. Defining clear dependencies (`logger`, `claudeModel`)
2. Obtaining resources through ServiceRegistry in factory methods
3. Using typed configuration options
4. Accessing resources directly in methods

See `/src/utils/tagExtractor.ts` for the full implementation.