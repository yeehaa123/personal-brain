/**
 * ProfileMcpResources
 * 
 * Responsible for registering and handling MCP resources related to profiles
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import logger from '@/utils/logger';

import type { IProfileContext } from '../types/profileContextInterface';

/**
 * The ProfileMcpResources class is responsible for registering and handling
 * all MCP resources related to profile functionality
 */
export class ProfileMcpResources {
  /**
   * Reference to the MCP server instance
   */
  private mcpServer: McpServer;
  
  /**
   * Reference to the parent ProfileContext for handling business logic
   */
  private profileContext: IProfileContext;
  
  /**
   * Creates a new ProfileMcpResources instance
   * 
   * @param server - MCP server instance for registering resources
   * @param profileContext - Parent context that handles business logic
   */
  constructor(server: McpServer, profileContext: IProfileContext) {
    this.mcpServer = server;
    this.profileContext = profileContext;
  }
  
  /**
   * Registers all profile-related resources with the MCP server
   */
  registerResources(): void {
    this.mcpServer.resource(
      'profile',
      'profile://me',
      this.handleProfileResource.bind(this),
    );
    
    this.mcpServer.resource(
      'profile_keywords',
      'profile://keywords',
      this.handleProfileKeywordsResource.bind(this),
    );
    
    this.mcpServer.resource(
      'related_notes',
      'profile://related?limit',
      this.handleRelatedNotesResource.bind(this),
    );
    
    logger.debug('Registered profile MCP resources');
  }
  
  /**
   * Handles the 'profile' resource
   * Returns the user profile or an empty response if no profile exists
   */
  private async handleProfileResource() {
    try {
      const profile = await this.profileContext.getProfile();
      
      if (!profile) {
        return {
          contents: [{
            uri: 'profile://me',
            text: 'No profile found',
          }],
        };
      }
      
      // Format profile for display
      const profileText = this.profileContext.formatProfileForDisplay(profile);
      
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
      logger.error('Error in profile resource:', error instanceof Error ? error.message : String(error));
      return {
        contents: [{
          uri: 'profile://me',
          text: `Error retrieving profile: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
  
  /**
   * Handles the 'profile_keywords' resource
   * Returns keywords extracted from the profile or null if no profile exists
   */
  private async handleProfileKeywordsResource() {
    try {
      const profile = await this.profileContext.getProfile();
      
      if (!profile) {
        return {
          contents: [{
            uri: 'profile://keywords',
            text: 'No profile found, no keywords available',
          }],
        };
      }
      
      const keywords = this.profileContext.extractProfileKeywords(profile);
      
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
      logger.error('Error in profile keywords resource:', error instanceof Error ? error.message : String(error));
      return {
        contents: [{
          uri: 'profile://keywords',
          text: `Error retrieving profile keywords: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
  
  /**
   * Handles the 'related_notes' resource
   * Returns notes related to the user profile based on semantic similarity
   */
  private async handleRelatedNotesResource(uri: URL) {
    try {
      // We don't need limit parameter yet but could parse it from the URL
      const limitParam = uri.searchParams.get('limit');
      const limit = limitParam && !isNaN(Number(limitParam)) ? parseInt(limitParam, 10) : 5;
      
      const profile = await this.profileContext.getProfile();
      
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
      const noteContext = this.profileContext.getNoteContext();
      
      if (!noteContext) {
        return {
          contents: [{
            uri: uri.toString(),
            text: 'No note context available. Use the find_related_notes tool instead.',
          }],
        };
      }
      
      const notes = await this.profileContext.findRelatedNotes(noteContext, limit);
      
      if (!notes || notes.length === 0) {
        return {
          contents: [{
            uri: uri.toString(),
            text: 'No related notes found for this profile',
          }],
        };
      }
      
      // Format the notes for display
      const formattedNotes = notes.map((note: { title: string; similarity?: number }) => 
        `- **${note.title}** (Similarity: ${note.similarity ? (note.similarity * 100).toFixed(2) + '%' : 'N/A'})`,
      ).join('\n');
      
      return {
        contents: [{
          uri: uri.toString(),
          text: `Notes related to your profile:\n\n${formattedNotes}`,
          metadata: {
            count: notes.length,
            notes: notes.map((note: { id: string; title: string; similarity?: number }) => ({
              id: note.id,
              title: note.title,
              similarity: note.similarity,
            })),
          },
        }],
      };
    } catch (error) {
      logger.error('Error in related notes resource:', error instanceof Error ? error.message : String(error));
      return {
        contents: [{
          uri: uri.toString(),
          text: `Error retrieving related notes: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
}