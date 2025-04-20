# Notes Directory Flattening Plan

## Current Structure
```
src/contexts/notes/
├── adapters/
│   └── noteStorageAdapter.ts
├── core/
│   └── noteContext.ts
├── index.ts
└── messaging/
    ├── noteContextMessaging.ts
    ├── noteMessageHandler.ts
    └── noteNotifier.ts

tests/contexts/notes/
├── adapters/
│   └── noteStorageAdapter.test.ts
└── core/
    └── noteContext.test.ts
```

## Target Structure
```
src/contexts/notes/
├── noteStorageAdapter.ts
├── noteContext.ts
├── index.ts
└── messaging/
    ├── noteContextMessaging.ts
    ├── noteMessageHandler.ts
    └── noteNotifier.ts

tests/contexts/notes/
├── noteStorageAdapter.test.ts
└── noteContext.test.ts
```

## Completed Changes

### 1. Source Files

1. Created new files:
   - Created `src/contexts/notes/noteContext.ts` from `src/contexts/notes/core/noteContext.ts`
   - Created `src/contexts/notes/noteStorageAdapter.ts` from `src/contexts/notes/adapters/noteStorageAdapter.ts`

2. Updated imports in the moved files:
   - Updated relative import in `noteContext.ts`:
     ```typescript
     import { NoteStorageAdapter } from './noteStorageAdapter';
     ```
   - Updated import in `noteStorageAdapter.ts`:
     ```typescript
     import type { ListOptions, SearchCriteria, StorageInterface } from '@/contexts/core/storageInterface';
     ```

3. Updated exports in index.ts:
   ```typescript
   export { NoteContext } from './noteContext';
   export { NoteStorageAdapter } from './noteStorageAdapter';
   export type { NoteContextConfig } from './noteContext';
   ```

4. Updated imports in messaging files:
   - Updated in `src/contexts/notes/messaging/noteContextMessaging.ts`:
     ```typescript
     import type { NoteContext } from '../noteContext';
     ```
   - Updated in `src/contexts/notes/messaging/noteMessageHandler.ts`:
     ```typescript
     import type { NoteContext } from '../noteContext';
     ```

5. Updated import in other contexts:
   - Updated in `src/contexts/profiles/messaging/profileContextMessaging.ts`:
     ```typescript
     import type { NoteContext } from '../../notes/noteContext';
     ```

### 2. Test Files

1. Created test files:
   - Created `tests/contexts/notes/noteContext.test.ts` from `tests/contexts/notes/core/noteContext.test.ts`
   - Created `tests/contexts/notes/noteStorageAdapter.test.ts` from `tests/contexts/notes/adapters/noteStorageAdapter.test.ts`

2. Updated imports in test files:
   - Updated in `tests/contexts/notes/noteStorageAdapter.test.ts`:
     ```typescript
     import { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
     ```
   - Other imports use the barrel file so didn't need changes

3. Updated in mocks:
   - Updated in `tests/__mocks__/contexts/noteContext.ts`:
     ```typescript
     import type { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
     ```

4. Verified tests are passing from both locations:
   ```
   bun test tests/contexts/notes/noteContext.test.ts tests/contexts/notes/noteStorageAdapter.test.ts
   ```

### 3. Mock Files

1. Verified and updated mock implementations in `tests/__mocks__/` directory:
   - Updated the import in the noteContext.ts mock file

### 4. Testing

1. Ran TypeScript compiler to check for errors:
   ```
   bun run typecheck
   ```
   - No type errors found

2. Ran tests to ensure functionality is preserved:
   ```
   bun test tests/contexts/notes/noteContext.test.ts tests/contexts/notes/noteStorageAdapter.test.ts
   ```
   - All tests passed

## Complete Implementation Steps

1. ✅ Searched for all imports referring to the original paths
2. ✅ Created new files in the flattened structure
3. ✅ Updated imports and exports
4. ✅ Ran TypeScript compiler to verify types
5. ✅ Created test files in flattened structure and updated imports
6. ✅ Ran tests to verify functionality 
7. ⏳ Ready to remove old directories and files once confirmed everything works

## Next Steps

1. Commit these changes
2. Remove the old files and directories after confirming everything works:
   ```
   rm -rf src/contexts/notes/core
   rm -rf src/contexts/notes/adapters
   rm -rf tests/contexts/notes/core
   rm -rf tests/contexts/notes/adapters
   ```
3. Apply this same pattern to other contexts with similar deep nested structures

## Benefits

1. Simpler directory structure with fewer nesting levels
2. More direct imports with less path complexity
3. Consistent with the Component Interface Standardization pattern
4. Easier to understand and navigate the codebase
5. Better alignment with Phase 6 goals of simplifying the codebase