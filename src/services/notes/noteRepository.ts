/**
 * Repository for managing Note storage and retrieval
 * Centralizes database access for notes
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import { and, desc, eq, isNull, like, not, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/db';
import { noteChunks, notes } from '@/db/schema';
import type { Note } from '@/models/note';
import { DatabaseError, safeExec, tryExec, ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';

import type { IRepository } from '../interfaces/IRepository';

/**
 * Repository for accessing and managing notes in the database
 */
export class NoteRepository implements IRepository<Note, string> {
  /**
   * Singleton instance of NoteRepository
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: NoteRepository | null = null;
  
  /**
   * Logger instance for this repository
   */
  protected logger = Logger.getInstance();

  /**
   * Get the singleton instance of the repository
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @returns The singleton instance
   */
  public static getInstance(): NoteRepository {
    if (!NoteRepository.instance) {
      NoteRepository.instance = new NoteRepository();
      
      const logger = Logger.getInstance();
      logger.debug('NoteRepository singleton instance created');
    }
    
    return NoteRepository.instance;
  }

  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (NoteRepository.instance) {
        // No specific cleanup needed for this repository
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during NoteRepository instance reset:', error);
    } finally {
      NoteRepository.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('NoteRepository singleton instance reset');
    }
  }

  /**
   * Create a fresh NoteRepository instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @returns A new NoteRepository instance
   */
  public static createFresh(): NoteRepository {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh NoteRepository instance');
    
    return new NoteRepository();
  }
  
  /**
   * Create a new repository with dependencies
   * 
   * Part of the Component Interface Standardization pattern.
   * This method follows the standard pattern for dependency injection.
   * 
   * @param config Configuration options
   * @returns A new NoteRepository instance
   */
  public static createWithDependencies(_config: Record<string, unknown> = {}): NoteRepository {
    const logger = Logger.getInstance();
    logger.debug('Creating NoteRepository with dependencies');
    
    // For this repository, we currently don't have any dependencies to inject,
    // but we implement this method for consistency with the pattern
    
    return new NoteRepository();
  }

  /**
   * Get an entity by ID
   * @param id Entity ID
   * @returns The entity or undefined if not found
   * @throws DatabaseError If there's an error accessing the database
   * @throws ValidationError If the ID is invalid
   */
  async getById(id: string): Promise<Note | undefined> {
    if (!isNonEmptyString(id)) {
      this.logger.warn(`Invalid note ID provided for getById: ${id}`);
      throw new ValidationError('Invalid note ID provided', { id });
    }

    try {
      this.logger.debug(`Getting note with ID: ${id}`);
      const result = await db.select()
        .from(notes)
        .where(eq(notes.id, id))
        .limit(1);
      
      if (result[0]) {
        this.logger.debug(`Found note with ID: ${id}`);
      } else {
        this.logger.debug(`No note found with ID: ${id}`);
      }
      
      return result[0] as Note | undefined;
    } catch (error) {
      this.logger.error(`Database error retrieving note with ID: ${id}`, { 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      throw new DatabaseError(
        `Failed to retrieve note with ID: ${id}`, 
        { id, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }
  
  /**
   * Insert an entity
   * @param entity The entity to insert
   * @returns The inserted entity
   * @throws DatabaseError If there's an error accessing the database
   */
  async insert(entity: Note): Promise<Note> {
    try {
      this.logger.debug('Inserting new note');
      
      // We need to use a type assertion here for Drizzle ORM
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(notes).values(entity as any);
      
      // Try to get ID for better logging
      const id = (entity as unknown as { id?: string }).id;
      if (id) {
        this.logger.debug(`Successfully inserted note with ID: ${id}`);
      } else {
        this.logger.debug('Successfully inserted note');
      }
      
      return entity;
    } catch (error) {
      this.logger.error('Failed to insert note', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw new DatabaseError(
        'Failed to insert note', 
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Update an existing entity by ID with partial updates
   * @param id The ID of the entity to update
   * @param updates Partial entity with only the fields to update
   * @returns True if the update was successful
   * @throws ValidationError If the ID is invalid
   * @throws DatabaseError If there's an error updating the entity
   */
  async update(id: string, updates: Partial<Note>): Promise<boolean> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError('Invalid note ID for update', { id });
    }

    try {
      this.logger.debug(`Updating note with ID: ${id}`);
      
      // Use Drizzle's update operation with type assertion for complex generic types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.update(notes).set(updates as any).where(eq(notes.id, id));
      
      this.logger.debug(`Successfully updated note with ID: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update note with ID: ${id}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw new DatabaseError(
        `Failed to update note with ID: ${id}`,
        { id, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Delete an entity by ID
   * @param id Entity ID
   * @returns true if successful
   */
  async deleteById(id: string): Promise<boolean> {
    return safeExec(async () => {
      if (!isNonEmptyString(id)) {
        this.logger.warn(`Invalid note ID provided for deleteById: ${id}`);
        throw new ValidationError('note ID is required', { id });
      }
      
      this.logger.debug(`Deleting note with ID: ${id}`);
      await db.delete(notes)
        .where(eq(notes.id, id));
      
      this.logger.debug(`Successfully deleted note with ID: ${id}`);
      return true;
    }, false, 'error');
  }

  /**
   * Get the total count of entities in the database
   * @returns The total count
   */
  async getCount(): Promise<number> {
    return tryExec(async () => {
      try {
        this.logger.debug('Getting count of all note entities');
        
        // Get just the IDs for efficiency
        const allEntities = await db.select({ id: notes.id })
          .from(notes);
        
        // Handle potential null or undefined return
        if (!Array.isArray(allEntities)) {
          this.logger.warn('Database query returned non-array result for note count');
          return 0;
        }
        
        this.logger.debug(`Found ${allEntities.length} note entities`);
        return allEntities.length;
      } catch (error) {
        this.logger.error('Database error getting note count', {
          error: error instanceof Error ? error.message : String(error),
        });
        
        throw new DatabaseError(
          `Error getting note count: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }, 'Error getting note count');
  }

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
      
      this.logger.debug(`Fetching ${safeLimit} recent notes`);
      
      // Query recent notes ordered by update time
      const recentNotes = await db
        .select()
        .from(notes)
        .orderBy(desc(notes.updatedAt))
        .limit(safeLimit);
      
      this.logger.debug(`Found ${recentNotes.length} recent notes`);
      
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
          this.logger.debug(`Searching with ${keywords.length} extracted keywords`);
          
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
          this.logger.debug('No keywords extracted, using original query');
          
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
          this.logger.debug(`Searching with ${validTags.length} tags`);
          
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
        this.logger.debug('No search conditions, returning recent notes');
        
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