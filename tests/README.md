# Personal Brain Test Suite

This directory contains unit tests for the Personal Brain project.

## Running Tests

To run all tests:

```bash
bun test
```

To run specific test files:

```bash
bun test tests/embeddings.test.ts
```

To generate test coverage report:

```bash
bun test --coverage
```

## Test Organization

- `embeddings.test.ts` - Tests for the embedding service
- `noteContext.test.ts` - Tests for the note context operations
- `note.test.ts` - Tests for note validation

## Adding New Tests

1. Create a new `.test.ts` file in this directory
2. Import the module to test
3. Write test cases using the Bun test framework
4. Run with `bun test`

## Mocking

The tests use Bun's mocking features to mock database operations and API calls.