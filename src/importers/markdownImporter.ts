import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { notes } from '../db/schema';
import { sql } from 'drizzle-orm';
import { NoteContext } from '../mcp/context/noteContext';
import { EmbeddingService } from '../mcp/model/embeddings';
import { extractTags } from '../utils/tagExtractor';

interface MarkdownMetadata {
  title?: string;
  tags?: string[];
  date?: string;
  [key: string]: any;
}

interface ParsedMarkdown {
  metadata: MarkdownMetadata;
  content: string;
}

const context = new NoteContext();
const embeddingService = new EmbeddingService();

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
    if (headingMatch) {
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
    try {
      console.log(`Generating tags for: ${title}`);
      // Use the combined title and content for better tag context
      const tagContent = `${title}\n\n${content}`;
      
      // Use the same tag extractor we use for profiles
      const generatedTags = await extractTags(tagContent, [], 7);
      if (generatedTags && generatedTags.length > 0) {
        tags = generatedTags;
        console.log(`Generated tags: ${tags.join(', ')}`);
      }
    } catch (error) {
      console.error(`Error generating tags for ${filePath}:`, error);
      // Continue with no tags if there's an error
    }
  }
  
  // Create a stable ID based on the file basename
  // This ensures the same file always gets the same ID
  const fileName = basename(filePath);
  const sourceId = `source:${fileName}`;
  
  console.log(`Source ID for ${filePath}: ${sourceId}`);
  
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
    console.error(`Couldn't generate embedding for ${filePath}:`, error);
    // Continue without embedding if there's an error
  }
  
  let id: string;
  
  if (existingNotes.length > 0) {
    // Update existing note
    id = existingNotes[0].id;
    
    await db
      .update(notes)
      .set({
        title,
        content: processedContent,
        tags,
        embedding,
        updatedAt: now
      })
      .where(sql`${notes.id} = ${id}`);
      
    console.log(`Updated existing note: ${id}`);
  } else {
    // Create new note using the improved NoteContext API
    const noteData = {
      id: nanoid(),
      title,
      content: processedContent,
      tags,
      embedding,
      createdAt: now,
      updatedAt: now
    };
    
    // Use the context's createNote method which handles chunking too
    id = await context.createNote(noteData);
    
    console.log(`Created new note: ${id}`);
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
          console.log(`Imported: ${fullPath}`);
        } catch (error) {
          failed++;
          console.error(`Failed to import ${fullPath}:`, error);
        }
      }
    }
  }
  
  await processDirectory(dirPath);
  return { imported, failed };
}