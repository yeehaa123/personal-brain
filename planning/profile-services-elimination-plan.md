# Profile Services Elimination Plan

## Overview

With the migration to ProfileContextV2, which uses note-based storage for profiles, we can eliminate several profile-specific services that duplicate functionality already available through the note system. This document outlines the plan for this elimination.

## Services to Eliminate

1. **ProfileEmbeddingService**
   - Currently in `/src/services/profiles/profileEmbeddingService.ts`
   - Will be replaced by: Using NoteEmbeddingService through the NoteContext

2. **ProfileTagService**
   - Currently in `/src/services/profiles/profileTagService.ts`
   - Will be replaced by: Using the common tag extraction utilities

3. **ProfileSearchService**
   - Currently in `/src/services/profiles/profileSearchService.ts`
   - Will be replaced by: Using NoteSearchService with appropriate filters

4. **ProfileRepository**
   - Currently in `/src/services/profiles/profileRepository.ts`
   - Will be replaced by: Using the note-based storage adapter in ProfileContextV2

## Implementation Steps

### Step 1: Remove Dependencies on Profile Services

1. Search for imports of the profile services and replace them with their note-based alternatives:
   - Replace `ProfileEmbeddingService` with `NoteEmbeddingService` through the NoteContext
   - Replace `ProfileTagService` with tag extraction utilities or direct use of tags in ProfileContextV2
   - Replace `ProfileSearchService` with `NoteSearchService` with appropriate filters
   - Replace `ProfileRepository` with ProfileNoteAdapter

2. Check the following files for direct imports:
   - `/src/protocol/managers/profileManager.ts`
   - `/src/protocol/components/profileAnalyzer.ts`
   - Any command handlers that use profile services

### Step 2: Update ProfileContextV2

1. Ensure ProfileContextV2 provides all necessary functionality:
   - `embedProfile` method (already implemented)
   - Methods for tag generation and extraction
   - Search functionality for profiles

2. Add any missing functionality:
   - Tag extraction if not already implemented
   - Search capabilities if not already implemented

### Step 3: Update Tests

1. Update all tests to use the note-based alternatives:
   - Replace mocks of profile services with mocks of note services or ProfileContextV2
   - Update test expectations to match the new implementation

2. Check the following test files:
   - `/tests/services/profiles/profileEmbeddingService.test.ts`
   - `/tests/services/profiles/profileTagService.test.ts`
   - `/tests/services/profiles/profileSearchService.test.ts`
   - `/tests/services/profiles/profileRepository.test.ts`

### Step 4: Complete Removal

1. Once all dependencies have been updated and tests are passing:
   - Remove the profile service files
   - Remove any remaining imports
   - Update documentation

2. Files to remove:
   - `/src/services/profiles/profileEmbeddingService.ts`
   - `/src/services/profiles/profileTagService.ts`
   - `/src/services/profiles/profileSearchService.ts`
   - `/src/services/profiles/profileRepository.ts`

## Benefits

1. **Reduced Codebase**: Elimination of duplicate functionality
2. **Simplified Architecture**: Consistent use of note-based storage for both notes and profiles
3. **Improved Maintainability**: Fewer components to test and maintain
4. **Consolidated Service Layer**: More focused service implementation

## Testing Strategy

1. **Unit Tests**: Ensure all unit tests for ProfileContextV2 pass after each removal
2. **Integration Tests**: Verify that all components that previously used profile services work with the new implementation
3. **System Tests**: Confirm that CLI and Matrix interfaces continue to work correctly with profiles

## Timeline

- **Week 1**: Steps 1-2 - Remove dependencies and update ProfileContextV2
- **Week 2**: Step 3 - Update tests to use note-based alternatives
- **Week 3**: Step 4 - Complete removal of profile services

## Rollback Plan

If issues are encountered:
1. Revert to using the original profile services
2. Document the specific issues that prevented elimination
3. Create a plan to address those issues in the future