/**
 * Repository for profile data operations
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/db';
import { profiles } from '@/db/schema';
import {
  insertProfileSchema,
  type Profile,
} from '@/models/profile';
import { BaseRepository } from '@/services/BaseRepository';
import { DatabaseError, ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';

/**
 * Repository for profile data operations
 */
export class ProfileRepository extends BaseRepository<typeof profiles, Profile> {
  /**
   * Singleton instance of ProfileRepository
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ProfileRepository | null = null;

  /**
   * Get the singleton instance of the repository
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @returns The singleton instance
   */
  public static getInstance(): ProfileRepository {
    if (!ProfileRepository.instance) {
      ProfileRepository.instance = new ProfileRepository();
      
      const logger = Logger.getInstance();
      logger.debug('ProfileRepository singleton instance created');
    }
    
    return ProfileRepository.instance;
  }

  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (ProfileRepository.instance) {
        // No specific cleanup needed for this repository
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during ProfileRepository instance reset:', error);
    } finally {
      ProfileRepository.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('ProfileRepository singleton instance reset');
    }
  }

  /**
   * Create a fresh ProfileRepository instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @returns A new ProfileRepository instance
   */
  public static createFresh(): ProfileRepository {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ProfileRepository instance');
    
    return new ProfileRepository();
  }
  /**
   * Get the table that this repository uses
   */
  protected get table() {
    return profiles;
  }

  /**
   * Get entity name for error messages and logging
   */
  protected get entityName() {
    return 'profile';
  }
  
  /**
   * Get the ID column for the table
   */
  protected getIdColumn() {
    return profiles.id;
  }

  /**
   * Retrieve the user profile
   * @returns The user profile or undefined if not found
   */
  async getProfile(): Promise<Profile | undefined> {
    try {
      this.logger.debug('Retrieving user profile');
      const result = await db.select().from(profiles).limit(1);
      this.logger.debug(`Profile found: ${Boolean(result[0])}`);
      return result[0];
    } catch (error) {
      this.logger.error(`Failed to retrieve profile: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Insert a new profile
   * @param profileData Complete profile data
   * @returns ID of the created profile
   */
  async insertProfile(profileData: Profile): Promise<string> {
    try {
      if (!isDefined(profileData)) {
        this.logger.warn('Profile data is undefined or null');
        throw new ValidationError('Profile data is required');
      }

      const id = profileData.id || nanoid();
      const now = new Date();
      
      this.logger.debug(`Creating new profile with ID: ${id}`);
      
      // Ensure experiences is a string if it's an object
      const experiences = typeof profileData.experiences === 'object' 
        ? JSON.stringify(profileData.experiences) 
        : profileData.experiences;
      
      const insertData = insertProfileSchema.parse({
        ...profileData,
        id,
        experiences,
        createdAt: profileData.createdAt || now,
        updatedAt: profileData.updatedAt || now,
      });
      
      await db.insert(profiles).values(insertData);
      this.logger.info(`Profile created with ID: ${id}`);
      return id;
    } catch (error) {
      this.logger.error(`Failed to insert profile: ${error instanceof Error ? error.message : String(error)}`);
      throw new DatabaseError('Failed to create profile', { originalError: error });
    }
  }

  /**
   * Update an existing profile
   * @param id Profile ID
   * @param profileData Profile data to update
   * @returns true if successful
   */
  async updateProfile(id: string, profileData: Partial<Profile>): Promise<boolean> {
    try {
      if (!isDefined(id) || !isDefined(profileData)) {
        this.logger.warn(`Invalid update request: ID defined: ${Boolean(id)}, data defined: ${Boolean(profileData)}`);
        throw new ValidationError('Profile ID and data are required');
      }

      this.logger.debug(`Updating profile with ID: ${id}`);
      
      const now = new Date();
      // Process profile data to handle experiences correctly
      const processedData = { ...profileData, updatedAt: now };
      
      // Use a safer approach with Object.assign to handle data
      // Create a safe shallow copy without type issues
      const safeData: Record<string, unknown> = {};
      
      // Safely copy all fields except experiences
      Object.keys(processedData).forEach(key => {
        if (key !== 'experiences') {
          safeData[key] = processedData[key as keyof typeof processedData];
        }
      });
      
      // Handle experiences field specially
      const experiences = processedData.experiences;
      if (experiences !== undefined) {
        // Convert to string if it's an object
        if (typeof experiences === 'object') {
          safeData['experiences'] = JSON.stringify(experiences);
        } else {
          safeData['experiences'] = experiences;
        }
      }
      
      // Use our safe data object for the update
      await db.update(profiles)
        .set(safeData)
        .where(eq(profiles.id, id));

      this.logger.info(`Profile ${id} updated successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update profile ${id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Delete a profile 
   * @param id Profile ID
   * @returns true if successful
   */
  async deleteProfile(id: string): Promise<boolean> {
    this.logger.debug(`Attempting to delete profile with ID: ${id}`);
    const result = await this.deleteById(id);
    
    if (result) {
      this.logger.info(`Profile ${id} deleted successfully`);
    } else {
      this.logger.warn(`Failed to delete profile ${id} or profile not found`);
    }
    
    return result;
  }
}