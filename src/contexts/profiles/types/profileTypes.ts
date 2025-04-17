/**
 * Type definitions for the Profile Context
 * Contains shared interfaces and types used across profile components
 */
import type { Note } from '@/models/note';

/**
 * Interface for notes with similarity scores for related notes functionality
 */
export interface NoteWithSimilarity extends Omit<Note, 'source' | 'confidence' | 'conversationMetadata' | 'verified' | 'tags'> {
  /**
   * Tags associated with the note
   */
  tags?: string[] | null;
  /**
   * Similarity score between note and search vector (0-1)
   */
  similarity?: number;
  
  /**
   * Source of the note (import, conversation, user-created)
   */
  source?: 'import' | 'conversation' | 'user-created';
  
  /**
   * Confidence score for notes generated from conversations
   */
  confidence?: number | null;
  
  /**
   * Metadata for notes generated from conversations
   */
  conversationMetadata?: {
    conversationId: string;
    timestamp: Date;
    userName?: string;
    promptSegment?: string;
  } | null;
  
  /**
   * Whether the note has been verified by a user
   */
  verified?: boolean | null;
}

/**
 * Interface for Note Context to use in profile-related operations
 * Provides a minimal interface for the ProfileContext to interact with notes
 */
export interface NoteContext {
  /**
   * Search notes using embedding vector for semantic similarity
   * @param embedding - The embedding vector to compare against
   * @param limit - Optional limit on number of results
   * @returns Array of notes with similarity scores
   */
  searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<NoteWithSimilarity[]>;
  
  /**
   * Search notes using text and/or tags
   * @param options - Search options including query text and tags
   * @returns Array of matching notes with similarity scores
   */
  searchNotes: (options: { 
    query?: string; 
    tags?: string[]; 
    limit?: number; 
    includeContent?: boolean 
  }) => Promise<NoteWithSimilarity[]>;
}

/**
 * Interface for profile formatting options
 */
export interface ProfileFormattingOptions {
  /**
   * Whether to include section headers
   * @default true
   */
  includeSectionHeaders?: boolean;
  
  /**
   * Whether to include empty sections
   * @default false
   */
  includeEmptySections?: boolean;
  
  /**
   * Maximum characters for each field
   * Set to 0 for no limit
   * @default 0
   */
  maxFieldLength?: number;
}