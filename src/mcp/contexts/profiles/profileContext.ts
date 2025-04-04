/**
 * ProfileContext implementation using the Model Context Protocol SDK
 * This provides the same interface as the original ProfileContext but uses MCP SDK internally
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

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


// Import DI container and service registry

// Import service types

// Re-use the NoteWithSimilarity interface from the original implementation
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
 * Context for working with user profiles using MCP SDK
 * This is a drop-in replacement for the original ProfileContext
 */
export class ProfileContext {
  private repository: ProfileRepository;
  private embeddingService: ProfileEmbeddingService;
  private tagService: ProfileTagService;
  private searchService: ProfileSearchService;
  private mcpServer: McpServer;
  
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
    // Register services in the container (service registry handles duplicates)
    const container = getContainer();
    registerServices(container, { apiKey });
    
    // Resolve dependencies from container
    this.repository = getService<ProfileRepository>(ServiceIdentifiers.ProfileRepository);
    this.embeddingService = getService<ProfileEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
    this.tagService = getService<ProfileTagService>(ServiceIdentifiers.ProfileTagService);
    this.searchService = getService<ProfileSearchService>(ServiceIdentifiers.ProfileSearchService);
    
    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'ProfileBrain',
      version: '1.0.0',
    });
    
    // Register MCP resources on our internal server
    this.registerMcpResources();
    
    // Register MCP tools on our internal server
    this.registerMcpTools();
    
    logger.debug('MCP-based ProfileContext initialized with resources and tools');
  }

  /**
   * Get the MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
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
    
    // Register resources and tools on the external server
    this.registerMcpResources(server);
    this.registerMcpTools(server);
    
    logger.debug('ProfileContext registered on external MCP server');
  }

  /**
   * Register MCP resources for accessing profile data
   * @param server Optional external MCP server to register resources on
   */
  registerMcpResources(server?: McpServer): void {
    // Use provided server or internal server
    const targetServer = server || this.mcpServer;
    // Resource to get profile
    targetServer.resource(
      'profile',
      'profile://me',
      async () => {
        try {
          const profile = await this.getProfile();
          
          if (!profile) {
            return {
              contents: [{
                uri: 'profile://me',
                text: 'No profile found',
              }],
            };
          }
          
          // Format profile for display
          const profileText = this.formatProfileForDisplay(profile);
          
          return {
            contents: [{
              uri: 'profile://me',
              text: profileText,
              metadata: {
                id: profile.id,
                tags: profile.tags,
                fullName: profile.fullName,
                occupation: profile.occupation,
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt,
              },
            }],
          };
        } catch (error) {
          logger.error(`Error in profile resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: 'profile://me',
              text: `Error retrieving profile: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
    
    // Resource to get profile keywords
    targetServer.resource(
      'profile_keywords',
      'profile://keywords',
      async () => {
        try {
          const profile = await this.getProfile();
          
          if (!profile) {
            return {
              contents: [{
                uri: 'profile://keywords',
                text: 'No profile found, no keywords available',
              }],
            };
          }
          
          const keywords = this.extractProfileKeywords(profile);
          
          return {
            contents: [{
              uri: 'profile://keywords',
              text: `Keywords extracted from profile:\n${keywords.join(', ')}`,
              metadata: {
                keywords,
              },
            }],
          };
        } catch (error) {
          logger.error(`Error in profile keywords resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: 'profile://keywords',
              text: `Error retrieving profile keywords: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
    
    // Resource to get related notes by embedding
    targetServer.resource(
      'related_notes',
      'profile://related?limit',
      async (uri) => {
        try {
          // We don't need limit parameter yet
          const profile = await this.getProfile();
          
          if (!profile) {
            return {
              contents: [{
                uri: uri.toString(),
                text: 'No profile found, cannot retrieve related notes',
              }],
            };
          }
          
          // We need a note context to perform the search, but MCP doesn't support passing
          // objects directly. In a real implementation, this would be done differently.
          return {
            contents: [{
              uri: uri.toString(),
              text: 'To find related notes, use the find_related_notes tool. This resource is for future compatibility.',
            }],
          };
        } catch (error) {
          logger.error(`Error in related notes resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: uri.toString(),
              text: `Error retrieving related notes: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
  }
  
  /**
   * Register MCP tools for profile operations
   * @param server Optional external MCP server to register tools on
   */
  registerMcpTools(server?: McpServer): void {
    // Use provided server or internal server
    const targetServer = server || this.mcpServer;
    // Tool to save/update profile
    targetServer.tool(
      'save_profile',
      'Create or update a user profile with automatic tag and embedding generation',
      {
        // Required fields
        fullName: z.string(),
        // Optional fields
        publicIdentifier: z.string().nullable().optional(),
        profilePicUrl: z.string().nullable().optional(),
        backgroundCoverImageUrl: z.string().nullable().optional(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        followerCount: z.number().optional(),
        headline: z.string().nullable().optional(),
        occupation: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        countryFullName: z.string().nullable().optional(),
        experiences: z.array(z.any()).nullable().optional(),
        education: z.array(z.any()).nullable().optional(),
        languages: z.array(z.string()).nullable().optional(),
        languagesAndProficiencies: z.array(z.any()).nullable().optional(),
        accomplishmentPublications: z.array(z.any()).nullable().optional(),
        accomplishmentHonorsAwards: z.array(z.any()).nullable().optional(),
        accomplishmentProjects: z.array(z.any()).nullable().optional(),
        volunteerWork: z.array(z.any()).nullable().optional(),
      },
      async (args) => {
        try {
          const profileId = await this.saveProfile(args);
          
          return {
            content: [{
              type: 'text',
              text: `Profile saved with ID: ${profileId}`,
            }],
          };
        } catch (error) {
          logger.error(`Error saving profile via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to save profile: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
    
    // Tool to update profile tags
    targetServer.tool(
      'update_profile_tags',
      'Update or generate tags for an existing profile',
      {
        forceRegenerate: z.boolean().optional(),
      },
      async (args) => {
        try {
          const forceRegenerate = args.forceRegenerate === true;
          const tags = await this.updateProfileTags(forceRegenerate);
          
          if (!tags) {
            return {
              content: [{
                type: 'text',
                text: 'Failed to update profile tags',
              }],
              isError: true,
            };
          }
          
          return {
            content: [{
              type: 'text',
              text: `Profile tags updated: ${tags.join(', ')}`,
            }],
          };
        } catch (error) {
          logger.error(`Error updating profile tags via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to update profile tags: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
    
    // Tool to generate embeddings for the profile
    targetServer.tool(
      'generate_profile_embedding',
      'Generate or update embeddings for the profile',
      async () => {
        try {
          const result = await this.generateEmbeddingForProfile();
          
          return {
            content: [{
              type: 'text',
              text: result.updated 
                ? 'Profile embedding successfully updated' 
                : 'Profile embedding update failed or was not needed',
            }],
          };
        } catch (error) {
          logger.error(`Error generating profile embedding via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to generate profile embedding: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Format profile for display in a readable text format
   * @param profile The profile to format
   * @returns A formatted string representation of the profile
   */
  private formatProfileForDisplay(profile: Profile): string {
    const parts: string[] = [];
    
    // Add title
    parts.push(`# ${profile.fullName || 'Profile'}`);
    parts.push('');
    
    // Add basic information
    if (profile.headline) parts.push(`**${profile.headline}**`);
    if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
    
    // Add location
    const location = [profile.city, profile.state, profile.countryFullName]
      .filter(Boolean)
      .join(', ');
    if (location) parts.push(`Location: ${location}`);
    
    // Add tags
    if (profile.tags && profile.tags.length > 0) {
      parts.push(`\nTags: ${profile.tags.map(tag => `#${tag}`).join(' ')}`);
    }
    
    // Add summary
    if (profile.summary) {
      parts.push('\n## Summary');
      parts.push(profile.summary);
    }
    
    // Add experiences
    if (profile.experiences && profile.experiences.length > 0) {
      parts.push('\n## Experience');
      profile.experiences.forEach(exp => {
        parts.push(`### ${exp.title} at ${exp.company}`);
        
        // Format dates
        const startDate = this.formatDate(exp.starts_at);
        const endDate = exp.ends_at ? this.formatDate(exp.ends_at) : 'Present';
        parts.push(`${startDate} - ${endDate}`);
        
        if (exp.location) parts.push(`Location: ${exp.location}`);
        if (exp.description) parts.push(`\n${exp.description}`);
        parts.push('');
      });
    }
    
    // Add education
    if (profile.education && profile.education.length > 0) {
      parts.push('\n## Education');
      profile.education.forEach(edu => {
        const degree = edu.degree_name ? `${edu.degree_name}, ` : '';
        const field = edu.field_of_study || '';
        parts.push(`### ${degree}${field}`);
        parts.push(`${edu.school}`);
        
        // Format dates
        const startDate = this.formatDate(edu.starts_at);
        const endDate = edu.ends_at ? this.formatDate(edu.ends_at) : 'Present';
        parts.push(`${startDate} - ${endDate}`);
        
        if (edu.grade) parts.push(`Grade: ${edu.grade}`);
        if (edu.activities_and_societies) parts.push(`Activities: ${edu.activities_and_societies}`);
        if (edu.description) parts.push(`\n${edu.description}`);
        parts.push('');
      });
    }
    
    // Add publications
    if (profile.accomplishmentPublications && profile.accomplishmentPublications.length > 0) {
      parts.push('\n## Publications');
      profile.accomplishmentPublications.forEach(pub => {
        parts.push(`### ${pub.name}`);
        parts.push(`Published by ${pub.publisher}, ${this.formatDate(pub.published_on)}`);
        if (pub.description) parts.push(`\n${pub.description}`);
        if (pub.url) parts.push(`URL: ${pub.url}`);
        parts.push('');
      });
    }
    
    // Add projects
    if (profile.accomplishmentProjects && profile.accomplishmentProjects.length > 0) {
      parts.push('\n## Projects');
      profile.accomplishmentProjects.forEach(proj => {
        parts.push(`### ${proj.title}`);
        
        // Format dates
        const startDate = this.formatDate(proj.starts_at);
        const endDate = proj.ends_at ? this.formatDate(proj.ends_at) : 'Present';
        parts.push(`${startDate} - ${endDate}`);
        
        if (proj.description) parts.push(`\n${proj.description}`);
        if (proj.url) parts.push(`URL: ${proj.url}`);
        parts.push('');
      });
    }
    
    // Add awards
    if (profile.accomplishmentHonorsAwards && profile.accomplishmentHonorsAwards.length > 0) {
      parts.push('\n## Awards');
      profile.accomplishmentHonorsAwards.forEach(award => {
        parts.push(`### ${award.title}`);
        parts.push(`Issued by ${award.issuer}, ${this.formatDate(award.issued_on)}`);
        if (award.description) parts.push(`\n${award.description}`);
        parts.push('');
      });
    }
    
    return parts.join('\n');
  }
  
  /**
   * Format date for display
   * @param date The date info to format
   * @returns A formatted date string
   */
  private formatDate(date: { year: number | null; month: number | null; day: number | null }): string {
    if (!date || !date.year) return 'Unknown date';
    
    let result = '';
    
    if (date.month) {
      const month = new Date(0, date.month - 1).toLocaleString('default', { month: 'short' });
      result += month + ' ';
      
      if (date.day) {
        result += date.day + ', ';
      }
    }
    
    result += date.year;
    
    return result;
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
    // Use a more specific type that allows optional fields with null values
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
        // Create profile with proper type casting for compatibility
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
    return this.searchService.findRelatedNotes(noteContext, limit);
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
    return this.searchService.findNotesWithSimilarTags(noteContext, profileTags, limit);
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