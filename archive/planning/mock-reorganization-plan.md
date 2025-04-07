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
    /repositories/            # Repository mocks
      noteRepository.ts       # Note repository mock
      profileRepository.ts    # Profile repository mock (in progress)
    /services/                # Service layer mocks
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

### NoteRepository Mock Progress
- [x] Create centralized MockNoteRepository implementation
- [x] Implement singleton pattern with getInstance/resetInstance methods
- [x] Match interface with real NoteRepository (core methods + specialized methods)
- [x] Update the following test files to use standardized mock:
  - [x] tests/services/notes/noteSearchService.test.ts
  - [x] tests/services/notes/conversationToNoteService.test.ts
  - [x] tests/mcp/contexts/notes/noteContext.test.ts
  - [x] tests/services/notes/assistant-response-handling.test.ts
  - [x] tests/mcp/contexts/notes/adapters/noteStorageAdapter.test.ts
  - [x] tests/mcp/protocol/components/noteService.test.ts
  - [x] tests/commands/conversation-notes.test.ts
- [x] Successfully committed all changes

### ProfileRepository Mock Progress
- [x] Create centralized MockProfileRepository implementation
- [x] Implement singleton pattern with getInstance/resetInstance methods
- [x] Match interface with real ProfileRepository (core methods + specialized methods)
- [x] Update the following test files to use standardized mock:
  - [x] tests/services/profiles/profileEmbeddingService.test.ts
  - [x] tests/services/profiles/profileSearchService.test.ts
  - [x] tests/services/profiles/profileTagService.test.ts
  - [x] tests/mcp/contexts/profiles/adapters/profileStorageAdapter.test.ts
  - [x] Kept tests/services/profiles/profileRepository.test.ts as correct pattern (extends real repository)
  - [x] Kept tests/mcp/contexts/profiles/profileContext.test.ts as-is (uses complex module mocking)
  - [x] No change needed for tests/mcp/protocol/components/profileAnalyzer.test.ts (doesn't use repository directly)
- [x] Run tests to ensure all changes work properly
- [x] Commit all changes

Remaining mocks to migrate:
- [x] Note model mock
- [x] Profile model mock
- [x] NoteRepository mock
- [x] ProfileRepository mock
- [ ] Other repository mocks
- [x] Storage mocks
  - [x] BaseStorageInterface mock (generic base for all storage implementations)
  - [x] ConversationStorage mock (specific implementation for conversation storage)
  - [x] Updated all tests to use standardized storage mocks
  - [x] Centralized mocks in setup.ts and removed duplicate mocks from individual test files
- [ ] Context mocks

When all mocks are migrated:
- [ ] Update CLAUDE.md with mock organization guidelines
- [ ] Add notes about the new mock system to test README

This plan provides a clear structure that will make mocks more discoverable and maintainable, while eliminating duplication and inconsistency.