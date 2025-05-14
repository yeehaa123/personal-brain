/**
 * Profile Migration Script (Database to Note)
 * 
 * This script migrates a profile from the database to the new note-based format.
 * It retrieves the profile from the old ProfileContext and saves it using the new
 * ProfileContextV2, effectively migrating it to be stored as a note.
 * 
 * Usage:
 *   bun run scripts/migrate-profile-from-db.ts
 */

import { ProfileContext } from '@/contexts';
import { ProfileContextV2 } from '@/contexts/profiles/profileContextV2';
import { LinkedInProfile } from '@/models/linkedInProfile';
import { Logger } from '@/utils/logger';

// Configure logger
const logger = Logger.getInstance();

/**
 * Main migration function
 */
async function migrateProfileFromDb() {
  try {
    logger.info('Starting migration of profile from database to note-based storage...');
    
    // Get the old profile context
    const oldProfileContext = ProfileContext.getInstance();
    
    // Get the new profile context
    const newProfileContext = ProfileContextV2.getInstance();
    
    // Get the existing profile
    const profile = await oldProfileContext.getProfile();
    
    if (!profile) {
      logger.error('No profile found in the database. Nothing to migrate.');
      process.exit(1);
    }
    
    logger.info('Found existing profile. Converting to the new format...');
    
    // Convert the profile to a LinkedIn profile format
    // This is a workaround since our migration adapter expects LinkedIn format
    const linkedInProfile: LinkedInProfile = {
      id: profile.id || `profile-${Date.now()}`,
      fullName: profile.fullName || profile.displayName || 'User',
      headline: profile.headline,
      summary: profile.summary,
      city: profile.city,
      state: profile.state,
      countryFullName: profile.countryFullName,
      country: profile.country,
      profilePicUrl: profile.profilePicUrl || profile.avatar,
      experiences: profile.experiences,
      education: profile.education,
      languages: profile.languages,
      languagesAndProficiencies: profile.languagesAndProficiencies,
      accomplishmentProjects: profile.accomplishmentProjects,
      accomplishmentPublications: profile.accomplishmentPublications,
      tags: profile.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Migrate the profile using the new context
    const success = await newProfileContext.migrateLinkedInProfile(linkedInProfile);
    
    if (!success) {
      logger.error('Failed to migrate profile to the new storage format.');
      process.exit(1);
    }
    
    // Get the new profile to verify migration
    const newProfile = await newProfileContext.getProfile();
    
    if (!newProfile) {
      logger.error('Migration seemed to succeed but the new profile was not found.');
      process.exit(1);
    }
    
    logger.info('Successfully migrated profile to the new note-based storage!');
    logger.info(`New profile ID: ${newProfile.id}`);
    logger.info('You can now use ProfileContextV2 to access the profile.');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Migration failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run the migration
migrateProfileFromDb().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});