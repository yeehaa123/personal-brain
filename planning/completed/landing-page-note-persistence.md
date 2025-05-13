# Landing Page Note Persistence

## Overview

This document outlines the plan to implement persistent storage for landing page data by leveraging the existing note system instead of in-memory storage. This change will provide consistency, backup/restore capabilities, and searchability for landing page content.

## Current State

Currently, the website landing page data is stored in-memory within the `InMemoryWebsiteStorageAdapter` class. This approach has several limitations:

1. Data is lost when the application restarts
2. No integration with the existing persistence layer
3. No ability to search or reference landing page content from other contexts
4. Landing page data is not included in backups

## Proposed Solution

We will extend the note model to support landing page content and implement adapters to convert between landing page data and note format. This approach allows us to leverage the existing database infrastructure and note management capabilities.

### Key Components

1. **Extended Note Model**:
   - Add 'landing-page' to the source type enum
   - Use note content field to store serialized landing page JSON
   - Use tags to identify the special note ('website', 'landing-page')

2. **LandingPageNoteAdapter**:
   - Convert between LandingPageData and Note formats
   - Provide methods to save/retrieve landing page data to/from notes
   - Follow Component Interface Standardization pattern

3. **PersistentWebsiteStorageAdapter**:
   - Replace InMemoryWebsiteStorageAdapter for persistence
   - Use LandingPageNoteAdapter for storage operations
   - Maintain backward compatibility with existing interfaces

4. **Migration Utility**:
   - Move data from in-memory storage to persistent note storage
   - Handle graceful fallback if migration fails

## Technical Design

### 1. Note Model Extension

Update the note model to support landing page source type:

```typescript
// src/models/note.ts
export const insertNoteSchema = baseInsertNoteSchema.extend({
  // ...existing fields
  source: z.enum([
    'import', 
    'conversation', 
    'user-created', 
    'landing-page'
  ]).default('import'),
  // ...other fields
});

export const selectNoteSchema = baseSelectNoteSchema.extend({
  // ...existing fields with matching source enum
});
```

### 2. LandingPageNoteAdapter Implementation

Create a specialized adapter for converting between landing page data and notes:

```typescript
// src/contexts/website/adapters/landingPageNoteAdapter.ts
export class LandingPageNoteAdapter {
  // Singleton pattern implementation
  private static instance: LandingPageNoteAdapter | null = null;
  
  // Dependencies
  private readonly noteStorageAdapter: NoteStorageAdapter;
  private readonly noteId: string = 'website-landing-page';
  
  // Core methods
  async getLandingPageData(): Promise<LandingPageData | null> {
    // Retrieve from note storage and parse JSON
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<boolean> {
    // Convert to note format and save
  }
  
  // Conversion methods
  convertNoteToLandingPageData(note: Note): LandingPageData | null {
    // Parse JSON and validate
  }
  
  convertLandingPageDataToNote(data: LandingPageData): Partial<Note> {
    // Serialize to JSON with proper note metadata
  }
}
```

### 3. PersistentWebsiteStorageAdapter Implementation

Replace the in-memory adapter with a persistent version:

```typescript
// src/contexts/website/adapters/persistentWebsiteStorageAdapter.ts
export class PersistentWebsiteStorageAdapter implements WebsiteStorageAdapter {
  // Singleton pattern implementation
  private static instance: PersistentWebsiteStorageAdapter | null = null;
  
  // Dependencies
  private readonly landingPageAdapter: LandingPageNoteAdapter;
  
  // WebsiteStorageAdapter interface implementation
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.landingPageAdapter.getLandingPageData();
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    await this.landingPageAdapter.saveLandingPageData(data);
  }
  
  // Other interface methods...
}
```

### 4. Migration Utility

Create a utility to migrate existing data:

```typescript
// src/contexts/website/migration/websiteDataMigration.ts
export async function migrateToNoteStorage(
  inMemoryAdapter: InMemoryWebsiteStorageAdapter,
  persistentAdapter: PersistentWebsiteStorageAdapter
): Promise<boolean> {
  // Migrate landing page data
  // Return success status
}
```

## Implementation Phases

### Phase 1: Core Infrastructure

1. Update the Note model to support landing-page source type
2. Implement LandingPageNoteAdapter
3. Implement unit tests for the adapter

**Estimated time**: 1 day

### Phase 2: Storage Adapter

1. Implement PersistentWebsiteStorageAdapter
2. Create migration utility
3. Add unit tests for the adapter and migration

**Estimated time**: 1 day

### Phase 3: Integration

1. Update WebsiteContext to use the persistent adapter
2. Implement migration checks
3. Update affected tests

**Estimated time**: 1 day

### Phase 4: Testing & Documentation

1. Integrate end-to-end testing
2. Update documentation
3. Address any performance concerns

**Estimated time**: 1 day

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration failures | Data loss | Implement fallback to in-memory storage if migration fails |
| Performance impact | Slower landing page operations | Add caching in the adapter |
| Breaking existing tests | CI failures | Update mock implementations |
| Large landing page data | Storage limitations | Implement compression or chunking if needed |

## Backward Compatibility

The implementation will maintain the same public interface for the WebsiteContext and WebsiteStorageAdapter, ensuring that existing code continues to work. Migration will happen automatically in the background.

## Future Improvements

1. Add search capabilities specifically for landing page content
2. Implement versioning for landing page data
3. Support multiple landing page variants
4. Add a UI for browsing saved landing page versions

## Success Criteria

- Landing page data persists between application restarts
- All existing functionality continues to work
- Unit and integration tests pass
- No performance degradation
- Clear migration path from in-memory to persistent storage

## Conclusion

This implementation leverages the existing note infrastructure to provide persistent storage for landing page data. This approach is consistent with the application's architecture, follows established patterns, and provides significant benefits with minimal code changes.