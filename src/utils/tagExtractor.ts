import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { aiConfig, textConfig } from '@/config';
import { db } from '@/db';
import { notes } from '@/db/schema';
import { ClaudeModel } from '@/mcp/model/claude';
import logger from '@/utils/logger';

import { extractKeywords } from './textUtils';


/**
 * Extract tags from content using Claude AI
 * @param content The text content to analyze
 * @param existingTags Optional array of existing tags to consider
 * @param maxTags Maximum number of tags to extract (default: 7)
 * @returns Array of extracted tags
 */
export async function extractTags(
  content: string,
  existingTags: string[] = [],
  maxTags: number = textConfig.defaultMaxTags,
): Promise<string[]> {
  try {
    // Check for API key
    if (!aiConfig.anthropic.apiKey) {
      logger.warn('No Anthropic API key available, falling back to keyword extraction');
      return extractKeywords(content, maxTags);
    }

    // Truncate content if it's too long
    const truncatedContent = content.length > textConfig.tagContentMaxLength
      ? content.substring(0, textConfig.tagContentMaxLength) + '... [content truncated]'
      : content;

    // Build the prompt
    const prompt = `You are a precise tag extraction system. Your task is to extract the most relevant tags from the provided content.

The tags should capture the main concepts, topics, and themes in the content. The tags should be:
- Relevant to the domain and content
- Single words or short phrases (1-3 words)
- Lowercase, with hyphens for multi-word tags (e.g., "ecosystem-architecture")
- Domain-specific rather than generic
- Nouns or noun phrases preferred

Content to extract tags from:
${truncatedContent}

${existingTags.length > 0 ? 'Existing tags to consider: ' + existingTags.join(', ') : ''}

Extract up to ${maxTags} tags that best represent this content.

FORMAT: Respond with ONLY a comma-separated list of tags, with no additional text or explanation.`;

    // Get the Claude model instance
    const claude = ClaudeModel.getInstance();

    // Define the schema for the response
    const tagSchema = z.object({
      tags: z.array(z.string()).max(maxTags),
    });

    // Call Claude with schema, type is inferred from the schema using z.infer
    const response = await claude.complete<z.infer<typeof tagSchema>>({
      schema: tagSchema,
      systemPrompt: 'You extract tags from content. Only respond with the tags, nothing else.',
      userPrompt: prompt,
      temperature: aiConfig.anthropic.temperature,
    });

    // Return the tags array directly
    return response.object.tags
  } catch (error) {
    logger.error(`Error extracting tags with Claude: ${error}`);
    // Fallback to simple keyword extraction
    return extractKeywords(content, maxTags);
  }
}

/**
 * Generate and save tags for a note
 * @param note The note object to generate tags for
 * @param forceTags Whether to force tag generation even if tags already exist
 * @returns The generated tags array or existing tags if not regenerated
 */
export async function generateAndSaveTagsForNote(
  note: { id: string; title: string; content: string; tags?: string[] | null },
  forceTags: boolean = false,
): Promise<{ tags: string[], success: boolean }> {
  try {
    // Skip notes that already have tags unless force regeneration is enabled
    if (!forceTags && note.tags && note.tags.length > 0) {
      logger.info(`Skipping note "${note.title}" (already has tags)`);
      return { tags: note.tags, success: true };
    }

    logger.info(`Generating tags for note: "${note.title}"`);

    // Use title + content for better tagging context
    const tagContent = `${note.title}\n\n${note.content}`;

    // Get existing tags to consider (if any)
    const existingTags = note.tags || [];

    // Generate tags
    const generatedTags = await extractTags(tagContent, existingTags, textConfig.defaultMaxTags);

    if (generatedTags && generatedTags.length > 0) {
      // Update the note with the new tags
      await db.update(notes)
        .set({ tags: generatedTags })
        .where(sql`${notes.id} = ${note.id}`);

      logger.info(`Updated tags for "${note.title}": ${generatedTags.join(', ')}`);
      return { tags: generatedTags, success: true };
    } else {
      logger.info(`No tags generated for "${note.title}"`);
      return { tags: existingTags, success: false };
    }
  } catch (error) {
    logger.error(`Error generating tags for note "${note.title}": ${error}`);
    return { tags: note.tags || [], success: false };
  }
}

/**
 * Batch process tags for multiple notes
 * @param forceRegenerate Whether to force regeneration even if tags exist
 * @returns Statistics on processed notes
 */
export async function batchProcessNoteTags(forceRegenerate: boolean = false): Promise<{
  processed: number,
  updated: number,
  failed: number
}> {
  logger.info('=== Processing Note Tags ===');

  try {
    // Get all notes from the database
    // If not forced, only process notes without tags
    let allNotes;
    if (!forceRegenerate) {
      // For SQLite with JSON columns, we check if the tags field is NULL or an empty array
      allNotes = await db.select().from(notes).where(
        sql`${notes.tags} IS NULL OR ${notes.tags} = '[]'`,
      );
    } else {
      allNotes = await db.select().from(notes);
    }

    if (allNotes.length === 0) {
      logger.info('No notes found that need tag generation');
      return { processed: 0, updated: 0, failed: 0 };
    }

    logger.info(`Found ${allNotes.length} notes to process`);
    let updated = 0;
    let failed = 0;

    for (const note of allNotes) {
      const result = await generateAndSaveTagsForNote(note, forceRegenerate);
      if (result.success) {
        updated++;
      } else {
        failed++;
      }
    }

    logger.info(`\nNotes processed: ${updated + failed}`);
    logger.info(`Notes updated: ${updated}`);
    logger.info(`Notes failed: ${failed}`);

    return { processed: updated + failed, updated, failed };
  } catch (error) {
    logger.error(`Error in batch note tag processing: ${error}`);
    return { processed: 0, updated: 0, failed: 0 };
  }
}
