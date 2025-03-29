#!/usr/bin/env bun
import { db } from './db';
import { notes, profiles } from './db/schema';
import { sql } from 'drizzle-orm';
import { extractTags } from './utils/tagExtractor';
import { ProfileContext } from './mcp/context/profileContext';
import { EmbeddingService } from './mcp/model/embeddings';

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
  const embeddingService = new EmbeddingService();
  const profileContext = new ProfileContext();

  console.log(`Generating tags${entityType !== 'all' ? ` for ${entityType}` : ''}${forceRegenerate ? ' (forced regeneration)' : ''}...`);

  try {
    // Process based on entity type
    if (entityType === 'profile' || entityType === 'all') {
      await generateProfileTags(profileContext, forceRegenerate);
    }
    
    if (entityType === 'notes' || entityType === 'all') {
      await generateNoteTags(forceRegenerate);
    }
    
    console.log('\nTag generation complete!');
  } catch (error) {
    console.error('Error generating tags:', error);
    process.exit(1);
  }
}

async function generateProfileTags(profileContext: ProfileContext, forceRegenerate: boolean = false) {
  console.log('\n=== Processing Profile Tags ===');
  
  try {
    // Check if profile exists
    const profile = await profileContext.getProfile();
    
    if (!profile) {
      console.log('No profile found. Import a profile first.');
      return;
    }
    
    // Check if we need to generate tags
    if (!forceRegenerate && profile.tags && profile.tags.length > 0) {
      console.log('Profile already has tags:', profile.tags.join(', '));
      console.log('Use --force to regenerate tags.');
      return;
    }
    
    // Generate tags
    const tags = await profileContext.updateProfileTags(forceRegenerate);
    
    if (tags) {
      console.log(`Generated tags for profile: ${tags.join(', ')}`);
    } else {
      console.log('No tags were generated for profile. Check logs for details.');
    }
  } catch (error) {
    console.error('Error generating profile tags:', error);
  }
}

async function generateNoteTags(forceRegenerate: boolean = false) {
  console.log('\n=== Processing Note Tags ===');

  try {
    // Get all notes from the database
    // If not forced, only process notes without tags
    let allNotes;
    if (!forceRegenerate) {
      // For SQLite with JSON columns, we check if the tags field is NULL or an empty array
      allNotes = await db.select().from(notes).where(
        sql`${notes.tags} IS NULL OR ${notes.tags} = '[]'`
      );
    } else {
      allNotes = await db.select().from(notes);
    }
    
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

    console.log(`\nNotes processed: ${updated + failed}`);
    console.log(`Notes updated: ${updated}`);
    console.log(`Notes failed: ${failed}`);
  } catch (error) {
    console.error('Error generating note tags:', error);
  }
}

// Show usage if no arguments provided
if (process.argv.length === 2) {
  console.log(`
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