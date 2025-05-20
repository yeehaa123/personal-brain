# Unified Entity Model Roadmap

## Executive Summary

This roadmap consolidates our planning efforts toward implementing a unified entity model architecture that will significantly simplify our codebase, improve maintainability, and enable more powerful cross-entity functionality. Analyzing all planning documents indicates this initiative is the next logical architectural improvement following our successful MCP context migration and service architecture simplification.

The unified entity model approach will:

1. Standardize all entities (notes, profiles, conversations, website content) under a single model interface
2. Provide consistent markdown representation via `toMarkdown()` methods
3. Centralize embedding, tagging, and chunking functionality
4. Eliminate unnecessary abstractions and complex inheritance
5. Significantly improve cross-entity search capabilities
6. Prepare the codebase for future enhancements

## Implementation Strategy: Iterative Approach

For this implementation, we'll use an **iterative approach**:

1. Start with BrainProtocol and NoteContext only
2. Move other contexts to a temporary location
3. Implement the unified model for Notes first
4. Update BrainProtocol to work with the new model
5. Get tests passing with this minimal implementation
6. Then gradually reintroduce each context one by one

This "minimum viable architecture" approach will:
- Validate the core design early
- Keep the codebase functional throughout the transition
- Reduce risk by allowing backtracking if needed
- Provide clearer checkpoints for progress

## Current Status Assessment

### Completed Initiatives ✅

1. **Context System Simplification**
   - Completed migration to MCPContext pattern
   - Removed excessive generic type parameters
   - Replaced inheritance with composition
   - Simplified interfaces to be more specific
   - Implemented all context types with the MCP pattern

2. **Service Architecture Simplification**
   - Removed unnecessary abstraction layers
   - Simplified repository, search, and embedding services
   - Implemented direct service interfaces
   - Significantly reduced cognitive load

3. **MCP Context Migration**
   - Migrated 21/78 test files to behavioral testing approach
   - Implemented tiered memory in MCPConversationContext
   - Completed storage adapter implementations
   - Resolved TypeScript compilation errors

4. **MVP Core Components**
   - Protocol response simplification
   - Deployment architecture with Caddy
   - Website context and basic Astro setup
   - Website identity service

### Current Work In Progress ⏳

1. **MCP Migration TODOs**
   - Cross-context dependencies in ProfileNoteAdapter
   - Mock context type mismatches
   - Website context test failures
   - Test refactoring (behavioral approach)

2. **Landing Page Refinements**
   - Segmented landing page generation
   - Section quality assessment
   - Two-phase editorial process
   - Quality metrics integration

## Implementation Phases

### Phase 1: Minimal Viable Architecture (1 week)

1. **Prepare Codebase** (Days 1-2)
   - Move non-Note contexts to temporary location
   - Update imports and fix compilation errors
   - Ensure tests still pass with minimal functionality

2. **Update Note Model** (Days 2-3)
   - Add `entityType` field to Note model
   - Implement `EntityType` enum
   - Update database schema
   - Replace current source field with entityType

3. **Design Base Interfaces** (Days 3-4)
   - Create `BaseEntity` interface
   - Define `toMarkdown()` method standard
   - Implement metadata handling
   - Update Note to implement BaseEntity

4. **Content Processing Service** (Days 4-5)
   - Implement unified `ContentProcessingService`
   - Centralize embedding generation for Notes
   - Standardize tag extraction
   - Create content chunking utilities

### Phase 2: BrainProtocol & Note Layer (1 week)

1. **Adapt Repository** (Days 1-2)
   - Update NoteRepository to support EntityType filtering
   - Optimize query patterns for entity types
   - Create note-specific accessors
   - Build test coverage for new functions

2. **Update NoteContext** (Days 3-4)
   - Update MCPNoteContext to support entity typing
   - Create entity-specific creation methods
   - Update note tools for entity operations
   - Update tests for new functionality

3. **Update BrainProtocol** (Days 4-5)
   - Update BrainProtocol to support unified entities
   - Fix messaging for note operations
   - Update command handlers for notes
   - Get all note-related tests passing

### Phase 3: Reintroduce Profile Context (1 week)

1. **Profile Entity Implementation** (Days 1-2)
   - Create Profile entity implementation
   - Implement Profile toMarkdown method
   - Update Profile schema to use entityType
   - Create ProfileAdapter

2. **Reintroduce ProfileContext** (Days 3-5)
   - Restore ProfileContext from temporary location
   - Update to use BaseEntity and ContentProcessingService
   - Remove direct NoteContext dependency
   - Update profile tools to use new model
   - Fix cross-context dependencies
   - Update profile test suite

### Phase 4: Reintroduce Website Context (1 week)

1. **Website Entity Implementation** (Days 1-2)
   - Create WebsiteSection entity implementation
   - Implement WebsiteSection toMarkdown method
   - Create WebsiteSectionAdapter

2. **Reintroduce WebsiteContext** (Days 3-5)
   - Restore WebsiteContext from temporary location
   - Update to use BaseEntity
   - Fix related tools and services
   - Update tests for website functionality

### Phase 5: Reintroduce Remaining Contexts (1 week)

1. **Conversation Entity Implementation** (Days 1-2)
   - Add Conversation entity
   - Implement Conversation toMarkdown method
   - Restore ConversationContext
   - Ensure compatibility with tiered memory

2. **ExternalSource Entity Implementation** (Days 3-4)
   - Create ExternalSource entity
   - Implement ExternalSource toMarkdown method
   - Restore ExternalSourceContext
   - Fix tests and functionality

3. **Final Integration** (Day 5)
   - Verify all contexts working together
   - Fix any remaining cross-context issues
   - Ensure all tests pass

### Phase 6: Query Enhancements & Documentation (1 week)

1. **Query Enhancements** (Days 1-3)
   - Create unified search interface across entity types
   - Implement semantic search improvements
   - Add entity-type filtering
   - Create query optimization layer
   - Improve result formatting

2. **Documentation & Cleanup** (Days 4-5)
   - Update architectural documentation
   - Create usage examples
   - Clean up deprecated code
   - Update type definitions
   - Create developer guides for the new model

## Temporary Code Structure During Transition

During the iterative implementation, we'll use a temporary folder structure to store contexts that haven't been migrated yet:

```
src/
  contexts/
    MCPContext.ts              # Keep the base interface
    notes/                     # Start with just the Note context
      MCPNoteContext.ts        # Update to use the new model
    _temp/                     # Temporary storage for other contexts
      profiles/                # Move here during implementation
      conversations/           # Move here during implementation
      website/                 # Move here during implementation
      externalSources/         # Move here during implementation
```

This allows us to maintain a clean separation between migrated and non-migrated code while keeping the codebase compilable throughout the transition.

## Implementation Principles

1. **Iterative Development**: Start minimal and expand gradually
2. **Clean Break Approach**: Implement the new model directly rather than maintaining backward compatibility
3. **Test-First Approach**: Update tests before changing implementation
4. **Composition Over Inheritance**: Use composition patterns consistently
5. **Clean Interfaces**: Maintain clear and explicit interfaces between components
6. **Performance Awareness**: Consider query performance, especially for vector operations
7. **Implementation Simplicity**: Focus on the simplest implementation that works

## Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking changes | High | High | Accept breaking changes; clearly document new approach |
| Test coverage gaps | Medium | Medium | Update tests before implementation and use TDD |
| Complex dependencies | High | High | Use careful dependency tracking and incremental changes |
| Implementation delays | Medium | Medium | Focus on core functionality first, add refinements later |
| Performance issues | Medium | Low | Benchmark critical operations and optimize as needed |
| Integration problems | High | Medium | Use the iterative approach to identify issues early |
| Temporary structure confusion | Medium | Medium | Clearly document what's in _temp and migration status |

## Post-Implementation Benefits

1. **Simplified Codebase**: Significant reduction in code complexity and mental model
2. **Improved Search**: Cross-entity semantic search becomes straightforward
3. **Enhanced Extensibility**: Adding new entity types becomes trivial
4. **Better Performance**: Optimized storage and query patterns
5. **Easier Onboarding**: Clearer architectural patterns for new developers
6. **Future Features**: Enable more powerful features like entity relationships and knowledge graphs

## Success Metrics

1. **Code Reduction**: 15-25% reduction in total lines of code
2. **Type Safety**: Zero TypeScript errors without "any" casts
3. **Test Coverage**: >90% test coverage for all new code
4. **Query Performance**: Equal or better performance for entity queries
5. **Developer Experience**: Simplified onboarding and development workflow
6. **Feature Velocity**: Increased speed of feature development after implementation

## Conclusion

The unified entity model represents the next logical step in our architectural evolution. Building on our successful MCP context migration and service architecture simplification, this initiative will further streamline our codebase, improve maintainability, and enable powerful new capabilities. 

Our iterative implementation approach starting with just BrainProtocol and NoteContext will allow us to validate the core architecture quickly before gradually reintroducing other contexts. This minimizes risk while keeping the codebase functional throughout the transition.