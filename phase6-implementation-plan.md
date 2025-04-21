# Phase 6 Implementation Plan: Codebase Diet ✅ COMPLETED

## Overview

Phase 6 focused on aggressive cleanup and simplification of the architecture. With the MCP (Model-Context-Protocol) architecture established with proper interfaces and messaging, we've successfully removed redundancy, simplified interfaces, and consolidated functionality to make the codebase more maintainable.

The key accomplishments include:
- ✅ Standardizing interfaces across all contexts
- ✅ Flattening overly nested directories
- ✅ Simplifying interface hierarchies
- ✅ Implementing proper dependency injection for major components

Remaining tasks have been moved to Phase 7 (see phase7-implementation-plan.md).

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

- ✅ Flatten nested directories
  - ✅ Conversations context
  - ✅ Profiles context
  - ✅ ExternalSources context
  - ✅ Website context
- ✅ Simplify interfaces (completed)
  - ✅ Define standardized interface hierarchy
  - ✅ Implement across contexts
  - ✅ Remove redundant methods
  - ✅ Simplify interface inheritance hierarchy
- ✅ Standardize ResourceRegistry and ServiceRegistry implementations
- ✅ Implement dependency injection for major contexts
  - ✅ ConversationContext
  - ✅ NoteContext
  - ✅ ProfileContext
  - ✅ ExternalSourceContext
  - ✅ WebsiteContext

The following items have been moved to Phase 7:
- Remove legacy code and backward compatibility layers
- Eliminate transitional adapters and intermediary layers
- Remove deprecated code paths
- Complete dependency injection for remaining components
- Consolidate similar functionality

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
- ✅ ConversationContext updated with object-based dependency injection pattern
- ✅ ConversationStorageAdapter updated with createWithDependencies factory method
- ✅ Created createWithDependencies factory methods in multiple contexts
- ⏳ Finish dependency injection for remaining contexts
- ⏳ Remove any remaining direct dependencies in constructors

### 3. Interface Simplification (Priority: Medium)

Simplify interfaces by removing redundant methods:
- Define standardized interfaces based on common patterns:
  - Started defining base interfaces (ContextDependencies, StorageAccess, FormatterAccess, ServiceAccess)
  - Begin standardizing context interface hierarchy
  - Prepare for gradual implementation across contexts
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

### Milestone 2: Dependency Injection ✅ MAJOR CONTEXTS COMPLETED
- ✅ Complete dependency injection for major contexts
  - ✅ NoteContext updated with proper DI pattern
  - ✅ ExternalSourceContext and its components (WikipediaSource, NewsApiSource) updated
  - ✅ WebsiteContext using createWithDependencies factory method
  - ✅ ProfileContext updated with object-based dependency injection
  - ✅ ProfileStorageAdapter with createWithDependencies factory method
  - ✅ ConversationContext updated with object-based dependency injection
  - ✅ ConversationStorageAdapter with createWithDependencies factory method
  - ✅ All major contexts now use proper dependency injection
- ✅ Make progress on removing direct dependencies
  - ✅ ExternalSourceStorageAdapter no longer directly creates its dependencies
  - ✅ ProfileStorageAdapter properly takes explicit repository dependency
  - ✅ ConversationContext no longer creates its own services
  - ✅ Improved test mocks to work with the new dependency injection patterns

Remaining dependency injection work moved to Phase 7.

### Milestone 3: Interface Simplification ✅ COMPLETED
- ✅ Define standardized interfaces
  - ✅ Created core interface types (ContextDependencies, StorageAccess, FormatterAccess, ServiceAccess)
  - ✅ Defined comprehensive interface hierarchy (CoreContextInterface, McpContextInterface, ContextInterface)
  - ✅ Updated BaseContext with standardized interface contract
  - ✅ Update context implementations to use new interfaces
    - ✅ ConversationContext now properly implements ContextInterface
    - ✅ WebsiteContext now properly implements ContextInterface
    - ✅ ExternalSourceContext properly implements ContextInterface
    - ✅ NoteContext properly implements ContextInterface
    - ✅ ProfileContext properly implements ContextInterface
    - ✅ Required config types now extend Record<string, unknown> for compatibility
    - ✅ Storage adapters now properly implement StorageInterface
    - ✅ Added missing createWithDependencies to MockNoteContext
    - ✅ All contexts verified for interface compatibility
- ✅ Simplify interfaces by removing redundancy
  - ✅ Merged redundant interfaces for cleaner hierarchy
  - ✅ Renamed FullContextInterface to ContextInterface
  - ✅ Simplified CoreMcpContextInterface and McpContextInterface hierarchy
  - ✅ Removed duplicate interface definitions
- ✅ Consolidate similar functionality
- ✅ Update references to use simplified interfaces
  - ✅ Fixed createWithDependencies method signatures in contexts
  - ✅ Updated mock implementations to be compatible with new interface requirements
  - ✅ Added MockExternalSourceFormatter implementation
  - ✅ Updated MockExternalSourceContext to fully implement interface requirements
  - ✅ Fixed contextInterface.test.ts to use the updated interface names
  - ✅ Fixed all type errors related to interface renaming

### Milestone 4: Directory Restructuring ✅ COMPLETED
- ✅ Flatten nested directories while preserving logical structure
- ✅ Move core context files to root level while maintaining specialized subdirectories
- ✅ Update imports and references
- ✅ Achieved optimal balance in directory structure

### Milestone 5: Final Cleanup - Moved to Phase 7
- The final cleanup tasks have been moved to Phase 7's Legacy Code Removal milestone
- See phase7-implementation-plan.md for details

## Completed Goals & Next Steps

### Completed Major Goals in Phase 6

1. **✅ Interface Simplification**:
   - ✅ Completed dependency injection for all major contexts (NoteContext, ExternalSourceContext, WebsiteContext, ProfileContext, ConversationContext)
   - ✅ Used object-based dependency injection pattern for better maintainability
   - ✅ Created proper createWithDependencies factory methods across all contexts
   - ✅ Defined standardized interface hierarchy with core interfaces
   - ✅ Fixed critical type errors in primary contexts (ConversationContext, NoteContext, ProfileContext)
   - ✅ Updated BaseContext to properly interact with Registries
   - ✅ Fixed broken tests by ensuring proper interface implementation
   - ✅ Systematically updated all contexts to implement the new interfaces
   - ✅ Fixed all type errors related to interface renaming
   - ✅ Updated tests to work with the new interface patterns
   - ✅ Simplified interface hierarchy by removing redundancy
   - ✅ Renamed FullContextInterface to ContextInterface
   - ✅ Fixed interface conflicts between different McpContextInterface definitions
   - ✅ Achieved a clean, maintainable interface hierarchy

2. **✅ Directory Structure Flattening**:
   - ✅ Successfully flattened all major context directories
   - ✅ Removed unnecessary nesting
   - ✅ Improved code organization and maintainability
   - ✅ Updated imports and references to match new structure

3. **✅ Registry Standardization**:
   - ✅ ResourceRegistry and ServiceRegistry both follow the Component Interface Standardization pattern
   - ✅ Improved type safety across registries
   - ✅ Standardized factory methods and dependency resolution

### Moving Forward to Phase 7

The remaining tasks from Phase 6 have been moved to Phase 7:

1. **Legacy Code Removal** (Now Phase 7, Priority 1):
   - Remove all remaining backward compatibility layers
   - Eliminate transitional adapters and intermediary layers
   - Remove deprecated code paths
   - Update imports and references to use the new simplified structure
   
2. **Complete Dependency Injection** (Now Phase 7, Priority 2):
   - Complete dependency injection for all remaining components
   - Remove any direct dependencies in constructors
   - Ensure all components follow the Component Interface Standardization pattern
   - Standardize factory methods across all codebase
   - Update tests to properly mock dependencies

Please see phase7-implementation-plan.md for the detailed roadmap of these remaining tasks.