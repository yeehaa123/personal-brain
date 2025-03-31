/**
 * Repository for managing Note storage and retrieval
 * Centralizes database access for notes
 */
import { db } from '@/db';
import { notes, noteChunks } from '@/db/schema';
import { eq, like, and, or, desc, isNull, not } from 'drizzle-orm';
import type { Note } from '@/models/note';
import { nanoid } from 'nanoid';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString, safeArrayAccess } from '@/utils/safeAccessUtils';
import { DatabaseError, ValidationError, tryExec } from '@/utils/errorUtils';

/**
 * Repository for accessing and managing notes in the database
 */
export class NoteRepository {
  /**
   * Retrieve a note by its ID
   * @param id The ID of the note to retrieve
   * @returns The note object or undefined if not found
   * @throws DatabaseError If there's an error accessing the database
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('Invalid note ID provided', { id });
    }

    try {
      const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
      return safeArrayAccess(result, 0, undefined);
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve note with ID: ${id}`, 
        { id, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Insert a new note into the database
   * @param noteData The note data to save
   * @returns The ID of the created note
   * @throws ValidationError If the note data is invalid
   * @throws DatabaseError If there's an error inserting the note
   */
  async insertNote(noteData: {
    id?: string;
    title: string;
    content: string;
    embedding?: number[];
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];
  }): Promise<string> {
    if (!noteData || typeof noteData !== 'object') {
      throw new ValidationError('Invalid note data provided', { noteType: typeof noteData });
    }

    try {
      const now = new Date();
      const id = isNonEmptyString(noteData.id) ? noteData.id : nanoid();
      const title = isNonEmptyString(noteData.title) ? noteData.title : 'Untitled Note';
      const content = isNonEmptyString(noteData.content) ? noteData.content : '';

      // Prepare timestamp values with defaults
      const createdAt = isDefined(noteData.createdAt) ? noteData.createdAt : now;
      const updatedAt = isDefined(noteData.updatedAt) ? noteData.updatedAt : now;
      
      // Validate tags array
      const tags = Array.isArray(noteData.tags) ? noteData.tags.filter(isNonEmptyString) : undefined;

      // Insert the note with the embedding array directly
      await db.insert(notes).values({
        id,
        title,
        content,
        embedding: noteData.embedding,
        createdAt,
        updatedAt,
        tags,
      });

      return id;
    } catch (error) {
      // Convert to a DatabaseError with context information
      throw new DatabaseError(
        `Failed to create note: ${error instanceof Error ? error.message : String(error)}`, 
        { 
          noteId: noteData.id,
          title: noteData.title?.substring(0, 30), 
          contentLength: noteData.content?.length,
        },
      );
    }
  }

  /**
   * Insert a note chunk with embedding
   * @param chunkData The chunk data to insert
   * @throws DatabaseError If there's an error inserting the chunk
   */
  async insertNoteChunk(chunkData: {
    noteId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
  }): Promise<string> {
    try {
      const id = nanoid();
      const now = new Date();

      await db.insert(noteChunks).values({
        id,
        noteId: chunkData.noteId,
        content: chunkData.content,
        embedding: chunkData.embedding,
        chunkIndex: chunkData.chunkIndex,
        createdAt: now,
      });

      return id;
    } catch (error) {
      throw new DatabaseError(
        `Failed to insert note chunk: ${error instanceof Error ? error.message : String(error)}`,
        {
          noteId: chunkData.noteId,
          chunkIndex: chunkData.chunkIndex,
        },
      );
    }
  }

  /**
   * Update a note's embedding
   * @param noteId The ID of the note to update
   * @param embedding The embedding to set
   * @throws DatabaseError If there's an error updating the note
   */
  async updateNoteEmbedding(noteId: string, embedding: number[]): Promise<void> {
    try {
      await db
        .update(notes)
        .set({ embedding })
        .where(eq(notes.id, noteId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to update note embedding: ${error instanceof Error ? error.message : String(error)}`,
        { noteId },
      );
    }
  }

  /**
   * Get recent notes ordered by update time
   * @param limit Maximum number of notes to return
   * @returns Array of recent notes
   * @throws DatabaseError If there's an error accessing the database
   */
  async getRecentNotes(limit = 5): Promise<Note[]> {
    return tryExec(async () => {
      // Apply safe limits
      const safeLimit = Math.max(1, Math.min(limit || 5, 100));
      
      logger.debug(`Fetching ${safeLimit} recent notes`);
      
      // Query recent notes ordered by update time
      const recentNotes = await db
        .select()
        .from(notes)
        .orderBy(desc(notes.updatedAt))
        .limit(safeLimit);
      
      logger.debug(`Found ${recentNotes.length} recent notes`);
      return recentNotes;
    }, 'Error fetching recent notes');
  }

  /**
   * Get all notes without embeddings
   * @returns Array of notes without embeddings
   */
  async getNotesWithoutEmbeddings(): Promise<Note[]> {
    try {
      return await db
        .select()
        .from(notes)
        .where(isNull(notes.embedding));
    } catch (error) {
      throw new DatabaseError(
        `Error finding notes without embeddings: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all notes with embeddings
   * @returns Array of notes with embeddings
   */
  async getNotesWithEmbeddings(): Promise<Note[]> {
    try {
      return await db
        .select()
        .from(notes)
        .where(not(isNull(notes.embedding)));
    } catch (error) {
      throw new DatabaseError(
        `Error finding notes with embeddings: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all notes except one, with embeddings
   * @param excludeNoteId ID of the note to exclude
   * @returns Array of other notes with embeddings
   */
  async getOtherNotesWithEmbeddings(excludeNoteId: string): Promise<Note[]> {
    try {
      return await db
        .select()
        .from(notes)
        .where(
          and(
            not(eq(notes.id, excludeNoteId)),
            not(isNull(notes.embedding)),
          ),
        );
    } catch (error) {
      throw new DatabaseError(
        `Error finding other notes with embeddings: ${error instanceof Error ? error.message : String(error)}`,
        { excludeNoteId },
      );
    }
  }

  /**
   * Get the total count of notes in the database
   * @returns The total number of notes
   * @throws DatabaseError If there's an error accessing the database
   */
  async getNoteCount(): Promise<number> {
    return tryExec(async () => {
      try {
        // Get just the IDs for efficiency
        const allNotes = await db.select({ id: notes.id }).from(notes);
        
        // Handle potential null or undefined return
        if (!Array.isArray(allNotes)) {
          logger.warn('Database query returned non-array result for note count');
          return 0;
        }
        
        return allNotes.length;
      } catch (error) {
        throw new DatabaseError(
          `Error getting note count: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }, 'Error getting note count');
  }

  /**
   * Search notes using keyword matching
   * @param query Optional search query
   * @param tags Optional tags to filter by
   * @param limit Maximum results to return
   * @param offset Pagination offset
   * @returns Array of matching notes
   */
  async searchNotesByKeywords(query?: string, tags?: string[], limit = 10, offset = 0): Promise<Note[]> {
    try {
      // Apply safe limits
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);
      
      const conditions = [];

      // Add query conditions if query is provided
      if (isNonEmptyString(query)) {
        // Break query into keywords for better matching
        const keywords = query
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 2);

        // If we have actual keywords, search for them
        if (keywords.length > 0) {
          logger.debug(`Searching with ${keywords.length} extracted keywords`);
          
          const keywordConditions = keywords.map(keyword => {
            // Sanitize the keyword for SQL LIKE pattern
            const safeKeyword = keyword.replace(/%/g, '\\%').replace(/_/g, '\\_');
            
            return or(
              like(notes.title, `%${safeKeyword}%`),
              like(notes.content, `%${safeKeyword}%`),
              like(notes.tags, `%${safeKeyword}%`),
            );
          });

          // Create a condition that matches any of the keywords
          conditions.push(or(...keywordConditions));
        } else {
          // Fallback to original query if no keywords extracted
          logger.debug('No keywords extracted, using original query');
          
          // Sanitize the query for SQL LIKE pattern
          const safeQuery = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
          
          conditions.push(
            or(
              like(notes.title, `%${safeQuery}%`),
              like(notes.content, `%${safeQuery}%`),
            ),
          );
        }
      }

      // Add tag conditions if tags are provided
      if (Array.isArray(tags) && tags.length > 0) {
        const validTags = tags.filter(isNonEmptyString);
        if (validTags.length > 0) {
          logger.debug(`Searching with ${validTags.length} tags`);
          
          // This assumes tags are stored as a JSON array in a TEXT field
          // Add a condition for each tag to search in the JSON array
          for (const tag of validTags) {
            // Sanitize the tag for SQL LIKE pattern
            const safeTag = tag.replace(/%/g, '\\%').replace(/_/g, '\\_');
            conditions.push(like(notes.tags, `%${safeTag}%`));
          }
        }
      }

      // If no conditions, just get recent notes
      if (conditions.length === 0) {
        logger.debug('No search conditions, returning recent notes');
        
        return db
          .select()
          .from(notes)
          .orderBy(desc(notes.updatedAt))
          .limit(safeLimit)
          .offset(safeOffset);
      }

      // Execute search with conditions
      return db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.updatedAt))
        .limit(safeLimit)
        .offset(safeOffset);
    } catch (error) {
      throw new DatabaseError(
        `Error in keyword search: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}