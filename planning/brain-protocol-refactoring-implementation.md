# BrainProtocol Refactoring Implementation Plan

## Overview

This document provides a detailed, component-by-component implementation plan for refactoring the BrainProtocol class. It complements the design outlined in [brain-protocol-refactoring.md](./brain-protocol-refactoring.md) by adding specific sequencing and implementation details.

## Why Component-by-Component?

A component-by-component approach offers several advantages:

1. **Reduced Risk**: Smaller, focused changes are easier to test and verify
2. **Better Traceability**: Issues can be traced to specific component changes
3. **Continuous Integration**: The system remains functional throughout the refactoring
4. **Focused Review**: Pull requests can be reviewed more thoroughly
5. **Clearer Progress**: Well-defined milestones make progress visible

## Implementation Sequence

### Phase 1: Setup & Interfaces (1 day)

1. **Create Directory Structure**
   - Create `/src/mcp/protocol/` with subdirectories:
     - `/core/`
     - `/config/`
     - `/managers/`
     - `/pipeline/`
     - `/types/`
   - Create interface files for each component
   - Add placeholder implementations

2. **Extract Types & Interfaces**
   - Move types and interfaces to `/types/index.ts`
   - Define interfaces for all managers
   - Create basic `QueryResult` types

**Commit Point**: "Set up BrainProtocol refactoring structure and interfaces"

### Phase 2: Configuration & Core Protocol (0.5 day)

1. **Extract Configuration**
   - Implement `BrainProtocolConfig` class
   - Move all config handling from BrainProtocol
   - Add validation methods

2. **Create Thin BrainProtocol Facade**
   - Implement skeleton of new BrainProtocol class
   - Use placeholder implementations for managers
   - Keep original code for now

**Commit Point**: "Implement BrainProtocol configuration and skeleton facade"

### Phase 3: Context Manager (0.5 day)

1. **Implement Context Manager**
   - Extract context-related methods from BrainProtocol
   - Implement `ContextManager` class
   - Update BrainProtocol to use the new manager
   - Write unit tests

2. **Update Public API**
   - Refactor these methods to use the Context Manager:
     - `getNoteContext()`
     - `getProfileContext()`
     - `getExternalSourceContext()`

**Commit Point**: "Implement Context Manager for BrainProtocol"

### Phase 4: Conversation Manager (1 day)

1. **Implement Conversation Manager**
   - Extract conversation methods from BrainProtocol
   - Implement `ConversationManager` class
   - Update references to use the new manager
   - Write unit tests

2. **Update Public API**
   - Refactor these methods to use the Conversation Manager:
     - `getConversationMemory()`
     - `setCurrentRoom()`
     - `hasActiveConversation()`
     - `getCurrentConversationId()`
     - `getConversation()`

**Commit Point**: "Implement Conversation Manager for BrainProtocol"

### Phase 5: Profile Manager (0.5 day)

1. **Implement Profile Manager**
   - Extract profile methods from BrainProtocol
   - Implement `ProfileManager` class
   - Update references to use the new manager
   - Write unit tests

2. **Extract Profile Analyzer**
   - Move profile relevance analysis to separate class
   - Update ProfileManager to use the analyzer

**Commit Point**: "Implement Profile Manager for BrainProtocol"

### Phase 6: External Source Manager (0.5 day)

1. **Implement External Source Manager**
   - Extract external source methods from BrainProtocol
   - Implement `ExternalSourceManager` class
   - Update references to use the new manager
   - Write unit tests

2. **Update Public API**
   - Refactor these methods to use the External Source Manager:
     - `setUseExternalSources()`
     - `getUseExternalSources()`

**Commit Point**: "Implement External Source Manager for BrainProtocol"

### Phase 7: Query Processor (1 day)

1. **Extract Pipeline Stages**
   - Identify each stage in the query processing pipeline
   - Create helper methods for each stage
   - Test each stage independently

2. **Implement Query Processor**
   - Create `QueryProcessor` class with pipeline methods
   - Inject all required dependencies
   - Connect stages together
   - Write unit and integration tests

**Commit Point**: "Implement Query Processor for BrainProtocol"

### Phase 8: Final Integration (1 day)

1. **Update BrainProtocol Implementation**
   - Remove all extracted code from original class
   - Connect all managers to the facade
   - Update constructor and initialization
   - Ensure all public API methods delegate correctly

2. **Integration Testing**
   - Test all components together
   - Add integration tests for key flows
   - Verify end-to-end functionality

**Commit Point**: "Complete BrainProtocol refactoring"

## Implementation Guidelines

### For Each Component

1. **Extract First, Then Enhance**
   - Start by moving existing code, preserving behavior
   - Enhance and improve only after basic functionality works
   - Keep tests passing throughout

2. **Focused Testing**
   - Write unit tests for each new component
   - Test edge cases and error handling
   - Check interactions with other components

3. **Documentation**
   - Add JSDoc comments to all classes and methods
   - Document purpose, parameters, and return values
   - Explain any complex logic or important decisions

### Transitioning Between Components

1. **Create Type-Safe Seams**
   - Add interfaces before implementation
   - Use temporary adapter patterns if needed
   - Keep old code until new code is fully tested

2. **Update References Carefully**
   - Change import statements gradually
   - Update one component at a time
   - Use IDE refactoring tools when possible

3. **Verify Each Step**
   - Run tests after each significant change
   - Check for regressions after each component
   - Watch for subtle behavior changes

## Testing Strategy

1. **Component-Level Testing**
   - Test each component in isolation
   - Mock dependencies for unit tests
   - Test normal and error paths

2. **Integration Testing**
   - Test interactions between components
   - Focus on common user scenarios
   - Verify data flows correctly

3. **System Testing**
   - Test the entire system end-to-end
   - Compare behavior with original implementation
   - Check for performance regressions

## Success Criteria

1. All tests pass after each component is refactored
2. No changes in behavior from the user's perspective
3. Each component has clear responsibilities
4. Codebase is more maintainable and testable
5. All files are under 300 lines
6. Documentation is up-to-date and comprehensive

## Timeline

The complete refactoring is estimated to take 5-6 days of focused work, with an additional 1-2 days for documentation and comprehensive testing.

## Next Steps After Refactoring

1. **Performance Optimization**
   - Identify and optimize bottlenecks
   - Add caching where appropriate
   - Improve memory usage

2. **Feature Enhancement**
   - Add support for multiple LLM providers
   - Enhance conversation memory capabilities
   - Improve external source integration