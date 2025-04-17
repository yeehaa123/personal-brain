/**
 * Adapter to convert ProfileRepository to StorageInterface
 * 
 * This adapter wraps the existing ProfileRepository implementation to
 * make it compatible with the new StorageInterface standard.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type { ListOptions, SearchCriteria, StorageInterface } from '@/contexts/core/storageInterface';
import type { Profile } from '@/models/profile';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import { Logger } from '@/utils/logger';

/**
 * Adapter to provide StorageInterface for Profile entities
 */
export class ProfileStorageAdapter implements StorageInterface<Profile> {
  /** The singleton instance */
  private static instance: ProfileStorageAdapter | null = null;
  
  /** Logger instance for this class */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Creates a new ProfileStorageAdapter
   * @param repository The underlying ProfileRepository to adapt
   */
  constructor(private repository: ProfileRepository) {}
  
  /**
   * Get the singleton instance of ProfileStorageAdapter
   * 
   * @param repository The repository implementation to use (only used when creating a new instance)
   * @returns The shared ProfileStorageAdapter instance
   */
  public static getInstance(repository: ProfileRepository): ProfileStorageAdapter {
    if (!ProfileStorageAdapter.instance) {
      ProfileStorageAdapter.instance = new ProfileStorageAdapter(repository);
    }
    return ProfileStorageAdapter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    ProfileStorageAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param repository The repository implementation to use
   * @returns A new ProfileStorageAdapter instance
   */
  public static createFresh(repository: ProfileRepository): ProfileStorageAdapter {
    return new ProfileStorageAdapter(repository);
  }

  /**
   * Create a new profile (equivalent to insertProfile)
   * @param item The profile data to create
   * @returns The ID of the created profile
   */
  async create(item: Partial<Profile>): Promise<string> {
    try {
      // Handle the case where we need to create a full Profile from partial data
      const profile = this.prepareProfileForCreate(item);
      return await this.repository.insertProfile(profile);
    } catch (error) {
      this.logger.error('Failed to create profile in adapter', { error, context: 'ProfileStorageAdapter' });
      throw error;
    }
  }

  /**
   * Read a profile by ID
   * @param id The profile ID
   * @returns The profile or null if not found
   */
  async read(id: string): Promise<Profile | null> {
    try {
      // ProfileRepository doesn't support getById, but we can check if the 
      // retrieved profile matches our ID
      const profile = await this.repository.getProfile();
      
      if (profile && profile.id === id) {
        return profile;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to read profile with ID ${id}`, { error, context: 'ProfileStorageAdapter' });
      return null;
    }
  }

  /**
   * Update an existing profile
   * @param id The profile ID
   * @param updates The profile updates to apply
   * @returns True if update was successful
   */
  async update(id: string, updates: Partial<Profile>): Promise<boolean> {
    try {
      return await this.repository.updateProfile(id, updates);
    } catch (error) {
      this.logger.error(`Failed to update profile with ID ${id}`, { error, context: 'ProfileStorageAdapter' });
      return false;
    }
  }

  /**
   * Delete a profile by ID
   * @param id The profile ID
   * @returns True if deletion was successful
   */
  async delete(id: string): Promise<boolean> {
    try {
      return await this.repository.deleteProfile(id);
    } catch (error) {
      this.logger.error(`Failed to delete profile with ID ${id}`, { error, context: 'ProfileStorageAdapter' });
      return false;
    }
  }

  /**
   * Search for profiles matching criteria
   * @param criteria The search criteria
   * @returns Array of matching profiles
   * 
   * Note: Since the ProfileRepository doesn't support complex search,
   * this returns at most one profile that matches ALL criteria.
   */
  async search(criteria: SearchCriteria): Promise<Profile[]> {
    try {
      const profile = await this.repository.getProfile();
      
      // If no profile exists or we have no criteria, return appropriate result
      if (!profile) {
        return [];
      }
      
      if (!criteria || Object.keys(criteria).length === 0) {
        return [profile];
      }
      
      // Check if profile matches all criteria
      const matches = Object.entries(criteria).every(([key, value]) => {
        // Use type assertion to safely check properties
        return profile[key as keyof Profile] === value;
      });
      
      return matches ? [profile] : [];
    } catch (error) {
      this.logger.error('Failed to search profiles', { error, context: 'ProfileStorageAdapter' });
      return [];
    }
  }

  /**
   * List profiles with pagination
   * @param options Options for listing profiles
   * @returns Array of profiles
   * 
   * Note: Since there's only one profile, this returns either that profile
   * or an empty array, respecting the offset option.
   */
  async list(options?: ListOptions): Promise<Profile[]> {
    try {
      const profile = await this.repository.getProfile();
      
      // If no profile or offset > 0, return empty array
      if (!profile || (options?.offset && options.offset > 0)) {
        return [];
      }
      
      return [profile];
    } catch (error) {
      this.logger.error('Failed to list profiles', { error, context: 'ProfileStorageAdapter' });
      return [];
    }
  }

  /**
   * Count profiles matching criteria
   * @param criteria Optional criteria to count matching profiles
   * @returns Number of matching profiles (0 or 1)
   */
  async count(criteria?: SearchCriteria): Promise<number> {
    try {
      const profile = await this.repository.getProfile();
      
      // If no profile exists, return 0
      if (!profile) {
        return 0;
      }
      
      // If no criteria, return 1 (the profile exists)
      if (!criteria || Object.keys(criteria).length === 0) {
        return 1;
      }
      
      // Check if profile matches all criteria
      const matches = Object.entries(criteria).every(([key, value]) => {
        return profile[key as keyof Profile] === value;
      });
      
      return matches ? 1 : 0;
    } catch (error) {
      this.logger.error('Failed to count profiles', { error, context: 'ProfileStorageAdapter' });
      return 0;
    }
  }

  /**
   * Get the profile directly (convenience method for ProfileContext)
   * @returns The profile or undefined if not found
   */
  async getProfile(): Promise<Profile | undefined> {
    return this.repository.getProfile();
  }

  /**
   * Helper method to prepare a complete Profile from partial data
   * @param item Partial profile data
   * @returns A complete Profile object
   */
  private prepareProfileForCreate(item: Partial<Profile>): Profile {
    const now = new Date();
    
    // Create a properly shaped Profile object
    return {
      id: item.id || '', // Will be generated by repository if empty
      fullName: item.fullName || '',
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
      embedding: item.embedding || [],
      tags: item.tags || [],
      // Include remaining properties with their values or defaults
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
  }
}