# Conversations Context Directory Flattening Plan

## Current Structure

The conversations context has a nested directory structure with various components in subdirectories:

```
/src/contexts/conversations/
├── adapters/
│   └── conversationStorageAdapter.ts
├── core/
│   └── conversationContext.ts
├── formatters/
│   ├── conversationFormatter.ts
│   └── conversationMcpFormatter.ts
├── index.ts
├── memory/
│   ├── summarizer.ts
│   └── tieredMemoryManager.ts
├── messaging/
│   ├── conversationContextMessaging.ts
│   ├── conversationMessageHandler.ts
│   └── conversationNotifier.ts
├── README.md
├── resources/
│   ├── conversationResources.ts
│   └── index.ts
├── services/
│   ├── conversationMemoryService.ts
│   ├── conversationQueryService.ts
│   └── index.ts
├── storage/
│   ├── conversationStorage.ts
│   └── inMemoryStorage.ts
└── tools/
    ├── conversationTools.ts
    └── index.ts
```

Similarly, the tests follow a similar structure:

```
/tests/contexts/conversations/
├── adapters/
│   └── conversationStorageAdapter.test.ts
├── conversationFormatter.test.ts
├── conversationMcpFormatter.test.ts
├── core/
│   └── conversationContext.test.ts
├── index.test.ts
├── inMemoryStorage.test.ts
├── summarizer.test.ts
└── tieredMemoryManager.test.ts
```

## Target Structure

We want to flatten the directory structure by moving the core and adapters files to the parent directory:

```
/src/contexts/conversations/
├── conversationContext.ts           # Moved from core/
├── conversationStorageAdapter.ts    # Moved from adapters/
├── formatters/
│   ├── conversationFormatter.ts
│   └── conversationMcpFormatter.ts
├── index.ts
├── memory/
│   ├── summarizer.ts
│   └── tieredMemoryManager.ts
├── messaging/
│   ├── conversationContextMessaging.ts
│   ├── conversationMessageHandler.ts
│   └── conversationNotifier.ts
├── README.md
├── resources/
│   ├── conversationResources.ts
│   └── index.ts
├── services/
│   ├── conversationMemoryService.ts
│   ├── conversationQueryService.ts
│   └── index.ts
├── storage/
│   ├── conversationStorage.ts
│   └── inMemoryStorage.ts
└── tools/
    ├── conversationTools.ts
    └── index.ts
```

For tests, we want a similar flattened structure:

```
/tests/contexts/conversations/
├── conversationContext.test.ts         # Moved from core/
├── conversationFormatter.test.ts
├── conversationMcpFormatter.test.ts
├── conversationStorageAdapter.test.ts  # Moved from adapters/
├── index.test.ts
├── inMemoryStorage.test.ts
├── summarizer.test.ts
└── tieredMemoryManager.test.ts
```

## Changes Required

1. Move the following files:
   - `/src/contexts/conversations/core/conversationContext.ts` to `/src/contexts/conversations/conversationContext.ts`
   - `/src/contexts/conversations/adapters/conversationStorageAdapter.ts` to `/src/contexts/conversations/conversationStorageAdapter.ts`
   - `/tests/contexts/conversations/core/conversationContext.test.ts` to `/tests/contexts/conversations/conversationContext.test.ts`
   - `/tests/contexts/conversations/adapters/conversationStorageAdapter.test.ts` to `/tests/contexts/conversations/conversationStorageAdapter.test.ts`

2. Update import paths in these files to reflect the new locations.

3. Update the barrel file (`index.ts`) to export from the new locations:
   ```typescript
   // Update the exports
   export { ConversationContext } from './conversationContext';
   // instead of
   export { ConversationContext } from './core/conversationContext';
   
   export { ConversationStorageAdapter } from './conversationStorageAdapter';
   // instead of
   export { ConversationStorageAdapter } from './adapters/conversationStorageAdapter';
   ```

4. Update imports in all files that import from the nested paths to use the new flattened paths. This includes:
   - Other files in the conversations context
   - Any test files that import these components
   - Any external files that import these components

5. Verify that all tests pass with the new structure.

6. Remove the now-empty directories:
   - `/src/contexts/conversations/core/`
   - `/src/contexts/conversations/adapters/`
   - `/tests/contexts/conversations/core/`
   - `/tests/contexts/conversations/adapters/`

## Implementation Steps

1. Create the new flattened files by copying from nested directories, updating imports as needed.
2. Update the imports in the moved files to reference the new locations.
3. Update the barrel file (`index.ts`) to export from the new locations.
4. Update imports in all other files that reference the old nested paths.
5. Run TypeScript compiler to check for any errors.
6. Run tests to ensure everything works correctly.
7. Remove the old nested directories once everything is working.

## Benefits

- Simplifies the directory structure
- Reduces nesting, making the codebase more navigable
- Makes imports more consistent and easier to maintain
- Follows the established pattern of having key context files at the root level
- Reduces import path length and complexity