#!/usr/bin/env bun
import { ProfileContext } from '@/contexts/profiles/core/profileContext';
import logger from '@/utils/logger';
import { batchProcessNoteTags } from '@/utils/tagExtractor';

const ENTITY_TYPES = ['profile', 'notes', 'all'] as const;
type EntityType = typeof ENTITY_TYPES[number];

async function generateTags() {
  // Parse arguments
  const args = process.argv.slice(2);
  const forceRegenerate = args.includes('--force');

  // Determine what to tag (profile, notes, or all)
  let entityType: EntityType = 'all';
  for (const arg of args) {
    if (ENTITY_TYPES.includes(arg as EntityType)) {
      entityType = arg as EntityType;
      break;
    }
  }

  // Initialize services
  const profileContext = new ProfileContext();

  logger.info(`Generating tags${entityType !== 'all' ? ` for ${entityType}` : ''}${forceRegenerate ? ' (forced regeneration)' : ''}...`);

  try {
    // Process based on entity type
    if (entityType === 'profile' || entityType === 'all') {
      await generateProfileTags(profileContext, forceRegenerate);
    }

    if (entityType === 'notes' || entityType === 'all') {
      await generateNoteTags(forceRegenerate);
    }

    logger.info('\nTag generation complete!');
  } catch (error) {
    logger.error(`Error generating tags: ${error}`);
    process.exit(1);
  }
}

async function generateProfileTags(profileContext: ProfileContext, forceRegenerate: boolean = false) {
  logger.info('\n=== Processing Profile Tags ===');

  try {
    // Check if profile exists
    const profile = await profileContext.getProfile();

    if (!profile) {
      logger.info('No profile found. Import a profile first.');
      return;
    }

    // Check if we need to generate tags
    if (!forceRegenerate && profile.tags && profile.tags.length > 0) {
      logger.info(`Profile already has tags: ${profile.tags.join(', ')}`);
      logger.info('Use --force to regenerate tags.');
      return;
    }

    // Generate tags
    const tags = await profileContext.updateProfileTags(forceRegenerate);

    if (tags) {
      logger.info(`Generated tags for profile: ${tags.join(', ')}`);
    } else {
      logger.info('No tags were generated for profile. Check logs for details.');
    }
  } catch (error) {
    logger.error(`Error generating profile tags: ${error}`);
  }
}

async function generateNoteTags(forceRegenerate: boolean = false) {
  // Use the centralized batch processing function from tagExtractor.ts
  const result = await batchProcessNoteTags(forceRegenerate);
  
  // No need for additional logging as it's handled in the utility function
  return result;
}

// Show usage if no arguments provided
if (process.argv.length === 2) {
  logger.info(`
Usage:
  bun run src/tag.ts [entity-type] [options]

Entity Types:
  profile     Generate tags for the user profile
  notes       Generate tags for all notes
  all         Generate tags for both profile and notes (default)

Options:
  --force     Force regeneration of tags even if they already exist

Examples:
  bun run src/tag.ts                  # Generate missing tags for all entities
  bun run src/tag.ts profile          # Generate tags for profile if missing
  bun run src/tag.ts notes --force    # Force regenerate tags for all notes
  `);
  process.exit(0);
}

generateTags();
