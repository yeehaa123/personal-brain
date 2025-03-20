import { db } from '../../db';
import { notes } from '../../db/schema';
import { eq, like, inArray, and, or, desc, sql } from 'drizzle-orm';
import type { Note } from '../../models/note';

export interface SearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export class NoteContext {
  /**
   * Retrieve a note by its ID
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0];
  }

  /**
   * Search notes based on query text and/or tags
   */
  async searchNotes(options: SearchOptions): Promise<Note[]> {
    const { query, tags, limit = 10, offset = 0 } = options;
    
    let conditions = [];
    
    if (query) {
      // Break query into keywords for better matching
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);
        
      // If we have actual keywords, search for them
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword => 
          or(
            like(notes.title, `%${keyword}%`),
            like(notes.content, `%${keyword}%`),
            like(notes.tags, `%${keyword}%`)
          )
        );
        
        // Create a condition that matches any of the keywords
        conditions.push(or(...keywordConditions));
      } else {
        // Fallback to original query
        conditions.push(
          or(
            like(notes.title, `%${query}%`),
            like(notes.content, `%${query}%`)
          )
        );
      }
    }
    
    if (tags && tags.length > 0) {
      // This assumes tags are stored as a JSON array in a TEXT field
      // Add a condition for each tag to search in the JSON array
      for (const tag of tags) {
        conditions.push(like(notes.tags, `%${tag}%`));
      }
    }
    
    if (conditions.length === 0) {
      // If no conditions, just get recent notes
      return db
        .select()
        .from(notes)
        .orderBy(desc(notes.updatedAt))
        .limit(limit)
        .offset(offset);
    }
    
    return db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get related notes based on content similarity
   * Simple implementation looking for overlapping keywords
   */
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    const sourceNote = await this.getNoteById(noteId);
    if (!sourceNote) return [];
    
    // Extract keywords from the source note (basic implementation)
    const keywords = this.extractKeywords(sourceNote.content);
    
    // Find notes that contain these keywords
    const relatedNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          ...keywords.map(keyword => like(notes.content, `%${keyword}%`)),
          // Exclude the source note itself
          noteId ? eq(notes.id, noteId) : sql`1=1`
        )
      )
      .limit(maxResults);
    
    return relatedNotes;
  }
  
  /**
   * Very simple keyword extraction (would need improvement in a real app)
   */
  private extractKeywords(text: string): string[] {
    // Remove markdown syntax, common words, keep only words > 4 chars
    const cleanedText = text
      .replace(/[#*_`>\\+\\=\\[\\]\\(\\)\\{\\}\\|]/g, ' ')
      .toLowerCase();
    
    // Split into words and filter
    const words = cleanedText.split(/\s+/);
    const commonWords = new Set([
      'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but'
    ]);
    
    return [...new Set(
      words.filter(word => 
        word.length > 4 && !commonWords.has(word)
      )
    )].slice(0, 10); // Take top 10 keywords
  }
  
  /**
   * Get recent notes
   */
  async getRecentNotes(limit = 5): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .orderBy(desc(notes.updatedAt))
      .limit(limit);
  }
}