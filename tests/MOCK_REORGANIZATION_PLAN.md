# Mock Reorganization Plan

This document outlines the plan for reorganizing and standardizing mocks in the personal-brain codebase.

## Goals

1. Create standardized mock implementations for all components
2. Use consistent patterns with getInstance(), resetInstance(), and createFresh()
3. Centralize mocks in the tests/__mocks__ directory
4. Update tests to use standardized mocks

## Progress

### Completed
- [x] Note model mock
- [x] Profile model mock
- [x] NoteRepository mock
- [x] ProfileRepository mock
- [x] Storage mocks
  - [x] BaseStorageInterface mock (generic base for all storage implementations)
  - [x] ConversationStorage mock (specific implementation for conversation storage)
  - [x] Updated all tests to use standardized storage mocks
  - [x] Centralized mocks in setup.ts and removed duplicate mocks from individual test files
- [x] Context mocks
  - [x] BaseContext mock (base for all context implementations)
  - [x] ConversationContext mock
  - [x] NoteContext mock
  - [x] ProfileContext mock
  - [x] ExternalSourceContext mock
  - [x] Added tests for context mocks
  - [x] Updated setup.ts to use standardized context mocks

### Remaining
- [ ] Other Repository mocks
  - [x] Service mocks
  - [ ] Formatter mocks
  - [ ] Tool mocks
- [x] Remove legacy mock files
  - [x] tests/mcp/contexts/__mocks__/mcpMocks.ts
  - [x] tests/mcp/contexts/conversations/__mocks__/mockInMemoryStorage.ts
  - [x] tests/mcp/contexts/conversations/__mocks__/index.ts
- [x] Update CLAUDE.md with mock organization guidelines
- [x] Add notes about the new mock system to test README

## Implementation Details

### Standard Mock Pattern

All mocks follow this standard pattern:

```typescript
export class MockComponent {
  private static instance: MockComponent | null = null;
  
  // Singleton pattern
  public static getInstance(): MockComponent {
    if (!MockComponent.instance) {
      MockComponent.instance = new MockComponent();
    }
    return MockComponent.instance;
  }
  
  // Reset instance for test isolation
  public static resetInstance(): void {
    MockComponent.instance = null;
  }
  
  // Create fresh instance for test isolation
  public static createFresh(options?: Record<string, unknown>): MockComponent {
    return new MockComponent(options);
  }
  
  // Component implementation...
}
```