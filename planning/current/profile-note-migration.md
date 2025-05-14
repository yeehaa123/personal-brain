# Profile Note Migration Plan

## Overview

This document outlines a plan to simplify the Profile storage model by migrating from a dedicated `profiles` table to storing profile data as a special type of Note. This change aligns with the existing pattern used for landing page data and website identity information, creating a more consistent and unified data storage approach.

Additionally, we will simplify the profile data schema itself, removing the tight coupling to LinkedIn's profile structure and creating a cleaner, more focused schema that better suits our application's needs.

## Motivation

The current implementation uses a separate database table and repository for profile data, which adds complexity to the codebase. The profile schema is also overly complex and tightly coupled to LinkedIn's structure. Since our Personal Brain application is still pre-launch, we have an opportunity to simplify both the architecture and data model.

Key benefits of this approach:

1. **Data Model Consistency**: All user-centric data (notes, profile, landing page) stored in the same format
2. **Simplified Architecture**: Fewer database tables and repositories to maintain
3. **Feature Reuse**: Leverage existing note functionality like embeddings and tag-based organization
4. **Reduced Code Duplication**: Reuse common patterns across contexts
5. **Improved Schema**: A simpler, more focused profile schema that includes essential fields like email

## Current State

Currently, profile data is stored in:
- A dedicated `profiles` table in the database
- Accessed via a `ProfileRepository` 
- Managed by a `ProfileStorageAdapter` and `ProfileContext`

Additionally:
- The current model allows for multiple profiles, which is unnecessary for a personal brain
- Profile data is stored in a complex schema with numerous fields and JSON objects
- The schema is tightly coupled to LinkedIn's profile structure
- Essential information like email is missing from the schema

## Proposed Solution

Our solution consists of two main parts:

1. **Storage Migration**: Implement a `ProfileNoteAdapter` to store the user's profile as a note with a fixed ID, following the same pattern used by `LandingPageNoteAdapter` and `WebsiteIdentityNoteAdapter`.

2. **Schema Simplification**: Replace the complex LinkedIn-based profile schema with a simpler, more focused schema that better meets our application's needs.

### Key Components

1. **New Profile Schema**:
   - Create a simplified schema in place of the LinkedIn-based schema
   - Include essential fields like email
   - Use more straightforward date formats
   - Remove tight coupling to external platforms

2. **Note Schema Extension**:
   - Add 'profile' to the source enum in Note schema (alongside 'landing-page')
   - Use note content field to store serialized profile JSON
   - Use note tags for searchable profile attributes

3. **ProfileNoteAdapter Implementation**:
   - Create adapter to convert between Profile and Note formats
   - Use a fixed ID for the profile note (since only one profile is needed)
   - Implement Component Interface Standardization pattern

4. **ProfileContext Updates**:
   - Simplify API to focus on single profile management
   - Replace ProfileStorageAdapter with ProfileNoteAdapter
   - Maintain backward compatibility where needed

5. **Migration Utility**:
   - Create utility to migrate existing LinkedIn profiles to the new format
   - Convert complex LinkedIn data to our simplified schema

## Implementation Details

### 1. New Profile Schema

We'll replace the current LinkedIn-based schema with a cleaner, more focused schema:

```typescript
// In src/models/profile.ts
export const profileSchema = z.object({
  // Basic information
  id: z.string().uuid().optional(), // Generated if not provided
  displayName: z.string().min(1),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  
  // Contact information
  contact: z.object({
    phone: z.string().optional(),
    website: z.string().url().optional(),
    social: z.array(z.object({
      platform: z.string(),
      url: z.string().url(),
    })).optional(),
  }).optional(),
  
  // Location information
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  
  // Work experiences - simplified
  experiences: z.array(z.object({
    title: z.string(),
    organization: z.string(),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(), // null means current
    location: z.string().optional(),
  })).optional(),
  
  // Education - simplified
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    description: z.string().optional(),
  })).optional(),
  
  // Skills & expertise
  skills: z.array(z.string()).optional(),
  
  // Languages - simplified
  languages: z.array(z.object({
    name: z.string(),
    proficiency: z.enum(['basic', 'intermediate', 'fluent', 'native']),
  })).optional(),
  
  // Projects - simplified
  projects: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string().url().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })).optional(),
  
  // Publications - simplified
  publications: z.array(z.object({
    title: z.string(),
    publisher: z.string().optional(),
    date: z.date().optional(),
    url: z.string().url().optional(),
    description: z.string().optional(),
  })).optional(),

  // Custom fields for our application
  tags: z.array(z.string()).optional(),
  fields: z.record(z.string()).optional(), // For any custom fields we want to add
  
  // Metadata
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// We'll rename the old schema for backward compatibility
export const linkedInProfileSchema = z.object({
  // Keep the existing profile schema as linkedInProfileSchema for migration purposes
  // This will contain all the old LinkedIn-specific fields
});
```

### 2. Note Schema Update

```typescript
// In src/models/note.ts
export const insertNoteSchema = baseInsertNoteSchema.extend({
  // Existing fields...
  source: z.enum(['import', 'conversation', 'user-created', 'landing-page', 'profile']).default('import'),
  // Other fields remain the same...
});

export const selectNoteSchema = baseSelectNoteSchema.extend({
  // Existing fields...
  source: z.enum(['import', 'conversation', 'user-created', 'landing-page', 'profile']).default('import'),
  // Other fields remain the same...
});
```

### 3. LinkedIn Profile Migration Adapter

```typescript
/**
 * LinkedInProfileMigrationAdapter
 * 
 * Utility to convert LinkedIn-format profiles to our new simplified format
 */
export class LinkedInProfileMigrationAdapter {
  /**
   * Convert a LinkedIn profile to our simplified profile format
   */
  static convertToProfile(linkedInProfile: LinkedInProfile): Profile {
    return {
      // Basic information
      displayName: linkedInProfile.fullName,
      email: '', // Will need to be filled in manually
      avatar: linkedInProfile.profilePicUrl,
      headline: linkedInProfile.headline,
      summary: linkedInProfile.summary,
      
      // Contact information
      contact: {
        social: [
          // Extract any social links from the LinkedIn profile if available
        ],
      },
      
      // Location information
      location: {
        city: linkedInProfile.city,
        state: linkedInProfile.state,
        country: linkedInProfile.countryFullName,
      },
      
      // Work experiences
      experiences: linkedInProfile.experiences?.map(exp => ({
        title: exp.title,
        organization: exp.company,
        description: exp.description,
        startDate: this.convertLinkedInDateToDate(exp.starts_at),
        endDate: exp.ends_at ? this.convertLinkedInDateToDate(exp.ends_at) : undefined,
        location: exp.location,
      })),
      
      // Education
      education: linkedInProfile.education?.map(edu => ({
        institution: edu.school,
        degree: edu.degree_name,
        field: edu.field_of_study,
        startDate: this.convertLinkedInDateToDate(edu.starts_at),
        endDate: edu.ends_at ? this.convertLinkedInDateToDate(edu.ends_at) : undefined,
        description: edu.description,
      })),
      
      // Skills (extracted from headline and summary)
      skills: this.extractSkills(linkedInProfile),
      
      // Languages
      languages: linkedInProfile.languagesAndProficiencies?.map(lang => ({
        name: lang.name,
        proficiency: this.mapProficiencyLevel(lang.proficiency),
      })),
      
      // Projects
      projects: linkedInProfile.accomplishmentProjects?.map(proj => ({
        title: proj.title,
        description: proj.description,
        url: proj.url,
        startDate: this.convertLinkedInDateToDate(proj.starts_at),
        endDate: proj.ends_at ? this.convertLinkedInDateToDate(proj.ends_at) : undefined,
      })),
      
      // Publications
      publications: linkedInProfile.accomplishmentPublications?.map(pub => ({
        title: pub.name,
        publisher: pub.publisher,
        date: this.convertLinkedInDateToDate(pub.published_on),
        description: pub.description,
        url: pub.url,
      })),
      
      // Preserve tags if they exist
      tags: linkedInProfile.tags,
      
      // Created/updated timestamps
      createdAt: new Date(linkedInProfile.createdAt),
      updatedAt: new Date(linkedInProfile.updatedAt),
    };
  }
  
  /**
   * Helper to convert LinkedIn date format to standard Date
   */
  private static convertLinkedInDateToDate(dateInfo): Date {
    if (!dateInfo) return undefined;
    
    const { year, month, day } = dateInfo;
    // Default to the 1st of the month if day is missing
    const adjustedDay = day || 1;
    // Default to January if month is missing
    const adjustedMonth = month ? month - 1 : 0;
    
    return new Date(year, adjustedMonth, adjustedDay);
  }
  
  /**
   * Map LinkedIn proficiency levels to our simplified levels
   */
  private static mapProficiencyLevel(proficiency: string): 'basic' | 'intermediate' | 'fluent' | 'native' {
    const map = {
      'ELEMENTARY': 'basic',
      'LIMITED_WORKING': 'basic',
      'PROFESSIONAL_WORKING': 'intermediate',
      'FULL_PROFESSIONAL': 'fluent',
      'NATIVE_OR_BILINGUAL': 'native',
    };
    
    return map[proficiency] || 'basic';
  }
  
  /**
   * Extract skills from headline and summary
   */
  private static extractSkills(profile: LinkedInProfile): string[] {
    // Implementation would extract key skills from text
    // This could use NLP or simple keyword matching
    return [];
  }
}
```

### 4. ProfileNoteAdapter Implementation

```typescript
/**
 * ProfileNoteAdapter
 * 
 * Specialized adapter for storing profile data as a note
 * Simplifies profile storage to a single profile per personal brain
 */
export class ProfileNoteAdapter {
  // Singleton instance management (getInstance, resetInstance, createFresh)
  private static instance: ProfileNoteAdapter | null = null;
  
  // Fixed ID for the single profile
  public static readonly PROFILE_NOTE_ID = 'user-profile';
  
  private noteContext: NoteContext;
  
  private constructor() {
    this.noteContext = NoteContext.getInstance();
  }
  
  public static getInstance(): ProfileNoteAdapter {
    if (!ProfileNoteAdapter.instance) {
      ProfileNoteAdapter.instance = new ProfileNoteAdapter();
    }
    return ProfileNoteAdapter.instance;
  }
  
  public static resetInstance(): void {
    ProfileNoteAdapter.instance = null;
  }
  
  public static createFresh(): ProfileNoteAdapter {
    return new ProfileNoteAdapter();
  }
  
  /**
   * Get the user profile from the note store
   */
  async getProfile(): Promise<Profile | null> {
    const note = await this.noteContext.getNote(ProfileNoteAdapter.PROFILE_NOTE_ID);
    if (!note) {
      return null;
    }
    
    return this.convertNoteToProfile(note);
  }
  
  /**
   * Save the user profile as a note
   */
  async saveProfile(profile: Profile): Promise<boolean> {
    const noteData = this.convertProfileToNote(profile);
    const existingNote = await this.noteContext.getNote(ProfileNoteAdapter.PROFILE_NOTE_ID);
    
    if (existingNote) {
      // Update existing note
      return this.noteContext.updateNote(ProfileNoteAdapter.PROFILE_NOTE_ID, noteData);
    } else {
      // Create new note
      const result = await this.noteContext.createNote({
        id: ProfileNoteAdapter.PROFILE_NOTE_ID,
        ...noteData,
      });
      
      return !!result;
    }
  }
  
  /**
   * Convert a note to profile format
   */
  convertNoteToProfile(note: Note): Profile | null {
    try {
      // Parse the profile data from the note content
      const profileData = JSON.parse(note.content);
      return profileData;
    } catch (error) {
      console.error('Failed to parse profile data from note', error);
      return null;
    }
  }
  
  /**
   * Convert profile data to note format
   */
  convertProfileToNote(profile: Profile): Partial<Note> {
    // Extract key values for tags to make profile searchable
    const tags = [
      ...(profile.tags || []),
      profile.displayName,
      ...(profile.skills || []),
      ...(profile.experiences?.map(exp => exp.organization) || []),
    ].filter(Boolean);
    
    return {
      title: `Profile: ${profile.displayName}`,
      content: JSON.stringify(profile, null, 2),
      tags: [...new Set(tags)], // Remove duplicates
      source: 'profile',
      updatedAt: new Date(),
    };
  }
}
```

### 5. ProfileContext Simplification

The current ProfileContext has numerous methods for managing multiple profiles, searching, and manipulating profile data. With our single-profile approach and note-based storage, we can drastically simplify this class:

**Before Simplification:**
```typescript
// Current ProfileContext (simplified for brevity)
export class ProfileContext extends BaseContext {
  private profileStorageAdapter: ProfileStorageAdapter;
  private profileRepository: ProfileRepository;
  private profileEmbeddingService: ProfileEmbeddingService;
  private profileSearchService: ProfileSearchService;
  
  // Methods for multiple profiles
  async getAllProfiles(): Promise<Profile[]> { /* ... */ }
  async getProfileById(id: string): Promise<Profile | null> { /* ... */ }
  async getProfilesByTag(tag: string): Promise<Profile[]> { /* ... */ }
  async searchProfiles(query: string): Promise<Profile[]> { /* ... */ }
  
  // General methods
  async createProfile(profile: Profile): Promise<string> { /* ... */ }
  async updateProfile(id: string, data: Partial<Profile>): Promise<boolean> { /* ... */ }
  async deleteProfile(id: string): Promise<boolean> { /* ... */ }
  
  // Active profile methods
  async getActiveProfile(): Promise<Profile | null> { /* ... */ }
  async setActiveProfile(id: string): Promise<boolean> { /* ... */ }
  
  // Related services
  async embedProfile(profile: Profile): Promise<number[] | null> { /* ... */ }
  
  // ... many other methods
}
```

**After Simplification:**
```typescript
/**
 * Simplified ProfileContext implementation using note-based storage
 */
export class ProfileContext extends BaseContext {
  private noteContext: NoteContext;
  private profileNoteAdapter: ProfileNoteAdapter;
  
  constructor(options?: Partial<ProfileContextConfig>) {
    super(options);
    this.noteContext = NoteContext.getInstance();
    this.profileNoteAdapter = ProfileNoteAdapter.getInstance();
    this.setReadyState(true);
  }
  
  /**
   * Get the user profile
   */
  async getProfile(): Promise<Profile | null> {
    return this.profileNoteAdapter.getProfile();
  }
  
  /**
   * Save the user profile
   */
  async saveProfile(profile: Profile): Promise<boolean> {
    return this.profileNoteAdapter.saveProfile(profile);
  }
  
  /**
   * Update the user profile (partial update)
   */
  async updateProfile(data: Partial<Profile>): Promise<boolean> {
    const currentProfile = await this.getProfile();
    if (!currentProfile) return false;
    
    return this.saveProfile({
      ...currentProfile,
      ...data,
      updatedAt: new Date()
    });
  }
  
  /**
   * Get profile as a note (for interoperability)
   */
  async getProfileAsNote(): Promise<Note | null> {
    return this.noteContext.getNote(ProfileNoteAdapter.PROFILE_NOTE_ID);
  }
  
  /**
   * For backward compatibility
   */
  async getActiveProfile(): Promise<Profile | null> {
    return this.getProfile();
  }
  
  /**
   * Migrate a LinkedIn profile to our new format
   */
  async migrateLinkedInProfile(linkedInProfile: LinkedInProfile): Promise<boolean> {
    const profile = LinkedInProfileMigrationAdapter.convertToProfile(linkedInProfile);
    return this.saveProfile(profile);
  }
}
```

**Key Simplifications:**

1. **Removed Multiple Profile Support**: Eliminated all methods for managing multiple profiles
2. **Eliminated Storage Complexity**: Removed direct dependency on ProfileRepository and ProfileStorageAdapter
3. **Streamlined API**: Reduced to just 5-6 core methods instead of dozens
4. **Leverages Note Infrastructure**: Uses NoteContext for underlying operations
5. **Maintains Domain Logic**: Still provides a profile-specific interface
6. **Adds Migration Support**: Includes method to migrate from LinkedIn profiles

## Simplifications

Several key simplifications are incorporated in this design:

1. **Single Profile**: Eliminating support for multiple profiles greatly simplifies the implementation
2. **Fixed ID**: Using a constant ID ensures consistent access to the profile
3. **No Complex Repository**: Direct use of note storage eliminates need for a separate repository
4. **Unified API**: Cleaner, more focused methods in the ProfileContext
5. **Simplified Schema**: A more streamlined data model without the LinkedIn-specific complexity
6. **Standard Date Format**: Using JavaScript Date objects instead of custom day/month/year structures

## Impact on Testing and Mocks

This migration will have significant implications for our test suite and mock implementations.

### Current Test Approach

Currently, testing profile-related functionality involves:

1. **Complex Mock Setup**: Tests need to mock ProfileRepository, ProfileStorageAdapter, and other dependencies
2. **Multiple Test Files**: Tests spread across multiple files for different profile components
3. **Heavy DB Mock Usage**: Tests heavily mock database operations
4. **Isolated Component Testing**: Each component of the profile system is tested in isolation

```typescript
// Example of current test setup
describe('ProfileContext', () => {
  beforeEach(() => {
    // Complex setup with many mocked dependencies
    ProfileRepository.resetInstance();
    ProfileStorageAdapter.resetInstance();
    ProfileSearchService.resetInstance();
    ProfileEmbeddingService.resetInstance();
    
    // Mock repository with test data
    const mockRepo = MockProfileRepository.getInstance();
    mockRepo.setProfiles([
      createMockProfile('profile-1', 'Test User 1'),
      createMockProfile('profile-2', 'Test User 2'),
    ]);
    
    // Mock storage adapter
    MockProfileStorageAdapter.getInstance().setRepository(mockRepo);
  });
  
  test('getAllProfiles should return all profiles', async () => {
    const context = ProfileContext.getInstance();
    const profiles = await context.getAllProfiles();
    expect(profiles.length).toBe(2);
  });
  
  // Many more tests for different methods...
});
```

### New Test Approach

After the migration, our testing strategy will be significantly simplified:

1. **Leverage Note Testing**: We can reuse existing note testing infrastructure
2. **Simplified Mocks**: We only need to mock the NoteContext and possibly ProfileNoteAdapter
3. **Fewer Test Files**: Tests will be more focused on the key functionality
4. **Integration with Note Tests**: We can test the integration with note functionality more easily

```typescript
// Example of simplified test setup
describe('ProfileContext', () => {
  beforeEach(() => {
    // Simplified setup with fewer dependencies
    NoteContext.resetInstance();
    ProfileNoteAdapter.resetInstance();
    ProfileContext.resetInstance();
    
    // Mock single note for profile storage
    const mockNoteContext = MockNoteContext.getInstance();
    mockNoteContext.setNotes([
      createMockProfileNote('user-profile', 'Test User'),
    ]);
  });
  
  test('getProfile should return the user profile', async () => {
    const context = ProfileContext.getInstance();
    const profile = await context.getProfile();
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Test User');
  });
  
  // Fewer, more focused tests
});
```

### New Tests for Schema Migration

We'll also need to test the migration from LinkedIn profiles:

```typescript
describe('LinkedInProfileMigrationAdapter', () => {
  test('should convert LinkedIn profile to our format', () => {
    const linkedInProfile = createMockLinkedInProfile();
    const profile = LinkedInProfileMigrationAdapter.convertToProfile(linkedInProfile);
    
    expect(profile.displayName).toBe(linkedInProfile.fullName);
    expect(profile.experiences?.length).toBe(linkedInProfile.experiences?.length);
    // More assertions...
  });
  
  test('should correctly convert LinkedIn dates', () => {
    const linkedInDate = { day: 15, month: 3, year: 2020 };
    const date = LinkedInProfileMigrationAdapter['convertLinkedInDateToDate'](linkedInDate);
    
    expect(date.getFullYear()).toBe(2020);
    expect(date.getMonth()).toBe(2); // 0-indexed months
    expect(date.getDate()).toBe(15);
  });
});
```

### Concerns and Mitigations

1. **Test Breakage**:
   - **Concern**: Existing tests will break due to API changes
   - **Mitigation**: Create a test migration plan and update tests in phases alongside implementation
   
2. **Mock Complexity During Transition**:
   - **Concern**: During the transition, we might need both old and new style mocks
   - **Mitigation**: Create adapter mocks that work with both systems temporarily

3. **Test Coverage Gaps**:
   - **Concern**: The simplified API might lead to reduced test coverage
   - **Mitigation**: Ensure all core functionality is still covered by focusing on use cases rather than methods

4. **Integration Tests**:
   - **Concern**: Integration tests that rely on the old profile system might break
   - **Mitigation**: Update integration tests first, then refactor unit tests

### Mock Implementation Strategy

Create simplified mocks that follow the new pattern:

```typescript
export class MockProfileNoteAdapter {
  private static instance: MockProfileNoteAdapter | null = null;
  private mockProfile: Profile | null = null;
  
  static getInstance(): MockProfileNoteAdapter {
    if (!MockProfileNoteAdapter.instance) {
      MockProfileNoteAdapter.instance = new MockProfileNoteAdapter();
    }
    return MockProfileNoteAdapter.instance;
  }
  
  static resetInstance(): void {
    MockProfileNoteAdapter.instance = null;
  }
  
  setMockProfile(profile: Profile | null): void {
    this.mockProfile = profile;
  }
  
  async getProfile(): Promise<Profile | null> {
    return this.mockProfile;
  }
  
  async saveProfile(profile: Profile): Promise<boolean> {
    this.mockProfile = profile;
    return true;
  }
}
```

## Implementation Plan

### Phase 1: Schema Migration (1 day)

1. Create new profile schema in `src/models/profile.ts`
2. Rename old schema to `linkedInProfileSchema`
3. Create `LinkedInProfileMigrationAdapter`
4. Add tests for schema conversion

### Phase 2: Storage Migration (1 day)

1. Update Note schema to include 'profile' source type
2. Create `ProfileNoteAdapter` class
3. Modify ProfileContext to use the new adapter and schema
4. Update tests for the core functionality

### Phase 3: Transition and Integration (1 day)

1. Update any existing code that uses ProfileContext
2. Add profile tagging capabilities
3. Create migration utility for production use
4. Create new mock implementations
5. Update integration tests

### Phase 4: Testing and Optimization (1 day)

1. Complete test suite migration
2. Profile performance and optimize if needed
3. Conduct integration testing with other contexts
4. Verify all functionality works correctly
5. Update documentation

## Benefits

1. **Consistency**: All data follows the same storage pattern
2. **Simplicity**: Fewer components and storage mechanisms to maintain
3. **Improved Developer Experience**: Common patterns across different data types
4. **Future Flexibility**: Easier to add features like version history or change tracking
5. **Search Integration**: Profile data automatically included in unified search
6. **Better Data Model**: Profile schema that better reflects our application's needs
7. **Essential Fields**: Added important fields like email that were missing
8. **Platform Independence**: No longer tied to LinkedIn's structure

## Architectural Considerations: Keeping ProfileContext

An important architectural decision in this migration is whether to keep the ProfileContext as a separate context or merge its functionality into NoteContext. After careful consideration, we have decided to **maintain a simplified ProfileContext** for the following reasons:

1. **Domain Separation**: Even with notes as the storage mechanism, "Profile" represents a distinct domain concept with specific behaviors and semantics
   
2. **Clean API**: Having a dedicated context provides a clear, domain-specific API for profile operations

3. **Specialized Functionality**: Some profile-specific operations don't make sense as general note operations

4. **Future Extensions**: A dedicated context allows for future profile-specific features without cluttering NoteContext

### NoteContext Integration

While maintaining the separate ProfileContext, we'll enhance it to leverage the NoteContext's capabilities:

```typescript
export class ProfileContext extends BaseContext {
  private noteContext: NoteContext;
  private profileNoteAdapter: ProfileNoteAdapter;
  
  // ...constructor...
  
  /**
   * Get profile as a note (for interoperability)
   */
  async getProfileAsNote(): Promise<Note | null> {
    const note = await this.noteContext.getNote(ProfileNoteAdapter.PROFILE_NOTE_ID);
    return note;
  }
  
# Note: embedProfile method is no longer needed
# ProfileContext now uses the NoteContext's built-in embedding capabilities through the note storage
}
```

This approach gives us the best of both worlds: unified storage with specialized domain interfaces.

## Future Considerations

1. **Profile History**: Since profiles are now stored as notes, we can leverage note history mechanisms
2. **Enhanced Search**: Profile data can be included in semantic search queries
3. **Related Data**: Easier to establish relationships between notes and profile information
4. **Context Unification**: Long-term, we could consider further unifying contexts as the application evolves
5. **Profile Completion**: Add features to encourage users to complete their profiles
6. **External Profile Import**: Support importing profiles from various platforms, not just LinkedIn