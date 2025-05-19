#!/usr/bin/env bun
import { join } from 'path';

import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

// MCPNoteContext will be imported if needed later

import logger from '../utils/logger';

async function runMigration() {
  logger.info('Running Drizzle migrations...', { context: 'DBMigration' });
  
  try {
    const sqlite = new Database('brain.db');
    const db = drizzle(sqlite);
    
    // Run migrations from the drizzle directory
    await migrate(db, { migrationsFolder: join(import.meta.dir, '../../drizzle') });
    
    logger.info('Database migration completed successfully', { context: 'DBMigration' });
    
    // Generate embeddings for existing notes
    logger.info('Generating embeddings for existing notes...', { context: 'DBMigration' });
    // TODO: Replace with MCPNoteContext when migration is updated
    const { MCPNoteContext } = await import('@/contexts/notes');
    const context = MCPNoteContext.createFresh();
    const result = await context.generateEmbeddingsForAllNotes();
    
    logger.info('Embedding generation complete', { 
      context: 'DBMigration',
      updated: result.updated,
      failed: result.failed,
    });
  } catch (error) {
    logger.error('Error running database migration:', { error, context: 'DBMigration' });
    process.exit(1);
  }
}

runMigration();