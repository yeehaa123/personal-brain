# MCP Architecture Refactoring Plan (Integrated with MVP Implementation)

## Overview

This document outlines an integrated plan to refactor our codebase to better align with the Model-Context-Protocol (MCP) architecture principles as part of our MVP delivery. Taking into account the progress already made on schema-based responses, deployment architecture, and landing page generation, this plan focuses on the remaining refactoring work needed to complete the MCP architecture alignment.

## UPDATE: Flattened Directory Structure Approach

After reviewing the current implementation and ongoing refactoring efforts, we've decided to adopt a flattened directory structure approach. This update supplements the original plan with a new objective to simplify our architecture by eliminating nested directory structures where not necessary.

### Key Benefits of Flattening
1. **Reduced Import Complexity**: Shorter, more intuitive import paths
2. **Simplified Navigation**: Easier to locate and understand code organization
3. **Clearer Component Boundaries**: More visible separation of concerns
4. **Reduced Artificial Nesting**: Components that work together are closer in the structure

### Updated Directory Structure
```
/src/
├── models/                    # Domain models
│   ├── note.ts
│   └── profile.ts
│
├── contexts/                  # Context implementations
│   ├── baseContext.ts
│   ├── conversationContext.ts
│   ├── noteContext.ts
│   └── [...other contexts]
│
├── protocol/                  # Protocol implementation
│   ├── brainProtocol.ts
│   ├── components/
│   ├── managers/
│   └── [...other protocol components]
│
├── resources/                 # External resources
│   ├── ai/                    # AI implementations
│   │   ├── claude.ts
│   │   ├── embeddings.ts
│   │   └── interfaces.ts
│   └── [...other resources]
│
├── services/                  # All services in one place
│   ├── notes/                 # Note-related services
│   ├── profiles/              # Profile-related services
│   ├── common/                # Shared service implementations
│   └── [...other services]
│
├── transport/                 # Communication layer
│
└── utils/                     # Utilities
```

### Implementation Approach
This flattening will be integrated with the phases outlined below. We'll maintain the same logical separation of components while simplifying the physical directory structure by removing the intermediate `/src/mcp/` directory.

## Current Status and Progress

### Completed Components
- ✅ **Protocol Response Simplification (Phase 0)** - Implemented schema-based responses in BrainProtocol
- ✅ **Website Context Setup (Phase 1)** - Website Context and storage adapters implemented
- ✅ **Basic Astro Setup (Phase 1)** - Astro integration with content collections
- ✅ **Deployment Architecture** - Replaced Netlify with Caddy for deployment
- ✅ **LandingPageGenerationService** - Partial implementation for profile-to-landing-page conversion
- ✅ **Phase 0: Directory Structure Flattening** - Implemented flattened directory structure
- ✅ **Phase 1: Resource Layer Reorganization** - Created ResourceRegistry and moved AI services to resources layer 
- ✅ **Phase 3: BrainProtocol Decomposition** - Implemented ContextOrchestrator, StatusManager, and FeatureCoordinator
- ✅ **Command Interface Integration** - CLI and Matrix commands for website management
- ✅ **Phase 6B: Context Dependency Injection** - Implemented dependency injection pattern for multiple contexts:
  - ✅ NoteContext - Refactored to use explicit dependency injection
  - ✅ ProfileContext - Converted to use dependency injection pattern
  - ✅ ConversationContext - Refactored with explicit dependencies
  - ✅ ExternalSourceContext - Implemented dependency injection pattern

### In Progress
- ⏳ **Phase 4: Cross-Context Communication** - Establishing patterns for standardized cross-context communication

### Upcoming
- 🔄 **Phase 5: Protocol Integration** - Direct replacement of current BrainProtocol with BrainProtocolIntegrated
  - Replace all imports and usage of BrainProtocol with BrainProtocolIntegrated
  - Update entry points (index.ts, cli.ts, matrix.ts) to use the new implementation
  - Ensure all interface implementations match the IBrainProtocol interface
  - Merge ContextOrchestrator and ContextOrchestratorExtended into a single implementation
    - Combine the functionality of both into ContextOrchestrator
    - Ensure all messaging capabilities are preserved
    - Update all code that references either implementation
  - After successful integration, rename BrainProtocolIntegrated to BrainProtocol
  - Remove the old BrainProtocol implementation entirely
  - No compatibility layer - direct replacement approach
  - Update all tests to use the new implementation

- 🔄 **Phase 6: Codebase Diet** - Aggressive cleanup and simplification of the architecture
  - Remove ALL legacy code and backward compatibility remains without exception
  - Eliminate all transitional adapters, intermediary layers, and duplicate implementations
  - Remove deprecated code paths completely
  - Flatten remaining overly nested directories
  - Simplify interfaces by removing redundant methods
  - Consolidate similar functionality across contexts
  - Complete remaining dependency injection implementations for all contexts
  - Standardize ResourceRegistry and ServiceRegistry implementations
    - Unify registry pattern (class-based following Component Interface Standardization)
    - Clear separation between resource types (external AI, databases) and services
    - Establish consistent dependency flow from resources to services
    - Comprehensive test coverage for all registries and their interactions
  - Focus on reducing the overall codebase size and complexity
  - Improve documentation of the simplified architecture

### Recently Completed
- ✅ **Phase 2: Protocol Layer Organization** - Implemented protocol formatters, converters, adapters, and message routing components
- ✅ **Context Dependency Injection Pattern** - Implemented dependency injection for NoteContext, ProfileContext, ConversationContext, and ExternalSourceContext

## Current Architecture Analysis

### Strengths

1. **Well-established Context Layer**
   - Clear context implementations (NoteContext, ConversationContext, etc.)
   - Consistent BaseContext abstraction
   - Component Interface Standardization pattern (getInstance/resetInstance/createFresh)

2. **Solid Domain Models**
   - Well-defined Note and Profile models
   - Repository pattern implementation

3. **Enhanced Protocol Structure**
   - Schema-based response handling (recently implemented)
   - System prompt generation
   - Protocol response transformation

### Areas for Improvement

1. **Improper Resource Placement**
   - AI services (Claude, Embedding) incorrectly placed in model layer
   - External resources need proper organization

2. **BrainProtocol Responsibilities**
   - Handles too many concerns across different architectural layers
   - Lacks clear separation between protocol handling and context orchestration

3. **Protocol Layer Organization**
   - Missing clear separation between formats, translators, and adapters
   - No formalized message routing system

4. **Cross-Context Communication**
   - Direct method calls instead of structured message passing
   - Lacks standardized patterns for context interaction

## Refactoring Goals

1. Reorganize external resources into a proper resources layer
2. Reduce BrainProtocol responsibilities through decomposition
3. Improve protocol layer organization with clearer component boundaries
4. Establish patterns for standardized cross-context communication
5. Maintain backward compatibility during the refactoring

## Integrated Implementation Plan

### Phase 0: Directory Structure Flattening (Prerequisite)

**Goal**: Simplify the directory structure by moving from nested MCP directory to a flat organization

1. **Initial Directory Setup**
   - Create top-level directories that don't already exist:
     ```
     /src/
     ├── contexts/        # From /src/mcp/contexts/
     ├── protocol/        # From /src/mcp/protocol/
     ├── resources/       # From /src/mcp/resources/
     └── transport/       # From /src/mcp/transport/
     ```

2. **Migration Strategy**
   - Start with lower-level modules to minimize breakage
   - Update one directory at a time, with full testing between each
   - Create transitional barrel files to maintain backward compatibility

3. **Import Path Updates**
   - Update import paths incrementally as directories are moved
   - Create temporary re-export files at original locations when needed
   - Utilize TypeScript path aliases to simplify future refactoring

4. **Testing Approach**
   - Run existing tests after each directory migration
   - Create additional tests for each migrated component
   - Ensure end-to-end functionality is preserved

### Phase 1: Resource Layer Reorganization (MVP Week 2, Days 3-4)

**Goal**: Move external service clients to an appropriate resource layer

1. **Create Resource Directory Structure**
   ```
   /src/resources/       # Previously /src/mcp/resources/
   ├── ai/               # AI service providers
   │   ├── claude/       # Claude API client
   │   ├── embedding/    # Embedding services
   │   └── index.ts      # Unified exports
   ├── registry/         # Resource registration
   └── providers/        # Other external providers
   ```

2. **Relocate AI Service Clients**
   - Move `/src/mcp/model/claude.ts` to `/src/resources/ai/claude/index.ts`
   - Move `/src/mcp/model/embeddings.ts` to `/src/resources/ai/embedding/index.ts`
   - Create adapter interfaces that abstract provider-specific details

3. **Implement Resource Registry**
   - Create a ResourceRegistry class for centralized resource management
   - Add registration and discovery mechanisms
   - Ensure proper lifecycle management

4. **Update Import Paths**
   - Find all references to the moved components
   - Update import paths throughout the codebase
   - Add backward compatibility aliases if needed

**Integration with MVP Timeline**: This phase directly aligns with Week 2 CLI Interface Improvements, as reorganizing resources will help create cleaner separation of concerns in the interface layer.

### Phase 2: Protocol Layer Organization (MVP Week 2, Day 5 - Week 3, Day 1)

**Goal**: Improve organization of protocol components according to their responsibilities

1. **Create Protocol Directory Structure**
   ```
   /src/protocol/
   ├── formats/          # Message format definitions
   │   ├── schemas/      # Response schemas
   │   └── converters/   # Format conversion utilities
   ├── adapters/         # Adapters between different models
   ├── translators/      # Translation between formats
   ├── router/           # Message routing components
   │   ├── rules/        # Routing rules
   │   └── resolvers/    # Destination resolvers
   └── core/             # Core protocol components
   ```

2. **Reorganize Schema Definitions**
   - Move the recently implemented StandardResponseSchema to formats/schemas directory
   - Standardize schema definition patterns
   - Update imports with backward compatibility

3. **Extract Translator Components**
   - Move standardToProtocolResponse to translators directory
   - Create dedicated translator classes for complex transformations

4. **Define Standard Message Formats**
   - Create base message interfaces
   - Implement common message types (Query, Command, Event)

**Integration with MVP Timeline**: This organizational work overlaps with Landing Page Refinements and the start of Integration & Performance work, providing a cleaner foundation for these features.

### Phase 3: BrainProtocol Decomposition (MVP Week 3, Days 2-3)

**Goal**: Reduce responsibilities of BrainProtocol by decomposing it into specialized components

1. **Create Component Architecture**
   ```
   /src/protocol/
   ├── core/
   │   ├── brainProtocol.ts         # Focused on protocol concerns
   │   ├── contextOrchestrator.ts   # Handles context coordination
   │   ├── queryProcessor.ts        # Processes queries across contexts
   │   └── responseFormatter.ts     # Formats responses
   ```

2. **Extract Context Orchestrator**
   - Create ContextOrchestrator class
   - Move context coordination logic from BrainProtocol
   - Establish clear responsibility boundaries

3. **Refocus BrainProtocol**
   - Limit to protocol concerns (communication, format handling)
   - Delegate context coordination to orchestrator
   - Update client code to use the new components

**Integration with MVP Timeline**: This work fits within Week 3's Integration & Performance focus, helping to streamline the core protocol components that affect all interfaces.

### Phase 4: Cross-Context Communication (MVP Week 3, Days 4-5 - Final Integration)

**Goal**: Establish patterns for standardized cross-context communication

1. **Define Message-Based Communication**
   - Create standard message types for different operations
   - Implement message passing between contexts
   - Ensure type safety in message handling

2. **Create Context Mediator**
   - Implement mediator pattern for complex context interactions
   - Centralize cross-context workflows
   - Reduce direct dependencies between contexts

**Integration with MVP Timeline**: This final phase integrates with the Final Integration and Testing work in Week 3, ensuring all components work together seamlessly with the new architecture.

## Timeline Integration with MVP

| MVP Timeline | MCP Refactoring Work |
|--------------|----------------------|
| Week 2, Days 3-4 | Phase 1: Resource Layer Reorganization |
| Week 2, Day 5 - Week 3, Day 1 | Phase 2: Protocol Layer Organization |
| Week 3, Days 2-3 | Phase 3: BrainProtocol Decomposition |
| Week 3, Days 4-5 | Phase 4: Cross-Context Communication |

## Testing Strategy

1. **Unit Testing**
   - Test each new and refactored component in isolation
   - Verify behavior matches original implementation
   - Add tests for new functionality

2. **Integration Testing**
   - Test communication between components
   - Verify cross-context operations
   - Ensure protocol handling works correctly

3. **System Testing**
   - Test end-to-end workflows
   - Verify overall system behavior
   - Compare results with pre-refactoring behavior

4. **Performance Testing**
   - Measure performance of new architecture
   - Compare with baseline metrics
   - Address any performance regressions

## Rollout Strategy

1. **Incremental Approach**
   - Implement changes in small, testable increments
   - Maintain backward compatibility during transition
   - Ship each phase independently once stable

2. **Feature Flagging**
   - Use feature flags to toggle between old and new implementations
   - Enable gradual rollout of changes
   - Quick rollback if issues are discovered

3. **Documentation**
   - Update architecture documentation
   - Create migration guides for affected code
   - Document new patterns and best practices

## Success Metrics

1. **Code Quality**
   - Reduced coupling between components
   - Improved cohesion within components
   - Better adherence to MCP principles

2. **Maintainability**
   - Easier to locate relevant code
   - Reduced complexity in core components
   - More consistent patterns across the codebase

3. **Extensibility**
   - Easier to add new contexts
   - Simpler integration of new external resources
   - More flexible protocol handling

4. **Developer Experience**
   - Clearer component boundaries
   - More intuitive architecture
   - Better testability

## Dependency Injection Implementation

### Phase 6B: Context Decoupling with Dependency Injection

As part of the Phase 6 "Codebase Diet" efforts, we will implement a comprehensive dependency injection approach to decouple contexts from registry implementations. This will reduce tight coupling, improve testability, and eliminate the need for global mocks in tests.

#### Current Problems

1. **Tight Coupling**: Context classes directly instantiate and use registries with direct constructor calls
2. **Global State Dependency**: Contexts rely on singleton instances, making isolated testing difficult
3. **Brittle Tests**: Most tests require global mocks or registry reset operations
4. **Unclear Dependencies**: Dependencies are hidden inside constructors rather than explicitly declared

#### Solution: Pure Dependency Injection

We will implement a pure dependency injection approach without backward compatibility fallbacks:

1. **Explicit Dependencies**: Context constructors will require their dependencies as parameters
2. **No Fallbacks**: No auto-resolution of dependencies, all dependencies must be provided
3. **Factory Methods**: Factory methods for creating instances with resolved dependencies
4. **Clear Interfaces**: Use of interface types instead of concrete implementations

#### Implementation Pattern

```typescript
export class NoteContext extends BaseContext {
  // Singleton instance
  private static instance: NoteContext | null = null;
  
  // Pure constructor with explicit dependencies
  constructor(
    config: NoteContextConfig,
    private repository: NoteRepository,
    private embeddingService: NoteEmbeddingService,
    private searchService: NoteSearchService
  ) {
    super(config);
    
    // Initialize storage adapter
    this.storage = new NoteStorageAdapter(this.repository);
  }
  
  // Factory method for dependency resolution
  public static createWithDependencies(config: NoteContextConfig = {}): NoteContext {
    const serviceRegistry = ServiceRegistry.getInstance({
      apiKey: config.apiKey
    });
    
    return new NoteContext(
      config,
      serviceRegistry.getNoteRepository(),
      serviceRegistry.getNoteEmbeddingService(),
      serviceRegistry.getNoteSearchService()
    );
  }
  
  // Use factory method in getInstance
  static override getInstance(options?: NoteContextConfig): NoteContext {
    if (!NoteContext.instance) {
      NoteContext.instance = NoteContext.createWithDependencies(options);
    }
    
    return NoteContext.instance;
  }
  
  // Methods remain unchanged
  // ...
}
```

#### Testing Benefits

With this approach, tests become much simpler:

```typescript
// Testing with directly provided mock dependencies
test('NoteContext with explicit dependencies', () => {
  // Create mock dependencies
  const repository = MockNoteRepository.createFresh();
  const embeddingService = MockNoteEmbeddingService.createFresh();
  const searchService = MockNoteSearchService.createFresh();
  
  // Create context with explicit dependencies
  const context = new NoteContext(
    { name: 'Test' },
    repository,
    embeddingService,
    searchService
  );
  
  // Test context with controlled dependencies
  // No need to reset global state
  // No interference with other tests
});
```

#### Implementation Strategy

1. **Update BaseContext**: Ensure BaseContext supports dependency injection
2. **Apply to One Context**: Implement in NoteContext first as a prototype
3. **Test with Real Use Cases**: Verify it works in actual code paths
4. **Standardize Pattern**: Document the pattern and apply to all contexts
5. **Update Tests**: Convert existing tests to use explicit dependencies

#### Timeline

This work will be done as part of Phase 6 "Codebase Diet" following the other registry standardization work.

## Risk Assessment and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking changes | High | Medium | Use backward compatibility layers, extensive testing |
| Performance regression | Medium | Low | Performance testing at each step, optimization where needed |
| Increased complexity | Medium | Medium | Clear documentation, consistent patterns, developer training |
| Scope creep | High | High | Strict phase boundaries, regular progress reviews |
| MVP timeline impact | High | Medium | Align refactoring with related MVP tasks, prioritize phases |
| MCP Inspector compatibility | Medium | Medium | Test integration at each phase with MCP tools |
| Dependency injection disruption | Medium | Medium | Start with isolated contexts, thorough testing suite |

## Implementation Dependencies

The MCP refactoring has several dependencies with other MVP components:

1. **Protocol Response Simplification** (Prerequisite) - The schema-based responses work provides the foundation for the Protocol Layer Organization phase
2. **CLI Interface Improvements** (Parallel work) - Resource reorganization supports cleaner CLI implementations
3. **Landing Page Refinements** (Parallel work) - Will benefit from cleaner protocol organization

## Detailed Next Steps

1. **Immediate Actions (Next 2 Days)**
   - Create a task list for Phase 1 (Resource Layer Reorganization)
   - Identify all import references that will need updating
   - Set up test fixtures for validating refactored components

2. **Week 2 Implementation**
   - Execute Phase 1 alongside CLI Interface Improvements
   - Begin Protocol Layer Organization as CLI work progresses
   - Prepare for BrainProtocol decomposition in Week 3

3. **Week 3 Integration**
   - Complete BrainProtocol decomposition early in the week
   - Implement cross-context communication patterns
   - Integrate with final MVP testing and validation

## Conclusion

This integrated refactoring plan aligns the necessary architectural improvements with the MVP timeline, ensuring we deliver a well-structured codebase that follows MCP principles. By phasing the work to coincide with related MVP tasks, we minimize disruption while making substantial architectural progress.

The most immediate benefits will come from properly organizing external resources (Phase 1) and standardizing the protocol layer (Phase 2), with the full benefits of the architecture realized when all phases are complete by the end of the MVP timeline.