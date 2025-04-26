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

import { BaseContext } from '@/contexts/baseContext';
import type { 
  ContextDependencies,
  ContextInterface,
} from '@/contexts/contextInterface';
import type { FormatterInterface } from '@/contexts/formatterInterface';
import type { StorageInterface } from '@/contexts/storageInterface';
import type { 
  Profile,
} from '@/models/profile';
import { 
  ProfileEmbeddingService,
  ProfileRepository,
  ProfileSearchService,
  ProfileTagService,
} from '@/services/profiles';
import { ServiceRegistry } from '@/services/serviceRegistry';
import { Logger } from '@/utils/logger';


import { ProfileFormatter } from './formatters/profileFormatter';
import { ProfileStorageAdapter } from './profileStorageAdapter';
import type { NoteContext, NoteWithSimilarity, ProfileFormattingOptions } from './profileTypes';

/**
 * Configuration for the ProfileContext
 */
export interface ProfileContextConfig extends Record<string, unknown> {
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
 * Dependencies for ProfileContext
 */
export interface ProfileContextDependencies {
  /** Profile repository instance */
  repository: ProfileRepository;
  /** Profile embedding service instance */
  embeddingService: ProfileEmbeddingService;
  /** Profile tag service instance */
  tagService: ProfileTagService;
  /** Profile search service instance */
  searchService: ProfileSearchService;
  /** Optional storage adapter (will be created if not provided) */
  storageAdapter?: ProfileStorageAdapter;
}

/**
 * Context for working with user profiles
 * 
 * Acts as a facade for profile-related operations, coordinating between
 * services, repositories, and MCP components.
 * 
 * Implements the standardized interfaces:
 * - StorageAccess: For accessing profile storage operations
 * - FormatterAccess: For formatting profile data
 * - ServiceAccess: For accessing profile-related services
 */
export class ProfileContext extends BaseContext<
  ProfileStorageAdapter,
  ProfileFormatter,
  Profile,
  string
> implements ContextInterface<
  ProfileStorageAdapter,
  ProfileFormatter,
  Profile,
  string
> {
  /** Logger instance - overrides the protected one from BaseContext */
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  // Storage adapter and formatter
  private storage: ProfileStorageAdapter;
  private formatter: ProfileFormatter;
  
  // Optional note context for related note operations
  private noteContext?: NoteContext;
  
  // Service dependencies
  private readonly embeddingService: ProfileEmbeddingService;
  private readonly tagService: ProfileTagService;
  private readonly searchService: ProfileSearchService;
  
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
      // Prepare config with defaults
      const config = options || {};
      
      // Use the config directly - ProfileContextConfig extends Record<string, unknown>
      ProfileContext.instance = ProfileContext.createWithDependencies(config);
      
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
    
    // Prepare config with defaults
    const config = options || {};
    
    // Use the config directly - ProfileContextConfig extends Record<string, unknown>
    return ProfileContext.createWithDependencies(config);
  }

  /**
   * Factory method for creating an instance with explicit dependencies
   * This implementation matches the BaseContext abstract method signature
   * 
   * @param config Configuration options object
   * @param dependencies Optional dependencies for the context
   * @returns A new ProfileContext instance with the provided dependencies
   */
  public static override createWithDependencies<
    TStorage extends StorageInterface<unknown, unknown>,
    TFormatter extends FormatterInterface<unknown, unknown>
  >(
    config: Record<string, unknown> = {},
    dependencies?: ContextDependencies<TStorage, TFormatter>,
  ): ProfileContext {
    // Convert the generic config to our specific config type
    const profileConfig: ProfileContextConfig = {
      name: config['name'] as string || 'ProfileBrain',
      version: config['version'] as string || '1.0.0',
      apiKey: config['apiKey'] as string,
    };
    
    // If dependencies are provided, use them with proper casting
    if (dependencies) {
      // Get the repository from the storage adapter or create one
      const typedStorage = dependencies.storage as unknown as ProfileStorageAdapter;
      const repository = typedStorage?.repository || ProfileRepository.getInstance();
      
      // Create service instances from registry or defaults
      const serviceRegistry = (dependencies.registry || ServiceRegistry.getInstance()) as ServiceRegistry;
      const embeddingService = serviceRegistry.getProfileEmbeddingService() as unknown as ProfileEmbeddingService;
      const tagService = serviceRegistry.getProfileTagService() as unknown as ProfileTagService;
      const searchService = serviceRegistry.getProfileSearchService() as unknown as ProfileSearchService;
      
      // Create context with provided dependencies
      return new ProfileContext(
        profileConfig,
        {
          repository,
          embeddingService,
          tagService,
          searchService,
          storageAdapter: typedStorage,
        },
      );
    } else {
      // No dependencies provided, create from config
      // Create embedding service first, it will be needed by other components
      const embeddingService = ProfileEmbeddingService.getInstance();
      
      // Create repository
      const repository = ProfileRepository.getInstance();
      
      // Create tag service
      const tagService = ProfileTagService.getInstance();
      
      // Create search service with explicit dependencies using the updated interface
      const searchService = ProfileSearchService.createWithDependencies(
        { entityName: 'profile' },
        {
          repository,
          embeddingService,
          tagService,
        },
      );
      
      // Create storage adapter with explicit repository dependency
      const storageAdapter = ProfileStorageAdapter.createWithDependencies({
        repository,
      });
      
      // Create and return the context with explicit dependencies
      return new ProfileContext(
        profileConfig,
        {
          repository,
          embeddingService,
          tagService,
          searchService,
          storageAdapter,
        },
      );
    }
  }
  
  /**
   * Constructor for ProfileContext with explicit dependency injection
   * 
   * @param config Configuration for the context
   * @param dependencies Service dependencies for the context
   */
  constructor(
    config: ProfileContextConfig,
    dependencies: ProfileContextDependencies,
  ) {
    super(config as Record<string, unknown>);
    
    // Store dependencies
    this.embeddingService = dependencies.embeddingService;
    this.tagService = dependencies.tagService;
    this.searchService = dependencies.searchService;
    
    // Initialize storage adapter (use provided one or create new one with the repository)
    this.storage = dependencies.storageAdapter || 
      ProfileStorageAdapter.createWithDependencies({ repository: dependencies.repository });
    
    // Initialize formatter
    this.formatter = ProfileFormatter.getInstance();
    
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
   * Get the search service
   * @returns The ProfileSearchService instance
   */
  getSearchService(): ProfileSearchService {
    return this.searchService;
  }
  
  /**
   * Get the storage adapter
   * Implements StorageAccess interface
   * @returns The storage adapter
   */
  override getStorage(): ProfileStorageAdapter {
    return this.storage;
  }
  
  /**
   * Get the formatter
   * Implements FormatterAccess interface
   * @returns The formatter
   */
  override getFormatter(): ProfileFormatter {
    return this.formatter;
  }
  
  /**
   * Get a service by type from the registry
   * Implements ServiceAccess interface
   * @param serviceType Type of service to retrieve
   * @returns Service instance
   */
  override getService<T>(serviceType: new () => T): T {
    // Simple implementation that doesn't actually use the serviceType parameter
    // This handles the common cases for ProfileContext services
    
    if (serviceType.name === 'ProfileEmbeddingService') {
      return this.embeddingService as unknown as T;
    }
    
    if (serviceType.name === 'ProfileTagService') {
      return this.tagService as unknown as T;
    }
    
    if (serviceType.name === 'ProfileSearchService') {
      return this.searchService as unknown as T;
    }
    
    if (serviceType.name === 'ProfileRepository') {
      return ProfileRepository.getInstance() as unknown as T;
    }
    
    throw new Error(`Service not found: ${serviceType.name}`);
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by FullContextInterface
   * @returns The singleton instance
   */
  getInstance(): ProfileContext {
    return ProfileContext.getInstance();
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by FullContextInterface
   */
  resetInstance(): void {
    ProfileContext.resetInstance();
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by FullContextInterface
   * @param options Optional configuration
   * @returns A new instance
   */
  createFresh(options?: Record<string, unknown>): ProfileContext {
    return ProfileContext.createFresh(options as ProfileContextConfig);
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by ExtendedContextInterface
   * @param config Configuration options
   * @param dependencies Optional dependencies for the context
   * @returns A new instance with the provided dependencies
   */
  createWithDependencies<
    TStorage extends StorageInterface<unknown, unknown>,
    TFormatter extends FormatterInterface<unknown, unknown>
  >(
    config: Record<string, unknown>,
    dependencies?: ContextDependencies<TStorage, TFormatter>,
  ): ProfileContext {
    return ProfileContext.createWithDependencies(config, dependencies);
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
   * @param limit Maximum number of results to return
   * @returns Array of notes with similarity information
   */
  async findRelatedNotes(limit = 5): Promise<NoteWithSimilarity[]> {
    const notes = await this.searchService.findRelatedNotes(limit);
    // Ensure proper type casting
    return notes.map(note => ({
      ...note,
      embedding: note.embedding || null, // Ensure embedding is null, not undefined
    }));
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
    const notes = await this.searchService.findNotesWithSimilarTags(profileTags, limit);
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