#!/usr/bin/env bun
import { NoteContext } from './mcp/context/noteContext';
import { db } from './db';
import { notes } from './db/schema';
import { sql } from 'drizzle-orm';

async function generateEmbeddings() {
  const forceAll = process.argv.includes('--force');
  
  if (forceAll) {
    console.log('Force regenerating embeddings for ALL notes...');
    // Clear existing embeddings to force regeneration
    await db.update(notes).set({ embedding: null });
  } else {
    console.log('Generating embeddings for notes without embeddings...');
    console.log('Use --force flag to regenerate all embeddings');
  }
  
  try {
    const context = new NoteContext();
    const result = await context.generateEmbeddingsForAllNotes();
    
    console.log(`Embedding generation complete!`);
    console.log(`Notes updated: ${result.updated}`);
    console.log(`Notes failed: ${result.failed}`);
    
    if (result.failed > 0) {
      console.log('Some notes failed to generate embeddings. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error generating embeddings:', error);
    process.exit(1);
  }
}

generateEmbeddings();