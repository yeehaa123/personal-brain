/**
 * MockProfileStorageAdapter
 * 
 * Standard mock for ProfileStorageAdapter that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';
import { nanoid } from 'nanoid';

import type { ProfileStorageAdapter } from '@/contexts/profiles';
import type { ListOptions, SearchCriteria } from '@/contexts/storageInterface';
import type { Profile } from '@/models/profile';
// Import only the types we need

/**
 * Mock implementation of ProfileStorageAdapter
 */
export class MockProfileStorageAdapter {
  private static instance: MockProfileStorageAdapter | null = null;

  // Mock storage
  private profile: Profile | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): ProfileStorageAdapter {
    if (!MockProfileStorageAdapter.instance) {
      MockProfileStorageAdapter.instance = new MockProfileStorageAdapter();
    }
    return MockProfileStorageAdapter.instance as unknown as ProfileStorageAdapter;
  }

  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockProfileStorageAdapter.instance = null;
  }

  /**
   * Create fresh instance for testing
   */
  public static createFresh(): ProfileStorageAdapter {
    return new MockProfileStorageAdapter() as unknown as ProfileStorageAdapter;
  }

  /**
   * Set a mock profile for testing
   */
  setMockProfile(profile: Profile | null): void {
    this.profile = profile;
  }

  // Mock methods with default implementations
  public create = mock((item: Partial<Profile>): Promise<string> => {
    const id = item.id || `profile-${nanoid()}`;
    const now = new Date();

    this.profile = {
      id,
      fullName: item.fullName || 'Test User',
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
      embedding: item.embedding || [],
      tags: item.tags || [],
      publicIdentifier: item.publicIdentifier || null,
      profilePicUrl: item.profilePicUrl || null,
      backgroundCoverImageUrl: item.backgroundCoverImageUrl || null,
      firstName: item.firstName || null,
      lastName: item.lastName || null,
      followerCount: item.followerCount || 0,
      headline: item.headline || null,
      occupation: item.occupation || null,
      summary: item.summary || null,
      city: item.city || null,
      state: item.state || null,
      country: item.country || null,
      countryFullName: item.countryFullName || null,
      experiences: item.experiences || null,
      education: item.education || null,
      languages: item.languages || null,
      languagesAndProficiencies: item.languagesAndProficiencies || null,
      accomplishmentPublications: item.accomplishmentPublications || null,
      accomplishmentHonorsAwards: item.accomplishmentHonorsAwards || null,
      accomplishmentProjects: item.accomplishmentProjects || null,
      volunteerWork: item.volunteerWork || null,
    };

    return Promise.resolve(id);
  });

  public read = mock((id: string): Promise<Profile | null> => {
    if (this.profile && this.profile.id === id) {
      return Promise.resolve(this.profile);
    }
    return Promise.resolve(null);
  });

  public update = mock((id: string, updates: Partial<Profile>): Promise<boolean> => {
    if (this.profile && this.profile.id === id) {
      this.profile = {
        ...this.profile,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  });

  public delete = mock((id: string): Promise<boolean> => {
    if (this.profile && this.profile.id === id) {
      this.profile = null;
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  });

  public search = mock((_criteria: SearchCriteria): Promise<Profile[]> => {
    return this.profile ? Promise.resolve([this.profile]) : Promise.resolve([]);
  });

  public list = mock((_options?: ListOptions): Promise<Profile[]> => {
    return this.profile ? Promise.resolve([this.profile]) : Promise.resolve([]);
  });

  public count = mock((_criteria?: SearchCriteria): Promise<number> => {
    return Promise.resolve(this.profile ? 1 : 0);
  });

  public getProfile = mock((): Promise<Profile | null> => {
    return Promise.resolve(this.profile || null);
  });
}
