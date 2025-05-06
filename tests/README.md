# Personal Brain Test Suite

This directory contains unit tests for the Personal Brain project. Our testing strategy focuses on isolated, efficient tests with clear maintainability goals.

## Recent Changes

We've been refactoring the test suite to:
- Reduce test count and file count
- Lower expect call count to improve TypeScript checking performance
- Consolidate similar tests using table-driven test patterns
- Focus on critical functionality while removing duplicate test assertions
- Improve test isolation and mock consistency

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file(s)
bun test tests/services/notes/noteRepository.test.ts

# Run tests with coverage report
bun test --coverage
```

## Test Organization

Tests mirror the source code structure:

```
tests/
├── __mocks__/             # Centralized mock implementations
│   ├── contexts/          # Context mock implementations
│   ├── core/              # Core service mock implementations
│   ├── models/            # Model mock implementations
│   ├── protocol/          # Protocol component mock implementations
│   ├── repositories/      # Repository mock implementations
│   ├── services/          # Service mock implementations
│   ├── storage/           # Storage mock implementations
│   └── utils/             # Utility mock implementations
├── helpers/               # Test helper functions
│   ├── di/                # Dependency injection helpers
│   ├── envUtils.ts        # Environment variable test utilities
│   ├── index.ts           # Main helper exports
│   └── outputUtils.ts     # Console/output capture utilities
├── commands/              # Command tests
├── contexts/              # Context tests
├── interfaces/            # Interface tests
├── models/                # Model tests
├── protocol/              # Protocol tests
├── resources/             # Resource tests
├── services/              # Service tests
└── utils/                 # Utility tests
```

## Testing Standards

### Component Interface Standardization Pattern

All testable components follow this pattern:

```typescript
export class MyComponent {
  // Singleton instance
  private static instance: MyComponent | null = null;
  
  // Get singleton instance
  public static getInstance(config?, dependencies?): MyComponent {
    if (!MyComponent.instance) {
      MyComponent.instance = new MyComponent(config, dependencies);
    }
    return MyComponent.instance;
  }
  
  // Reset for test isolation
  public static resetInstance(): void {
    MyComponent.instance = null;
  }
  
  // Create fresh instance for specific tests
  public static createFresh(config?, dependencies?): MyComponent {
    return new MyComponent(config, dependencies);
  }
}
```

### Standardized Mock System

We have two primary mock patterns:

1. **Class-based Mocks** - For services, repositories, contexts:
```typescript
export class MockSearchService implements SearchService {
  private static instance: MockSearchService | null = null;
  
  static getInstance(): MockSearchService {
    if (!MockSearchService.instance) {
      MockSearchService.instance = new MockSearchService();
    }
    return MockSearchService.instance;
  }
  
  static resetInstance(): void {
    MockSearchService.instance = null;
  }
  
  static createFresh(options?: MockOptions): MockSearchService {
    const service = new MockSearchService();
    if (options?.results) {
      service.mockResults = options.results;
    }
    return service;
  }
  
  // Mock state and implementations...
}
```

2. **Factory Functions** - For data objects:
```typescript
export function createMockNote(
  id = 'mock-note-id',
  title = 'Mock Note Title',
  tags = ['mock', 'test'],
  content = 'Mock note content'
): Note {
  return {
    id, title, tags, content,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}
```

### Test Isolation Guidelines

1. **Reset Singletons** in `beforeEach`:
```typescript
beforeEach(() => {
  // Reset singleton instances
  MyService.resetInstance();
  DependencyService.resetInstance();
});
```

2. **Use createFresh** for isolated testing:
```typescript
test('specific configuration', () => {
  // Create isolated instance with specific config
  const service = MyService.createFresh({
    specialMode: true,
  });
  
  // Test with this isolated instance
});
```

3. **Inject Dependencies** for controlled testing:
```typescript
test('with mock dependencies', () => {
  // Create mocks
  const mockLogger = MockLogger.createFresh({ silent: true });
  const mockRepo = MockRepository.createFresh([initialData]);
  
  // Inject mocks into component under test
  const service = MyService.createFresh({}, { 
    logger: mockLogger,
    repository: mockRepo 
  });
  
  // Test with controlled dependencies
});
```

### Table-Driven Test Pattern

For testing similar scenarios:

```typescript
// Test data
const testCases = [
  { 
    name: 'simple query', 
    input: 'test query', 
    expected: ['result1', 'result2'] 
  },
  { 
    name: 'empty query', 
    input: '', 
    expected: [] 
  },
  // More test cases...
];

// Single test function that runs all cases
testCases.forEach(({ name, input, expected }) => {
  test(`search handles ${name}`, async () => {
    const results = await searchService.search(input);
    expect(results).toEqual(expected);
  });
});
```

## Best Practices

1. **Use TypeScript Path Aliases**:
```typescript
// Good:
import { createMockNote } from '@test/__mocks__/models/note';
import { MockLogger } from '@test/__mocks__/core/logger';

// Bad:
import { createMockNote } from '../../../__mocks__/models/note';
```

2. **Test Reset and Cleanup**:
```typescript
describe('My Test Suite', () => {
  // Reset before each test
  beforeEach(() => {
    MyService.resetInstance();
    MockLogger.resetInstance();
  });
  
  // Tests with clean state...
});
```

3. **Descriptive Test Names**:
```typescript
// Good:
test('should calculate embedding similarity within expected range', () => {});

// Bad:
test('similarity works', () => {});
```

4. **Group Related Tests** with describe blocks:
```typescript
describe('NoteService', () => {
  describe('search functionality', () => {
    test('should find notes by keyword', () => {});
    test('should return empty array when no matches', () => {});
  });
  
  describe('embedding generation', () => {
    test('should generate embeddings for notes', () => {});
  });
});
```

5. **Minimize Expect Calls**:
```typescript
// Good - focused assertion:
expect(result.items).toHaveLength(3);
expect(result.items[0].title).toBe('Expected Title');

// Bad - redundant assertions:
expect(result).toBeDefined();
expect(result.items).toBeDefined();
expect(Array.isArray(result.items)).toBe(true);
expect(result.items.length).toBe(3);
expect(result.items[0]).toBeDefined();
expect(result.items[0].title).toBeDefined();
expect(result.items[0].title).toBe('Expected Title');
```

## Mocking Dependencies

Prefer explicit dependency injection over global mocks:

```typescript
// GOOD: Explicit dependency injection
const mockLogger = MockLogger.createFresh({ silent: true });
const service = new Service({}, { logger: mockLogger });

// AVOID: Global monkey patching
jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve({
  json: () => Promise.resolve({ data: 'test' }),
}));
```

## Environment Helpers

Use standardized environment setup:

```typescript
import { setMockEnv, clearMockEnv } from '@test/helpers/envUtils';

describe('Your Test Suite', () => {
  beforeAll(() => {
    setMockEnv(); // Sets up standard test environment
  });
  
  afterAll(() => {
    clearMockEnv(); // Cleans up environment
  });
});
```