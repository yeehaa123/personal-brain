/**
 * ProfileMcpTools
 * 
 * Responsible for registering and handling MCP tools related to profiles
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import logger from '@/utils/logger';

import type { IProfileContext } from '../types/profileContextInterface';
import type { NoteWithSimilarity } from '../types/profileTypes';

/**
 * The ProfileMcpTools class is responsible for registering and handling
 * all MCP tools related to profile functionality
 */
export class ProfileMcpTools {
  /**
   * Reference to the MCP server instance
   */
  private mcpServer: McpServer;
  
  /**
   * Reference to the parent ProfileContext for handling business logic
   */
  private profileContext: IProfileContext;
  
  /**
   * Creates a new ProfileMcpTools instance
   * 
   * @param server - MCP server instance for registering tools
   * @param profileContext - Parent context that handles business logic
   */
  constructor(server: McpServer, profileContext: IProfileContext) {
    this.mcpServer = server;
    this.profileContext = profileContext;
  }
  
  /**
   * Registers all profile-related tools with the MCP server
   */
  registerTools(): void {
    this.registerSaveProfileTool();
    this.registerUpdateProfileTagsTool();
    this.registerGenerateProfileEmbeddingTool();
    this.registerFindRelatedNotesTool();
    
    logger.debug('Registered profile MCP tools');
  }
  
  /**
   * Registers the 'save_profile' tool for creating or updating a user profile
   * with automatic tag and embedding generation
   */
  private registerSaveProfileTool(): void {
    this.mcpServer.tool(
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
          const profileId = await this.profileContext.saveProfile(args);
          
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
  }
  
  /**
   * Registers the 'update_profile_tags' tool for updating or generating tags
   * for an existing profile
   */
  private registerUpdateProfileTagsTool(): void {
    this.mcpServer.tool(
      'update_profile_tags',
      'Update or generate tags for an existing profile',
      {
        forceRegenerate: z.boolean().optional(),
      },
      async (args) => {
        try {
          const forceRegenerate = args.forceRegenerate === true;
          const tags = await this.profileContext.updateProfileTags(forceRegenerate);
          
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
  }
  
  /**
   * Registers the 'generate_profile_embedding' tool for generating or updating
   * embeddings for the profile
   */
  private registerGenerateProfileEmbeddingTool(): void {
    this.mcpServer.tool(
      'generate_profile_embedding',
      'Generate or update embeddings for the profile',
      async () => {
        try {
          const result = await this.profileContext.generateEmbeddingForProfile();
          
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
   * Registers the 'find_related_notes' tool for finding notes related to the profile
   * based on semantic similarity
   */
  private registerFindRelatedNotesTool(): void {
    this.mcpServer.tool(
      'find_related_notes',
      'Find notes related to the profile using semantic similarity',
      {
        limit: z.number().optional(),
      },
      async (args) => {
        try {
          const limit = args.limit || 5;
          
          // In a real implementation, we would need to provide a note context
          // This is simplified for demonstration purposes
          const noteContext = this.profileContext.getNoteContext();
          
          if (!noteContext) {
            return {
              content: [{
                type: 'text',
                text: 'No note context available to search for related notes',
              }],
              isError: true,
            };
          }
          
          const relatedNotes = await this.profileContext.findRelatedNotes(noteContext, limit);
          
          if (!relatedNotes || relatedNotes.length === 0) {
            return {
              content: [{
                type: 'text',
                text: 'No related notes found',
              }],
            };
          }
          
          // Format the results
          const formattedNotes = relatedNotes.map((note: NoteWithSimilarity) => 
            `- ${note.title} (Similarity: ${note.similarity ? (note.similarity * 100).toFixed(2) + '%' : 'N/A'})`,
          ).join('\n');
          
          return {
            content: [{
              type: 'text',
              text: `Related notes:\n${formattedNotes}`,
            }],
          };
        } catch (error) {
          logger.error(`Error finding related notes via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to find related notes: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
  }
}