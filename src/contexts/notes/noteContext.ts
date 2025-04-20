/**
 * NoteContext implementation using the BaseContext architecture
 * 
 * This version extends BaseContext to ensure consistent behavior
 * with other context implementations.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance 
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { textConfig } from '@/config';
import { BaseContext } from '@/contexts/core/baseContext';
import type { StorageInterface } from '@/contexts/core/storageInterface';
import type { Note } from '@/models/note';
import type {
  NoteEmbeddingService,
  NoteRepository,
  NoteSearchService,
} from '@/services/notes';
import type { NoteSearchOptions } from '@/services/notes/noteSearchService';
import { ServiceRegistry } from '@/services/serviceRegistry';
import { Logger } from '@/utils/logger';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';

import { NoteStorageAdapter } from './noteStorageAdapter';

/**
 * Configuration for the NoteContext
 */
export interface NoteContextConfig {
  /**
   * API key for embedding service
   */
  apiKey?: string;
  
  /**
   * Name for the context (defaults to 'NoteBrain')
   */
  name?: string;
  
  /**
   * Version for the context (defaults to '1.0.0')
   */
  version?: string;
}

/**
 * Context for working with notes
 * 
 * Acts as a facade for note-related operations, coordinating between
 * services, repositories, and MCP components.
 */
export class NoteContext extends BaseContext {
  /** Logger instance - overrides the protected one from BaseContext */
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  // Storage adapter
  private storage: StorageInterface<Note>;
  
  // Singleton instance
  private static instance: NoteContext | null = null;
  
  /**
   * Get singleton instance of NoteContext
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  static override getInstance(options?: NoteContextConfig | string): NoteContext {
    if (!NoteContext.instance) {
      // Convert string config to object if needed
      let config: NoteContextConfig = {};
      if (typeof options === 'string') {
        config = { apiKey: options };
      } else if (options) {
        config = options;
      }
      
      NoteContext.instance = NoteContext.createWithDependencies(config);
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('NoteContext singleton instance created');
    } else if (options) {
      // Log at debug level if trying to get instance with different config
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
    }
    
    return NoteContext.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  static override resetInstance(): void {
    if (NoteContext.instance) {
      // Any cleanup needed before destroying the instance
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('NoteContext singleton instance reset');
      
      NoteContext.instance = null;
    }
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new NoteContext instance
   */
  static override createFresh(options?: NoteContextConfig | string): NoteContext {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh NoteContext instance');
    
    // Convert string config to object if needed
    let config: NoteContextConfig = {};
    if (typeof options === 'string') {
      config = { apiKey: options };
    } else if (options) {
      config = options;
    }
    
    return NoteContext.createWithDependencies(config);
  }
  
  /**
   * Factory method for creating an instance with dependencies from ServiceRegistry
   * 
   * @param config Configuration options
   * @returns A new NoteContext instance with resolved dependencies
   */
  public static createWithDependencies(config: NoteContextConfig = {}): NoteContext {
    const serviceRegistry = ServiceRegistry.getInstance({
      apiKey: config.apiKey,
    });
    
    return new NoteContext(
      config,
      serviceRegistry.getNoteRepository() as NoteRepository,
      serviceRegistry.getNoteEmbeddingService() as NoteEmbeddingService,
      serviceRegistry.getNoteSearchService() as NoteSearchService,
    );
  }

  /**
   * Constructor for NoteContext with explicit dependency injection
   * 
   * @param config Configuration for the context
   * @param repository Note repository instance
   * @param embeddingService Note embedding service instance
   * @param searchService Note search service instance
   */
  constructor(
    config: NoteContextConfig,
    private readonly repository: NoteRepository,
    private readonly embeddingService: NoteEmbeddingService,
    private readonly searchService: NoteSearchService,
  ) {
    super(config as Record<string, unknown>);
    
    // Initialize storage adapter
    this.storage = new NoteStorageAdapter(this.repository);
    
    this.logger.debug('NoteContext initialized with dependency injection', { context: 'NoteContext' });
  }

  /**
   * Get the context name
   * @returns The name of this context
   */
  override getContextName(): string {
    return (this.config['name'] as string) || 'NoteBrain';
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
    // Register note resources
    this.resources = [
      {
        protocol: 'note',
        path: ':id',
        handler: async (params) => {
          const id = params['id'] as string;
          if (!id) {
            throw new Error('No note ID provided');
          }
          
          const note = await this.getNoteById(id);
          
          if (!note) {
            throw new Error(`Note with ID ${id} not found`);
          }
          
          return {
            id: note.id,
            title: note.title || 'Untitled Note',
            content: note.content || '',
            tags: note.tags,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          };
        },
        name: 'Get Note',
        description: 'Retrieve a note by ID',
      },
      
      {
        protocol: 'notes',
        path: 'search',
        handler: async (_params, query) => {
          const options: NoteSearchOptions = {
            query: query ? query['query'] as string : undefined,
            tags: query && query['tags'] ? String(query['tags']).split(',') : undefined,
            limit: query && query['limit'] ? Number(query['limit']) : 10,
            offset: query && query['offset'] ? Number(query['offset']) : 0,
            semanticSearch: query && query['semantic'] ? String(query['semantic']) === 'true' : true,
          };
          
          const notes = await this.searchNotes(options);
          
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
        },
        name: 'Search Notes',
        description: 'Search notes by query or tags',
      },
      
      {
        protocol: 'notes',
        path: 'recent',
        handler: async (_params, query) => {
          const limit = query && query['limit'] ? Number(query['limit']) : 5;
          const notes = await this.getRecentNotes(limit);
          
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
        },
        name: 'Recent Notes',
        description: 'Get recent notes',
      },
      
      {
        protocol: 'notes',
        path: 'related/:id',
        handler: async (params, query) => {
          const id = params['id'] as string;
          const limit = query && query['limit'] ? Number(query['limit']) : 5;
          
          if (!id) {
            throw new Error('No note ID provided');
          }
          
          const notes = await this.getRelatedNotes(id, limit);
          
          return {
            sourceId: id,
            count: notes.length,
            notes: notes.map(note => ({
              id: note.id,
              title: note.title || 'Untitled Note',
              preview: note.content?.substring(0, 150) || '',
              tags: note.tags,
              createdAt: note.createdAt,
            })),
          };
        },
        name: 'Related Notes',
        description: 'Get notes related to a specific note',
      },
    ];
    
    // Register note tools
    this.tools = [
      {
        protocol: 'notes',
        path: 'create_note',
        name: 'create_note',
        description: 'Create a new note with optional title and tags',
        handler: async (params) => {
          const title = params['title'] as string;
          const content = params['content'] as string;
          const tags = params['tags'] as string[] | undefined;
          
          if (!content) {
            throw new Error('Note content is required');
          }
          
          const noteId = await this.createNote({
            title: title || '',
            content,
            tags: tags || null,
          });
          
          return { noteId };
        },
      },
      
      {
        protocol: 'notes',
        path: 'generate_embeddings',
        name: 'generate_embeddings',
        description: 'Generate or update embeddings for all notes in the database',
        handler: async () => {
          const result = await this.generateEmbeddingsForAllNotes();
          return {
            success: true,
            updated: result.updated,
            failed: result.failed,
          };
        },
      },
      
      {
        protocol: 'notes',
        path: 'search_with_embedding',
        name: 'search_with_embedding',
        description: 'Search for notes similar to a given embedding vector',
        handler: async (params) => {
          const embedding = params['embedding'] as number[];
          const maxResults = params['maxResults'] as number || 5;
          
          if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Valid embedding vector is required');
          }
          
          const notes = await this.searchNotesWithEmbedding(embedding, maxResults);
          
          return {
            count: notes.length,
            notes: notes.map(note => ({
              id: note.id,
              title: note.title || 'Untitled Note',
              preview: note.content?.substring(0, 150) || '',
              tags: note.tags,
            })),
          };
        },
      },
    ];
  }
  
  // Public API methods that delegate to storage and services
  
  /**
   * Retrieve a note by its ID
   * @param id The ID of the note to retrieve
   * @returns The note object or undefined if not found
   */
  async getNoteById(id: string): Promise<Note | undefined> {
    const note = await this.storage.read(id);
    return note || undefined;
  }

  /**
   * Create a new note with embeddings
   * @param note The note data to create
   * @returns The ID of the created note
   */
  async createNote(note: Partial<Note>): Promise<string> {
    try {
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
          this.logger.error(`Error generating embedding for new note: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
        }
      }

      // Insert the note
      const now = new Date();
      const noteData: Partial<Note> = {
        ...note,
        embedding,
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now,
      };
      
      const noteId = await this.storage.create(noteData);

      // If the note is long, also create chunks
      const content = isNonEmptyString(note.content) ? note.content : '';
      if (content.length > (textConfig.defaultChunkThreshold || 1000)) {
        try {
          await this.embeddingService.createNoteChunks(noteId, content);
        } catch (error) {
          this.logger.error(`Failed to create chunks for note ${noteId}: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
        }
      }

      return noteId;
    } catch (error) {
      this.logger.error(`Failed to create note: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
      throw error;
    }
  }

  /**
   * Search notes based on query text and/or tags with optional semantic search
   * @param options Search options including query, tags, limit, offset, and search type
   * @returns Array of matching notes
   */
  async searchNotes(options: NoteSearchOptions): Promise<Note[]> {
    return this.searchService.searchNotes(options);
  }

  /**
   * Get related notes based on vector similarity
   * @param noteId ID of the note to find related notes for
   * @param maxResults Maximum number of results to return
   * @returns Array of related notes
   */
  async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    return this.searchService.findRelated(noteId, maxResults);
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
      this.logger.error('Invalid embedding provided to searchNotesWithEmbedding', { context: 'NoteContext' });
      return [];
    }

    try {
      const scoredNotes = await this.embeddingService.searchSimilarNotes(embedding, maxResults);

      // Return notes without the score property
      return scoredNotes.map(({ score: _score, ...note }) => note);
    } catch (error) {
      this.logger.error(`Error searching notes with embedding: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
      return [];
    }
  }

  /**
   * Get recent notes ordered by update time
   * @param limit Maximum number of notes to return
   * @returns Array of recent notes
   */
  async getRecentNotes(limit = 5): Promise<Note[]> {
    return this.storage.list({ limit });
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
    return this.storage.count();
  }

  /**
   * Get the note repository instance
   */
  getNoteRepository(): NoteRepository {
    return this.repository;
  }
  
  /**
   * Get the note embedding service instance
   */
  getNoteEmbeddingService(): NoteEmbeddingService {
    return this.embeddingService;
  }
  
  /**
   * Get the storage adapter
   * @returns The storage interface for notes
   */
  getStorage(): StorageInterface<Note> {
    return this.storage;
  }
}