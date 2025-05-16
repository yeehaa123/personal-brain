/**
 * Note Tools for MCP
 * 
 * This file contains the tool definitions for the NoteContext
 * following the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates a new instance with explicit dependencies
 */

import { z } from 'zod';

import type { ResourceDefinition } from '@/contexts/contextInterface';
// TODO: Remove this import after NoteContext is fully migrated to MCPNoteContext
// import type { NoteContext } from '@/contexts/notes/noteContext';
import { Logger } from '@/utils/logger';

/**
 * TODO: Remove this interface after NoteContext is fully migrated to MCPNoteContext
 * 
 * Temporary interface to support both the legacy NoteContext and the new MCPNoteContext
 * during the migration period. This defines the minimum functionality needed from any
 * note context for the tool service.
 * 
 * After migration is complete:
 * 1. Remove this interface
 * 2. Update all methods to use MCPNoteContext directly
 * 3. Remove the NoteContext import
 */

// We use `any` here temporarily during migration since both contexts return slightly different types
// This will be replaced with proper types after migration is complete
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface NoteToolContext {
  createNote(note: { title: string; content: string; tags?: string[] | null }): Promise<string>;
  getNoteById(id: string): Promise<any | undefined>;
  updateNote(id: string, updates: Record<string, unknown>): Promise<boolean>;
  deleteNote(id: string): Promise<boolean>;
  searchNotes(options: { query?: string; tags?: string[]; limit?: number; offset?: number }): Promise<any[]>;
  searchWithEmbedding(text: string, limit?: number, tags?: string[]): Promise<any[]>;
  generateEmbeddingsForAllNotes(): Promise<{ updated: number; failed: number }>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Configuration options for NoteToolService
 */
export interface NoteToolServiceConfig {
  /** Default limit for search results */
  defaultSearchLimit?: number;
  /** Default semantic search setting */
  defaultSemanticSearch?: boolean;
}

/**
 * Dependencies for NoteToolService
 */
export interface NoteToolServiceDependencies {
  /** Logger instance */
  logger?: Logger;
}

/**
 * Service responsible for providing MCP tools for notes
 * Follows the Component Interface Standardization pattern
 */
export class NoteToolService {
  /** The singleton instance */
  private static instance: NoteToolService | null = null;
  
  /** Configuration values */
  private readonly config: NoteToolServiceConfig;
  
  /** Logger instance for this class */
  private readonly logger: Logger;
  
  /**
   * Get the singleton instance of NoteToolService
   * 
   * @param config Optional configuration
   * @returns The shared NoteToolService instance
   */
  public static getInstance(config?: NoteToolServiceConfig): NoteToolService {
    if (!NoteToolService.instance) {
      NoteToolService.instance = new NoteToolService(config);
    } else if (config) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }
    return NoteToolService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    NoteToolService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param config Optional configuration
   * @returns A new NoteToolService instance
   */
  public static createFresh(config?: NoteToolServiceConfig): NoteToolService {
    return new NoteToolService(config);
  }
  
  /**
   * Create a new instance with explicit dependencies
   * 
   * @param config Configuration options
   * @param dependencies External dependencies
   * @returns A new NoteToolService instance
   */
  public static createWithDependencies(
    config: Record<string, unknown> = {},
    dependencies: Record<string, unknown> = {},
  ): NoteToolService {
    // Convert config to typed config
    const toolServiceConfig: NoteToolServiceConfig = {
      defaultSearchLimit: config['defaultSearchLimit'] as number,
      defaultSemanticSearch: config['defaultSemanticSearch'] as boolean,
    };
    
    // Create with typed dependencies
    return new NoteToolService(
      toolServiceConfig,
      {
        logger: dependencies['logger'] as Logger,
      },
    );
  }
  
  /**
   * Private constructor to enforce factory methods
   * 
   * @param config Optional configuration
   * @param dependencies Optional dependencies
   */
  private constructor(
    config?: NoteToolServiceConfig,
    dependencies?: NoteToolServiceDependencies,
  ) {
    this.config = {
      defaultSearchLimit: config?.defaultSearchLimit ?? 10,
      defaultSemanticSearch: config?.defaultSemanticSearch ?? true,
    };
    this.logger = dependencies?.logger || Logger.getInstance();
    
    this.logger.debug('NoteToolService initialized', { context: 'NoteToolService' });
  }
  
  /**
   * Get the MCP tools for the note context
   * 
   * @param context The note context (supports both NoteContext and MCPNoteContext)
   * @returns Array of MCP tools
   */
  getTools(context: NoteToolContext): ResourceDefinition[] {
    return [
      // create_note
      this.createNoteTool(context),
      
      // generate_embeddings
      this.generateEmbeddingsTool(context),
      
      // search_with_embedding
      this.searchWithEmbeddingTool(context),
      
      // search_notes
      this.searchNotesTool(context),
      
      // get_note
      this.getNoteTool(context),
      
      // update_note
      this.updateNoteTool(context),
      
      // delete_note
      this.deleteNoteTool(context),
    ];
  }

  /**
   * Get the Zod schema for a tool based on its name
   * 
   * @param tool Tool definition with parameters
   * @returns Zod schema object for tool parameters
   */
  getToolSchema(tool: { name?: string }): Record<string, z.ZodTypeAny> {
    // Return appropriate Zod schema based on tool name
    switch (tool.name) {
    case 'create_note':
      return {
        title: z.string().optional(),
        content: z.string().min(1, 'Content must not be empty'),
        tags: z.array(z.string()).optional(),
      };

    case 'generate_embeddings':
      return {}; // No parameters needed

    case 'search_with_embedding':
      return {
        text: z.string().min(1, 'Text must not be empty'),
        limit: z.number().positive().optional(),
        tags: z.array(z.string()).optional(),
      };
      
    case 'search_notes':
      return {
        query: z.string().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().positive().optional(),
        offset: z.number().nonnegative().optional(),
        semanticSearch: z.boolean().optional(),
      };
      
    case 'get_note':
      return {
        id: z.string().min(1, 'Note ID must not be empty'),
      };
      
    case 'update_note':
      return {
        id: z.string().min(1, 'Note ID must not be empty'),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      };
      
    case 'delete_note':
      return {
        id: z.string().min(1, 'Note ID must not be empty'),
      };
      
    default:
      // For unknown tools, return an empty schema
      return {};
    }
  }

  /**
   * Create the create_note tool
   */
  private createNoteTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'create_note',
      name: 'create_note',
      description: 'Create a new note with optional title and tags',
      handler: async (params: Record<string, unknown>) => {
        try {
          const title = params['title'] as string;
          const content = params['content'] as string;
          const tags = params['tags'] as string[] | undefined;
          
          if (!content) {
            throw new Error('Note content is required');
          }
          
          const noteId = await context.createNote({
            title: title || '',
            content,
            tags: tags || null,
          });
          
          return { noteId };
        } catch (error) {
          this.logger.error('Error creating note via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to create note: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }

  /**
   * Create the generate_embeddings tool
   */
  private generateEmbeddingsTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'generate_embeddings',
      name: 'generate_embeddings',
      description: 'Generate or update embeddings for all notes in the database',
      handler: async () => {
        try {
          const result = await context.generateEmbeddingsForAllNotes();
          return {
            success: true,
            updated: result.updated,
            failed: result.failed,
          };
        } catch (error) {
          this.logger.error('Error generating embeddings via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }

  /**
   * Create the search_with_embedding tool
   */
  private searchWithEmbeddingTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'search_with_embedding',
      name: 'search_with_embedding',
      description: 'Search notes using semantic similarity with a text passage',
      handler: async (params: Record<string, unknown>) => {
        try {
          const text = params['text'] as string;
          const limit = params['limit'] as number || this.config.defaultSearchLimit;
          const tags = params['tags'] as string[] | undefined;
          
          if (!text) {
            throw new Error('Text is required');
          }
          
          const notes = await context.searchWithEmbedding(text, limit, tags);
          
          return {
            count: notes.length,
            notes: notes.map(note => ({
              id: note.id,
              title: note.title || 'Untitled Note',
              preview: note.content?.substring(0, 150) || '',
              tags: note.tags,
              similarity: note.similarity,
            })),
          };
        } catch (error) {
          this.logger.error('Error searching with embeddings via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to search with embeddings: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }

  /**
   * Create the search_notes tool
   */
  private searchNotesTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'search_notes',
      name: 'search_notes',
      description: 'Search notes by query and/or tags',
      handler: async (params: Record<string, unknown>) => {
        try {
          const options = {
            query: params['query'] as string | undefined,
            tags: params['tags'] as string[] | undefined,
            limit: (params['limit'] as number) || this.config.defaultSearchLimit,
            offset: (params['offset'] as number) || 0,
            semanticSearch: params['semanticSearch'] !== undefined 
              ? Boolean(params['semanticSearch']) 
              : this.config.defaultSemanticSearch,
          };
          
          const notes = await context.searchNotes(options);
          
          return {
            count: notes.length,
            notes: notes.map(note => ({
              id: note.id,
              title: note.title || 'Untitled Note',
              preview: note.content?.substring(0, 150) || '',
              tags: note.tags,
              createdAt: note.createdAt,
            })),
          };
        } catch (error) {
          this.logger.error('Error searching notes via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to search notes: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }

  /**
   * Create the get_note tool
   */
  private getNoteTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'get_note',
      name: 'get_note',
      description: 'Get a note by ID',
      handler: async (params: Record<string, unknown>) => {
        try {
          const id = params['id'] as string;
          
          if (!id) {
            throw new Error('Note ID is required');
          }
          
          const note = await context.getNoteById(id);
          
          if (!note) {
            return {
              isError: true,
              error: `Note with ID ${id} not found`,
            };
          }
          
          return {
            id: note.id,
            title: note.title || 'Untitled Note',
            content: note.content || '',
            tags: note.tags,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          };
        } catch (error) {
          this.logger.error('Error getting note via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to get note: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }

  /**
   * Create the update_note tool
   */
  private updateNoteTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'update_note',
      name: 'update_note',
      description: 'Update an existing note',
      handler: async (params: Record<string, unknown>) => {
        try {
          const id = params['id'] as string;
          const title = params['title'] as string | undefined;
          const content = params['content'] as string | undefined;
          const tags = params['tags'] as string[] | undefined;
          
          if (!id) {
            throw new Error('Note ID is required');
          }
          
          if (!title && !content && !tags) {
            throw new Error('At least one field to update is required');
          }
          
          const success = await context.updateNote(id, {
            title,
            content,
            tags,
          });
          
          if (!success) {
            return {
              isError: true,
              error: `Failed to update note with ID ${id}`,
            };
          }
          
          return { success: true, noteId: id };
        } catch (error) {
          this.logger.error('Error updating note via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to update note: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }

  /**
   * Create the delete_note tool
   */
  private deleteNoteTool(context: NoteToolContext): ResourceDefinition {
    return {
      protocol: 'notes',
      path: 'delete_note',
      name: 'delete_note',
      description: 'Delete a note by ID',
      handler: async (params: Record<string, unknown>) => {
        try {
          const id = params['id'] as string;
          
          if (!id) {
            throw new Error('Note ID is required');
          }
          
          const success = await context.deleteNote(id);
          
          if (!success) {
            return {
              isError: true,
              error: `Failed to delete note with ID ${id}`,
            };
          }
          
          return { success: true, noteId: id };
        } catch (error) {
          this.logger.error('Error deleting note via MCP tool', { error, context: 'NoteContext' });
          return {
            isError: true,
            error: `Failed to delete note: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    };
  }
}