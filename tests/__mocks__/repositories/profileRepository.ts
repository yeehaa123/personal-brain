/**
 * Mock Profile Repository Implementation
 * 
 * This file provides a standardized mock implementation of the Profile Repository
 * for use in tests across the codebase.
 */

import { profiles } from '@/db/schema';
import type { Profile } from '@/models/profile';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createMockProfile, createMockProfiles } from '@test/__mocks__/models/profile';

/**
 * MockProfileRepository class with standardized interface
 * 
 * This repository mock includes:
 * - Singleton pattern with getInstance() and resetInstance()
 * - In-memory storage for profiles
 * - CRUD operations (create, read, update, delete)
 * - Search and query operations
 * - Methods for test setup and verification
 */
export class MockProfileRepository {
  private static instance: MockProfileRepository | null = null;
  profiles: Profile[] = [];
  // Add logger to match the BaseRepository implementation
  protected logger = MockLogger.getInstance();

  /**
   * Private constructor to enforce singleton pattern
   */
  constructor() {
    this.profiles = [];
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProfileRepository {
    if (!MockProfileRepository.instance) {
      MockProfileRepository.instance = new MockProfileRepository();
      // Initialize with default profiles asynchronously
      createMockProfiles().then(profiles => {
        if (MockProfileRepository.instance) {
          MockProfileRepository.instance.profiles = [...profiles];
        }
      });
    }
    return MockProfileRepository.instance as unknown as ProfileRepository;
  }

  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockProfileRepository.instance = null;
  }

  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(initialProfiles: Profile[] = []): ProfileRepository {
    const repo = new MockProfileRepository();
    
    // If we have initial profiles, use them
    if (initialProfiles.length > 0) {
      // Handle both regular profiles and Promises
      const profilePromises = initialProfiles.map(profile => {
        if (profile && typeof profile === 'object' && 'then' in profile) {
          return profile;
        }
        return Promise.resolve(profile);
      });
      
      // Load the profiles asynchronously
      Promise.all(profilePromises).then(resolvedProfiles => {
        repo.profiles = [...resolvedProfiles];
      });
    } else {
      // Otherwise load default profiles
      createMockProfiles().then(profiles => {
        repo.profiles = [...profiles];
      });
    }
    
    return repo as unknown as ProfileRepository;
  }

  /**
   * Get a profile by ID - BaseRepository method
   */
  getById = async (id: string): Promise<Profile | undefined> => {
    return this.profiles.find(profile => profile.id === id);
  };

  /**
   * Insert profile - BaseRepository method
   */
  insert = async (profile: Profile): Promise<Profile> => {
    const index = this.profiles.findIndex(p => p.id === profile.id);
    if (index !== -1) {
      this.profiles[index] = profile;
      return profile;
    }
    this.profiles.push(profile);
    return profile;
  };

  /**
   * Delete profile by ID - BaseRepository method
   */
  deleteById = async (id: string): Promise<boolean> => {
    const initialLength = this.profiles.length;
    this.profiles = this.profiles.filter(profile => profile.id !== id);
    return this.profiles.length < initialLength;
  };

  /**
   * Get profile count - BaseRepository method
   */
  getCount = async (): Promise<number> => {
    return this.profiles.length;
  };

  /**
   * Get the profile - specialized method from ProfileRepository
   */
  getProfile = async (): Promise<Profile | undefined> => {
    if (this.profiles.length === 0) {
      return undefined;
    }
    return this.profiles[0];
  };

  /**
   * Insert a profile - specialized method from ProfileRepository
   */
  insertProfile = async (profileData: Profile): Promise<string> => {
    const id = profileData.id;
    const index = this.profiles.findIndex(p => p.id === id);

    if (index !== -1) {
      this.profiles[index] = profileData;
    } else {
      this.profiles.push(profileData);
    }

    return id;
  };

  /**
   * Update a profile - specialized method from ProfileRepository
   */
  updateProfile = async (id: string, profileData: Partial<Profile>): Promise<boolean> => {
    const index = this.profiles.findIndex(profile => profile.id === id);
    if (index === -1) return false;

    this.profiles[index] = { ...this.profiles[index], ...profileData, updatedAt: new Date() };
    return true;
  };

  /**
   * Delete a profile - specialized method from ProfileRepository
   */
  deleteProfile = async (id: string): Promise<boolean> => {
    return this.deleteById(id);
  };

  /**
   * Get all profiles
   */
  getAll = async (): Promise<Profile[]> => {
    return [...this.profiles];
  };

  /**
   * Update a profile's embedding
   */
  updateProfileEmbedding = async (profileId: string, embedding: number[]): Promise<void> => {
    const index = this.profiles.findIndex(profile => profile.id === profileId);
    if (index !== -1) {
      this.profiles[index] = { ...this.profiles[index], embedding };
    }
  };

  /**
   * Get profiles without embeddings
   */
  getProfilesWithoutEmbeddings = async (): Promise<Profile[]> => {
    return this.profiles.filter(profile => profile.embedding === null);
  };

  /**
   * Get profiles with embeddings
   */
  getProfilesWithEmbeddings = async (): Promise<Profile[]> => {
    return this.profiles.filter(profile => profile.embedding !== null);
  };

  /**
   * Implementation of the required abstract methods from BaseRepository
   * These are needed for TypeScript compatibility but aren't used in tests
   */
  get table() {
    return profiles;
  }

  get entityName(): string {
    return 'profile';
  }

  getIdColumn() {
    return profiles.id;
  }

  /**
   * Reset repository state (instance method to reset content, not singleton)
   */
  reset = async (): Promise<void> => {
    const profiles = await createMockProfiles();
    this.profiles = [...profiles];
  };

  /**
   * Clear all profiles
   */
  clear(): void {
    this.profiles = [];
  }

  /**
   * Add test profiles
   */
  addTestProfiles = async (count: number = 3): Promise<Profile[]> => {
    const newProfiles: Profile[] = [];
    for (let i = 1; i <= count; i++) {
      const profile = await createMockProfile(`test-profile-${i}`);
      this.profiles.push(profile);
      newProfiles.push(profile);
    }
    return newProfiles;
  };
}
