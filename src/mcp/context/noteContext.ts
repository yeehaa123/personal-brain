import { db } from '@/db';
import { notes, noteChunks } from '@/db/schema';
import { eq, like, and, or, desc, isNull, not } from 'drizzle-orm';
import type { Note } from '@/models/note';
import { EmbeddingService } from '@/mcp/model/embeddings';
import { nanoid } from 'nanoid';
import { extractKeywords } from '@/utils/textUtils';
import logger from '@/utils/logger';

export interface SearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  semanticSearch?: boolean;
}

interface NoteWithScore extends Note {
  score?: number;
}

export class NoteContext {
  private embeddingService: EmbeddingService;

  constructor(apiKey?: string) {
    this.embeddingService = new EmbeddingService(apiKey ? { apiKey } : undefined);
  }

  /**
   * Retrieve a note by its ID
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0];
  }

  /**
   * Create a new note with embeddings
   * @param note The note data to create
   * @returns The ID of the created note
   */
  async createNote(note: Omit<Note, 'embedding'> & { embedding?: number[] }): Promise<string> {
    const now = new Date();
    const id = note.id || nanoid();

    let embedding = note.embedding;

    // Generate embedding if not provided
    if (!embedding) {
      try {
        const combinedText = `${note.title} ${note.content}`;
        const result = await this.embeddingService.getEmbedding(combinedText);
        embedding = result.embedding;
      } catch (error) {
        logger.error(`Error generating embedding: ${error}`);
      }
    }

    // Insert the note with the embedding array directly
    await db.insert(notes).values({
      id,
      title: note.title,
      content: note.content,
      embedding: embedding,
      createdAt: note.createdAt || now,
      updatedAt: note.updatedAt || now,
      tags: Array.isArray(note.tags) ? note.tags : undefined,
    });

    // If the note is long, also create chunks
    if (note.content.length > 1000) {
      await this.createNoteChunks(id, note.content);
    }

    return id;
  }

  /**
   * Create chunks for a note and generate embeddings for each chunk
   * @param noteId The ID of the parent note
   * @param content The content to chunk
   */
  private async createNoteChunks(noteId: string, content: string): Promise<void> {
    try {
      // Chunk the content
      const chunks = this.embeddingService.chunkText(content, 1000, 200);

      // Generate embeddings for all chunks in batch
      const embeddingResults = await this.embeddingService.getBatchEmbeddings(chunks);

      // Insert each chunk with its embedding
      const now = new Date();

      for (let i = 0; i < chunks.length; i++) {
        // Use the embedding array directly
        await db.insert(noteChunks).values({
          id: nanoid(),
          noteId,
          content: chunks[i],
          embedding: embeddingResults[i].embedding,
          chunkIndex: i,
          createdAt: now,
        });
      }
    } catch (error) {
      logger.error(`Error creating note chunks: ${error}`);
    }
  }

  /**
   * Search notes based on query text and/or tags with optional semantic search
   */
  async searchNotes(options: SearchOptions): Promise<Note[]> {
    const { query, tags, limit = 10, offset = 0, semanticSearch = true } = options;

    // If semantic search is enabled and there's a query, perform vector search
    if (semanticSearch && query) {
      return this.semanticSearch(query, tags, limit, offset);
    }

    // Otherwise, fall back to keyword search
    return this.keywordSearch(options);
  }

  /**
   * Search using traditional keyword matching
   */
  private async keywordSearch(options: SearchOptions): Promise<Note[]> {
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
            like(notes.tags, `%${keyword}%`),
          ),
        );

        // Create a condition that matches any of the keywords
        conditions.push(or(...keywordConditions));
      } else {
        // Fallback to original query
        conditions.push(
          or(
            like(notes.title, `%${query}%`),
            like(notes.content, `%${query}%`),
          ),
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
   * Search using vector similarity
   * @param query The search query
   * @param tags Optional tags to filter by
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns Array of matching notes
   */
  private async semanticSearch(query: string, tags?: string[], limit = 10, offset = 0): Promise<Note[]> {
    try {
      // Get embedding for the query
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // Get all notes (with embeddings)
      const notesWithEmbeddings = await db
        .select()
        .from(notes)
        .where(not(isNull(notes.embedding)));

      // Filter by tags if provided
      const filteredNotes = tags && tags.length > 0
        ? notesWithEmbeddings.filter(note => {
          if (!note.tags) return false;
          return tags.some(tag => note.tags?.includes(tag));
        })
        : notesWithEmbeddings;

      // Calculate similarity scores
      const scoredNotes: NoteWithScore[] = filteredNotes
        .filter(note => note.embedding && note.embedding.length > 0)
        .map(note => {
          if (!note.embedding) {
            return { ...note, score: 0 }; // This shouldn't happen due to the filter above
          }
          const score = this.embeddingService.cosineSimilarity(
            queryEmbedding.embedding,
            note.embedding,
          );
          return { ...note, score };
        });

      // Sort by similarity score (highest first)
      scoredNotes.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      // Apply pagination
      return scoredNotes.slice(offset, offset + limit);
    } catch (error) {
      logger.error(`Error in semantic search: ${error}`);
      // Fall back to keyword search
      return this.keywordSearch({ query, tags, limit, offset });
    }
  }

  /**
   * Get related notes based on vector similarity
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   */
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    const sourceNote = await this.getNoteById(noteId);
    if (!sourceNote || !sourceNote.embedding) {
      // Fall back to keyword-based similarity if note has no embedding
      return this.getKeywordRelatedNotes(noteId, maxResults);
    }

    try {
      // Get all notes except the source note
      const otherNotes = await db
        .select()
        .from(notes)
        .where(
          and(
            not(eq(notes.id, noteId)),
            not(isNull(notes.embedding)),
          ),
        );

      // Calculate similarity scores
      const scoredNotes: NoteWithScore[] = otherNotes
        .filter(note => note.embedding && note.embedding.length > 0)
        .map(note => {
          if (!note.embedding) {
            return { ...note, score: 0 }; // This shouldn't happen due to the filter above
          }
          
          const score = this.embeddingService.cosineSimilarity(
            sourceNote.embedding as number[], // We already checked this is not null above
            note.embedding,
          );
          return { ...note, score };
        });

      // Sort by similarity score (highest first)
      scoredNotes.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      // Return top matches
      return scoredNotes.slice(0, maxResults);
    } catch (error) {
      logger.error(`Error finding related notes: ${error}`);
      return this.getKeywordRelatedNotes(noteId, maxResults);
    }
  }
  
  /**
   * Search notes by embedding similarity (for profile integration)
   * Finds notes similar to a given embedding vector
   * @param embedding The embedding vector to search with
   * @param maxResults Maximum number of results to return
   * @returns Array of similar notes
   */
  async searchNotesWithEmbedding(embedding: number[], maxResults = 5): Promise<Note[]> {
    try {
      // Get all notes with embeddings
      const notesWithEmbeddings = await db
        .select()
        .from(notes)
        .where(not(isNull(notes.embedding)));
      
      // Calculate similarity scores
      const scoredNotes: NoteWithScore[] = notesWithEmbeddings
        .filter(note => note.embedding && note.embedding.length > 0)
        .map(note => {
          if (!note.embedding) {
            return { ...note, score: 0 }; // This shouldn't happen due to the filter above
          }
          
          const score = this.embeddingService.cosineSimilarity(
            embedding,
            note.embedding,
          );
          return { ...note, score };
        });
      
      // Sort by similarity score (highest first)
      scoredNotes.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      
      // Return top matches
      return scoredNotes.slice(0, maxResults);
    } catch (error) {
      logger.error(`Error searching notes with embedding: ${error}`);
      return [];
    }
  }

  /**
   * Fall back to keyword-based related notes
   */
  private async getKeywordRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    const sourceNote = await this.getNoteById(noteId);
    if (!sourceNote) return [];

    // Extract keywords from the source note
    const keywords = this.extractKeywords(sourceNote.content);

    // Find notes that contain these keywords
    const relatedNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          not(eq(notes.id, noteId)),
          or(...keywords.map(keyword => like(notes.content, `%${keyword}%`))),
        ),
      )
      .limit(maxResults);

    return relatedNotes;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return extractKeywords(text, 10); // Take top 10 keywords
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

  /**
   * Generate or update embeddings for existing notes
   * @returns Statistics on the update operation
   */
  async generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    let updated = 0;
    let failed = 0;

    // Get all notes without embeddings
    const notesWithoutEmbeddings = await db
      .select()
      .from(notes)
      .where(isNull(notes.embedding));

    logger.info(`Found ${notesWithoutEmbeddings.length} notes without embeddings`);

    for (const note of notesWithoutEmbeddings) {
      try {
        const combinedText = `${note.title} ${note.content}`;
        const result = await this.embeddingService.getEmbedding(combinedText);

        // Update the note with the embedding directly
        await db
          .update(notes)
          .set({ embedding: result.embedding })
          .where(eq(notes.id, note.id));

        // Also create chunks for longer notes
        if (note.content.length > 1000) {
          await this.createNoteChunks(note.id, note.content);
        }

        updated++;
        logger.info(`Updated embedding for note: ${note.id}`);
      } catch (error) {
        failed++;
        logger.error(`Failed to update embedding for note ${note.id}: ${error}`);
      }
    }

    return { updated, failed };
  }
  
  /**
   * Get the total count of notes in the database
   * @returns The total number of notes
   */
  async getNoteCount(): Promise<number> {
    try {
      // Try a simpler approach - just get all notes and count them
      const allNotes = await db.select({ id: notes.id }).from(notes);
      return allNotes.length;
    } catch (error) {
      logger.error(`Error getting note count: ${error}`);
      throw error;
    }
  }
}
