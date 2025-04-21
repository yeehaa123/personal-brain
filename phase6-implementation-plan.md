# Phase 6 Implementation Plan: Codebase Diet

## Overview

Phase 6 focuses on aggressive cleanup and simplification of the architecture. Now that the MCP (Model-Context-Protocol) architecture has been established with proper interfaces and messaging, we'll remove redundancy, simplify interfaces, and consolidate functionality to make the codebase more maintainable.

## Goals

1. Remove ALL legacy code and backward compatibility layers without exception
2. Eliminate all transitional adapters, intermediary layers, and duplicate implementations
3. Remove deprecated code paths completely
4. Flatten remaining overly nested directories
5. Simplify interfaces by removing redundant methods
6. Consolidate similar functionality across contexts
7. Complete remaining dependency injection implementations
8. Standardize ResourceRegistry and ServiceRegistry implementations

## Progress Tracking

- ⏳ Remove legacy code and backward compatibility layers
- ⏳ Eliminate transitional adapters and intermediary layers
- ⏳ Remove deprecated code paths
- ✅ Flatten nested directories
  - ✅ Conversations context
  - ✅ Profiles context
  - ✅ ExternalSources context
  - ✅ Website context
- ⏳ Simplify interfaces
- ⏳ Consolidate similar functionality
- 🔄 Complete dependency injection for all contexts (in progress)
- ✅ Standardize ResourceRegistry and ServiceRegistry implementations

## Implementation Approach

### 1. ✅ Registry Standardization (Priority: High) - COMPLETED

Registry standardization has been completed:
- ResourceRegistry and ServiceRegistry both follow the Component Interface Standardization pattern
- BaseContext implementation has been fixed to properly register resources and tools with MCP server
- Created proper adapter functions for handling resource and tool registrations
- Fixed all type checking and testing issues
- Registry implementations now have a clear separation of concerns and consistent API

### 2. Dependency Injection Completion (Priority: High) - IN PROGRESS

Dependency injection implementation is in progress:
- ✅ NoteContext properly uses explicit dependency injection with required parameters
- ✅ ExternalSourceContext now uses proper dependency injection with nested components
- ✅ WebsiteContext updated with factory method for dependency resolution
- ✅ ProfileContext updated with object-based dependency injection pattern
- ✅ ProfileStorageAdapter updated with createWithDependencies factory method
- ✅ Created createWithDependencies factory methods in multiple contexts
- ⏳ Finish dependency injection for remaining contexts
- ⏳ Remove any remaining direct dependencies in constructors

### 3. Interface Simplification (Priority: Medium)

Simplify interfaces by removing redundant methods:
- Remove methods that duplicate functionality
- Consolidate related methods
- Ensure interfaces follow the Interface Segregation Principle
- Update tests to reflect changes

### 4. ✅ Directory Flattening (Priority: Medium) - COMPLETED

The directory structure has been successfully flattened and balanced:
- All major contexts have been restructured (Conversations, Profiles, ExternalSources, Website)
- Unnecessary nesting layers have been removed
- Primary context files moved to appropriate levels
- Specialized subdirectories maintained where valuable
- Achieved the right balance between flat and organized structure

### 5. Code Cleanup (Priority: High)

Remove legacy code and transitional adapters:
- Identify and remove all backward compatibility layers
- Remove transitional adapters
- Remove deprecated code paths
- Update imports and references

## Testing Strategy

1. Update tests after each significant change
2. Run tests frequently to ensure functionality is preserved
3. Update test mocks to reflect new interfaces
4. Ensure all tests pass after each major change

## Progress Milestones

### Milestone 1: Registry Standardization ✅ COMPLETED
- ✅ BaseContext properly integrates with MCP server
- ✅ ResourceRegistry and ServiceRegistry follow consistent patterns
- ✅ Fixed context registration with MCP server
- ✅ All tests pass with the updated implementations

### Milestone 2: Dependency Injection 🔄 IN PROGRESS
- 🔄 Complete dependency injection for all contexts
  - ✅ NoteContext updated with proper DI pattern
  - ✅ ExternalSourceContext and its components (WikipediaSource, NewsApiSource) updated
  - ✅ WebsiteContext using createWithDependencies factory method
  - ✅ ProfileContext updated with object-based dependency injection
  - ✅ ProfileStorageAdapter with createWithDependencies factory method
  - ⏳ ConversationContext to be updated
- 🔄 Remove direct dependencies on concrete implementations
  - ✅ ExternalSourceStorageAdapter no longer directly creates its dependencies
  - ✅ ProfileStorageAdapter properly takes explicit repository dependency
  - ✅ Improved test mocks to work with the new dependency injection patterns
  - ⏳ Continue removing direct dependencies in other contexts

### Milestone 3: Interface Simplification
- Simplify interfaces
- Consolidate similar functionality
- Update references to use simplified interfaces

### Milestone 4: Directory Restructuring ✅ COMPLETED
- ✅ Flatten nested directories while preserving logical structure
- ✅ Move core context files to root level while maintaining specialized subdirectories
- ✅ Update imports and references
- ✅ Achieved optimal balance in directory structure

### Milestone 5: Final Cleanup
- Remove any remaining legacy code
- Final testing and validation

## Next Steps

1. **Continue Dependency Injection Completion** (High Priority):
   - ✅ Made significant progress with ExternalSourceContext, NoteContext, and WebsiteContext
   - ✅ Completed ProfileContext with object-based dependency injection pattern
   - Focus on ConversationContext next
   - Continue updating constructors to require dependencies as parameters
   - Create factory methods for dependency resolution in remaining contexts
   - Ensure all components follow the Component Interface Standardization pattern

2. **Start Interface Simplification** (Medium Priority):
   - Review interfaces for redundancy and consolidation opportunities
   - Prioritize high-use interfaces for simplification
   - Remove duplicate methods and consolidate related functionality
   - Focus on source interfaces and context interface standardization

3. **Begin Code Cleanup** (High Priority):
   - Identify and remove any remaining backward compatibility layers
   - Remove transitional adapters and intermediary layers
   - Remove deprecated code paths
   - Update imports and references to use the new simplified structure