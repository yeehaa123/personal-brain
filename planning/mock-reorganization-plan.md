# Mock Reorganization Plan

## 1. New Directory Structure

```
/tests/
  /__mocks__/                 # Centralized mocks directory
    /core/                    # Core system mocks
      logger.ts               # Logger mock
      config.ts               # Config mock
    /models/                  # Data model mocks
      note.ts                 # Note model mocks
      profile.ts              # Profile model mocks 
    /services/                # Service layer mocks
      repository.ts           # Repository mocks
      searchService.ts        # Search service mocks
      embeddingService.ts     # Embedding service mocks
    /contexts/                # Context mocks
      conversationContext.ts  # Conversation context mocks
      noteContext.ts          # Note context mocks
      profileContext.ts       # Profile context mocks
    /protocol/                # Protocol mocks
      brainProtocol.ts        # Brain protocol mocks
    /storage/                 # Storage mocks
      inMemoryStorage.ts      # In-memory storage mocks
    /utils/                   # Utility mocks
      fetch.ts                # Fetch mocks
    index.ts                  # Exports all common mocks
```

## 2. Standardized Mock Patterns

For each mock file, follow a consistent pattern:

```typescript
// Example for logger.ts
export class MockLogger {
  // Mock implementation
  static instance: MockLogger | null = null;
  
  // Factory method
  static getInstance() {...}
  
  // Reset method for tests
  static resetInstance() {...}
}

// Factory function for creating instances
export function createMockLogger(options?) {
  return new MockLogger(options);
}

// Setup function for global mocking
export function setupLoggerMocks(mockFn) {
  mockFn.module('@utils/logger', () => ({
    default: createMockLogger(),
    // Other exports
  }));
}
```

## 3. Revised Implementation Steps (Incremental Approach)

For each mock type (starting with logger):

1. **Create directory structure** for this specific mock
2. **Implement new mock version** in the centralized location
3. **Update registry** to include the new mock
4. **Update imports in affected tests** to use the new location
5. **Remove old mock implementations**
6. **Run tests, lint, and typecheck** to ensure everything works
7. **Commit changes** before moving to the next mock type

This incremental approach ensures that we maintain test stability throughout the refactoring process.

### Order of Implementation

1. Logger mock (high priority, used everywhere)
2. Note and Profile model mocks
3. Repository mocks
4. Storage mocks
5. Other mocks based on usage

## 4. Adoption Strategy

1. Start with the most frequently used mocks (logger, model mocks)
2. Update test files in batches, prioritizing frequently modified tests
3. Update documentation to reflect new patterns
4. Add linting rules to enforce consistent mock imports

## 5. Completion Checklist

For each mock type:
- [x] Implement logger mock in new location
- [x] Update affected imports for logger mock
- [x] Remove old logger mock implementation
- [x] Run tests
- [x] Run linter and fix issues
- [x] Run typecheck

Remaining mocks to migrate:
- [x] Note model mock
- [x] Profile model mock
- [ ] Repository mocks
- [ ] Storage mocks
- [ ] Context mocks

When all mocks are migrated:
- [ ] Update CLAUDE.md with mock organization guidelines
- [ ] Add notes about the new mock system to test README

This plan provides a clear structure that will make mocks more discoverable and maintainable, while eliminating duplication and inconsistency.