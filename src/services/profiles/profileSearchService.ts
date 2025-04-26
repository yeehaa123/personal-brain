/**
 * Service for profile-related search functionality
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates a new instance with explicit dependencies
 */
import type { Profile } from '@/models/profile';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import { DataRequestType, MessageFactory } from '@/protocol/messaging';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { BaseSearchService } from '@/services/common/baseSearchService';
import type { BaseSearchServiceConfig, BaseSearchServiceDependencies } from '@/services/common/baseSearchService';
import type { BaseSearchOptions } from '@/services/common/baseSearchService';
import { ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';
import { extractKeywords } from '@/utils/textUtils';

import { ProfileEmbeddingService } from './profileEmbeddingService';
import { ProfileRepository } from './profileRepository';
import { ProfileTagService } from './profileTagService';


/**
 * Configuration options for ProfileSearchService
 */
export interface ProfileSearchServiceConfig extends BaseSearchServiceConfig {
  /** Whether to include content in search results */
  includeContent?: boolean;
}

/**
 * Dependencies for ProfileSearchService
 */
export interface ProfileSearchServiceDependencies extends BaseSearchServiceDependencies<
  Profile, 
  ProfileRepository,
  ProfileEmbeddingService
> {
  /** Tag service for profile tag operations */
  tagService: ProfileTagService;
  
  /** Context mediator for cross-context communication */
  mediator?: ContextMediator;
}

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

/**
 * Service for finding notes related to a profile
 */
export class ProfileSearchService extends BaseSearchService<Profile, ProfileRepository, ProfileEmbeddingService> {
  /**
   * Singleton instance of ProfileSearchService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ProfileSearchService | null = null;
  
  /**
   * The tag service for profile tag operations
   * This is specific to ProfileSearchService, not in the base class
   */
  private tagService: ProfileTagService;
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param config Optional configuration options
   * @returns The singleton instance
   */
  public static getInstance(config?: ProfileSearchServiceConfig): ProfileSearchService {
    if (!ProfileSearchService.instance) {
      // Create with defaults
      const dependencies: ProfileSearchServiceDependencies = {
        repository: ProfileRepository.getInstance(),
        embeddingService: ProfileEmbeddingService.getInstance(),
        tagService: ProfileTagService.getInstance(),
        logger: Logger.getInstance({ silent: process.env.NODE_ENV === 'test' }),
      };
      
      ProfileSearchService.instance = new ProfileSearchService(
        { entityName: 'profile', ...config },
        dependencies,
      );
      
      dependencies.logger?.debug?.('ProfileSearchService singleton instance created');
    } else if (config) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
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
   * @param config Configuration options
   * @param dependencies Service dependencies
   * @returns A new ProfileSearchService instance
   */
  public static createFresh(
    config: ProfileSearchServiceConfig,
    dependencies: ProfileSearchServiceDependencies,
  ): ProfileSearchService {
    const logger = dependencies.logger || Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ProfileSearchService instance');
    
    return new ProfileSearchService(config, dependencies);
  }

  /**
   * Create a new ProfileSearchService with injected dependencies
   * 
   * This is an alias for createFresh() to maintain consistency with other services
   * that implement the Component Interface Standardization pattern.
   * 
   * @param config Configuration options
   * @param dependencies Service dependencies
   * @returns A new ProfileSearchService instance
   */
  public static createWithDependencies(
    config: ProfileSearchServiceConfig,
    dependencies: ProfileSearchServiceDependencies,
  ): ProfileSearchService {
    return ProfileSearchService.createFresh(config, dependencies);
  }

  /**
   * Create a new ProfileSearchService with injected dependencies
   * 
   * While this constructor is private, it is used by the static factory methods.
   * Use getInstance(), createFresh(), or createWithDependencies() instead of calling this directly.
   * 
   * @param config Configuration options
   * @param dependencies Service dependencies
   */
  private constructor(
    config: ProfileSearchServiceConfig,
    dependencies: ProfileSearchServiceDependencies,
  ) {
    super(config, dependencies);
    
    // Set the tag service from dependencies
    this.tagService = dependencies.tagService;
    
    // Store the mediator if provided
    this.mediator = dependencies.mediator;
    
    this.logger.debug('ProfileSearchService instance created');
  }
  
  /** Context mediator for cross-context communication */
  private mediator?: ContextMediator;
  

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
  protected override async keywordSearch(
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
  protected override async semanticSearch(
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
  public override async findRelated(_profileId: string, _maxResults = 5): Promise<Profile[]> {
    // This method doesn't make sense for profiles since there's only one
    return [];
  }

  /**
   * Find notes related to the profile using tags or embeddings
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findRelatedNotes(limit = 5): Promise<NoteWithSimilarity[]> {
    // Check if we have a mediator
    if (!this.mediator) {
      this.logger.error('Cannot find related notes: No mediator available for cross-context communication');
      return [];
    }
    
    const profile = await this.repository.getProfile();
    if (!profile) {
      return [];
    }

    // Try to find notes based on tags if available
    if (profile.tags?.length) {
      try {
        // Create a data request for notes with similar tags
        const tagRequest = MessageFactory.createDataRequest(
          ContextId.PROFILE, 
          ContextId.NOTES,
          DataRequestType.NOTES_SEARCH,
          {
            tags: profile.tags,
            limit: limit,
          },
        );
        
        // Send the request via mediator
        const tagResponse = await this.mediator.sendRequest(tagRequest);
        
        // Check if we got a successful response with notes
        if (tagResponse.status === 'success' && tagResponse.data && 
            'notes' in tagResponse.data && Array.isArray(tagResponse.data['notes']) && 
            tagResponse.data['notes'].length > 0) {
          return tagResponse.data['notes'] as NoteWithSimilarity[];
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
        // Use the profile text instead of raw embedding for better semantic understanding
        const profileText = this.tagService.prepareProfileTextForEmbedding(profile);
        
        // Create a data request for semantic search
        const semanticRequest = MessageFactory.createDataRequest(
          ContextId.PROFILE, 
          ContextId.NOTES,
          DataRequestType.NOTES_SEMANTIC_SEARCH,
          {
            text: profileText,
            limit: limit,
          },
        );
        
        // Send the request via mediator
        const semanticResponse = await this.mediator.sendRequest(semanticRequest);
        
        // Check if we got a successful response with notes
        if (semanticResponse.status === 'success' && semanticResponse.data && 
            'notes' in semanticResponse.data && Array.isArray(semanticResponse.data['notes']) && 
            semanticResponse.data['notes'].length > 0) {
          return semanticResponse.data['notes'] as NoteWithSimilarity[];
        }
      }

      // Otherwise fall back to keyword search
      const keywords = this.extractKeywords(this.tagService.prepareProfileTextForEmbedding(profile));
      
      // Create a data request for keyword search
      const keywordRequest = MessageFactory.createDataRequest(
        ContextId.PROFILE, 
        ContextId.NOTES,
        DataRequestType.NOTES_SEARCH,
        {
          query: keywords.slice(0, 10).join(' '), // Use top 10 keywords
          limit: limit,
        },
      );
      
      // Send the request via mediator
      const keywordResponse = await this.mediator.sendRequest(keywordRequest);
      
      // Check if we got a successful response with notes
      if (keywordResponse.status === 'success' && keywordResponse.data && 
          'notes' in keywordResponse.data && Array.isArray(keywordResponse.data['notes']) && 
          keywordResponse.data['notes'].length > 0) {
        return keywordResponse.data['notes'] as NoteWithSimilarity[];
      }
      
      return [];
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
   * @param profileTags The profile tags to match against
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findNotesWithSimilarTags(
    profileTags: string[],
    limit = 5,
  ): Promise<NoteWithSimilarity[]> {
    // Check if we have a mediator
    if (!this.mediator) {
      this.logger.error('Cannot find notes with similar tags: No mediator available for cross-context communication');
      return [];
    }
    
    if (!profileTags?.length) {
      return [];
    }

    try {
      // Create a data request for notes with specific tags
      const tagsRequest = MessageFactory.createDataRequest(
        ContextId.PROFILE, 
        ContextId.NOTES,
        DataRequestType.NOTES_SEARCH,
        {
          tags: profileTags,
          limit: 100, // Get more notes to score and filter
          includeContent: false,
        },
      );
      
      // Send the request via mediator
      const tagsResponse = await this.mediator.sendRequest(tagsRequest);
      
      // Check if we got a successful response with notes
      if (tagsResponse.status !== 'success' || !tagsResponse.data || 
          !('notes' in tagsResponse.data) || !Array.isArray(tagsResponse.data['notes']) || 
          tagsResponse.data['notes'].length === 0) {
        return [];
      }
      
      const allNotes = tagsResponse.data['notes'] as NoteWithSimilarity[];
      
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
            similarity: matchCount / Math.max(noteTags.length, profileTags.length), // Normalize to 0-1 range
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
        .map(({ tagScore, matchRatio, ...note }) => note);

      return sortedNotes.slice(0, limit);
    } catch (error) {
      this.logger.error('Error finding notes with similar tags:', { 
        error: error instanceof Error ? error.message : String(error),
        context: 'ProfileSearchService',
      });
      return [];
    }
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