/**
 * ProfileContext Interface
 * 
 * Defines the public interface of the ProfileContext class to avoid circular dependencies
 * between the ProfileContext and its component classes.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { Profile } from '@/models/profile';

import type { NoteContext, NoteWithSimilarity, ProfileFormattingOptions } from './profileTypes';

/**
 * Interface for the ProfileContext class
 * Used by components to interact with the main context without causing circular dependencies
 */
export interface IProfileContext {
  /**
   * Get the MCP server instance
   */
  getMcpServer(): McpServer;
  
  /**
   * Set the note context for related note operations
   */
  setNoteContext(context: NoteContext): void;
  
  /**
   * Get the current note context if available
   */
  getNoteContext(): NoteContext | undefined;
  
  /**
   * Register all MCP resources and tools on an external server
   */
  registerOnServer(server: McpServer): void;

  /**
   * Format profile for display in a readable text format
   */
  formatProfileForDisplay(profile: Profile, options?: ProfileFormattingOptions): string;

  /**
   * Retrieve the user profile
   */
  getProfile(): Promise<Profile | undefined>;

  /**
   * Create or update the user profile with automatic tag and embedding generation
   */
  saveProfile(profileData: Partial<Profile>): Promise<string>;

  /**
   * Update partial profile data with automatic embedding regeneration when needed
   */
  updateProfile(profileData: Partial<Profile>): Promise<void>;

  /**
   * Generate or update embeddings for the profile
   */
  generateEmbeddingForProfile(): Promise<{ updated: boolean }>;

  /**
   * Update or generate tags for an existing profile
   */
  updateProfileTags(forceRegenerate?: boolean): Promise<string[] | null>;

  /**
   * Find notes related to the profile using tags or embeddings
   */
  findRelatedNotes(noteContext: NoteContext, limit?: number): Promise<NoteWithSimilarity[]>;

  /**
   * Find notes that have similar tags to the profile
   */
  findNotesWithSimilarTags(
    noteContext: NoteContext,
    profileTags: string[],
    limit?: number,
  ): Promise<NoteWithSimilarity[]>;

  /**
   * Extract keywords from profile to use for searching notes
   */
  extractProfileKeywords(profile: Partial<Profile>): string[];

  /**
   * Prepare profile text for embedding
   */
  getProfileTextForEmbedding(profile: Partial<Profile>): string;
}