#!/usr/bin/env bun
import { NoteContext } from './mcp/context/noteContext';

async function generateEmbeddings() {
  console.log('Generating embeddings for all notes without embeddings...');
  
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