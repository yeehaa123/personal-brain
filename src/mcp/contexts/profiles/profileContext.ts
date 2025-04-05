/**
 * ProfileContext implementation for the Personal Brain
 * Refactored version using a modular architecture
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { 
  Profile, 
  ProfileAward, 
  ProfileEducation,
  ProfileExperience,
  ProfileLanguageProficiency,
  ProfileProject,
  ProfilePublication,
  ProfileVolunteerWork,
} from '@/models/profile';
import type {
  ProfileEmbeddingService,
  ProfileRepository,
  ProfileSearchService,
  ProfileTagService,
} from '@/services/profiles';
import { registerServices, ServiceIdentifiers } from '@/services/serviceRegistry';
import { getContainer, getService } from '@/utils/dependencyContainer';
import logger from '@/utils/logger';

import { ProfileFormatter } from './formatters/profileFormatter';
import { ProfileMcpResources } from './mcp/profileMcpResources';
import { ProfileMcpTools } from './mcp/profileMcpTools';
import type { IProfileContext } from './types/profileContextInterface';
import type { NoteContext, NoteWithSimilarity } from './types/profileTypes';

/**
 * Context for working with user profiles
 * 
 * Acts as a facade for profile-related operations, coordinating between
 * services, repositories, and MCP components.
 */
export class ProfileContext implements IProfileContext {
  private repository: ProfileRepository;
  private embeddingService: ProfileEmbeddingService;
  private tagService: ProfileTagService;
  private searchService: ProfileSearchService;
  private mcpServer: McpServer;
  private formatter: ProfileFormatter;
  private mcpResources: ProfileMcpResources;
  private mcpTools: ProfileMcpTools;
  
  // Optional note context for related note operations
  private noteContext?: NoteContext;
  
  // Singleton instance
  private static instance: ProfileContext | null = null;
  
  /**
   * Get singleton instance of ProfileContext
   * @param apiKey Optional API key for embedding service 
   * @param forceNew Create a new instance (for testing)
   * @returns The ProfileContext instance
   */
  public static getInstance(apiKey?: string, forceNew = false): ProfileContext {
    if (!ProfileContext.instance || forceNew) {
      ProfileContext.instance = new ProfileContext(apiKey);
    }
    return ProfileContext.instance;
  }
  
  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    ProfileContext.instance = null;
  }

  /**
   * Create a new ProfileContext
   * @param apiKey Optional API key for embedding service
   */
  constructor(apiKey?: string) {
    // Register services in the container
    const container = getContainer();
    registerServices(container, { apiKey });
    
    // Resolve dependencies from container
    this.repository = getService<ProfileRepository>(ServiceIdentifiers.ProfileRepository);
    this.embeddingService = getService<ProfileEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
    this.tagService = getService<ProfileTagService>(ServiceIdentifiers.ProfileTagService);
    this.searchService = getService<ProfileSearchService>(ServiceIdentifiers.ProfileSearchService);
    
    // Initialize formatter
    this.formatter = new ProfileFormatter();
    
    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'ProfileBrain',
      version: '1.0.0',
    });
    
    // Initialize MCP components
    this.mcpResources = new ProfileMcpResources(this.mcpServer, this);
    this.mcpTools = new ProfileMcpTools(this.mcpServer, this);
    
    // Register MCP resources and tools
    this.mcpResources.registerResources();
    this.mcpTools.registerTools();
    
    logger.debug('ProfileContext initialized with modular components');
  }

  /**
   * Get the MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
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
   * Register all MCP resources and tools on an external server
   * @param server The MCP server to register on
   */
  registerOnServer(server: McpServer): void {
    if (!server) {
      logger.warn('Cannot register ProfileContext on undefined server');
      return;
    }
    
    // Create new MCP components with the external server
    const externalMcpResources = new ProfileMcpResources(server, this);
    const externalMcpTools = new ProfileMcpTools(server, this);
    
    // Register on the external server
    externalMcpResources.registerResources();
    externalMcpTools.registerTools();
    
    logger.debug('ProfileContext registered on external MCP server');
  }

  /**
   * Format profile for display in a readable text format
   * @param profile The profile to format
   * @param options Optional formatting options
   * @returns A formatted string representation of the profile
   */
  formatProfileForDisplay(profile: Profile, options = {}): string {
    return this.formatter.formatProfileForDisplay(profile, options);
  }

  /**
   * Retrieve the user profile
   * @returns The user profile or undefined if not found
   */
  async getProfile(): Promise<Profile | undefined> {
    return this.repository.getProfile();
  }

  /**
   * Create or update the user profile with automatic tag and embedding generation
   * @param profileData The profile data without system fields
   * @returns The ID of the created or updated profile
   */
  async saveProfile(
    profileData: {
      fullName: string;
      publicIdentifier?: string | null;
      profilePicUrl?: string | null;
      backgroundCoverImageUrl?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      followerCount?: number;
      headline?: string | null;
      occupation?: string | null;
      summary?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      countryFullName?: string | null;
      experiences?: ProfileExperience[] | null;
      education?: ProfileEducation[] | null;
      languages?: string[] | null;
      languagesAndProficiencies?: ProfileLanguageProficiency[] | null;
      accomplishmentPublications?: ProfilePublication[] | null;
      accomplishmentHonorsAwards?: ProfileAward[] | null;
      accomplishmentProjects?: ProfileProject[] | null;
      volunteerWork?: ProfileVolunteerWork[] | null;
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
      const existingProfile = await this.repository.getProfile();

      if (existingProfile) {
        // Update existing profile
        const success = await this.repository.updateProfile(existingProfile.id, {
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
          id: '', // Will be generated by repository
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Profile;

        return this.repository.insertProfile(newProfile);
      }
    } catch (error) {
      logger.error(`Failed to save profile: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update partial profile data with automatic embedding regeneration when needed
   * @param profileData The partial profile data to update
   */
  async updateProfile(profileData: Partial<Profile>): Promise<void> {
    const existingProfile = await this.repository.getProfile();

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
    const success = await this.repository.updateProfile(existingProfile.id, profileData);
    
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