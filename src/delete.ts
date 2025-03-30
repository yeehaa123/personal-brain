#!/usr/bin/env bun
import { db } from './db';
import { notes } from './db/schema';
import { eq } from 'drizzle-orm';

async function deleteNoteById(id: string) {
  try {
    await db.delete(notes).where(eq(notes.id, id));
    console.log(`Note with ID ${id} deleted successfully.`);
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}

async function deleteAllNotes() {
  try {
    await db.delete(notes);
    console.log('All notes deleted successfully.');
    return true;
  } catch (error) {
    console.error('Error deleting all notes:', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  bun run src/delete.ts <id>    - Delete a specific note by ID
  bun run src/delete.ts --all   - Delete all notes (use with caution)
    `);
    process.exit(1);
  }

  if (args[0] === '--all') {
    await deleteAllNotes();
  } else {
    await deleteNoteById(args[0]);
  }
  
  process.exit(0);
}

main();