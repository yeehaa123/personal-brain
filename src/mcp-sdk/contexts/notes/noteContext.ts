/**
 * NoteContext implementation using the Model Context Protocol SDK
 * This provides the same interface as the original NoteContext but uses MCP SDK internally
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Note } from '@/models/note';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import logger from '@/utils/logger';
import { textConfig } from '@/config';
import { nanoid } from 'nanoid';
import { 
  NoteRepository, 
  NoteEmbeddingService, 
  NoteSearchService, 
} from '@/services/notes';
import type { SearchOptions } from '@/services/notes/noteSearchService';

/**
 * Context for working with notes using MCP SDK
 * This is a drop-in replacement for the original NoteContext
 */
export class NoteContext {
  private repository: NoteRepository;
  private embeddingService: NoteEmbeddingService;
  private searchService: NoteSearchService;
  private mcpServer: McpServer;

  /**
   * Create a new NoteContext
   * @param apiKey Optional API key for embedding service
   */
  constructor(apiKey?: string) {
    this.repository = new NoteRepository();
    this.embeddingService = new NoteEmbeddingService(apiKey);
    this.searchService = new NoteSearchService(apiKey);
    
    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'PersonalBrain',
      version: '1.0.0',
    });
    
    // Register the MCP resources
    this.registerMcpResources();
    
    // Register the MCP tools
    this.registerMcpTools();
    
    logger.debug('MCP-based NoteContext initialized with resources and tools');
  }
  
  /**
   * Register MCP resources for accessing note data
   */
  private registerMcpResources(): void {
    // Resource to get a note by ID
    this.mcpServer.resource(
      'note', 
      'note://:id',
      async (uri) => {
        try {
          const id = uri.pathname.substring(1); // Remove leading slash
          
          if (!id) {
            return {
              contents: [{
                uri: uri.toString(),
                text: 'Error: No note ID provided',
              }],
            };
          }
          
          const note = await this.getNoteById(id);
          
          if (!note) {
            return {
              contents: [{
                uri: uri.toString(),
                text: `Note with ID ${id} not found`,
              }],
            };
          }
          
          return {
            contents: [{
              uri: uri.toString(),
              text: `# ${note.title || 'Untitled Note'}\n\n${note.content || ''}`,
              metadata: {
                id: note.id,
                title: note.title,
                tags: note.tags,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              },
            }],
          };
        } catch (error) {
          logger.error(`Error in note resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: uri.toString(),
              text: `Error retrieving note: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
    
    // Resource to search notes
    this.mcpServer.resource(
      'notes',
      'notes://search',
      async (uri) => {
        try {
          const params = new URLSearchParams(uri.search);
          
          const options: SearchOptions = {
            query: params.get('query') || undefined,
            tags: params.has('tags') ? params.get('tags')?.split(',') : undefined,
            limit: params.has('limit') ? parseInt(params.get('limit') || '10', 10) : 10,
            offset: params.has('offset') ? parseInt(params.get('offset') || '0', 10) : 0,
            semanticSearch: params.has('semantic') ? params.get('semantic') === 'true' : true,
          };
          
          const notes = await this.searchNotes(options);
          
          return {
            contents: notes.map(note => ({
              uri: `note://${note.id}`,
              text: `# ${note.title || 'Untitled Note'}\n\n${
                note.content?.substring(0, 150) || ''
              }${note.content && note.content.length > 150 ? '...' : ''}`,
              metadata: {
                id: note.id,
                title: note.title,
                tags: note.tags,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              },
            })),
          };
        } catch (error) {
          logger.error(`Error in notes search resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: uri.toString(),
              text: `Error searching notes: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
    
    // Resource to get recent notes
    this.mcpServer.resource(
      'recent_notes',
      'notes://recent',
      async (uri) => {
        try {
          const params = new URLSearchParams(uri.search);
          const limit = params.has('limit') ? parseInt(params.get('limit') || '5', 10) : 5;
          
          const notes = await this.getRecentNotes(limit);
          
          return {
            contents: notes.map(note => ({
              uri: `note://${note.id}`,
              text: `# ${note.title || 'Untitled Note'}\n\n${
                note.content?.substring(0, 150) || ''
              }${note.content && note.content.length > 150 ? '...' : ''}`,
              metadata: {
                id: note.id,
                title: note.title,
                tags: note.tags,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              },
            })),
          };
        } catch (error) {
          logger.error(`Error in recent notes resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: uri.toString(),
              text: `Error retrieving recent notes: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
    
    // Resource to get related notes
    this.mcpServer.resource(
      'related_notes',
      'notes://related/:id',
      async (uri) => {
        try {
          const id = uri.pathname.split('/').pop();
          const params = new URLSearchParams(uri.search);
          const limit = params.has('limit') ? parseInt(params.get('limit') || '5', 10) : 5;
          
          if (!id) {
            return {
              contents: [{
                uri: uri.toString(),
                text: 'Error: No note ID provided',
              }],
            };
          }
          
          const notes = await this.getRelatedNotes(id, limit);
          
          return {
            contents: notes.map(note => ({
              uri: `note://${note.id}`,
              text: `# ${note.title || 'Untitled Note'}\n\n${
                note.content?.substring(0, 150) || ''
              }${note.content && note.content.length > 150 ? '...' : ''}`,
              metadata: {
                id: note.id,
                title: note.title,
                tags: note.tags,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              },
            })),
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
   * Register MCP tools for note operations
   */
  private registerMcpTools(): void {
    // Tool to create a new note
    this.mcpServer.tool(
      'create_note',
      'Create a new note with optional title and tags',
      {
        title: z.string().optional(),
        content: z.string(),
        tags: z.array(z.string()).optional(),
      },
      async (args) => {
        try {
          const now = new Date();
          const noteId = await this.createNote({
            id: nanoid(),
            title: args.title || '',
            content: args.content,
            tags: args.tags || null,
            createdAt: now,
            updatedAt: now,
          });
          
          // Return in the format expected by MCP
          return {
            content: [{
              type: 'text',
              text: `Note created with ID: ${noteId}`,
            }],
          };
        } catch (error) {
          logger.error(`Error creating note via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to create note: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
    
    // Tool to generate embeddings for all notes
    this.mcpServer.tool(
      'generate_embeddings',
      'Generate or update embeddings for all notes in the database',
      async () => {
        try {
          const result = await this.generateEmbeddingsForAllNotes();
          
          return {
            content: [{
              type: 'text',
              text: `Generated embeddings for ${result.updated} notes (${result.failed} failed)`,
            }],
          };
        } catch (error) {
          logger.error(`Error generating embeddings via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
    
    // Tool to search notes with embedding
    this.mcpServer.tool(
      'search_with_embedding',
      'Search for notes similar to a given embedding vector',
      {
        embedding: z.array(z.number()),
        maxResults: z.number().optional(),
      },
      async (args) => {
        try {
          const notes = await this.searchNotesWithEmbedding(
            args.embedding, 
            args.maxResults || 5,
          );
          
          // Format the results as required by MCP
          if (notes.length === 0) {
            return {
              content: [{
                type: 'text',
                text: 'No matching notes found',
              }],
            };
          }
          
          return {
            content: notes.map(note => ({
              type: 'text',
              text: `# ${note.title || 'Untitled Note'}\n\n${
                note.content?.substring(0, 150) || ''
              }${note.content && note.content.length > 150 ? '...' : ''}`,
            })),
          };
        } catch (error) {
          logger.error(`Error searching with embedding via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to search with embedding: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
  }

  /**
   * Get the MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  /**
   * Retrieve a note by its ID
   * @param id The ID of the note to retrieve
   * @returns The note object or undefined if not found
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    return this.repository.getNoteById(id);
  }

  /**
   * Create a new note with embeddings
   * @param note The note data to create
   * @returns The ID of the created note
   */
  async createNote(note: Omit<Note, 'embedding'> & { embedding?: number[] }): Promise<string> {
    // Generate embedding if not provided
    let embedding = note.embedding;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      try {
        const title = isNonEmptyString(note.title) ? note.title : '';
        const content = isNonEmptyString(note.content) ? note.content : '';
        
        if (title.length > 0 || content.length > 0) {
          embedding = await this.embeddingService.generateEmbedding(title, content);
        }
      } catch (error) {
        logger.error(`Error generating embedding for new note: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Insert the note
    const noteId = await this.repository.insertNote({
      id: note.id,
      title: note.title,
      content: note.content,
      embedding,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags || undefined,
    });
    
    // If the note is long, also create chunks
    const content = isNonEmptyString(note.content) ? note.content : '';
    if (content.length > (textConfig.defaultChunkThreshold || 1000)) {
      try {
        await this.embeddingService.createNoteChunks(noteId, content);
      } catch (error) {
        logger.error(`Failed to create chunks for note ${noteId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return noteId;
  }

  /**
   * Search notes based on query text and/or tags with optional semantic search
   * @param options Search options including query, tags, limit, offset, and search type
   * @returns Array of matching notes
   */
  async searchNotes(options: SearchOptions): Promise<Note[]> {
    return this.searchService.searchNotes(options);
  }

  /**
   * Get related notes based on vector similarity
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   */
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    return this.searchService.getRelatedNotes(noteId, maxResults);
  }
  
  /**
   * Search notes by embedding similarity (for profile integration)
   * Finds notes similar to a given embedding vector
   * @param embedding The embedding vector to search with
   * @param maxResults Maximum number of results to return
   * @returns Array of similar notes
   */
  async searchNotesWithEmbedding(embedding: number[], maxResults = 5): Promise<Note[]> {
    if (!isDefined(embedding) || !Array.isArray(embedding)) {
      logger.warn('Invalid embedding provided to searchNotesWithEmbedding');
      return [];
    }
    
    try {
      const scoredNotes = await this.embeddingService.searchSimilarNotes(embedding, maxResults);
      
      // Return notes without the score property
      return scoredNotes.map(({ score: _score, ...note }) => note);
    } catch (error) {
      logger.error(`Error searching notes with embedding: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get recent notes ordered by update time
   * @param limit Maximum number of notes to return
   * @returns Array of recent notes
   */
  async getRecentNotes(limit = 5): Promise<Note[]> {
    return this.repository.getRecentNotes(limit);
  }

  /**
   * Generate or update embeddings for existing notes
   * @returns Statistics on the update operation
   */
  async generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    return this.embeddingService.generateEmbeddingsForAllNotes();
  }
  
  /**
   * Get the total count of notes in the database
   * @returns The total number of notes
   */
  async getNoteCount(): Promise<number> {
    return this.repository.getNoteCount();
  }
}