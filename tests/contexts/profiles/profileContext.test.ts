import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { NoteContext } from '@/contexts/notes/noteContext';
import type { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import type { ProfileContextDependencies } from '@/contexts/profiles/profileContext';
import { ProfileContext } from '@/contexts/profiles/profileContext';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import type { Profile } from '@/models/profile';
import type { LinkedInProfileMigrationAdapter } from '@/services/profiles/linkedInProfileMigrationAdapter';
import { Logger } from '@/utils/logger';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileNoteAdapter } from '@test/__mocks__/contexts/profiles/adapters/profileNoteAdapter';
import { MockLogger } from '@test/__mocks__/core/logger';
import { MockLinkedInProfileMigrationAdapter } from '@test/__mocks__/services/profiles/linkedInProfileMigrationAdapter';

describe('ProfileContext', () => {
  // Create a sample profile for testing
  const sampleProfile: Profile = {
    displayName: 'Test User',
    email: 'test@example.com',
    headline: 'Test Headline',
    summary: 'Test Summary',
  };
  
  // Test dependencies
  let mockNoteContext: MockNoteContext;
  let mockProfileNoteAdapter: MockProfileNoteAdapter;
  let mockProfileMigrationAdapter: MockLinkedInProfileMigrationAdapter;
  let dependencies: ProfileContextDependencies;

  beforeEach(async () => {
    // Reset singletons before each test
    ProfileContext.resetInstance();
    MockNoteContext.resetInstance();
    MockProfileNoteAdapter.resetInstance();
    MockLinkedInProfileMigrationAdapter.resetInstance();
    MockLogger.resetInstance();
    
    // Create new mock instances for each test
    mockNoteContext = MockNoteContext.createFresh() as MockNoteContext;
    mockProfileNoteAdapter = MockProfileNoteAdapter.createFresh();
    mockProfileMigrationAdapter = MockLinkedInProfileMigrationAdapter.createFresh();
    
    // Set up dependencies
    dependencies = {
      noteContext: mockNoteContext as unknown as NoteContext,
      profileNoteAdapter: mockProfileNoteAdapter as unknown as ProfileNoteAdapter,
      profileMigrationAdapter: mockProfileMigrationAdapter as unknown as LinkedInProfileMigrationAdapter,
      logger: Logger.getInstance(),
    };
    
    // Initialize with default state
    await mockProfileNoteAdapter.setMockProfile(null);
  });

  // Helper to create a context with dependencies
  const createContext = () => {
    return ProfileContext.createFresh({}, dependencies);
  };

  test('getInstance should return a singleton instance', () => {
    // Create first instance with dependencies
    const ctx1 = ProfileContext.getInstance({}, dependencies);
    
    // Second call should return the same instance
    const ctx2 = ProfileContext.getInstance();
    
    expect(ctx1).toBe(ctx2);
  });

  test('createFresh should create a new instance', () => {
    const ctx1 = createContext();
    const ctx2 = createContext();
    
    expect(ctx1).not.toBe(ctx2);
  });

  test('getProfile should return null when no profile exists', async () => {
    const ctx = createContext();
    const profile = await ctx.getProfile();
    
    expect(profile).toBeNull();
  });

  test('saveProfile should store a profile', async () => {
    const ctx = createContext();
    
    // Spy on the adapter's saveProfile method
    const saveProfileSpy = spyOn(mockProfileNoteAdapter, 'saveProfile');
    
    const result = await ctx.saveProfile(sampleProfile);
    
    expect(result).toBe(true);
    expect(saveProfileSpy).toHaveBeenCalled();
    
    // Set up mock response for getProfile
    await mockProfileNoteAdapter.setMockProfile(sampleProfile);
    
    // Verify profile was stored
    const savedProfile = await ctx.getProfile();
    expect(savedProfile).not.toBeNull();
    expect(savedProfile?.displayName).toBe(sampleProfile.displayName);
    expect(savedProfile?.email).toBe(sampleProfile.email);
  });

  test('updateProfile should update an existing profile', async () => {
    const ctx = createContext();
    
    // Set up an existing profile
    await mockProfileNoteAdapter.setMockProfile(sampleProfile);
    
    // Spy on the adapter's saveProfile method
    const saveProfileSpy = spyOn(mockProfileNoteAdapter, 'saveProfile');
    
    // Update the profile
    const update = {
      headline: 'Updated Headline',
      summary: 'Updated Summary',
    };
    
    const result = await ctx.updateProfile(update);
    expect(result).toBe(true);
    expect(saveProfileSpy).toHaveBeenCalled();
    
    // Set up mock response for getProfile
    await mockProfileNoteAdapter.setMockProfile({
      ...sampleProfile,
      ...update,
    });
    
    // Verify profile was updated
    const updatedProfile = await ctx.getProfile();
    expect(updatedProfile?.headline).toBe(update.headline);
    expect(updatedProfile?.summary).toBe(update.summary);
    expect(updatedProfile?.displayName).toBe(sampleProfile.displayName);
  });

  test('updateProfile should fail when no profile exists', async () => {
    const ctx = createContext();
    
    // Try to update without an existing profile
    const update = {
      headline: 'Updated Headline',
    };
    
    const result = await ctx.updateProfile(update);
    expect(result).toBe(false);
  });

  test('migrateLinkedInProfile should convert and save a LinkedIn profile', async () => {
    const ctx = createContext();
    
    // Mock LinkedIn profile (simplified)
    const linkedInProfile: Partial<LinkedInProfile> = {
      id: 'linkedin-123',
      fullName: 'LinkedIn User',
      headline: 'LinkedIn Headline',
      summary: 'LinkedIn Summary',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Spy on the adapter methods
    const convertToProfileSpy = spyOn(mockProfileMigrationAdapter, 'convertToProfile');
    const saveProfileSpy = spyOn(mockProfileNoteAdapter, 'saveProfile');
    
    // Configure the migration adapter
    mockProfileMigrationAdapter.setMockConvertFn(() => ({
      displayName: linkedInProfile.fullName!,
      email: 'converted@example.com',
      headline: linkedInProfile.headline || '',
      summary: linkedInProfile.summary,
    }));
    
    const result = await ctx.migrateLinkedInProfile(linkedInProfile as LinkedInProfile);
    
    expect(result).toBe(true);
    expect(convertToProfileSpy).toHaveBeenCalled();
    expect(saveProfileSpy).toHaveBeenCalled();
    
    // Verify error logging if migration fails
    const errorLogSpy = spyOn(Logger.getInstance(), 'error');
    convertToProfileSpy.mockImplementation(() => {
      throw new Error('Conversion failed');
    });
    
    const failedResult = await ctx.migrateLinkedInProfile(linkedInProfile as LinkedInProfile);
    expect(failedResult).toBe(false);
    expect(errorLogSpy).toHaveBeenCalled();
  });
});