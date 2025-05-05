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
   * Source of the note (import, conversation, user-created, landing-page)
   */
  source?: 'import' | 'conversation' | 'user-created' | 'landing-page';
  
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
   * Search notes using text for semantic similarity
   * @param text - The text to search for similar notes
   * @param limit - Optional limit on number of results
   * @param tags - Optional tags to filter by
   * @returns Array of notes with similarity scores
   */
  searchWithEmbedding: (text: string, limit?: number, tags?: string[]) => Promise<NoteWithSimilarity[]>;
  
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