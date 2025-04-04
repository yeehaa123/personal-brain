/**
 * Repository for managing Note storage and retrieval
 * Centralizes database access for notes
 */
import { and, desc, eq, isNull, like, not, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/db';
import { noteChunks, notes } from '@/db/schema';
import type { Note } from '@/models/note';
import { BaseRepository } from '@/services/BaseRepository';
import { DatabaseError, tryExec, ValidationError } from '@/utils/errorUtils';
import logger from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';


/**
 * Repository for accessing and managing notes in the database
 */
export class NoteRepository extends BaseRepository<typeof notes, Note> {
  // New methods for conversation-to-notes feature
  
  /**
   * Find notes by source type
   * @param source The source type to filter by ('import', 'conversation', 'user-created')
   * @param limit Maximum number of notes to return
   * @param offset Pagination offset
   * @returns Array of notes with the specified source
   */
  async findBySource(source: 'import' | 'conversation' | 'user-created', limit = 10, offset = 0): Promise<Note[]> {
    try {
      // Note: We need to cast the return type to fix the TypeScript issue
      // The actual records from the database should match the Note type
      const results = await db
        .select()
        .from(notes)
        .where(eq(notes.source, source))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(notes.createdAt));

      // Cast the source field to the proper enum type - in the database it's TEXT
      return results.map(note => ({
        ...note,
        // Force the source field to be one of the expected enum values
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
    } catch (error) {
      throw new DatabaseError(
        `Error finding notes by source: ${error instanceof Error ? error.message : String(error)}`,
        { source, limit, offset },
      );
    }
  }

  /**
   * Find notes by metadata field value in conversationMetadata
   * @param field The field name in the conversationMetadata to match
   * @param value The value to search for
   * @returns Array of notes with matching metadata
   */
  async findByConversationMetadata(field: string, value: string): Promise<Note[]> {
    try {
      // For SQLite with JSON storage, we need a json_extract function
      // This is SQLite-specific implementation
      // Since db.execute doesn't exist, we'll use a different approach with drizzle-orm
      const results = await db
        .select()
        .from(notes)
        .where(
          sql`json_extract(${notes.conversationMetadata}, '$."${field}"') = ${value}`,
        )
        .orderBy(desc(notes.createdAt));
      
      // Cast the source field to the proper enum type
      return results.map(note => ({
        ...note,
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
    } catch (error) {
      throw new DatabaseError(
        `Error finding notes by conversation metadata: ${error instanceof Error ? error.message : String(error)}`,
        { field, value },
      );
    }
  }
  /**
   * Get the table that this repository uses
   */
  protected get table() {
    return notes;
  }

  /**
   * Get entity name for error messages and logging
   */
  protected get entityName() {
    return 'note';
  }
  
  /**
   * Get the ID column for the table
   */
  protected getIdColumn() {
    return notes.id;
  }

  /**
   * Retrieve a note by its ID
   * @param id The ID of the note to retrieve
   * @returns The note object or undefined if not found
   * @throws DatabaseError If there's an error accessing the database
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    return this.getById(id);
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
      
      // Apply consistent typing to source field
      return recentNotes.map(note => ({
        ...note,
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
    }, 'Error fetching recent notes');
  }

  /**
   * Get all notes without embeddings
   * @returns Array of notes without embeddings
   */
  async getNotesWithoutEmbeddings(): Promise<Note[]> {
    try {
      const results = await db
        .select()
        .from(notes)
        .where(isNull(notes.embedding));
      
      // Apply consistent typing to source field
      return results.map(note => ({
        ...note,
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
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
      const results = await db
        .select()
        .from(notes)
        .where(not(isNull(notes.embedding)));
        
      // Apply consistent typing to source field
      return results.map(note => ({
        ...note,
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
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
      const results = await db
        .select()
        .from(notes)
        .where(
          and(
            not(eq(notes.id, excludeNoteId)),
            not(isNull(notes.embedding)),
          ),
        );
        
      // Apply consistent typing to source field
      return results.map(note => ({
        ...note,
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
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
    return this.getCount();
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
        
        const results = await db
          .select()
          .from(notes)
          .orderBy(desc(notes.updatedAt))
          .limit(safeLimit)
          .offset(safeOffset);
          
        // Apply consistent typing to source field
        return results.map(note => ({
          ...note,
          source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
        }));
      }

      // Execute search with conditions
      const results = await db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.updatedAt))
        .limit(safeLimit)
        .offset(safeOffset);
        
      // Apply consistent typing to source field
      return results.map(note => ({
        ...note,
        source: (note.source || 'import') as 'import' | 'conversation' | 'user-created',
      }));
    } catch (error) {
      throw new DatabaseError(
        `Error in keyword search: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}