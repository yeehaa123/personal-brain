#!/usr/bin/env bun
import { NoteContext, ProfileContext } from '@/mcp';
import { db } from '@/db';
import { notes, profiles } from '@/db/schema';
import logger from '@/utils/logger';

const ENTITY_TYPES = ['profile', 'notes', 'all'] as const;
type EntityType = typeof ENTITY_TYPES[number];

async function generateEmbeddings() {
  // Parse arguments
  const args = process.argv.slice(2);
  const forceRegenerate = args.includes('--force');
  
  // Determine what to embed (profile, notes, or all)
  let entityType: EntityType = 'notes'; // Default to notes for backward compatibility
  for (const arg of args) {
    if (ENTITY_TYPES.includes(arg as EntityType)) {
      entityType = arg as EntityType;
      break;
    }
  }

  logger.info(`Generating embeddings${entityType !== 'notes' ? ` for ${entityType}` : ''}${forceRegenerate ? ' (forced regeneration)' : ''}...`);

  try {
    // Process based on entity type
    if (entityType === 'profile' || entityType === 'all') {
      await generateProfileEmbeddings(forceRegenerate);
    }
    
    if (entityType === 'notes' || entityType === 'all') {
      await generateNoteEmbeddings(forceRegenerate);
    }
    
    logger.info('\nEmbedding generation complete!');
  } catch (error) {
    logger.error(`Error generating embeddings: ${error}`);
    process.exit(1);
  }
}

async function generateNoteEmbeddings(forceRegenerate: boolean) {
  logger.info('\n=== Processing Note Embeddings ===');
  
  if (forceRegenerate) {
    logger.info('Force regenerating embeddings for ALL notes...');
    await db.update(notes).set({ embedding: null });
  } else {
    logger.info('Generating embeddings for notes without embeddings...');
    logger.info('Use --force flag to regenerate all embeddings');
  }

  try {
    const context = new NoteContext();
    const result = await context.generateEmbeddingsForAllNotes();

    logger.info(`Notes updated: ${result.updated}`);
    logger.info(`Notes failed: ${result.failed}`);

    if (result.failed > 0) {
      logger.info('Some notes failed to generate embeddings. Check the logs for details.');
    }
  } catch (error) {
    logger.error(`Error generating note embeddings: ${error}`);
  }
}

async function generateProfileEmbeddings(forceRegenerate: boolean) {
  logger.info('\n=== Processing Profile Embedding ===');
  
  if (forceRegenerate) {
    logger.info('Force regenerating embedding for profile...');
    await db.update(profiles).set({ embedding: null });
  } else {
    logger.info('Generating embedding for profile if not present...');
    logger.info('Use --force flag to regenerate profile embedding');
  }

  try {
    const context = new ProfileContext();
    const result = await context.generateEmbeddingForProfile();

    logger.info(`Profile updated: ${result.updated ? 'Yes' : 'No'}`);

    if (!result.updated) {
      logger.info('Profile embedding was not updated. Check the logs for details.');
    }
  } catch (error) {
    logger.error(`Error generating profile embedding: ${error}`);
  }
}

// Show usage if help flag is provided
if (process.argv.includes('--help') || process.argv.length === 2) {
  logger.info(`
Usage:
  bun run src/embed.ts [entity-type] [options]

Entity Types:
  profile     Generate embedding for the user profile
  notes       Generate embeddings for all notes (default)
  all         Generate embeddings for both profile and notes

Options:
  --force     Force regeneration of embeddings even if they already exist
  --help      Show this help message

Examples:
  bun run src/embed.ts                  # Generate embeddings for notes
  bun run src/embed.ts profile          # Generate embedding for profile
  bun run src/embed.ts all --force      # Force regenerate all embeddings
  `);
  process.exit(0);
}

generateEmbeddings();
