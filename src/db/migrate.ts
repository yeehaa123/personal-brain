#!/usr/bin/env bun
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { join } from 'path';
import { NoteContext } from '../mcp/context/noteContext';

async function runMigration() {
  console.log('Running Drizzle migrations...');
  
  try {
    const sqlite = new Database('brain.db');
    const db = drizzle(sqlite);
    
    // Run migrations from the drizzle directory
    await migrate(db, { migrationsFolder: join(import.meta.dir, '../../drizzle') });
    
    console.log('Database migration completed successfully');
    
    // Generate embeddings for existing notes
    console.log('Generating embeddings for existing notes...');
    const context = new NoteContext();
    const result = await context.generateEmbeddingsForAllNotes();
    
    console.log(`Embedding generation complete. Updated: ${result.updated}, Failed: ${result.failed}`);
  } catch (error) {
    console.error('Error running database migration:', error);
    process.exit(1);
  }
}

runMigration();