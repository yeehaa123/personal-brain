import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { notes } from '../db/schema';
import { sql } from 'drizzle-orm';

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
 * Imports a single markdown file into the database
 */
export async function importMarkdownFile(filePath: string): Promise<string> {
  const fileContent = await readFile(filePath, 'utf-8');
  const { metadata, content } = parseMarkdown(fileContent);
  
  const title = metadata.title || basename(filePath, extname(filePath));
  const tags = metadata.tags || [];
  const now = new Date();
  
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
  
  let id: string;
  
  if (existingNotes.length > 0) {
    // Update existing note
    id = existingNotes[0].id;
    
    await db
      .update(notes)
      .set({
        title,
        content: `<!-- ${sourceId} -->\n${content}`,
        tags,
        updatedAt: now
      })
      .where(sql`${notes.id} = ${id}`);
      
    console.log(`Updated existing note: ${id}`);
  } else {
    // Create new note
    id = nanoid();
    
    await db.insert(notes).values({
      id,
      title,
      content: `<!-- ${sourceId} -->\n${content}`,
      tags,
      createdAt: now,
      updatedAt: now
    });
    
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