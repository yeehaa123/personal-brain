/**
 * Profile Migration Script
 * 
 * This script migrates a profile from a YAML file to the new note-based format.
 * Rather than migrating from the database, we re-import the profile from its
 * original YAML file, which gives us a cleaner migration path.
 * 
 * Usage:
 *   bun run scripts/migrate-profile.ts [path/to/profile.yaml]
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import * as yaml from 'js-yaml';

import { NoteContext } from '@/contexts/notes/noteContext';
import { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import { LinkedInProfileMigrationAdapter } from '@/services/profiles/linkedInProfileMigrationAdapter';
import { TagExtractor } from '@/utils/tagExtractor';
import type { LinkedInProfile } from '@/models/linkedInProfile';
import { Logger } from '@/utils/logger';

// Configure logger
const logger = Logger.getInstance();

/**
 * Main migration function
 */
async function migrateProfile() {
  try {
    // Get the profile file path from command line or use default
    const profilePath = process.argv[2] || './src/models/profiles/sample.yaml';
    const resolvedPath = resolve(profilePath);
    
    if (!existsSync(resolvedPath)) {
      logger.error(`Profile file ${resolvedPath} does not exist`);
      process.exit(1);
    }
    
    if (!resolvedPath.endsWith('.yaml') && !resolvedPath.endsWith('.yml')) {
      logger.error(`File ${resolvedPath} is not a YAML file`);
      process.exit(1);
    }
    
    logger.info(`Migrating profile from ${resolvedPath}...`);
    
    // Create dependencies
    const noteContext = NoteContext.getInstance();
    const tagExtractor = TagExtractor.getInstance();
    const profileNoteAdapter = ProfileNoteAdapter.getInstance({
      noteContext,
      tagExtractor,
    });
    const profileMigrationAdapter = LinkedInProfileMigrationAdapter.getInstance();
    
    // Read the YAML file
    const fileContent = readFileSync(resolvedPath, 'utf8');
    const linkedInData = yaml.load(fileContent) as Record<string, unknown>;
    logger.info('YAML file loaded successfully');
    
    // Convert to LinkedIn profile format
    const linkedInProfile: LinkedInProfile = {
      id: linkedInData['id'] as string || `linkedin-${Date.now()}`,
      fullName: linkedInData['full_name'] as string || 'Unknown User',
      headline: linkedInData['headline'] as string,
      summary: linkedInData['summary'] as string,
      profilePicUrl: linkedInData['profile_pic_url'] as string,
      city: linkedInData['city'] as string,
      state: linkedInData['state'] as string,
      countryFullName: linkedInData['country_full_name'] as string,
      experiences: linkedInData['experiences'] as any[],
      education: linkedInData['education'] as any[],
      languages: linkedInData['languages'] as string[],
      languagesAndProficiencies: linkedInData['languages_and_proficiencies'] as any[],
      accomplishmentProjects: linkedInData['accomplishment_projects'] as any[],
      accomplishmentPublications: linkedInData['accomplishment_publications'] as any[],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Convert to new profile format
    const profile = profileMigrationAdapter.convertToProfile(linkedInProfile);
    
    // Make sure email is set (required field)
    if (!profile.email) {
      profile.email = 'example@example.com';
    }
    
    // Save as note
    const result = await profileNoteAdapter.saveProfile(profile);
    
    if (result) {
      logger.info('Successfully migrated profile to note storage');
      const newProfile = await profileNoteAdapter.getProfile();
      if (newProfile) {
        logger.info(`Profile name: ${newProfile.displayName}`);
        logger.info(`Profile ID: ${newProfile.id || 'unknown'}`);
        if (newProfile.tags && newProfile.tags.length > 0) {
          logger.info(`Tags: ${newProfile.tags.join(', ')}`);
        }
      }
    } else {
      logger.error('Failed to save profile to note storage');
      process.exit(1);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Migration failed: ${errorMessage}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
migrateProfile().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});