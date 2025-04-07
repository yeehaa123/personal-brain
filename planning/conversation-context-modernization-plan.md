# ConversationContext Modernization Plan

## Phase 1: Clean Up Legacy Tests and Structure

### Step 1: Remove Outdated Tests
1. Identify test files that test old implementations directly
2. Remove or refactor tests that interact with implementation details rather than interfaces
3. Ensure all tests work through adapter and interface boundaries

### Step 2: Standardize File Structure
1. Ensure directory structure fully aligns with NoteContext
2. Create specialized subdirectories for resources, tools, and interfaces if missing
3. Move any remaining implementation-specific files to appropriate locations

## Phase 2: Reduce ConversationContext Size and Responsibilities

### Step 1: Extract MCP Resource and Tool Definitions
1. Create new files for MCP resource definitions (`resources/conversationResources.ts`)
2. Create new files for MCP tool definitions (`tools/conversationTools.ts`)
3. Update ConversationContext to import and use these definitions

### Step 2: Create Service Components
1. Create `ConversationResourceService` for handling MCP resources
2. Create `ConversationToolService` for handling MCP tools
3. Create `ConversationQueryService` for handling conversation searches and retrieval
4. Move related functionality from ConversationContext to these new services

### Step 3: Refactor TieredMemoryManager Integration
1. Create a memory management service or adapter
2. Expose a cleaner interface for memory management
3. Move all direct tiered memory references out of ConversationContext

## Phase 3: Implement Dependency Injection Pattern

### Step 1: Create Service Registrations
1. Add conversation services to ServiceIdentifiers and service registry
2. Create factory methods for services that need custom initialization
3. Update container configuration to properly register all services

### Step 2: Update ConversationContext to Use DI
1. Refactor constructor to accept dependencies through injection
2. Replace direct instantiation with service resolution
3. Add getService() calls similar to NoteContext pattern
4. Add proper service interfaces for each dependency

### Step 3: Simplify Configuration
1. Reduce configuration options to essential parameters
2. Move specialized configuration to corresponding services
3. Create a unified configuration model similar to NoteContext

## Phase 4: Streamline Public API

### Step 1: Refine Public Methods
1. Reduce number of public methods to essential operations
2. Make ConversationContext focus on coordination
3. Move specialized operations to services

### Step 2: Improve Type Definitions
1. Create stronger interface declarations for public methods
2. Add proper JSDoc comments for all public methods
3. Enforce stricter typing for parameters and returns

### Step 3: Normalize Error Handling
1. Standardize error handling across all methods
2. Create conversation-specific error classes if needed
3. Ensure consistent logging and error propagation

## Phase 5: Update Integration Points

### Step 1: Update BrainProtocol Integration
1. Ensure ConversationManager properly works with new ConversationContext
2. Update any import references to new structure
3. Test all conversation-related operations through BrainProtocol

### Step 2: Update CLI and Matrix Integration
1. Ensure command handlers use new ConversationContext correctly
2. Update CLI rendering for conversation operations
3. Test all conversation commands with new implementation

### Step 3: Review and Update Documentation
1. Update architecture documentation with new design
2. Document integration patterns for ConversationContext
3. Update code examples in documentation

## Implementation Details

### ConversationContext (Target Structure)
```typescript
export class ConversationContext extends BaseContext {
  private static instance: ConversationContext | null = null;
  
  // Services resolved through DI
  private resourceService: ConversationResourceService;
  private toolService: ConversationToolService;
  private queryService: ConversationQueryService;
  private memoryService: ConversationMemoryService;
  
  // Storage adapter
  private storage: StorageInterface<Conversation>;
  
  constructor(config: ConversationContextConfig = {}) {
    super({
      name: config.name || 'ConversationBrain',
      version: config.version || '1.0.0',
    });
    
    // Initialize storage
    this.storage = this.resolveStorage(config.storage);
    
    // Resolve services
    this.resourceService = getService(ServiceIdentifiers.ConversationResourceService);
    this.toolService = getService(ServiceIdentifiers.ConversationToolService);
    this.queryService = getService(ServiceIdentifiers.ConversationQueryService);
    this.memoryService = getService(ServiceIdentifiers.ConversationMemoryService);
    
    // Set up resources and tools
    this.resources = this.resourceService.getResources(this);
    this.tools = this.toolService.getTools(this);
    
    logger.debug('ConversationContext initialized', { context: 'ConversationContext' });
  }
  
  // Implement standard BaseContext methods
  
  // Key conversation operations delegated to services
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    return this.queryService.createConversation(interfaceType, roomId);
  }
  
  async addTurn(conversationId: string, query: string, response: string, options?: TurnOptions): Promise<string> {
    const turn = await this.queryService.addTurn(conversationId, query, response, options);
    await this.memoryService.checkAndSummarize(conversationId);
    return turn;
  }
  
  // Additional methods with minimal implementation, delegating to services
}
```

### Services (New)
```typescript
// ConversationResourceService example
export class ConversationResourceService {
  getResources(context: ConversationContext): McpResource[] {
    return [
      // Resource definitions moved from ConversationContext
    ];
  }
}

// ConversationToolService example
export class ConversationToolService {
  getTools(context: ConversationContext): McpTool[] {
    return [
      // Tool definitions moved from ConversationContext
    ];
  }
}

// ConversationQueryService example
export class ConversationQueryService {
  constructor(
    private storage: StorageInterface<Conversation>,
    private formatter: ConversationFormatter
  ) {}
  
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    // Implementation moved from ConversationContext
  }
  
  // Other query methods
}

// ConversationMemoryService example
export class ConversationMemoryService {
  constructor(
    private storage: StorageInterface<Conversation>,
    private tieredManager: TieredMemoryManager
  ) {}
  
  async checkAndSummarize(conversationId: string): Promise<boolean> {
    return this.tieredManager.checkAndSummarize(conversationId);
  }
  
  // Other memory management methods
}
```

This plan will significantly improve the ConversationContext architecture, making it more aligned with the cleaner NoteContext approach, easier to test, and more maintainable in the long term.