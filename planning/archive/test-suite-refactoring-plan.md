# Test Suite Refactoring Plan

## Goals
- Reduce the test suite size by at least 50% (from 97 files to ≤48 files)
- Focus on unit tests, eliminating integration tests
- Simplify the mocking system
- Maintain coverage of critical functionality
- Make tests easier to maintain
- Reduce expect call count to improve TypeScript error handling

## Current State Analysis
- 97 test files identified
- Extensive mocking infrastructure (complex class-based mocks)
- Multiple integration tests that could be simplified or removed
- Redundant test patterns across similar components
- Significant setup/teardown boilerplate in most tests
- High expect call count leading to TypeScript type issues

## Progress Report
### Completed Refactorings:
1. **Test Case Reduction**:
   - BaseRepository.test.ts: 6 → 1 tests, 6 → 3 expect calls
   - noteRepository.test.ts: 11 → 3 tests, 29 → 10 expect calls 
   - profileSearchService.test.ts: 5 → 2 tests, 11 → 5 expect calls
   - BaseEmbeddingService.test.ts: 5 → 1 tests, 8 → 3 expect calls
   - contextManager.test.ts: 7 → 1 tests, 13 → 9 expect calls
   - textUtils.test.ts: 4 → 1 tests, 20+ → 5 expect calls
   - configUtils.test.ts: 6 → 1 tests, 14+ → 11 expect calls
   - websiteContext.test.ts: 21 → 3 tests, 50+ → 35 expect calls
   
2. **Unused Code Removal**:
   - Completely removed typeGuards.ts and typeGuards.test.ts as they were not used in the codebase
   - Analyzed utility usage to determine what can be safely removed

3. **Integration Test Removal**:
   - Removed all 8 identified integration test files

4. **Implementation Strategy Updates**:
   - Focused on reducing expect call count in addition to test count
   - Implementing consolidated test logic to reduce type checking burden
   - Simplified test assertions to only verify critical behaviors
   - Used Promise.all for concurrent operations to reduce test complexity
   - Used direct try/catch blocks instead of expect().toThrow() where appropriate
   - Added usage analysis to identify and remove unused utilities

## Implementation Strategy

### 1. Consolidate Similar Tests
- **Merge Component Types**: Combine tests for similar components (e.g., all formatter tests)
- **Target Areas**:
  - Context tests (conversationContext, noteContext, etc.)
  - Formatter tests (multiple similar formatters)
  - Storage adapter tests (similar storage patterns)
  - CLI/Matrix interface tests (similar UI behaviors)

### 2. Remove or Convert Integration Tests
- **Remove These Integration Tests**:
  - `tests/contexts/website/deploymentIntegration.test.ts`
  - `tests/contexts/website/websiteContextPersistence.test.ts`
  - `tests/protocol/integration/crossContextMessaging.test.ts`
  - `tests/protocol/pipeline/queryProcessor.test.ts`
  - `tests/protocol/messaging/contextIntegration.test.ts`
  - `tests/transport/httpServerIntegration.test.ts`
  - `tests/contexts/website/websiteContextMcpTools.test.ts`
  - `tests/interfaces/matrix-website-commands.test.ts`
  - `tests/services/serviceRegistry.test.ts` (partial integration)
  - `tests/contexts/conversations/conversationContext.test.ts` (partial integration)
  - `tests/contexts/website/websiteContext.test.ts` (partial integration)
- **Convert Essential Integration Tests**: Extract key test cases as focused unit tests

### 3. Simplify Mock System
- **Replace Complex Mock Classes**:
  - Replace class-based mocks with simple factory functions
  - Eliminate `getInstance()/resetInstance()/createFresh()` pattern for mocks
  - Use direct function mocks with Jest/Bun spies instead of class hierarchies
- **Simplified Mock Structure**:
  ```typescript
  // BEFORE:
  export class MockRepository {
    private static instance: MockRepository | null = null;
    
    static getInstance(): MockRepository {
      if (!MockRepository.instance) {
        MockRepository.instance = new MockRepository();
      }
      return MockRepository.instance;
    }
    
    static resetInstance(): void {
      MockRepository.instance = null;
    }
    
    static createFresh(): MockRepository {
      return new MockRepository();
    }
    
    // Many mock methods...
  }
  
  // AFTER:
  export function createMockRepository() {
    return {
      get: mock(() => Promise.resolve({})),
      create: mock(() => Promise.resolve('id-123')),
      // Fewer, more focused mock methods
    };
  }
  ```

### 4. Table-Driven Tests
- **Convert Repetitive Tests**:
  - Replace separate test cases with data-driven tables
  - Use parameterized tests to reduce code duplication
- **Example**:
  ```typescript
  // BEFORE:
  test('should extract tags from ecosystem content', async () => {
    // Setup...
    const content = 'Ecosystem architecture is...';
    const tags = await tagExtractor.extractTags(content, [], 5);
    expect(tags).toContain('ecosystem-architecture');
  });
  
  test('should extract tags from education content', async () => {
    // Same setup...
    const content = 'Education should focus on...';
    const tags = await tagExtractor.extractTags(content, [], 5);
    expect(tags).toContain('education');
  });
  
  // AFTER:
  const testCases = [
    {
      name: 'ecosystem content',
      content: 'Ecosystem architecture is...',
      expectedTags: ['ecosystem-architecture']
    },
    {
      name: 'education content',
      content: 'Education should focus on...',
      expectedTags: ['education']
    }
  ];
  
  testCases.forEach(({ name, content, expectedTags }) => {
    test(`should extract tags from ${name}`, async () => {
      const tags = await tagExtractor.extractTags(content, [], 5);
      expectedTags.forEach(tag => expect(tags).toContain(tag));
    });
  });
  ```

### 5. Focus on Critical Path Testing
- **Eliminate Tests for**:
  - Simple getters/setters with no logic
  - Trivial utility functions
  - Direct pass-through functions
- **Prioritize Tests for**:
  - Core business logic
  - Error handling
  - Edge cases
  - Complex transformations

### 6. Standardize Test Approach
- **Implement a New Testing Pattern**:
  - Create a minimal set of standardized testing utilities
  - Define clear patterns for unit tests vs. integration tests
  - Establish a common pattern for test setup and mock creation

## Implementation Phases

### Phase 1: Mock System Simplification
- Create new simplified mock factories
- Update a few test files to use the new pattern
- Validate the approach works

### Phase 2: Integration Test Removal
- Remove or convert integration tests
- Extract any critical test cases to unit tests

### Phase 3: Test Consolidation
- Merge similar test files
- Implement table-driven tests
- Reduce redundant setup/teardown

### Phase 4: Critical Path Focus
- Eliminate tests for trivial functionality
- Enhance tests for critical business logic

## Expected Outcomes
- **Test File Count**: Reduction from 97 to ≤48 files
- **Maintenance**: Lower maintenance burden with simpler mocks
- **Test Run Time**: Faster test execution
- **Coverage**: Maintained or improved coverage of critical functionality

## Success Criteria
- All unit tests pass after refactoring
- Test count reduced by at least 50%
- No breakage of application functionality
- Simplified test code that's easier to maintain
- Cleaner separation between unit and integration tests