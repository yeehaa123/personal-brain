# Context Standardization Plan

## Overview

This document outlines the plan to standardize the implementation of context components in the Personal Brain architecture. The goal is to establish a consistent pattern across all contexts (Note, Profile, Conversation, ExternalSource) to improve maintainability, reduce code duplication, and make the architecture more predictable.

## Current State Analysis

### Identified Inconsistencies

1. **Interface Structure**: Each context defines its own interface without a common base
2. **Storage Patterns**: 
   - NoteContext and ProfileContext use Repository pattern
   - ConversationContext uses Storage interface
   - ExternalSourceContext uses direct Source implementations
3. **Formatter Implementation**: Different approaches to formatting data
4. **MCP Integration**: Varying approaches to setting up resources and tools
5. **Singleton Implementation**: Different initialization and configuration patterns
6. **Component Organization**: Inconsistent internal component structure

### Context Comparison Table

| Feature | NoteContext | ProfileContext | ConversationContext | ExternalSourceContext |
|---------|-------------|----------------|---------------------|------------------------|
| Primary Interface | Direct methods | Direct methods | Comprehensive API | Search-focused API |
| Storage | Repository | Repository | Storage interface | Source implementations |
| Formatter | Simple | Simple | Complex (multiple) | Simple |
| MCP Resources | Few | Few | Many | Moderate |
| MCP Tools | Few | Few | Many | Moderate |
| State Management | Low | Low | High | Moderate |
| Singleton Pattern | Basic | Basic | Complex | Basic |

## Standardization Goals

1. Create a common interface and base class for all contexts
2. Standardize storage abstraction patterns
3. Establish consistent formatter patterns
4. Create uniform MCP resource and tool registration
5. Standardize configuration handling
6. Define a clear component organization structure
7. Document the standard context pattern

## Implementation Plan (Test-Driven Approach)

### Phase 1: Define Interfaces and Write Tests

#### 1.1 Define Base Context Interface

```typescript
export interface ContextInterface {
  // Initialization and state
  initialize(): Promise<boolean>;
  isReady(): boolean;
  getStatus(): ContextStatus;
  
  // MCP integration
  registerOnServer(server: McpServer): boolean;
  getMcpServer(): McpServer;
  getResources(): ResourceDefinition[];
  getTools(): ResourceDefinition[];
}
```

#### 1.2 Define Storage Interface Pattern

```typescript
export interface StorageInterface<T, ID = string> {
  // CRUD operations
  create(item: Partial<T>): Promise<ID>;
  read(id: ID): Promise<T | null>;
  update(id: ID, updates: Partial<T>): Promise<boolean>;
  delete(id: ID): Promise<boolean>;
  
  // Query operations
  search(criteria: SearchCriteria<T>): Promise<T[]>;
  list(options?: ListOptions): Promise<T[]>;
  count(criteria?: SearchCriteria<T>): Promise<number>;
}
```

#### 1.3 Define Formatter Interface Pattern

```typescript
export interface FormatterInterface<T, U> {
  format(data: T, options?: FormattingOptions): U;
}
```

#### 1.4 Write Interface Tests

Before implementing any classes, create comprehensive tests for the interfaces:

```typescript
// tests/mcp/contexts/baseContext.test.ts
describe('BaseContext Interface', () => {
  // Create a mock implementation of ContextInterface for testing
  class MockContext implements ContextInterface {
    // Implement all required methods
  }
  
  let context: MockContext;
  
  beforeEach(() => {
    context = new MockContext();
  });
  
  test('should initialize successfully', async () => {
    const result = await context.initialize();
    expect(result).toBe(true);
    expect(context.isReady()).toBe(true);
  });
  
  test('should register on MCP server', () => {
    const mockServer = new MockMcpServer();
    const result = context.registerOnServer(mockServer);
    expect(result).toBe(true);
  });
  
  // More interface tests...
});
```

Also write tests for storage and formatter interfaces.

### Phase 2: Implement Base Abstract Class with Tests

#### 2.1 Write Tests for BaseContext Abstract Class

```typescript
// tests/mcp/contexts/baseContextImpl.test.ts
describe('BaseContext Abstract Class', () => {
  // Create a concrete implementation for testing
  class TestContext extends BaseContext {
    getContextName(): string {
      return 'TestContext';
    }
    
    getContextVersion(): string {
      return '1.0.0';
    }
    
    protected initializeMcpComponents(): void {
      // Test implementation
    }
  }
  
  let context: TestContext;
  
  beforeEach(() => {
    TestContext.resetInstance();
    context = TestContext.createFresh({});
  });
  
  test('should implement singleton pattern correctly', () => {
    const instance1 = TestContext.getInstance();
    const instance2 = TestContext.getInstance();
    expect(instance1).toBe(instance2);
    
    TestContext.resetInstance();
    const instance3 = TestContext.getInstance();
    expect(instance3).not.toBe(instance1);
  });
  
  // More implementation tests...
});
```

#### 2.2 Implement BaseContext Abstract Class

After tests are in place, implement the abstract class:

```typescript
export abstract class BaseContext implements ContextInterface {
  protected static instance: BaseContext | null = null;
  protected mcpServer: McpServer;
  protected resources: ResourceDefinition[] = [];
  protected tools: ResourceDefinition[] = [];
  protected readyState: boolean = false;
  
  constructor(protected config: ContextConfig = {}) {
    this.mcpServer = new McpServer({
      name: this.getContextName(),
      version: this.getContextVersion(),
    });
    this.initializeMcpComponents();
  }
  
  // Factory methods (to be implemented in derived classes)
  static getInstance(options?: any): BaseContext {
    throw new Error('getInstance must be implemented by derived classes');
  }
  
  static createFresh(options?: any): BaseContext {
    throw new Error('createFresh must be implemented by derived classes');
  }
  
  static resetInstance(): void {
    throw new Error('resetInstance must be implemented by derived classes');
  }
  
  // Abstract methods to be implemented by derived contexts
  abstract getContextName(): string;
  abstract getContextVersion(): string;
  protected abstract initializeMcpComponents(): void;
  
  // Common implementation of interface methods
  async initialize(): Promise<boolean> {
    try {
      // Base initialization logic
      this.readyState = true;
      return true;
    } catch (error) {
      logger.error(`Error initializing ${this.getContextName()}: ${error}`);
      this.readyState = false;
      return false;
    }
  }
  
  isReady(): boolean {
    return this.readyState;
  }
  
  getStatus(): ContextStatus {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      ready: this.isReady(),
      resourceCount: this.resources.length,
      toolCount: this.tools.length,
    };
  }
  
  registerOnServer(server: McpServer): boolean {
    try {
      this.registerMcpResources(server);
      this.registerMcpTools(server);
      return true;
    } catch (error) {
      logger.error(`Error registering ${this.getContextName()} on MCP server: ${error}`);
      return false;
    }
  }
  
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
  
  getResources(): ResourceDefinition[] {
    return [...this.resources];
  }
  
  getTools(): ResourceDefinition[] {
    return [...this.tools];
  }
  
  // Protected common methods for derived classes to use
  protected registerMcpResources(server: McpServer): number {
    // Standard resource registration implementation
    return 0;
  }
  
  protected registerMcpTools(server: McpServer): number {
    // Standard tool registration implementation
    return 0;
  }
  
  protected getToolSchema(toolName: string): Record<string, z.ZodTypeAny> {
    // Default implementation returns empty schema
    return {};
  }
}
```

### Phase 3: Refactor Each Context with Tests First

#### Refactoring Priority

1. ProfileContext (simplest)
2. NoteContext
3. ExternalSourceContext
4. ConversationContext (most complex)

For each context, follow this test-driven process:

#### 3.1 Write Adapter Tests

Before modifying the existing context, create tests for any adapter classes needed:

```typescript
// tests/mcp/contexts/profiles/profileStorageAdapter.test.ts
describe('ProfileStorageAdapter', () => {
  let adapter: ProfileStorageAdapter;
  let mockRepository: jest.Mocked<ProfileRepository>;
  
  beforeEach(() => {
    mockRepository = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      // other mocked methods
    } as unknown as jest.Mocked<ProfileRepository>;
    
    adapter = new ProfileStorageAdapter(mockRepository);
  });
  
  test('create method should call repository insertProfile', async () => {
    const profile = { name: 'Test User' };
    mockRepository.insertProfile.mockResolvedValue('profile-1');
    
    const result = await adapter.create(profile);
    
    expect(mockRepository.insertProfile).toHaveBeenCalledWith(profile);
    expect(result).toBe('profile-1');
  });
  
  // More adapter tests...
});
```

#### 3.2 Write Extended Context Tests

Write tests for the context that will extend BaseContext:

```typescript
// tests/mcp/contexts/profiles/profileContext.test.ts
describe('ProfileContext', () => {
  let context: ProfileContext;
  let mockStorage: jest.Mocked<ProfileStorage>;
  
  beforeEach(() => {
    ProfileContext.resetInstance();
    
    mockStorage = {
      create: jest.fn(),
      read: jest.fn(),
      // other mocked methods
    } as unknown as jest.Mocked<ProfileStorage>;
    
    context = ProfileContext.createFresh({ storage: mockStorage });
  });
  
  test('should extend BaseContext', () => {
    expect(context).toBeInstanceOf(BaseContext);
  });
  
  test('should implement singleton pattern correctly', () => {
    const instance1 = ProfileContext.getInstance({ storage: mockStorage });
    const instance2 = ProfileContext.getInstance();
    expect(instance1).toBe(instance2);
  });
  
  test('getProfile should call storage.read', async () => {
    mockStorage.read.mockResolvedValue({ id: 'profile-1', name: 'Test User' });
    
    const result = await context.getProfile();
    
    expect(mockStorage.read).toHaveBeenCalled();
    expect(result).toEqual({ id: 'profile-1', name: 'Test User' });
  });
  
  // More context tests...
});
```

#### 3.3 Implement Context Adapters

After adapter tests pass, implement the adapter classes:

```typescript
export class ProfileRepositoryAdapter implements ProfileStorage {
  private repository: ProfileRepository;
  
  constructor(repository?: ProfileRepository) {
    this.repository = repository || new ProfileRepository();
  }
  
  // Implement ProfileStorage methods using repository
  async create(item: Partial<Profile>): Promise<string> {
    return this.repository.insertProfile(item as Profile);
  }
  
  async read(id: string): Promise<Profile | null> {
    return this.repository.getProfile();
  }
  
  // Other adapter methods...
}
```

#### 3.4 Implement the Context Class

After tests pass, implement the context class:

```typescript
export class ProfileContext extends BaseContext {
  private static instance: ProfileContext | null = null;
  
  private storage: ProfileStorage;
  private formatter: ProfileFormatter;
  
  private constructor(options?: ProfileContextOptions) {
    super(options);
    
    this.storage = options?.storage || new ProfileRepositoryAdapter();
    this.formatter = new ProfileFormatter();
    
    this.initializeMcpComponents();
  }
  
  public static getInstance(options?: ProfileContextOptions): ProfileContext {
    if (!ProfileContext.instance) {
      ProfileContext.instance = new ProfileContext(options);
    }
    return ProfileContext.instance;
  }
  
  public static createFresh(options?: ProfileContextOptions): ProfileContext {
    return new ProfileContext(options);
  }
  
  public static resetInstance(): void {
    ProfileContext.instance = null;
  }
  
  getContextName(): string {
    return 'ProfileContext';
  }
  
  getContextVersion(): string {
    return '1.0.0';
  }
  
  // Context-specific public API methods that delegate to storage
  async getProfile(): Promise<Profile | null> {
    return this.storage.read('profile');
  }
  
  // More API methods...
  
  // Implementation of abstract methods
  protected initializeMcpComponents(): void {
    // Initialize resources and tools arrays
  }
  
  // Override base methods as needed
}
```

### Phase 3: ConversationContext Standardization

As the most complex context, ConversationContext requires special consideration:

1. **Preserve Tiered Memory Functionality**: Keep the sophisticated tiered memory system
2. **Standardize Interface**: Align with the BaseContext pattern
3. **Refactor Storage Interface**: Ensure it follows the standard StorageInterface pattern
4. **Extract Sub-Components**: Better isolate ConversationMemory, TieredMemoryManager, etc.
5. **Update MCP Integration**: Follow standardized MCP registration patterns

### Phase 4: Testing and Documentation

1. **Update Tests**: Ensure all tests pass with the new structure
2. **Create Interface Tests**: Add tests that verify each context correctly implements the interface
3. **Document Context Pattern**: Create comprehensive documentation of the standardized pattern
4. **Update Architecture Docs**: Update architecture documentation to reflect the new structure

## Implementation Timeline

| Phase | Task | Estimated Effort |
|-------|------|------------------|
| 1 | Define Interfaces and Write Interface Tests | 0.5 day |
| 2 | Write Tests for BaseContext Abstract Class | 0.5 day |
| 2 | Implement BaseContext Abstract Class | 0.5 day |
| 3.1 | Write ProfileContext Adapter Tests | 0.25 day |
| 3.2 | Write Extended ProfileContext Tests | 0.25 day |
| 3.3 | Implement ProfileContext Adapters | 0.25 day |
| 3.4 | Implement ProfileContext Class | 0.25 day |
| 3.5-3.12 | Repeat for NoteContext and ExternalSourceContext | 1.5 days |
| 4 | Write ConversationContext Adapter Tests | 0.5 day |
| 4 | Write Extended ConversationContext Tests | 0.5 day |
| 4 | Implement ConversationContext Adapters | 0.5 day |
| 4 | Implement ConversationContext Class | 0.5 day |
| 5 | Update Documentation | 0.5 day |
| | **Total** | **6-7 days** |

## First Step Implementation Example: ProfileContext

Here's a detailed implementation plan for the ProfileContext refactoring:

```typescript
// Before refactoring
export class ProfileContext {
  private static instance: ProfileContext | null = null;
  
  private profileRepository: ProfileRepository;
  private profileFormatter: ProfileFormatter;
  
  // etc...
}

// After refactoring
export class ProfileContext extends BaseContext {
  private static instance: ProfileContext | null = null;
  
  private storage: ProfileStorage;
  private formatter: ProfileFormatter;
  
  private constructor(options?: ProfileContextOptions) {
    super(options);
    
    this.storage = options?.storage || new ProfileRepositoryAdapter();
    this.formatter = new ProfileFormatter();
    
    this.initializeMcpComponents();
  }
  
  public static getInstance(options?: ProfileContextOptions): ProfileContext {
    if (!ProfileContext.instance) {
      ProfileContext.instance = new ProfileContext(options);
    }
    return ProfileContext.instance;
  }
  
  public static createFresh(options?: ProfileContextOptions): ProfileContext {
    return new ProfileContext(options);
  }
  
  public static resetInstance(): void {
    ProfileContext.instance = null;
  }
  
  getContextName(): string {
    return 'ProfileContext';
  }
  
  getContextVersion(): string {
    return '1.0.0';
  }
  
  // Maintain existing public API for backward compatibility
  
  // Implement abstract methods
  protected initializeMcpComponents(): void {
    // Initialize resources and tools
  }
}

// Adapter to convert ProfileRepository to ProfileStorage
class ProfileRepositoryAdapter implements ProfileStorage {
  private repository: ProfileRepository;
  
  constructor() {
    this.repository = new ProfileRepository();
  }
  
  // Implement ProfileStorage methods using repository
}
```

## Expected Benefits

1. **Consistency**: Unified patterns across all contexts
2. **Maintainability**: Easier to understand and maintain code
3. **Better Testing**: Test-driven approach ensures proper implementation
4. **Easier Extension**: Clear patterns for adding new contexts
5. **Improved Documentation**: Standardized patterns are easier to document
6. **Enhanced Maintainability**: Consistent codebase is easier to maintain
7. **Regression Prevention**: Tests written first help prevent regressions
8. **Design Validation**: Interface tests validate the design before implementation

## Potential Challenges

1. **Backwards Compatibility**: Ensure existing code continues to work
2. **Testing Effort**: Writing comprehensive tests takes significant time
3. **Interface Design**: Finding the right level of abstraction for all contexts
4. **Time Investment**: Test-driven approach takes longer initially but provides better quality
5. **Mock Creation**: Creating proper mocks for all dependencies can be complex
6. **Over-Engineering Risk**: Need to avoid over-abstracting patterns
7. **Learning Curve**: Team needs to understand and follow the test-driven process

## Conclusion

This standardization plan will significantly improve the architectural consistency of the Personal Brain codebase. By establishing common patterns across all contexts, we will create a more maintainable, extensible, and understandable system.

The test-driven implementation approach ensures higher quality and better design by:
1. Validating interface designs before implementation
2. Ensuring all components adhere to the defined contracts
3. Preventing regressions during the refactoring process
4. Providing documentation through tests

Starting with the simplest contexts and progressing to the more complex ones allows us to refine our approach incrementally while maintaining a functioning system throughout the process. The focus on writing tests first might require more time initially but will result in a more robust and maintainable architecture that will serve as a solid foundation for future development.