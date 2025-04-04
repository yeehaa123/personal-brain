/**
 * Example implementation of NoteContext using Dependency Injection
 * This shows how to migrate from direct instantiation to DI
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { textConfig } from '@/config';
import type { Note } from '@/models/note';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import type { NoteSearchService } from '@/services/notes/noteSearchService';
import type { NoteSearchOptions } from '@/services/notes/noteSearchService';
import { registerServices, ServiceIdentifiers } from '@/services/serviceRegistry';
import { getContainer, getService } from '@/utils/dependencyContainer';
import logger from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';


/**
 * Context for working with notes using MCP SDK and DI
 * Shows how to implement a context using DI
 */
export class NoteContextWithDI {
  private repository: NoteRepository;
  private embeddingService: NoteEmbeddingService;
  private searchService: NoteSearchService;
  private mcpServer: McpServer;

  /**
   * Create a new NoteContextWithDI with injected dependencies
   */
  constructor(
    repository: NoteRepository,
    embeddingService: NoteEmbeddingService,
    searchService: NoteSearchService,
  ) {
    this.repository = repository;
    this.embeddingService = embeddingService;
    this.searchService = searchService;

    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'PersonalBrain',
      version: '1.0.0',
    });

    // Register the MCP resources and tools
    this.registerMcpResources();
    this.registerMcpTools();

    logger.debug('MCP-based NoteContextWithDI initialized with resources and tools');
  }

  /**
   * Factory method to create a new context with dependencies resolved from container
   * @param apiKey Optional API key for embedding service
   * @returns A new NoteContextWithDI instance
   */
  static create(apiKey?: string): NoteContextWithDI {
    // Ensure services are registered
    registerServices(getContainer(), { apiKey });

    // Get services from container
    const repository = getService<NoteRepository>(ServiceIdentifiers.NoteRepository);
    const embeddingService = getService<NoteEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
    const searchService = getService<NoteSearchService>(ServiceIdentifiers.NoteSearchService);

    // Create and return the context with resolved dependencies
    return new NoteContextWithDI(repository, embeddingService, searchService);
  }

  /**
   * Register MCP resources for accessing note data
   * @param server Optional external MCP server to register resources on
   */
  registerMcpResources(server?: McpServer): void {
    // Use provided server or internal server
    const targetServer = server || this.mcpServer;
    // Resource to get a note by ID
    targetServer.resource(
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
    targetServer.resource(
      'notes',
      'notes://search',
      async (uri) => {
        try {
          const params = new URLSearchParams(uri.search);

          const options: NoteSearchOptions = {
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
              text: `# ${note.title || 'Untitled Note'}\n\n${note.content?.substring(0, 150) || ''
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
  }

  /**
   * Register MCP tools for note operations
   * @param server Optional external MCP server to register tools on
   */
  registerMcpTools(server?: McpServer): void {
    // Use provided server or internal server
    const targetServer = server || this.mcpServer;
    // Tool to create a new note
    targetServer.tool(
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
            source: 'user-created',
            confidence: null,
            conversationMetadata: null,
            verified: true,
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
      logger.warn('Cannot register NoteContext on undefined server');
      return;
    }

    // Register resources and tools on the external server
    this.registerMcpResources(server);
    this.registerMcpTools(server);

    logger.debug('NoteContext registered on external MCP server');
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
          // Combine title and content for embedding
          const combinedText = `${title} ${content}`.trim();
          embedding = await this.embeddingService.generateEmbedding(combinedText);
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
  async searchNotes(options: NoteSearchOptions): Promise<Note[]> {
    return this.searchService.searchNotes(options);
  }
}
