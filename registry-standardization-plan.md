# Registry Standardization Plan

## Current State

Both ResourceRegistry and ServiceRegistry are based on the Registry base class, which provides:
- Core functionality for component registration and resolution
- SimpleContainer for dependency management
- Basic logging and configuration features

The current implementation works well but could benefit from additional standardization:
1. ResourceRegistry manages external resources (Claude, embeddings)
2. ServiceRegistry manages internal services and depends on ResourceRegistry
3. Initialization and error handling patterns aren't fully standardized
4. No explicit initialization tracking mechanism

## Goals

1. Enhance the existing Registry base class instead of creating a new one
2. Standardize initialization patterns across all registries
3. Implement consistent error handling and dependency validation
4. Improve the relationship between ResourceRegistry and ServiceRegistry
5. Add explicit initialization state tracking
6. Standardize component registration patterns

## Implementation Plan

### 1. Enhance Registry Base Class

Improve the existing Registry base class with these new features:

```typescript
export abstract class Registry<TOptions extends RegistryOptions = RegistryOptions> {
  // Add initialization tracking
  private initialized = false;
  
  // Add registry type for context-specific operations
  protected abstract readonly registryType: 'resource' | 'service';
  
  // Standard initialization method
  public initialize(): boolean {
    if (this.initialized) return true;
    
    this.logger.info(`Initializing ${this.name} (${this.registryType})`);
    try {
      // Call the abstract method implemented by derived classes
      this.registerComponents();
      this.initialized = true;
      this.logger.info(`${this.name} initialized successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error initializing ${this.name}`, { error });
      return false;
    }
  }
  
  // Abstract method for standardized component registration
  protected abstract registerComponents(): void;
  
  // Check if registry is initialized
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  // Enhance resolve method with better error handling
  public resolve<T = unknown>(id: string): T {
    try {
      return this.container.resolve<T>(id);
    } catch (error) {
      this.logger.error(`Failed to resolve ${this.registryType} with ID "${id}"`, { error });
      throw error;
    }
  }
  
  // Add convenience method for validating dependencies
  protected validateDependency(id: string, dependencyId: string): boolean {
    if (!this.has(dependencyId)) {
      this.logger.error(`Component "${id}" is missing dependency "${dependencyId}"`);
      return false;
    }
    return true;
  }
  
  // Override clear to reset initialization state
  public override clear(): void {
    super.clear();
    this.initialized = false;
  }
}
```

### 2. Standardize ResourceRegistry

Update ResourceRegistry to leverage the enhanced base class:

```typescript
export class ResourceRegistry extends Registry<ResourceRegistryOptions> {
  protected readonly registryType = 'resource';
  
  // Implement registerComponents instead of registerStandardResources
  protected registerComponents(): void {
    if (this.resourcesRegistered) return;
    
    // Register Claude model with validation
    this.registerResource(
      ResourceIdentifiers.ClaudeModel,
      () => {
        const apiKey = this.validateApiKey('anthropic');
        return ClaudeModel.getInstance({ apiKey });
      }
    );
    
    // Register embedding service with validation
    this.registerResource(
      ResourceIdentifiers.EmbeddingService,
      () => {
        const apiKey = this.validateApiKey('openai');
        return EmbeddingService.getInstance({ apiKey });
      }
    );
    
    this.resourcesRegistered = true;
  }
  
  // Standardized resource registration helper
  private registerResource<T>(
    id: string,
    factory: () => T,
    dependencies: string[] = []
  ): void {
    // Validate dependencies before registration
    for (const dependencyId of dependencies) {
      this.validateDependency(id, dependencyId);
    }
    
    this.register(id, () => factory());
  }
  
  // Enhanced API key validation with better error messages
  protected validateApiKey(keyType: 'anthropic' | 'openai'): string {
    const optionsKey = keyType === 'anthropic' ? 'anthropicApiKey' : 'openAiApiKey';
    const envKey = keyType === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    
    const apiKey = this.options[optionsKey] || process.env[envKey];
    if (!apiKey) {
      const error = new Error(`${keyType.toUpperCase()} API key is required but not provided`);
      this.logger.error(`Missing ${keyType} API key`, { error });
      throw error;
    }
    
    return apiKey;
  }
}
```

### 3. Standardize ServiceRegistry

Update ServiceRegistry to improve dependency handling with ResourceRegistry:

```typescript
export class ServiceRegistry extends Registry<ServiceRegistryOptions> {
  protected readonly registryType = 'service';
  private resourceRegistry: ResourceRegistry;
  
  // Update constructor to handle ResourceRegistry dependency consistently
  protected constructor(options: ServiceRegistryOptions) {
    super(options);
    
    // Initialize resource registry with proper validation
    this.resourceRegistry = options.resourceRegistry || ResourceRegistry.getInstance();
    
    // Ensure ResourceRegistry is initialized
    if (!this.resourceRegistry.isInitialized()) {
      this.logger.info(`Initializing ResourceRegistry dependency`);
      const success = this.resourceRegistry.initialize();
      if (!success) {
        this.logger.warn(`ResourceRegistry initialization failed, some services may not work`);
      }
    }
  }
  
  // Implement registerComponents instead of registerStandardServices
  protected registerComponents(): void {
    if (this.servicesRegistered) return;
    
    // Register repositories
    this.registerService<IRepository<Note>>(
      ServiceIdentifiers.NoteRepository,
      () => NoteRepository.getInstance()
    );
    
    // Register embedding services with ResourceRegistry dependency
    this.registerService<IEmbeddingService>(
      ServiceIdentifiers.NoteEmbeddingService,
      () => {
        // Get embedding service from resource registry (used internally by NoteEmbeddingService)
        this.resourceRegistry.getEmbeddingService(); // Ensure it's initialized
        return NoteEmbeddingService.getInstance();
      },
      // Define dependencies explicitly
      [ResourceIdentifiers.EmbeddingService]
    );
    
    // Register search services with explicit dependency declaration
    this.registerService<ISearchService<Note>>(
      ServiceIdentifiers.NoteSearchService,
      (container) => {
        const repository = container.resolve<NoteRepository>(ServiceIdentifiers.NoteRepository);
        const embeddingService = container.resolve<NoteEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
        
        return NoteSearchService.getInstance(repository, embeddingService);
      },
      // Define dependencies explicitly
      [ServiceIdentifiers.NoteRepository, ServiceIdentifiers.NoteEmbeddingService]
    );
    
    this.servicesRegistered = true;
  }
  
  // Standardized service registration helper
  private registerService<T>(
    id: string,
    factory: (container: SimpleContainer) => T,
    dependencies: string[] = []
  ): void {
    // Validate dependencies before registration
    let dependenciesValid = true;
    for (const dependencyId of dependencies) {
      if (this.has(dependencyId)) continue;
      
      // For cross-registry dependencies, check the resource registry
      if (dependencyId.startsWith('resource.') && this.resourceRegistry) {
        if (!this.resourceRegistry.has(dependencyId)) {
          this.logger.warn(`Service "${id}" depends on resource "${dependencyId}" which is not registered`);
          dependenciesValid = false;
        }
      } else {
        this.logger.warn(`Service "${id}" depends on "${dependencyId}" which is not registered`);
        dependenciesValid = false;
      }
    }
    
    if (!dependenciesValid) {
      this.logger.warn(`Registering service "${id}" with missing dependencies. It may not work correctly.`);
    }
    
    this.register(id, factory);
  }
  
  // Add helper method to get resource registry
  public getResourceRegistry(): ResourceRegistry {
    return this.resourceRegistry;
  }
}
```

### 4. Update getInstance/resetInstance Methods

Ensure consistent implementation across both registries:

```typescript
// ResourceRegistry
public static getInstance(options?: ResourceRegistryOptions): ResourceRegistry {
  if (!ResourceRegistry.instance) {
    ResourceRegistry.instance = new ResourceRegistry(options || {});
    // Auto-initialize on getInstance (can be made optional)
    ResourceRegistry.instance.initialize();
  } else if (options) {
    ResourceRegistry.instance.updateOptions(options);
  }
  
  return ResourceRegistry.instance;
}

// ServiceRegistry 
public static getInstance(options?: ServiceRegistryOptions): ServiceRegistry {
  if (!ServiceRegistry.instance) {
    ServiceRegistry.instance = new ServiceRegistry(options || {});
    // Auto-initialize on getInstance (can be made optional)
    ServiceRegistry.instance.initialize();
  } else if (options) {
    ServiceRegistry.instance.updateOptions(options);
  }
  
  return ServiceRegistry.instance;
}
```

### 5. Improve Registry Interface

Define a common interface that both registries will implement:

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
```

## Implementation Steps

1. Update Registry base class to add initialization state and enhanced methods
2. Add the abstract registerComponents method to Registry
3. Modify ResourceRegistry to implement the enhanced methods
4. Update ServiceRegistry to implement the enhanced methods
5. Standardize component registration patterns in both registries
6. Improve error handling for API keys and dependencies
7. Add unit tests for new functionality

## Testing Plan

1. Test initialization state tracking
2. Test error handling for missing API keys
3. Test dependency validation between registries
4. Test proper auto-initialization on getInstance()
5. Test that resetInstance properly clears initialization state

## Backward Compatibility

These changes maintain backward compatibility:
- Core interfaces remain the same
- Existing getInstance/resetInstance patterns continue to work
- Auto-initialization is opt-in and doesn't break existing code

## Benefits

1. Consistent initialization patterns across registries
2. Better error messages for missing dependencies and API keys
3. Explicit tracking of initialization state
4. Standardized component registration patterns
5. Improved type safety and validation
6. Proper dependency handling between registries