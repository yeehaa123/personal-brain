import { readdir, readFile } from 'fs/promises';
import { basename, extname, join } from 'path';

import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/db';
import { notes } from '@/db/schema';
import { NoteContext } from '@/mcp';
import { EmbeddingService } from '@/mcp/model/embeddings';
import logger from '@/utils/logger';
import { generateAndSaveTagsForNote } from '@/utils/tagExtractor';

interface MarkdownMetadata {
  title?: string;
  tags?: string[];
  date?: string;
  [key: string]: string | string[] | undefined;
}

interface ParsedMarkdown {
  metadata: MarkdownMetadata;
  content: string;
}

const context = new NoteContext();
const embeddingService = EmbeddingService.getInstance({});

/**
 * Parses a markdown file with optional frontmatter
 * Supports YAML-style frontmatter including list format for tags
 */
export function parseMarkdown(markdownContent: string): ParsedMarkdown {
  const metadata: MarkdownMetadata = {};
  let content = markdownContent;
  
  // Check for frontmatter
  if (content.startsWith('---')) {
    const frontmatterEnd = content.indexOf('---', 3);
    if (frontmatterEnd !== -1) {
      const frontmatter = content.substring(3, frontmatterEnd).trim();
      
      // Extract tags using regex to handle the YAML list format
      const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s*-\s*.*\n)+)/);
      if (tagsMatch && tagsMatch[1]) {
        const tagLines = tagsMatch[1].split('\n');
        metadata.tags = tagLines
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(1).trim());
      }
      
      // Parse the rest of the frontmatter
      frontmatter.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('-')) {
          const colonPos = trimmedLine.indexOf(':');
          if (colonPos > 0) {
            const key = trimmedLine.substring(0, colonPos).trim();
            const value = trimmedLine.substring(colonPos + 1).trim();
            
            // Skip tags as we've already handled them
            if (key !== 'tags') {
              metadata[key] = value;
            }
          }
        }
      });
      
      content = content.substring(frontmatterEnd + 3).trim();
    }
  }
  
  // If no title in frontmatter, try to extract from the first heading
  if (!metadata.title) {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch && headingMatch[1]) {
      metadata.title = headingMatch[1].trim();
    }
  }
  
  return { metadata, content };
}

/**
 * Imports a single markdown file into the database with embeddings
 */
export async function importMarkdownFile(filePath: string): Promise<string> {
  const fileContent = await readFile(filePath, 'utf-8');
  const { metadata, content } = parseMarkdown(fileContent);
  
  const title = metadata.title || basename(filePath, extname(filePath));
  let tags = metadata.tags || [];
  const now = new Date();
  
  // Generate tags with AI if none were provided in the frontmatter
  if (tags.length === 0) {
    // We'll handle tag generation after creating the note to avoid duplication
    logger.info(`No tags in frontmatter for: ${title}. Will generate after creating note.`);
  }
  
  // Create a stable ID based on the file basename
  // This ensures the same file always gets the same ID
  const fileName = basename(filePath);
  const sourceId = `source:${fileName}`;
  
  logger.debug(`Source ID for ${filePath}: ${sourceId}`);
  
  // Check if this file was already imported
  const existingNotes = await db
    .select()
    .from(notes)
    .where(sql`${notes.content} LIKE ${`%<!-- ${sourceId} -->%`}`)
    .limit(1);
  
  const processedContent = `<!-- ${sourceId} -->\n${content}`;
  
  // Try to generate an embedding for the content
  let embedding: number[] | undefined;
  try {
    // Generate embedding for combined title and content
    const combinedText = `${title} ${content}`;
    const embeddingResult = await embeddingService.getEmbedding(combinedText);
    embedding = embeddingResult.embedding;
  } catch (error) {
    logger.error(`Couldn't generate embedding for ${filePath}: ${error}`);
    // Continue without embedding if there's an error
  }
  
  let id: string;
  
  if (existingNotes.length > 0 && existingNotes[0]) {
    // Update existing note
    const existingNote = existingNotes[0];
    id = existingNote.id;
    
    await db
      .update(notes)
      .set({
        title,
        content: processedContent,
        tags,
        embedding,
        updatedAt: now,
      })
      .where(sql`${notes.id} = ${id}`);
      
    logger.info(`Updated existing note: ${id}`);
  } else {
    // Create new note using the improved NoteContext API
    const noteId = nanoid();
    const noteData = {
      id: noteId,
      title,
      content: processedContent,
      tags,
      embedding,
      createdAt: now,
      updatedAt: now,
      source: 'import' as const,
      confidence: null,
      conversationMetadata: null,
      verified: false,
    };
    
    // Use the context's createNote method which handles chunking too
    id = await context.createNote(noteData);
    
    logger.info(`Created new note: ${id}`);
    
    // Generate tags if none were provided in the frontmatter
    if (tags.length === 0) {
      // Use our shared utility function for tag generation
      const tagResult = await generateAndSaveTagsForNote({
        id: noteId,
        title,
        content: processedContent,
        tags: [],
      }, true); // Force tag generation
      
      // Update tags in memory for the return value
      tags = tagResult.tags;
    }
  }
  
  return id;
}

/**
 * Recursively imports all markdown files from a directory
 */
export async function importMarkdownDirectory(dirPath: string): Promise<{ imported: number, failed: number }> {
  let imported = 0;
  let failed = 0;
  
  async function processDirectory(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          await importMarkdownFile(fullPath);
          imported++;
          logger.info(`Imported: ${fullPath}`);
        } catch (error) {
          failed++;
          logger.error(`Failed to import ${fullPath}: ${error}`);
        }
      }
    }
  }
  
  await processDirectory(dirPath);
  return { imported, failed };
}