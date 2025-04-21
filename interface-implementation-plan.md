# Context Interface Standardization Implementation Plan

## Overview

This document outlines the implementation plan for standardizing interfaces across all contexts in the codebase. Based on the work done defining standardized interfaces (`ContextDependencies`, `StorageAccess`, `FormatterAccess`, `ServiceAccess`), we now need to systematically update all context implementations to follow these new interfaces.

## Goals

1. Update all contexts to implement the new standardized interfaces
2. Fix type errors introduced by the interface changes
3. Ensure consistent interface implementation across all contexts
4. Maintain backward compatibility during the transition
5. Update tests to work with the new interface patterns

## Implementation Approach

The implementation will follow a phased approach, focusing on one context at a time, and within each context, implementing one interface at a time. This incremental approach will minimize breaking changes and make the transition more manageable.

### Phase 1: Align BaseContext Implementation

1. Update `BaseContext` to fully implement all new interfaces
2. Ensure proper type parameters are used across all interfaces
3. Add comprehensive documentation explaining how to extend BaseContext
4. Create example implementations to serve as reference

### Phase 2: Context-by-Context Implementation

For each context, follow this process:

1. Update type parameters to ensure proper generics are used
2. Implement one interface at a time in this order:
   - `StorageAccess` interface
   - `FormatterAccess` interface 
   - `ServiceAccess` interface
   - `ExtendedContextInterface`
3. Update all factory methods to follow the new patterns
4. Fix type errors and ensure all tests pass after each update

#### Implementation Order for Contexts

1. `ConversationContext` - Starting with the most complex context
2. `ProfileContext` - Second most used context
3. `NoteContext` - Frequently used context
4. `ExternalSourceContext` - Moderate complexity
5. `WebsiteContext` - Least coupled to other contexts

### Phase 3: Test Updates

For each context implementation:

1. Update mock implementations in `tests/__mocks__/` directory
2. Ensure all mocks follow the `Component Interface Standardization` pattern
3. Update tests to use the new interfaces and mocks
4. Fix any test failures and ensure all tests pass

## Detailed Implementation Steps

### ConversationContext Implementation

1. Update class definition with proper type parameters:
```typescript
export class ConversationContext extends BaseContext<
  ConversationStorageAdapter,
  ConversationFormatter,
  ConversationData,
  FormattedConversationData
> implements FullContextInterface<
  ConversationStorageAdapter,
  ConversationFormatter,
  ConversationData,
  FormattedConversationData
>
```

2. Implement `StorageAccess` interface:
```typescript
// Update getStorage to match StorageAccess interface
override getStorage(): ConversationStorageAdapter {
  return this.storage;
}
```

3. Implement `FormatterAccess` interface:
```typescript
// Update getFormatter to match FormatterAccess interface
override getFormatter(): ConversationFormatter {
  return this.formatter;
}

// Use inherited format method from BaseContext
```

4. Implement `ServiceAccess` interface:
```typescript
// Use inherited getService method from BaseContext
```

5. Update factory methods:
```typescript
// Update createWithDependencies to match ExtendedContextInterface
static createWithDependencies(
  dependencies: ContextDependencies<ConversationStorageAdapter, ConversationFormatter>
): ConversationContext {
  return new ConversationContext({}, dependencies);
}
```

6. Update constructor to use ContextDependencies:
```typescript
protected constructor(
  config: ConversationContextConfig = {},
  dependencies?: ContextDependencies<ConversationStorageAdapter, ConversationFormatter>
) {
  super(config, dependencies);
  
  // Initialize from dependencies or create default instances
  this.storage = dependencies?.storage || ConversationStorageAdapter.getInstance();
  this.formatter = dependencies?.formatter || ConversationFormatter.getInstance();
  // Other initialization logic...
}
```

### ProfileContext Implementation

Follow the same pattern as ConversationContext.

### Update Mock Implementations

For each context:

1. Create standardized mock classes in `tests/__mocks__/`
2. Ensure mocks implement the same interfaces as real implementations
3. Add proper type parameters to all mock classes
4. Implement the Component Interface Standardization pattern

Example mock implementation:
```typescript
class MockConversationContext extends BaseContext<
  MockConversationStorage,
  MockConversationFormatter,
  MockConversationData,
  MockFormattedConversationData
> implements FullContextInterface<
  MockConversationStorage,
  MockConversationFormatter,
  MockConversationData,
  MockFormattedConversationData
> {
  // Implementation following the standard pattern...
}
```

## Validation

For each context after implementation:

1. Run TypeScript compiler to check for type errors
2. Run specific tests for the context
3. Run all tests to ensure no regressions
4. Manually verify key functionality

## Timeline

- Phase 1 (BaseContext alignment): 1 day
- Phase 2 (Context implementation):
  - ConversationContext: 1-2 days
  - ProfileContext: 1 day
  - NoteContext: 1 day
  - ExternalSourceContext: 1 day
  - WebsiteContext: 1 day
- Phase 3 (Test updates): 2-3 days

Total estimated time: 8-10 days

## Dependencies and Prerequisites

- Existing interface definitions (already completed)
- Updated BaseContext with standardized interfaces (already in progress)
- Knowledge of the Component Interface Standardization pattern

## Risks and Mitigations

- **Risk**: Breaking changes to existing interfaces
  - **Mitigation**: Implement one context at a time, ensuring tests pass after each update

- **Risk**: Type incompatibilities with external libraries
  - **Mitigation**: Create adapter interfaces where needed

- **Risk**: Test failures due to interface changes
  - **Mitigation**: Update all affected tests as part of each context implementation

## Success Criteria

1. All contexts implement the standardized interfaces
2. TypeScript compiler reports no errors
3. All tests pass
4. No changes to external API behavior
5. Code is more maintainable and follows consistent patterns