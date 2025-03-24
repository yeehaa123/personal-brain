#!/usr/bin/env bun
import { db } from './db';
import { notes } from './db/schema';
import { sql } from 'drizzle-orm';
import { extractTags } from './utils/tagExtractor';
import { EmbeddingService } from './mcp/model/embeddings';

async function generateTagsForNotes() {
  const forceRegenerate = process.argv.includes('--force');
  const embeddingService = new EmbeddingService();

  console.log(`Generating tags for notes${forceRegenerate ? ' (forced regeneration)' : ''}...`);

  try {
    // Get all notes from the database
    let notesQuery = db.select().from(notes);
    
    // If not forced, only process notes without tags
    if (!forceRegenerate) {
      // For SQLite with JSON columns, we check if the tags field is NULL or an empty array
      notesQuery = notesQuery.where(
        sql`${notes.tags} IS NULL OR ${notes.tags} = '[]'`
      );
    }
    
    const allNotes = await notesQuery;
    
    if (allNotes.length === 0) {
      console.log('No notes found that need tag generation');
      return;
    }
    
    console.log(`Found ${allNotes.length} notes to process`);
    let updated = 0;
    let failed = 0;

    for (const note of allNotes) {
      try {
        // Skip notes that already have tags unless force regeneration is enabled
        if (!forceRegenerate && note.tags && note.tags.length > 0) {
          console.log(`Skipping note "${note.title}" (already has tags)`);
          continue;
        }
        
        console.log(`Generating tags for note: "${note.title}"`);
        
        // Use title + content for better tagging context
        const tagContent = `${note.title}\n\n${note.content}`;
        
        // Get existing tags to consider (if any)
        const existingTags = note.tags || [];
        
        // Generate tags
        const generatedTags = await extractTags(tagContent, existingTags, 7);
        
        if (generatedTags && generatedTags.length > 0) {
          // Update the note with the new tags
          await db.update(notes)
            .set({ tags: generatedTags })
            .where(sql`${notes.id} = ${note.id}`);
          
          console.log(`Updated tags for "${note.title}": ${generatedTags.join(', ')}`);
          updated++;
        } else {
          console.log(`No tags generated for "${note.title}"`);
          failed++;
        }
      } catch (error) {
        console.error(`Error generating tags for note "${note.title}":`, error);
        failed++;
      }
    }

    console.log(`\nTag generation complete!`);
    console.log(`Notes updated: ${updated}`);
    console.log(`Notes failed: ${failed}`);
  } catch (error) {
    console.error('Error generating note tags:', error);
    process.exit(1);
  }
}

generateTagsForNotes();