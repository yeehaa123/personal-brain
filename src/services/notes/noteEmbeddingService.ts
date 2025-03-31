/**
 * Service for managing note embeddings and vector operations
 */
import { EmbeddingService } from '@/mcp/model/embeddings';
import { NoteRepository } from './noteRepository';
import type { Note } from '@/models/note';
import logger from '@/utils/logger';
import { textConfig } from '@/config';
import { isDefined, isNonEmptyString, assertDefined } from '@/utils/safeAccessUtils';
import { ApiError, ValidationError, tryExec } from '@/utils/errorUtils';

/**
 * Service for managing note embeddings
 */
export class NoteEmbeddingService {
  private embeddingService: EmbeddingService;
  private noteRepository: NoteRepository;

  constructor(apiKey?: string) {
    this.embeddingService = new EmbeddingService(apiKey ? { apiKey } : undefined);
    this.noteRepository = new NoteRepository();
  }

  /**
   * Generate an embedding for a note
   * @param title The note title
   * @param content The note content
   * @returns The embedding vector
   */
  async generateEmbedding(title: string, content: string): Promise<number[]> {
    if (!isNonEmptyString(title) && !isNonEmptyString(content)) {
      throw new ValidationError('Empty note content for embedding generation');
    }

    try {
      // Combine title and content for better embedding context
      const combinedText = `${title || ''} ${content || ''}`.trim();
      
      if (combinedText.length === 0) {
        throw new ValidationError('Empty combined text for embedding generation');
      }
      
      const result = await this.embeddingService.getEmbedding(combinedText);
      
      if (!isDefined(result) || !Array.isArray(result.embedding) || result.embedding.length === 0) {
        throw new ApiError('Failed to generate valid embedding', undefined, {
          textLength: combinedText.length,
        });
      }
      
      return result.embedding;
    } catch (error) {
      logger.error(`Error generating note embedding: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create chunks for a note and generate embeddings for each chunk
   * @param noteId The ID of the parent note
   * @param content The content to chunk
   * @returns Array of created chunk IDs
   * @throws ValidationError If the input parameters are invalid
   */
  async createNoteChunks(noteId: string, content: string): Promise<string[]> {
    // Validate inputs
    if (!isNonEmptyString(noteId)) {
      throw new ValidationError('Invalid note ID for chunking', { noteId });
    }
    
    if (!isNonEmptyString(content)) {
      throw new ValidationError('Empty or invalid content for chunking', { noteId, contentLength: 0 });
    }
    
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
        return [];
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
      const chunkIds: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        if (i >= chunks.length || i >= embeddingResults.length) {
          continue;
        }
        
        // Skip invalid chunks or embeddings
        const chunkContent = chunks[i];
        const embeddingResult = embeddingResults[i];
        
        if (
          !isNonEmptyString(chunkContent) || 
          !isDefined(embeddingResult) || 
          !Array.isArray(embeddingResult.embedding) || 
          embeddingResult.embedding.length === 0
        ) {
          logger.warn(`Invalid chunk or embedding at index ${i} for note ${noteId}, skipping`);
          continue;
        }
        
        // Insert the chunk
        const chunkId = await this.noteRepository.insertNoteChunk({
          noteId,
          content: chunkContent,
          embedding: embeddingResult.embedding,
          chunkIndex: i,
        });
        
        chunkIds.push(chunkId);
      }
      
      logger.info(`Successfully stored ${chunkIds.length} chunks for note ${noteId}`);
      return chunkIds;
    }, `Error creating note chunks for note ${noteId}`);
  }

  /**
   * Calculate similarity score between two notes
   * @param embedding1 First embedding
   * @param embedding2 Second embedding
   * @returns Similarity score (0 to 1)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    try {
      return this.embeddingService.cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      logger.error(`Error calculating similarity: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Generate or update embeddings for all notes that don't have them
   * @returns Statistics on the update operation
   */
  async generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    let updated = 0;
    let failed = 0;
    
    try {
      // Get all notes without embeddings
      const notesWithoutEmbeddings = await this.noteRepository.getNotesWithoutEmbeddings();
      
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
          
          // Skip notes with no content
          if (title.length === 0 && content.length === 0) {
            logger.warn(`Note ${note.id} has no content to embed, skipping`);
            failed++;
            continue;
          }
          
          // Generate embedding
          const embedding = await this.generateEmbedding(title, content);
          
          // Update the note with the embedding
          await this.noteRepository.updateNoteEmbedding(note.id, embedding);
          
          // Also create chunks for longer notes
          const chunkThreshold = textConfig.defaultChunkThreshold || 1000;
          if (content.length > chunkThreshold) {
            await this.createNoteChunks(note.id, content)
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
      logger.error(`Error in embedding generation: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return { updated, failed };
  }

  /**
   * Search notes by embedding similarity
   * @param embedding The embedding vector to search with
   * @param maxResults Maximum number of results to return
   * @returns Array of similar notes with similarity scores
   */
  async searchSimilarNotes(embedding: number[], maxResults = 5): Promise<(Note & { score: number })[]> {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new ValidationError('Invalid embedding for similarity search', { 
        embeddingType: typeof embedding,
        isArray: Array.isArray(embedding),
        length: Array.isArray(embedding) ? embedding.length : 0,
      });
    }
    
    try {
      // Apply safe limits
      const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));
      
      // Get all notes with embeddings
      const notesWithEmbeddings = await this.noteRepository.getNotesWithEmbeddings();
      
      logger.debug(`Found ${notesWithEmbeddings.length} notes with embeddings for similarity search`);
      
      if (notesWithEmbeddings.length === 0) {
        return [];
      }
      
      // Calculate similarity scores
      const scoredNotes: (Note & { score: number })[] = [];
      
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
            // Skip notes where similarity calculation fails
            logger.debug(`Error calculating similarity for note ${note.id}: ${similarityError}`);
          }
        }
      }
      
      logger.debug(`Calculated similarity scores for ${scoredNotes.length} notes`);
      
      // Sort by similarity score (highest first)
      scoredNotes.sort((a, b) => b.score - a.score);
      
      // Return top matches
      return scoredNotes.slice(0, safeMaxResults);
    } catch (error) {
      logger.error(`Error in similarity search: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find related notes for a given note ID based on embedding similarity
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes with similarity scores
   */
  async findRelatedNotes(noteId: string, maxResults = 5): Promise<(Note & { score: number })[]> {
    // Validate input
    if (!isNonEmptyString(noteId)) {
      throw new ValidationError('Invalid note ID for finding related notes', { noteId });
    }
    
    // Apply safe limits
    const safeMaxResults = Math.max(1, Math.min(maxResults || 5, 50));
    
    try {
      // Find the source note
      const sourceNote = await this.noteRepository.getNoteById(noteId);
      
      if (!isDefined(sourceNote)) {
        logger.warn(`Source note not found: ${noteId}`);
        return [];
      }
      
      if (!Array.isArray(sourceNote.embedding) || sourceNote.embedding.length === 0) {
        logger.debug(`Source note has no embedding for similarity search: ${noteId}`);
        return [];
      }
      
      // Get all other notes with embeddings
      const otherNotes = await this.noteRepository.getOtherNotesWithEmbeddings(noteId);
      
      logger.debug(`Found ${otherNotes.length} other notes with embeddings`);
      
      if (otherNotes.length === 0) {
        return [];
      }
      
      // Calculate similarity scores
      const scoredNotes: (Note & { score: number })[] = [];
      
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
            // Skip notes where similarity calculation fails
            logger.debug(`Error calculating similarity between notes ${noteId} and ${note.id}: ${similarityError}`);
          }
        }
      }
      
      logger.debug(`Calculated similarity scores for ${scoredNotes.length} notes`);
      
      // Sort by similarity score (highest first)
      scoredNotes.sort((a, b) => b.score - a.score);
      
      // Return top matches
      return scoredNotes.slice(0, safeMaxResults);
    } catch (error) {
      logger.error(`Error finding related notes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}