import { db } from '@/db';
import { notes, noteChunks } from '@/db/schema';
import { eq, like, and, or, desc, isNull, not } from 'drizzle-orm';
import type { Note } from '@/models/note';
import { EmbeddingService } from '@/mcp/model/embeddings';
import { nanoid } from 'nanoid';
import { extractKeywords } from '@/utils/textUtils';
import logger from '@/utils/logger';
import { textConfig } from '@/config';
import { 
  isNonEmptyString, 
  isDefined, 
  safeArrayAccess,
  assertDefined, 
} from '@/utils/safeAccessUtils';
import {
  ApiError,
  DatabaseError,
  ValidationError,
  tryExec,
  safeExec,
} from '@/utils/errorUtils';

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
   * Create a new note with embeddings
   * @param note The note data to create
   * @returns The ID of the created note
   * @throws ValidationError If the note data is invalid
   * @throws DatabaseError If there's an error inserting the note
   */
  async createNote(note: Omit<Note, 'embedding'> & { embedding?: number[] }): Promise<string> {
    if (!note || typeof note !== 'object') {
      throw new ValidationError('Invalid note data provided', { noteType: typeof note });
    }

    try {
      const now = new Date();
      const id = isNonEmptyString(note.id) ? note.id : nanoid();
      const title = isNonEmptyString(note.title) ? note.title : 'Untitled Note';
      const content = isNonEmptyString(note.content) ? note.content : '';

      let embedding = note.embedding;

      // Generate embedding if not provided
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        try {
          logger.debug(`Generating embedding for note: ${id}`);
          const combinedText = `${title} ${content}`;
          const result = await this.embeddingService.getEmbedding(combinedText);
          embedding = result.embedding;
        } catch (error) {
          // Log the error but continue - we can store the note without an embedding
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Error generating embedding for note ${id}: ${errMsg}`);
        }
      }

      // Prepare timestamp values with defaults
      const createdAt = isDefined(note.createdAt) ? note.createdAt : now;
      const updatedAt = isDefined(note.updatedAt) ? note.updatedAt : now;
      
      // Validate tags array
      const tags = Array.isArray(note.tags) ? note.tags.filter(isNonEmptyString) : undefined;

      // Insert the note with the embedding array directly
      await db.insert(notes).values({
        id,
        title,
        content,
        embedding,
        createdAt,
        updatedAt,
        tags,
      });

      // If the note is long, also create chunks
      if (content.length > (textConfig.defaultChunkThreshold || 1000)) {
        await this.createNoteChunks(id, content)
          .catch(chunkError => {
            // Log but don't fail the whole operation if chunking fails
            logger.error(`Failed to create chunks for note ${id}: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`);
          });
      }

      return id;
    } catch (error) {
      // Convert to a DatabaseError with context information
      throw new DatabaseError(
        `Failed to create note: ${error instanceof Error ? error.message : String(error)}`, 
        { 
          noteId: note.id,
          title: note.title?.substring(0, 30), 
          contentLength: note.content?.length,
        },
      );
    }
  }

  /**
   * Create chunks for a note and generate embeddings for each chunk
   * @param noteId The ID of the parent note
   * @param content The content to chunk
   * @throws ValidationError If the input parameters are invalid
   * @throws DatabaseError If there's an error inserting the chunks
   */
  private async createNoteChunks(noteId: string, content: string): Promise<void> {
    // Validate inputs
    if (!isNonEmptyString(noteId)) {
      throw new ValidationError('Invalid note ID for chunking', { noteId });
    }
    
    if (!isNonEmptyString(content)) {
      throw new ValidationError('Empty or invalid content for chunking', { noteId, contentLength: 0 });
    }
    
    // Use error handling utility to wrap the operation
    return tryExec(async () => {
      // Determine chunking parameters with safe defaults
      const chunkSize = isDefined(textConfig.defaultChunkSize) 
        ? textConfig.defaultChunkSize 
        : 1000;
        
      const chunkOverlap = isDefined(textConfig.defaultChunkOverlap) 
        ? textConfig.defaultChunkOverlap 
        : 200;
      
      // Chunk the content using configured parameters
      const chunks = this.embeddingService.chunkText(
        content,
        chunkSize,
        chunkOverlap,
      );
      
      if (!Array.isArray(chunks) || chunks.length === 0) {
        logger.warn(`No chunks were generated for note ${noteId}`);
        return;
      }
      
      logger.info(`Generated ${chunks.length} chunks for note ${noteId}`);
      
      // Generate embeddings for all chunks in batch
      const embeddingResults = await this.embeddingService.getBatchEmbeddings(chunks);
      
      if (!Array.isArray(embeddingResults) || embeddingResults.length === 0) {
        throw new ApiError('Failed to generate embeddings for chunks', undefined, {
          noteId,
          chunksCount: chunks.length,
        });
      }
      
      // Insert each chunk with its embedding
      const now = new Date();
      const chunkIds: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        // Safely access array elements with defaults
        const chunkContent = safeArrayAccess(chunks, i, '');
        
        if (!isNonEmptyString(chunkContent)) {
          logger.warn(`Empty chunk content at index ${i} for note ${noteId}, skipping`);
          continue;
        }
        
        // Safely access embedding results
        const embeddingResult = safeArrayAccess(embeddingResults, i, undefined);
        
        if (!isDefined(embeddingResult) || !Array.isArray(embeddingResult.embedding)) {
          logger.warn(`Missing or invalid embedding for chunk ${i} of note ${noteId}, skipping`);
          continue;
        }
        
        const embedding = embeddingResult.embedding;
        const chunkId = nanoid();
        
        // Use the embedding array directly
        await db.insert(noteChunks).values({
          id: chunkId,
          noteId,
          content: chunkContent,
          embedding,
          chunkIndex: i,
          createdAt: now,
        });
        
        chunkIds.push(chunkId);
      }
      
      logger.info(`Successfully stored ${chunkIds.length} chunks for note ${noteId}`);
    }, `Error creating note chunks for note ${noteId}`);
  }

  /**
   * Search notes based on query text and/or tags with optional semantic search
   * @param options Search options including query, tags, limit, offset, and search type
   * @returns Array of matching notes
   * @throws ValidationError If search options are invalid
   * @throws DatabaseError If there's an error accessing the database
   */
  async searchNotes(options: SearchOptions): Promise<Note[]> {
    // Validate options parameter
    if (!options || typeof options !== 'object') {
      throw new ValidationError('Invalid search options', { optionsType: typeof options });
    }
    
    return safeExec(async () => {
      // Safely extract options with defaults
      const limit = isDefined(options.limit) ? Math.max(1, Math.min(options.limit, 100)) : 10;
      const offset = isDefined(options.offset) ? Math.max(0, options.offset) : 0;
      const semanticSearch = options.semanticSearch !== false; // Default to true
      
      // Handle query safely, ensuring it's a string
      const query = isNonEmptyString(options.query) ? options.query : undefined;
      
      // Ensure tags is an array if present and filter out invalid tags
      const tags = Array.isArray(options.tags) 
        ? options.tags.filter(isNonEmptyString)
        : undefined;
        
      logger.debug(`Searching notes with: ${JSON.stringify({
        query: query?.substring(0, 30) + (query && query.length > 30 ? '...' : ''),
        tagsCount: tags?.length,
        limit,
        offset,
        semanticSearch,
      })}`);

      // If semantic search is enabled and there's a query, perform vector search
      if (semanticSearch && query) {
        const results = await this.semanticSearch(query, tags, limit, offset);
        logger.info(`Semantic search found ${results.length} results`);
        return results;
      }

      // Otherwise, fall back to keyword search
      const results = await this.keywordSearch({
        query,
        tags,
        limit,
        offset,
        semanticSearch,
      });
      
      logger.info(`Keyword search found ${results.length} results`);
      return results;
    }, [], 'warn');  // Use 'warn' level and return empty array on error
  }

  /**
   * Search using traditional keyword matching
   * @param options Search options
   * @returns Array of matching notes
   * @throws DatabaseError If there's an error accessing the database
   */
  private async keywordSearch(options: SearchOptions): Promise<Note[]> {
    return tryExec(async () => {
      // Extract options with safe defaults
      const query = isNonEmptyString(options.query) ? options.query : undefined;
      const tags = Array.isArray(options.tags) ? options.tags.filter(isNonEmptyString) : undefined;
      const limit = isDefined(options.limit) ? Math.max(1, Math.min(options.limit, 100)) : 10;
      const offset = isDefined(options.offset) ? Math.max(0, options.offset) : 0;

      const conditions = [];

      if (isDefined(query)) {
        // Break query into keywords for better matching, with minimum length filter
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

      if (isDefined(tags) && tags.length > 0) {
        logger.debug(`Searching with ${tags.length} tags`);
        
        // This assumes tags are stored as a JSON array in a TEXT field
        // Add a condition for each tag to search in the JSON array
        for (const tag of tags) {
          if (isNonEmptyString(tag)) {
            // Sanitize the tag for SQL LIKE pattern
            const safeTag = tag.replace(/%/g, '\\%').replace(/_/g, '\\_');
            conditions.push(like(notes.tags, `%${safeTag}%`));
          }
        }
      }

      if (conditions.length === 0) {
        // If no search conditions, just get recent notes
        logger.debug('No search conditions, returning recent notes');
        
        return db
          .select()
          .from(notes)
          .orderBy(desc(notes.updatedAt))
          .limit(limit)
          .offset(offset);
      }

      // Execute search with conditions
      return db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.updatedAt))
        .limit(limit)
        .offset(offset);
    }, `Error in keyword search: ${options.query?.substring(0, 30)}`);
  }

  /**
   * Search using vector similarity
   * @param query The search query
   * @param tags Optional tags to filter by
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns Array of matching notes
   * @throws ApiError If there's an error generating the embedding
   * @throws DatabaseError If there's an error accessing the database
   */
  private async semanticSearch(query: string, tags?: string[], limit = 10, offset = 0): Promise<Note[]> {
    return safeExec(async () => {
      if (!isNonEmptyString(query)) {
        throw new ValidationError('Empty query for semantic search');
      }
      
      // Apply safe limits
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const safeOffset = Math.max(0, offset);
      
      // Sanitize tags if provided
      const safeTags = Array.isArray(tags) ? tags.filter(isNonEmptyString) : undefined;
      
      logger.debug(`Performing semantic search for query: ${query.substring(0, 30)}...`);
      
      try {
        // Get embedding for the query
        const queryEmbedding = await this.embeddingService.getEmbedding(query);
        
        if (!isDefined(queryEmbedding) || !Array.isArray(queryEmbedding.embedding) || queryEmbedding.embedding.length === 0) {
          throw new ApiError('Failed to generate valid embedding for query', undefined, {
            query: query.substring(0, 30),
          });
        }
        
        // Get all notes with valid embeddings
        const notesWithEmbeddings = await db
          .select()
          .from(notes)
          .where(not(isNull(notes.embedding)));
        
        logger.debug(`Found ${notesWithEmbeddings.length} notes with embeddings`);
        
        // Filter by tags if provided
        const filteredNotes = isDefined(safeTags) && safeTags.length > 0
          ? notesWithEmbeddings.filter(note => {
            if (!Array.isArray(note.tags)) return false;
            return safeTags.some(tag => note.tags?.includes(tag));
          })
          : notesWithEmbeddings;
        
        if (isDefined(safeTags) && safeTags.length > 0) {
          logger.debug(`Filtered to ${filteredNotes.length} notes matching tags: ${safeTags.join(', ')}`);
        }
        
        // Calculate similarity scores with proper null/undefined handling
        const scoredNotes: NoteWithScore[] = filteredNotes
          .filter(note => Array.isArray(note.embedding) && note.embedding.length > 0)
          .map(note => {
            try {
              // We've verified embedding exists in the filter above, but add a safety check
              const noteEmbedding = note.embedding || [];
              
              if (noteEmbedding.length === 0) {
                return { ...note, score: 0 };
              }
              
              const score = this.embeddingService.cosineSimilarity(
                queryEmbedding.embedding,
                noteEmbedding,
              );
              
              return { ...note, score: isNaN(score) ? 0 : score };
            } catch (similarityError) {
              // If similarity calculation fails for a specific note, assign score 0
              logger.warn(`Error calculating similarity for note ${note.id}: ${similarityError}`);
              return { ...note, score: 0 };
            }
          });
        
        logger.debug(`Calculated similarity scores for ${scoredNotes.length} notes`);
        
        // Sort by similarity score (highest first) with null safety
        scoredNotes.sort((a, b) => {
          const scoreA = typeof a.score === 'number' ? a.score : 0;
          const scoreB = typeof b.score === 'number' ? b.score : 0;
          return scoreB - scoreA;
        });
        
        // Apply pagination with bounds checking
        const startIndex = Math.min(safeOffset, scoredNotes.length);
        const endIndex = Math.min(startIndex + safeLimit, scoredNotes.length);
        
        return scoredNotes.slice(startIndex, endIndex);
      } catch (error) {
        // Log but don't fail - fall back to keyword search
        logger.error(`Error in semantic search: ${error instanceof Error ? error.message : String(error)}`);
        
        // Try keyword search as fallback
        return this.keywordSearch({ query, tags: safeTags, limit: safeLimit, offset: safeOffset });
      }
    }, [], 'warn'); // Return empty array on error with 'warn' log level
  }

  /**
   * Get related notes based on vector similarity
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   * @throws ValidationError If the noteId is invalid
   */
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    return safeExec(async () => {
      // Validate inputs
      if (!isNonEmptyString(noteId)) {
        throw new ValidationError('Invalid note ID for finding related notes', { noteId });
      }
      
      // Apply safe limits
      const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));
      
      // Find the source note
      const sourceNote = await this.getNoteById(noteId);
      
      if (!isDefined(sourceNote)) {
        logger.warn(`Source note not found: ${noteId}`);
        return [];
      }
      
      if (!Array.isArray(sourceNote.embedding) || sourceNote.embedding.length === 0) {
        logger.debug(`Source note has no embedding, falling back to keyword-based similarity: ${noteId}`);
        return this.getKeywordRelatedNotes(noteId, safeMaxResults);
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
        
        logger.debug(`Found ${otherNotes.length} other notes with embeddings`);
        
        if (otherNotes.length === 0) {
          return [];
        }
        
        // Calculate similarity scores with proper error handling for each note
        const scoredNotes: NoteWithScore[] = [];
        
        for (const note of otherNotes) {
          if (Array.isArray(note.embedding) && note.embedding.length > 0) {
            try {
              const score = this.embeddingService.cosineSimilarity(
                assertDefined(sourceNote.embedding),
                note.embedding,
              );
              
              scoredNotes.push({ 
                ...note, 
                score: isNaN(score) ? 0 : score, 
              });
            } catch (similarityError) {
              // If similarity calculation fails for this note, skip it
              logger.debug(`Error calculating similarity between notes ${noteId} and ${note.id}: ${similarityError}`);
            }
          }
        }
        
        logger.debug(`Calculated similarity scores for ${scoredNotes.length} notes`);
        
        // Sort by similarity score (highest first) with null safety
        scoredNotes.sort((a, b) => {
          const scoreA = typeof a.score === 'number' ? a.score : 0;
          const scoreB = typeof b.score === 'number' ? b.score : 0;
          return scoreB - scoreA;
        });
        
        // Return top matches with safe slicing
        return scoredNotes.slice(0, safeMaxResults);
      } catch (error) {
        logger.error(`Error finding related notes by embedding: ${error instanceof Error ? error.message : String(error)}`);
        // Fall back to keyword-based similarity
        return this.getKeywordRelatedNotes(noteId, safeMaxResults);
      }
    }, [], 'warn'); // Return empty array on error with 'warn' log level
  }
  
  /**
   * Search notes by embedding similarity (for profile integration)
   * Finds notes similar to a given embedding vector
   * @param embedding The embedding vector to search with
   * @param maxResults Maximum number of results to return
   * @returns Array of similar notes
   * @throws ValidationError If the embedding is invalid
   */
  async searchNotesWithEmbedding(embedding: number[], maxResults = 5): Promise<Note[]> {
    return safeExec(async () => {
      // Validate inputs
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new ValidationError('Invalid embedding for search', { 
          embeddingType: typeof embedding,
          isArray: Array.isArray(embedding),
          length: Array.isArray(embedding) ? embedding.length : 0,
        });
      }
      
      // Apply safe limits
      const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));
      
      try {
        // Get all notes with embeddings
        const notesWithEmbeddings = await db
          .select()
          .from(notes)
          .where(not(isNull(notes.embedding)));
        
        logger.debug(`Found ${notesWithEmbeddings.length} notes with embeddings for similarity search`);
        
        if (notesWithEmbeddings.length === 0) {
          return [];
        }
        
        // Calculate similarity scores with proper error handling for each note
        const scoredNotes: NoteWithScore[] = [];
        
        for (const note of notesWithEmbeddings) {
          if (Array.isArray(note.embedding) && note.embedding.length > 0) {
            try {
              const score = this.embeddingService.cosineSimilarity(
                embedding,
                note.embedding,
              );
              
              scoredNotes.push({ 
                ...note, 
                score: isNaN(score) ? 0 : score, 
              });
            } catch (similarityError) {
              // If similarity calculation fails for this note, log and skip it
              logger.debug(`Error calculating similarity for note ${note.id}: ${similarityError}`);
            }
          }
        }
        
        logger.debug(`Calculated similarity scores for ${scoredNotes.length} notes`);
        
        // Sort by similarity score (highest first) with null safety
        scoredNotes.sort((a, b) => {
          const scoreA = typeof a.score === 'number' ? a.score : 0;
          const scoreB = typeof b.score === 'number' ? b.score : 0;
          return scoreB - scoreA;
        });
        
        // Return top matches with safe slicing
        return scoredNotes.slice(0, safeMaxResults);
      } catch (error) {
        throw new DatabaseError(
          `Error searching notes with embedding: ${error instanceof Error ? error.message : String(error)}`,
          { embeddingLength: embedding.length },
        );
      }
    }, [], 'warn'); // Return empty array on error with 'warn' log level
  }

  /**
   * Fall back to keyword-based related notes when embeddings aren't available
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   * @throws ValidationError If the noteId is invalid
   */
  private async getKeywordRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    return tryExec(async () => {
      // Validate input
      if (!isNonEmptyString(noteId)) {
        throw new ValidationError('Invalid note ID for keyword-based related notes', { noteId });
      }
      
      // Apply safe limits
      const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));
      
      // Get the source note
      const sourceNote = await this.getNoteById(noteId);
      
      if (!isDefined(sourceNote)) {
        logger.warn(`Source note not found for keyword relation: ${noteId}`);
        return [];
      }
      
      // Make sure the note has content
      if (!isNonEmptyString(sourceNote.content)) {
        logger.debug(`Source note has no content for keyword extraction: ${noteId}`);
        return this.getRecentNotes(safeMaxResults);
      }
      
      // Extract keywords from the source note
      const keywords = this.extractKeywords(sourceNote.content);
      
      if (!Array.isArray(keywords) || keywords.length === 0) {
        logger.debug(`No keywords extracted from note: ${noteId}`);
        return this.getRecentNotes(safeMaxResults);
      }
      
      logger.debug(`Extracted ${keywords.length} keywords from note ${noteId}: ${keywords.join(', ')}`);
      
      // Build query conditions for each keyword
      const keywordConditions = keywords
        .filter(isNonEmptyString)
        .map(keyword => {
          // Sanitize the keyword for SQL LIKE pattern
          const safeKeyword = keyword.replace(/%/g, '\\%').replace(/_/g, '\\_');
          return like(notes.content, `%${safeKeyword}%`);
        });
      
      if (keywordConditions.length === 0) {
        return this.getRecentNotes(safeMaxResults);
      }
      
      // Find notes that contain these keywords
      const relatedNotes = await db
        .select()
        .from(notes)
        .where(
          and(
            not(eq(notes.id, noteId)),
            or(...keywordConditions),
          ),
        )
        .limit(safeMaxResults);
      
      logger.debug(`Found ${relatedNotes.length} keyword-related notes for ${noteId}`);
      return relatedNotes;
    }, `Error finding keyword-related notes for ${noteId}`);
  }

  /**
   * Extract keywords from text
   * @param text The text to extract keywords from
   * @param maxKeywords Maximum number of keywords to extract (default: 10)
   * @returns Array of extracted keywords
   */
  private extractKeywords(text: string, maxKeywords = 10): string[] {
    if (!isNonEmptyString(text)) {
      logger.debug('Empty text provided for keyword extraction');
      return [];
    }
    
    try {
      // Apply safe limits with defaults
      const safeMaxKeywords = Math.max(1, Math.min(maxKeywords || 10, 50));
      
      // Use the utility function to extract keywords
      const keywords = extractKeywords(text, safeMaxKeywords);
      
      // Ensure we return a valid array
      return Array.isArray(keywords) ? keywords.filter(isNonEmptyString) : [];
    } catch (error) {
      logger.warn(`Error extracting keywords: ${error instanceof Error ? error.message : String(error)}`);
      return [];
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
   * Generate or update embeddings for existing notes
   * @returns Statistics on the update operation
   * @throws DatabaseError If there's an error accessing the database
   */
  async generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    // Define the operation to perform
    async function generateEmbeddings(context: NoteContext): Promise<{ updated: number, failed: number }> {
      let updated = 0;
      let failed = 0;
      
      try {
        // Get all notes without embeddings
        const notesWithoutEmbeddings = await db
          .select()
          .from(notes)
          .where(isNull(notes.embedding));
        
        logger.info(`Found ${notesWithoutEmbeddings.length} notes without embeddings`);
        
        if (notesWithoutEmbeddings.length === 0) {
          return { updated, failed };
        }
        
        // Process each note
        for (const note of notesWithoutEmbeddings) {
          try {
            if (!isDefined(note) || !isNonEmptyString(note.id)) {
              logger.warn('Found invalid note in database, skipping');
              failed++;
              continue;
            }
            
            // Create the text to embed
            const title = isNonEmptyString(note.title) ? note.title : '';
            const content = isNonEmptyString(note.content) ? note.content : '';
            const combinedText = `${title} ${content}`.trim();
            
            if (combinedText.length === 0) {
              logger.warn(`Note ${note.id} has no content to embed, skipping`);
              failed++;
              continue;
            }
            
            // Generate embedding
            const result = await context.embeddingService.getEmbedding(combinedText);
            
            if (!Array.isArray(result.embedding) || result.embedding.length === 0) {
              throw new ApiError('Failed to generate valid embedding', undefined, { 
                noteId: note.id,
                textLength: combinedText.length,
              });
            }
            
            // Update the note with the embedding directly
            await db
              .update(notes)
              .set({ embedding: result.embedding })
              .where(eq(notes.id, note.id));
            
            // Also create chunks for longer notes
            const chunkThreshold = textConfig.defaultChunkThreshold || 1000;
            if (content.length > chunkThreshold) {
              await context.createNoteChunks(note.id, content)
                .catch(chunkError => {
                  // Log but don't fail the whole operation
                  logger.error(`Failed to create chunks for note ${note.id}: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`);
                });
            }
            
            updated++;
            logger.info(`Updated embedding for note: ${note.id}`);
          } catch (error) {
            failed++;
            logger.error(`Failed to update embedding for note ${note.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        throw new DatabaseError(
          `Error generating embeddings for notes: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      
      return { updated, failed };
    }
    
    // Execute the operation with proper error handling
    try {
      return await tryExec(() => generateEmbeddings(this), 'Error generating embeddings for notes');
    } catch (error) {
      // Provide a default value if the operation fails
      logger.error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
      return { updated: 0, failed: 0 };
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
    }, 'Error getting note count');  // Error message for tryExec
  }
}
