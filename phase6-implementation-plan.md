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
- 🔄 Flatten remaining nested directories (in progress)
  - ✅ Conversations context
  - ✅ Profiles context
  - ✅ ExternalSources context
  - ✅ Website context
  - ⏳ Remaining contexts
- ⏳ Simplify interfaces
- ⏳ Consolidate similar functionality
- ⏳ Complete dependency injection for all contexts
- ⏳ Standardize ResourceRegistry and ServiceRegistry

## Implementation Approach

### 1. Registry Standardization (Priority: High)

Standardize ResourceRegistry and ServiceRegistry implementations:
- Implement consistent Component Interface Standardization pattern
- Ensure clear separation between resource types and services
- Establish consistent dependency flow

Files to modify:
- `/src/resources/resourceRegistry.ts`
- `/src/services/serviceRegistry.ts`

### 2. Dependency Injection Completion (Priority: High)

Complete dependency injection for remaining contexts:
- Review all contexts and identify those not using explicit dependency injection
- Update constructors to require dependencies as parameters
- Create factory methods for dependency resolution
- Ensure no direct instance creation in code

### 3. Interface Simplification (Priority: Medium)

Simplify interfaces by removing redundant methods:
- Remove methods that duplicate functionality
- Consolidate related methods
- Ensure interfaces follow the Interface Segregation Principle
- Update tests to reflect changes

### 4. Directory Flattening (Priority: Medium)

Flatten overly nested directories while preserving logical structure:
- Remove unnecessary nesting layers (especially for single files in subdirectories)
- Move primary context files to root level while keeping logical groupings in subdirectories
- Maintain specialized subdirectories (messaging, formatters, etc.) where they add value
- Ensure imports use clean paths
- Follow the balanced approach demonstrated in conversations and notes contexts

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

### Milestone 1: Registry Standardization
- Standardize ResourceRegistry
- Standardize ServiceRegistry
- Update references to use standardized registries

### Milestone 2: Dependency Injection
- Complete dependency injection for all contexts
- Remove direct dependencies on concrete implementations

### Milestone 3: Interface Simplification
- Simplify interfaces
- Consolidate similar functionality
- Update references to use simplified interfaces

### Milestone 4: Directory Restructuring
- Flatten nested directories while preserving logical structure
- Move core context files to root level while maintaining specialized subdirectories
- Update imports and references

### Milestone 5: Final Cleanup
- Remove any remaining legacy code
- Final testing and validation

## Next Steps

1. Continue with the Directory Restructuring that's already in progress:
   - Complete flattening of remaining contexts using the balanced approach
   - Follow patterns established in conversations, profiles, externalSources, and website contexts
   - Maintain logical groupings while removing unnecessary nesting

2. Begin Registry Standardization and Dependency Injection as high-priority items:
   - Focus on ResourceRegistry and ServiceRegistry standardization
   - Identify contexts without proper dependency injection and address them
   
3. Begin Interface Simplification work:
   - Review interfaces for redundancy and consolidation opportunities
   - Prioritize high-use interfaces for simplification