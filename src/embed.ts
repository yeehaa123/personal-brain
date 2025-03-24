#!/usr/bin/env bun
import { NoteContext } from './mcp/context/noteContext';
import { ProfileContext } from './mcp/context/profileContext';
import { db } from './db';
import { notes, profiles } from './db/schema';

async function generateEmbeddings() {
  const forceAll = process.argv.includes('--force');
  const entityType = process.argv[2]?.toLowerCase();
  
  if (entityType === 'profile') {
    await generateProfileEmbeddings(forceAll);
  } else {
    await generateNoteEmbeddings(forceAll);
  }
}

async function generateNoteEmbeddings(forceAll: boolean) {
  if (forceAll) {
    console.log('Force regenerating embeddings for ALL notes...');
    await db.update(notes).set({ embedding: null });
  } else {
    console.log('Generating embeddings for notes without embeddings...');
    console.log('Use --force flag to regenerate all embeddings');
  }

  try {
    const context = new NoteContext();
    const result = await context.generateEmbeddingsForAllNotes();

    console.log(`Note embedding generation complete!`);
    console.log(`Notes updated: ${result.updated}`);
    console.log(`Notes failed: ${result.failed}`);

    if (result.failed > 0) {
      console.log('Some notes failed to generate embeddings. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error generating note embeddings:', error);
    process.exit(1);
  }
}

async function generateProfileEmbeddings(forceAll: boolean) {
  if (forceAll) {
    console.log('Force regenerating embedding for profile...');
    await db.update(profiles).set({ embedding: null });
  } else {
    console.log('Generating embedding for profile if not present...');
    console.log('Use --force flag to regenerate profile embedding');
  }

  try {
    const context = new ProfileContext();
    const result = await context.generateEmbeddingForProfile();

    console.log(`Profile embedding generation complete!`);
    console.log(`Profile updated: ${result.updated ? 'Yes' : 'No'}`);

    if (!result.updated) {
      console.log('Profile embedding was not updated. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error generating profile embedding:', error);
    process.exit(1);
  }
}

// If no arguments, print usage
if (process.argv.length <= 2) {
  console.log(`
Usage:
  bun run src/embed.ts [options]         Generate embeddings for all notes
  bun run src/embed.ts profile [options] Generate embedding for profile

Options:
  --force  Force regenerate all embeddings (even if they already exist)
  `);
} else {
  generateEmbeddings();
}
