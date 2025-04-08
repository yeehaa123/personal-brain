/**
 * Service for profile-related search functionality
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import type { Profile } from '@/models/profile';
import { BaseSearchService } from '@/services/common/baseSearchService';
import type { BaseSearchOptions } from '@/services/common/baseSearchService';
import { ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';
import { extractKeywords } from '@/utils/textUtils';

import { ProfileEmbeddingService } from './profileEmbeddingService';
import { ProfileRepository } from './profileRepository';
import { ProfileTagService } from './profileTagService';


export type ProfileSearchOptions = BaseSearchOptions;

interface NoteWithSimilarity {
  id: string;
  title: string;
  content: string;
  tags?: string[] | null;
  embedding?: number[] | null;
  similarity?: number;
  createdAt: Date;
  updatedAt: Date;
  // Added fields to match the updated Note schema
  source?: 'import' | 'conversation' | 'user-created';
  confidence?: number | null;
  conversationMetadata?: {
    conversationId: string;
    timestamp: Date;
    userName?: string;
    promptSegment?: string;
  } | null;
  verified?: boolean | null;
}

interface NoteContext {
  searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<NoteWithSimilarity[]>;
  searchNotes: (options: { query?: string; tags?: string[]; limit?: number; includeContent?: boolean }) => Promise<NoteWithSimilarity[]>;
}

/**
 * Service for finding notes related to a profile
 */
export class ProfileSearchService extends BaseSearchService<Profile, ProfileRepository, ProfileEmbeddingService> {
  protected entityName = 'profile';
  protected repository: ProfileRepository;
  protected embeddingService: ProfileEmbeddingService;
  private tagService: ProfileTagService;
  
  /**
   * Singleton instance of ProfileSearchService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ProfileSearchService | null = null;
  
  /**
   * Override the logger from the base class with protected visibility
   * This allows the derived class to use the logger directly
   */
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param repository Repository for accessing profiles (defaults to singleton instance)
   * @param embeddingService Service for profile embeddings (defaults to singleton instance)
   * @param tagService Service for profile tag operations (defaults to a new instance)
   * @returns The singleton instance
   */
  public static getInstance(
    repository?: ProfileRepository,
    embeddingService?: ProfileEmbeddingService,
    tagService?: ProfileTagService,
  ): ProfileSearchService {
    if (!ProfileSearchService.instance) {
      ProfileSearchService.instance = new ProfileSearchService(
        repository || ProfileRepository.getInstance(),
        embeddingService || ProfileEmbeddingService.getInstance(),
        tagService || new ProfileTagService(),
      );
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileSearchService singleton instance created');
    } else if (repository || embeddingService || tagService) {
      // Log a warning if trying to get instance with different dependencies
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.warn('getInstance called with dependencies but instance already exists. Dependencies ignored.');
    }
    
    return ProfileSearchService.instance;
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
      if (ProfileSearchService.instance) {
        // No specific cleanup needed for this service
      }
    } catch (error) {
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.error('Error during ProfileSearchService instance reset:', error);
    } finally {
      ProfileSearchService.instance = null;
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileSearchService singleton instance reset');
    }
  }
  
  /**
   * Create a fresh ProfileSearchService instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param repository Repository for accessing profiles
   * @param embeddingService Service for profile embeddings
   * @param tagService Service for profile tag operations
   * @returns A new ProfileSearchService instance
   */
  public static createFresh(
    repository: ProfileRepository,
    embeddingService: ProfileEmbeddingService,
    tagService: ProfileTagService,
  ): ProfileSearchService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ProfileSearchService instance');
    
    return new ProfileSearchService(repository, embeddingService, tagService);
  }

  /**
   * Create a new ProfileSearchService with injected dependencies
   * 
   * While this constructor is public, it is recommended to use the factory methods
   * getInstance() or createFresh() instead to ensure consistent instance management.
   * 
   * @param repository Repository for accessing profiles
   * @param embeddingService Service for profile embeddings
   * @param tagService Service for profile tag operations
   */
  constructor(
    repository: ProfileRepository,
    embeddingService: ProfileEmbeddingService,
    tagService: ProfileTagService,
  ) {
    super();
    this.repository = repository;
    this.embeddingService = embeddingService;
    this.tagService = tagService;
    
    this.logger.debug('ProfileSearchService instance created');
  }
  
  /**
   * Legacy constructor support for backwards compatibility
   * @deprecated Use getInstance or createFresh instead
   * @param apiKey Optional API key for embeddings
   * @returns ProfileSearchService instance
   */
  static createWithApiKey(apiKey?: string): ProfileSearchService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.warn('createWithApiKey is deprecated, use getInstance() or createFresh() instead');
    
    const repository = ProfileRepository.getInstance();
    const embeddingService = apiKey ? 
      ProfileEmbeddingService.createFresh(apiKey) : 
      ProfileEmbeddingService.getInstance();
    const tagService = new ProfileTagService();
    
    return ProfileSearchService.getInstance(repository, embeddingService, tagService);
  }

  /**
   * Search profiles with various strategies
   * @param options Search options 
   * @returns Array of matching profiles
   */
  async searchProfiles(options: ProfileSearchOptions): Promise<Profile[]> {
    return this.search(options);
  }

  /**
   * Search profiles using keywords
   * @param query Optional search query
   * @param tags Optional tags to filter by
   * @param limit Maximum results
   * @param offset Pagination offset
   * @returns Array of matching profiles
   */
  protected async keywordSearch(
    query?: string, 
    tags?: string[], 
    _limit = 10, 
    _offset = 0,
  ): Promise<Profile[]> {
    // Since there's only one profile, we just return it if it matches the query/tags
    try {
      const profile = await this.repository.getProfile();
      if (!profile) {
        return [];
      }

      // If no query or tags, just return the profile
      if (!isNonEmptyString(query) && (!tags || tags.length === 0)) {
        return [profile];
      }

      // Check if profile matches the query
      let matchesQuery = true;
      if (isNonEmptyString(query)) {
        const profileText = this.tagService.prepareProfileTextForEmbedding(profile);
        matchesQuery = profileText.toLowerCase().includes(query.toLowerCase());
      }

      // Check if profile matches the tags
      let matchesTags = true;
      if (tags && tags.length > 0 && profile.tags) {
        matchesTags = tags.some(tag => profile.tags?.includes(tag));
      }

      return (matchesQuery && matchesTags) ? [profile] : [];
    } catch (error) {
      this.logger.error(`Profile keyword search failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Search profiles using embeddings
   * @param query Search query
   * @param tags Optional tags to filter by
   * @param limit Maximum results
   * @param offset Pagination offset
   * @returns Array of matching profiles
   */
  protected async semanticSearch(
    query: string, 
    tags?: string[], 
    _limit = 10, // Renamed to avoid unused parameter warning
    _offset = 0,  // Renamed to avoid unused parameter warning
  ): Promise<Profile[]> {
    try {
      if (!isNonEmptyString(query)) {
        throw new ValidationError('Empty query for semantic profile search');
      }
      
      const profile = await this.repository.getProfile();
      if (!profile || !profile.embedding) {
        return this.keywordSearch(query, tags, _limit, _offset);
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      // Calculate similarity between query and profile
      const similarity = this.embeddingService.calculateSimilarity(queryEmbedding, profile.embedding);
      
      // Use a threshold to determine if profile matches
      const threshold = 0.7; // Adjust as needed
      
      // Filter by tags if provided
      let matchesTags = true;
      if (tags && tags.length > 0 && profile.tags) {
        matchesTags = tags.some(tag => profile.tags?.includes(tag));
      }
      
      return (similarity >= threshold && matchesTags) ? [profile] : [];
    } catch (error) {
      this.logger.error(`Profile semantic search failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.keywordSearch(query, tags, _limit, _offset);
    }
  }

  /**
   * Find related entity (not implemented for profiles)
   * @param profileId ID of the profile
   * @param maxResults Maximum results to return
   * @returns Empty array (not implemented for profiles)
   */
  async findRelated(_profileId: string, _maxResults = 5): Promise<Profile[]> {
    // This method doesn't make sense for profiles since there's only one
    return [];
  }

  /**
   * Find notes related to the profile using tags or embeddings
   * @param noteContext The NoteContext for searching notes
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findRelatedNotes(noteContext: NoteContext, limit = 5): Promise<NoteWithSimilarity[]> {
    const profile = await this.repository.getProfile();
    if (!profile) {
      return [];
    }

    // Try to find notes based on tags if available
    if (profile.tags?.length) {
      try {
        const tagResults = await this.findNotesWithSimilarTags(noteContext, profile.tags as string[], limit);
        if (tagResults.length > 0) {
          return tagResults;
        }
      } catch (error) {
        this.logger.error('Error finding notes with similar tags', { 
          error: error instanceof Error ? error.message : String(error),
          context: 'ProfileSearchService',
        });
      }
    }

    // Fall back to embedding or keyword search
    try {
      // If profile has embeddings, use semantic search
      if (profile.embedding?.length) {
        return await noteContext.searchNotesWithEmbedding(
          profile.embedding as number[],
          limit,
        );
      }

      // Otherwise fall back to keyword search
      const keywords = this.extractKeywords(this.tagService.prepareProfileTextForEmbedding(profile));
      return await noteContext.searchNotes({
        query: keywords.slice(0, 10).join(' '), // Use top 10 keywords
        limit,
      });
    } catch (error) {
      this.logger.error('Error finding notes related to profile:', { 
        error: error instanceof Error ? error.message : String(error),
        context: 'ProfileSearchService',
      });
      return [];
    }
  }

  /**
   * Find notes that have similar tags to the profile
   * @param noteContext The NoteContext for searching notes
   * @param profileTags The profile tags to match against
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findNotesWithSimilarTags(
    noteContext: NoteContext,
    profileTags: string[],
    limit = 5,
    _offset = 0, // Add unused parameter for consistency
  ): Promise<NoteWithSimilarity[]> {
    if (!profileTags?.length) {
      return [];
    }

    // Get all notes with tags
    const allNotes = await noteContext.searchNotes({
      limit: 100,
      includeContent: false,
    });

    // Filter to notes that have tags and score them
    const scoredNotes = allNotes
      .filter(note => note.tags && Array.isArray(note.tags) && note.tags.length > 0)
      .map(note => {
        // We know tags is not null from the filter above
        const noteTags = note.tags as string[]; 
        const matchCount = this.calculateTagMatchScore(noteTags, profileTags);
        return {
          ...note,
          tagScore: matchCount,
          matchRatio: matchCount / noteTags.length,
        };
      })
      .filter(note => note.tagScore > 0);

    // Sort by tag match score and ratio
    const sortedNotes = scoredNotes
      .sort((a, b) => {
        // First sort by absolute number of matches
        if (b.tagScore !== a.tagScore) {
          return b.tagScore - a.tagScore;
        }
        // Then by ratio of matches to total tags
        return b.matchRatio - a.matchRatio;
      })
      .map(({ tagScore: _tagScore, matchRatio: _matchRatio, ...note }) => note);

    return sortedNotes.slice(0, limit);
  }

  /**
   * Extract keywords from text
   * @param text Source text
   * @param maxKeywords Maximum number of keywords
   * @returns Array of keywords
   */
  protected extractKeywords(text: string, maxKeywords = 10): string[] {
    if (!isNonEmptyString(text)) {
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
      this.logger.warn(`Error extracting profile keywords: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}