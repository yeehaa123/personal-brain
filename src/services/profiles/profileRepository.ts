/**
 * Repository for profile data operations
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
import logger from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';

/**
 * Repository for profile data operations
 */
export class ProfileRepository extends BaseRepository<typeof profiles, Profile> {
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
      const result = await db.select().from(profiles).limit(1);
      return result[0];
    } catch (error) {
      logger.error(`Failed to retrieve profile: ${error instanceof Error ? error.message : String(error)}`);
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
        throw new ValidationError('Profile data is required');
      }

      const id = profileData.id || nanoid();
      const now = new Date();
      
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
      return id;
    } catch (error) {
      logger.error(`Failed to insert profile: ${error instanceof Error ? error.message : String(error)}`);
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
        throw new ValidationError('Profile ID and data are required');
      }

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

      return true;
    } catch (error) {
      logger.error(`Failed to update profile ${id}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Delete a profile 
   * @param id Profile ID
   * @returns true if successful
   */
  async deleteProfile(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}