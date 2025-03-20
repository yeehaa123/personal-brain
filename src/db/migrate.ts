#!/usr/bin/env bun
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { join } from 'path';

async function runMigration() {
  console.log('Running Drizzle migrations...');
  
  try {
    const sqlite = new Database('brain.db');
    const db = drizzle(sqlite);
    
    // Run migrations from the drizzle directory
    await migrate(db, { migrationsFolder: join(import.meta.dir, '../../drizzle') });
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error running database migration:', error);
    process.exit(1);
  }
}

runMigration();