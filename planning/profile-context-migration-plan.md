# Profile Context Migration Plan

## Background

We've successfully refactored the main codebase to use ProfileContextV2 instead of ProfileContext. ProfileContextV2 uses a note-based storage model, which simplifies the architecture by having profiles stored as special notes rather than in a separate database table.

## Current Status

- All main code components now use ProfileContextV2
- ProfileContext is marked as @deprecated in exports
- Many test files and mocks still depend on the original ProfileContext

## Migration Tasks

### Phase 1: Update Main Code (Completed)

- ✅ Create ProfileContextV2 with note-based storage
- ✅ Update ProfileManager to use ProfileContextV2
- ✅ Update ContextOrchestrator to use ProfileContextV2
- ✅ Update QueryProcessor to use ProfileContextV2  
- ✅ Update WebsiteContext to use ProfileContextV2
- ✅ Update WebsiteIdentityService to use ProfileContextV2
- ✅ Update ContextIntegrator to use ProfileContextV2
- ✅ Update McpServerManager to use ProfileContextV2
- ✅ Mark ProfileContext as @deprecated in exports

### Phase 2: Update Test Files and Mocks

- [ ] Create MockProfileContextV2 in __mocks__/contexts
- [ ] Update WebsiteContext tests to use ProfileContextV2
- [ ] Update MockContextIntegrator to use ProfileContextV2
- [ ] Update MockContextOrchestrator to use ProfileContextV2
- [ ] Update ProfileContextV2 tests to ensure complete coverage
- [ ] Update any remaining test files that reference ProfileContext
- [ ] Create migration script for existing profiles (if needed)

### Phase 3: Remove Profile-Specific Services

Since profiles are now stored as notes, we can eliminate duplicate services:

- [ ] Remove ProfileEmbeddingService - Use NoteEmbeddingService instead
- [ ] Remove ProfileTagService - Use note tag extraction services
- [ ] Remove ProfileSearchService - Use NoteSearchService with appropriate filters
- [ ] Remove ProfileRepository - Already replaced by note-based storage

Update ProfileContextV2 to use the note-based services:
- [ ] Update ProfileContextV2 to use NoteEmbeddingService directly
- [ ] Update ProfileContextV2 to use shared tag extraction utilities
- [ ] Update ProfileContextV2 to use NoteSearchService with appropriate filters

### Phase 4: Final Cleanup and Removal

- [ ] Run and verify all tests pass with ProfileContextV2
- [ ] Remove ProfileContext class
- [ ] Update export in contexts/index.ts to only export ProfileContextV2
- [ ] Update all import statements to use ProfileContextV2
- [ ] Remove backward compatibility code and any @deprecated annotations
- [ ] Update all test mocks to only use ProfileContextV2
- [ ] Remove any remaining profile-specific database tables and models

## Implementation Notes

1. For test updates, we should:
   - Create a MockProfileContextV2 that matches the interface of the real ProfileContextV2
   - Update all test files to use the new mock
   - Ensure test coverage remains high

2. For removing profile-specific services:
   - Identify all places where these services are used
   - Replace with equivalent note-based services
   - Ensure type safety with appropriate filters and type guards

3. For final removal:
   - We may want to rename ProfileContextV2 to ProfileContext for simplicity
   - Ensure all import statements are updated to use the new path
   - Remove any backward compatibility code
   - Update database schema to remove any profile-specific tables

## Timeline

- Phase 1: Completed
- Phase 2: Next sprint
- Phase 3: In parallel with Phase 2
- Phase 4: After Phases 2 and 3 are complete and stable