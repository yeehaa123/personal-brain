/**
 * ProfileContext implementation using the BaseContext architecture
 * 
 * This version extends BaseContext to ensure consistent behavior
 * with other context implementations.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance 
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { BaseContext } from '@/contexts/core/baseContext';
import type { StorageInterface } from '@/contexts/core/storageInterface';
import type { 
  Profile,
} from '@/models/profile';
import type {
  ProfileEmbeddingService,
  ProfileRepository,
  ProfileSearchService,
  ProfileTagService,
} from '@/services/profiles';
import { ServiceRegistry } from '@/services/serviceRegistry';
import { Logger } from '@/utils/logger';


import { ProfileStorageAdapter } from './profileStorageAdapter';
import { ProfileFormatter } from './formatters/profileFormatter';
import type { NoteContext, NoteWithSimilarity, ProfileFormattingOptions } from './profileTypes';

/**
 * Configuration for the ProfileContext
 */
export interface ProfileContextConfig {
  /**
   * API key for embedding service
   */
  apiKey?: string;
  
  /**
   * Name for the context (defaults to 'ProfileBrain')
   */
  name?: string;
  
  /**
   * Version for the context (defaults to '1.0.0')
   */
  version?: string;
}

/**
 * Context for working with user profiles
 * 
 * Acts as a facade for profile-related operations, coordinating between
 * services, repositories, and MCP components.
 */
export class ProfileContext extends BaseContext {
  /** Logger instance - overrides the protected one from BaseContext */
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  // Storage adapter and formatter
  private storage: StorageInterface<Profile>;
  private formatter: ProfileFormatter;
  
  // Optional note context for related note operations
  private noteContext?: NoteContext;
  
  // Singleton instance
  private static instance: ProfileContext | null = null;
  
  /**
   * Get singleton instance of ProfileContext
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  static override getInstance(options: ProfileContextConfig = {}): ProfileContext {
    if (!ProfileContext.instance) {
      ProfileContext.instance = ProfileContext.createWithDependencies(options);
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileContext singleton instance created');
    } else if (Object.keys(options).length > 0) {
      // Log at debug level if trying to get instance with different config
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
    }
    
    return ProfileContext.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  static override resetInstance(): void {
    if (ProfileContext.instance) {
      // Any cleanup needed before destroying the instance
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileContext singleton instance reset');
      
      ProfileContext.instance = null;
    }
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new ProfileContext instance
   */
  static override createFresh(options: ProfileContextConfig = {}): ProfileContext {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ProfileContext instance');
    
    return ProfileContext.createWithDependencies(options);
  }

  /**
   * Factory method for creating an instance with dependencies from ServiceRegistry
   * 
   * @param config Configuration options
   * @returns A new ProfileContext instance with resolved dependencies
   */
  public static createWithDependencies(config: ProfileContextConfig = {}): ProfileContext {
    const serviceRegistry = ServiceRegistry.getInstance({
      apiKey: config.apiKey,
    });
    
    const repository = serviceRegistry.getProfileRepository() as ProfileRepository;
    const embeddingService = serviceRegistry.getProfileEmbeddingService() as ProfileEmbeddingService; 
    const tagService = serviceRegistry.getProfileTagService();
    const searchService = serviceRegistry.getProfileSearchService() as ProfileSearchService;
    
    return new ProfileContext(
      config,
      repository,
      embeddingService,
      tagService,
      searchService,
    );
  }

  /**
   * Constructor for ProfileContext with explicit dependency injection
   * 
   * @param config Configuration for the context
   * @param repository Profile repository instance
   * @param embeddingService Profile embedding service instance
   * @param tagService Profile tag service instance
   * @param searchService Profile search service instance
   */
  constructor(
    config: ProfileContextConfig,
    private readonly repository: ProfileRepository,
    private readonly embeddingService: ProfileEmbeddingService,
    private readonly tagService: ProfileTagService, 
    private readonly searchService: ProfileSearchService,
  ) {
    super(config as Record<string, unknown>);
    
    // Initialize storage adapter
    this.storage = new ProfileStorageAdapter(this.repository);
    
    // Initialize formatter
    this.formatter = new ProfileFormatter();
    
    this.logger.debug('ProfileContext initialized with dependency injection', { context: 'ProfileContext' });
  }

  /**
   * Get the context name
   * @returns The name of this context
   */
  override getContextName(): string {
    return (this.config['name'] as string) || 'ProfileBrain';
  }
  
  /**
   * Get the context version
   * @returns The version of this context
   */
  override getContextVersion(): string {
    return (this.config['version'] as string) || '1.0.0';
  }
  
  /**
   * Initialize MCP components
   */
  protected override initializeMcpComponents(): void {
    // Register profile resource
    this.resources.push({
      protocol: 'profile',
      path: 'get',
      handler: async () => {
        const profile = await this.getProfile();
        return { profile };
      },
      name: 'Get Profile',
      description: 'Retrieve the user profile',
    });
    
    // Register profile tools
    this.tools.push({
      protocol: 'profile',
      path: 'update',
      handler: async (params: Record<string, unknown>) => {
        const profileData = params['profile'] as Partial<Profile>;
        if (!profileData) {
          throw new Error('Profile data is required');
        }
        
        const existingProfile = await this.getProfile();
        let result;
        
        if (existingProfile) {
          await this.updateProfile(profileData);
          result = { success: true, action: 'updated' };
        } else {
          // Add required fullName field if it doesn't exist
          const profileWithName = {
            ...profileData,
            fullName: profileData.fullName || 'New User',
          };
          const id = await this.saveProfile(profileWithName);
          result = { success: true, action: 'created', id };
        }
        
        return result;
      },
      name: 'Update Profile',
      description: 'Update or create the user profile',
    });
    
    this.tools.push({
      protocol: 'profile',
      path: 'getTags',
      handler: async () => {
        const profile = await this.getProfile();
        return { tags: profile?.tags || [] };
      },
      name: 'Get Profile Tags',
      description: 'Get the tags associated with the profile',
    });
    
    this.tools.push({
      protocol: 'profile',
      path: 'updateTags',
      handler: async (params: Record<string, unknown>) => {
        const forceRegenerate = Boolean(params['forceRegenerate']);
        const tags = await this.updateProfileTags(forceRegenerate);
        return { tags, success: Boolean(tags) };
      },
      name: 'Update Profile Tags',
      description: 'Update or regenerate profile tags',
    });
  }
  
  /**
   * Set the note context for related note operations
   * @param context The note context to use
   */
  setNoteContext(context: NoteContext): void {
    this.noteContext = context;
  }
  
  /**
   * Get the current note context if available
   * @returns The current note context or undefined
   */
  getNoteContext(): NoteContext | undefined {
    return this.noteContext;
  }
  
  /**
   * Format profile for display in a readable text format
   * @param profile The profile to format
   * @param options Optional formatting options
   * @returns A formatted string representation of the profile
   */
  formatProfileForDisplay(profile: Profile, options: ProfileFormattingOptions = {}): string {
    return this.formatter.formatProfileForDisplay(profile, options);
  }

  /**
   * Retrieve the user profile
   * @returns The user profile or undefined if not found
   */
  async getProfile(): Promise<Profile | undefined> {
    try {
      // Use the adapter's getProfile method as a convenience
      return await (this.storage as ProfileStorageAdapter).getProfile();
    } catch (error) {
      this.logger.error('Failed to retrieve profile', { error, context: 'ProfileContext' });
      return undefined;
    }
  }

  /**
   * Create or update the user profile with automatic tag and embedding generation
   * @param profileData The profile data without system fields
   * @returns The ID of the created or updated profile
   */
  async saveProfile(
    profileData: Partial<Profile> & {
      fullName: string;
    },
  ): Promise<string> {
    try {
      // Generate profile text for embedding and tagging
      const profileText = this.embeddingService.getProfileTextForEmbedding(profileData);

      // Generate embedding and tags
      const embedding = await this.embeddingService.generateEmbedding(profileText);
      const tags = await this.tagService.generateProfileTags(profileText);

      if (!embedding || !tags) {
        throw new Error('Failed to generate profile embedding or tags');
      }

      // Check if profile exists
      const existingProfile = await this.getProfile();

      if (existingProfile) {
        // Update existing profile
        const success = await this.storage.update(existingProfile.id, {
          ...profileData,
          embedding,
          tags,
        });

        if (!success) {
          throw new Error('Failed to update profile');
        }

        return existingProfile.id;
      } else {
        // Create new profile
        const newProfile = {
          ...profileData,
          embedding,
          tags,
        } as Partial<Profile>;

        return this.storage.create(newProfile);
      }
    } catch (error) {
      this.logger.error('Failed to save profile', { error, context: 'ProfileContext' });
      throw error;
    }
  }

  /**
   * Update partial profile data with automatic embedding regeneration when needed
   * @param profileData The partial profile data to update
   */
  async updateProfile(profileData: Partial<Profile>): Promise<void> {
    const existingProfile = await this.getProfile();

    if (!existingProfile) {
      throw new Error('No profile exists to update');
    }

    // If profile content is being updated, regenerate the embedding
    if (this.embeddingService.shouldRegenerateEmbedding(profileData)) {
      const updatedProfile = { ...existingProfile, ...profileData };
      const profileText = this.embeddingService.getProfileTextForEmbedding(updatedProfile);
      const embedding = await this.embeddingService.generateEmbedding(profileText);

      if (embedding?.length) {
        profileData.embedding = embedding;
      }
    }

    // Update the profile with all changes
    const success = await this.storage.update(existingProfile.id, profileData);
    
    if (!success) {
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Generate or update embeddings for the profile
   * @returns Status of the update operation
   */
  async generateEmbeddingForProfile(): Promise<{ updated: boolean }> {
    return this.embeddingService.generateEmbeddingForProfile();
  }

  /**
   * Update or generate tags for an existing profile
   * @param forceRegenerate Whether to force regeneration of tags
   * @returns The updated tags or null if operation failed
   */
  async updateProfileTags(forceRegenerate = false): Promise<string[] | null> {
    return this.tagService.updateProfileTags(forceRegenerate);
  }

  /**
   * Find notes related to the profile using tags or embeddings
   * @param noteContext The NoteContext for searching notes
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findRelatedNotes(noteContext: NoteContext, limit = 5): Promise<NoteWithSimilarity[]> {
    const notes = await this.searchService.findRelatedNotes(noteContext, limit);
    // Ensure proper type casting
    return notes.map(note => ({
      ...note,
      embedding: note.embedding || null, // Ensure embedding is null, not undefined
    }));
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
  ): Promise<NoteWithSimilarity[]> {
    const notes = await this.searchService.findNotesWithSimilarTags(noteContext, profileTags, limit);
    // Ensure proper type casting
    return notes.map(note => ({
      ...note,
      embedding: note.embedding || null, // Ensure embedding is null, not undefined
    }));
  }

  /**
   * Extract keywords from profile to use for searching notes
   * @param profile The profile to extract keywords from
   * @returns Array of extracted keywords
   */
  extractProfileKeywords(profile: Partial<Profile>): string[] {
    return this.tagService.extractProfileKeywords(profile);
  }

  /**
   * Prepare profile text for embedding
   * @param profile The profile data
   * @returns Formatted text for embedding generation
   */
  getProfileTextForEmbedding(profile: Partial<Profile>): string {
    return this.embeddingService.getProfileTextForEmbedding(profile);
  }
}