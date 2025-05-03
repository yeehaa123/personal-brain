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
import { BaseContext } from '@/contexts/baseContext';
import type { 
  ContextDependencies,
  ContextInterface,
} from '@/contexts/contextInterface';
import type { FormatterInterface } from '@/contexts/formatterInterface';
import type { StorageInterface } from '@/contexts/storageInterface';
import type { Note } from '@/models/note';
import type {
  NoteEmbeddingService,
  NoteRepository,
  NoteSearchService,
} from '@/services/notes';
import type { NoteSearchOptions } from '@/services/notes/noteSearchService';
import { ServiceRegistry } from '@/services/serviceRegistry';
import { Logger } from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

import { NoteFormatter } from './formatters';
import { NoteStorageAdapter } from './noteStorageAdapter';
import { NoteToolService } from './tools';

/**
 * Configuration for the NoteContext
 */
export interface NoteContextConfig extends Record<string, unknown> {
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
 * 
 * Implements the standardized interfaces:
 * - StorageAccess: For accessing note storage operations
 * - FormatterAccess: For formatting note data
 * - ServiceAccess: For accessing note-related services
 */
export class NoteContext extends BaseContext<
  NoteStorageAdapter,
  NoteFormatter,
  Note,
  string
> implements ContextInterface<
  NoteStorageAdapter,
  NoteFormatter,
  Note,
  string
> {
  /** Logger instance - overrides the protected one from BaseContext */
  protected override logger = Logger.getInstance();
  
  // Storage adapter and formatter
  private storage: NoteStorageAdapter;
  private formatter: NoteFormatter;
  
  // Singleton instance
  private static instance: NoteContext | null = null;
  
  /**
   * Get singleton instance of NoteContext
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  static override getInstance(options?: NoteContextConfig): NoteContext {
    if (!NoteContext.instance) {
      // Prepare config with defaults
      const config = options || {};
      
      // Use the config directly - NoteContextConfig extends Record<string, unknown>
      NoteContext.instance = NoteContext.createWithDependencies(config);
      
      const logger = Logger.getInstance();
      logger.debug('NoteContext singleton instance created');
    } else if (options) {
      // Log at debug level if trying to get instance with different config
      const logger = Logger.getInstance();
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
      const logger = Logger.getInstance();
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
  static override createFresh(options?: NoteContextConfig): NoteContext {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh NoteContext instance');
    
    // Prepare config with defaults
    const config = options || {};
    
    // Use the config directly - NoteContextConfig extends Record<string, unknown>
    return NoteContext.createWithDependencies(config);
  }
  
  /**
   * Factory method for creating an instance with explicit dependencies
   * This implementation matches the BaseContext abstract method signature
   * 
   * @param config Configuration options object
   * @param dependencies Optional dependencies for the context
   * @returns A new NoteContext instance with the provided dependencies
   */
  public static override createWithDependencies<
    TStorage extends StorageInterface<unknown, unknown>,
    TFormatter extends FormatterInterface<unknown, unknown>
  >(
    config: Record<string, unknown> = {}, 
    dependencies?: ContextDependencies<TStorage, TFormatter> | Record<string, unknown>,
  ): NoteContext {
    // Convert the generic config to our specific config type
    const noteConfig: NoteContextConfig = {
      apiKey: config['apiKey'] as string,
      name: config['name'] as string,
      version: config['version'] as string,
    };
    
    // If dependencies are provided, use them with proper casting
    if (dependencies) {
      // Handle both standard ContextDependencies and object with specific services
      if ('repository' in dependencies) {
        // Direct service dependencies provided (used in tests)
        const repository = dependencies['repository'] as NoteRepository;
        const embeddingService = dependencies['embeddingService'] as NoteEmbeddingService;
        const searchService = dependencies['searchService'] as NoteSearchService;
        const storage = dependencies['storage'] as NoteStorageAdapter;
        
        return new NoteContext(
          noteConfig,
          repository,
          embeddingService,
          searchService,
          storage,
        );
      } else if ('registry' in dependencies || 'storage' in dependencies) {
        // Traditional ContextDependencies format
        const dependencies2 = dependencies as ContextDependencies<TStorage, TFormatter>;
        
        // Use registry from dependencies or create a service registry
        const serviceRegistry = (dependencies2.registry || ServiceRegistry.getInstance()) as ServiceRegistry;
        
        // Extract needed services from registry with correct type assertions
        const repository = serviceRegistry.getNoteRepository() as unknown as NoteRepository;
        const embeddingService = serviceRegistry.getNoteEmbeddingService() as unknown as NoteEmbeddingService;
        const searchService = serviceRegistry.getNoteSearchService() as unknown as NoteSearchService;
        
        // Create context with explicitly provided dependencies, cast storage to correct type
        return new NoteContext(
          noteConfig,
          repository,
          embeddingService,
          searchService,
          dependencies2.storage as unknown as NoteStorageAdapter,
        );
      }
    }
    
    // Otherwise use services from registry
    const serviceRegistry = ServiceRegistry.getInstance({
      apiKey: noteConfig.apiKey,
    });
    
    return new NoteContext(
      noteConfig,
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
   * @param storageAdapter Optional storage adapter instance (created from repository if not provided)
   */
  constructor(
    config: NoteContextConfig,
    private readonly repository: NoteRepository,
    private readonly embeddingService: NoteEmbeddingService,
    private readonly searchService: NoteSearchService,
    storageAdapter?: NoteStorageAdapter,
  ) {
    super(config as Record<string, unknown>);
    
    // Initialize storage adapter - explicitly use the provided adapter or create one
    this.storage = storageAdapter || new NoteStorageAdapter(this.repository);
    
    // Initialize formatter
    this.formatter = NoteFormatter.getInstance();
    
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
    
    // Get the tool service instance
    const toolService = NoteToolService.getInstance();
    
    // Register note tools using the tool service
    this.tools = toolService.getTools(this);
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
   * Search notes using text instead of embedding vector
   * First generates an embedding for the text then searches similar notes
   * @param text The text to generate an embedding for
   * @param limit Maximum number of results to return
   * @param tags Optional tags to filter by
   * @returns Array of similar notes with similarity scores
   */
  async searchWithEmbedding(text: string, limit = 10, tags?: string[]): Promise<(Note & { similarity?: number })[]> {
    if (!text) {
      this.logger.error('Empty text provided to searchWithEmbedding', { context: 'NoteContext' });
      return [];
    }

    try {
      // Generate embedding for the text
      const embedding = await this.embeddingService.generateEmbedding(text);
      
      // Search for similar notes
      const scoredNotes = await this.embeddingService.searchSimilarNotes(embedding, limit * 2); // Get more to allow for tag filtering
      
      // Filter by tags if needed
      let results = scoredNotes;
      if (tags && tags.length > 0) {
        results = scoredNotes.filter(note => {
          // If the note has no tags, it doesn't match
          if (!note.tags || note.tags.length === 0) {
            return false;
          }
          
          // Check if any of the note's tags match any of the requested tags
          return note.tags.some(tag => tags.includes(tag));
        });
      }
      
      // Limit results
      return results.slice(0, limit);
    } catch (error) {
      this.logger.error(`Error in searchWithEmbedding: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
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
   * Update an existing note
   * @param id The ID of the note to update
   * @param updates The fields to update
   * @returns True if the update was successful
   */
  async updateNote(id: string, updates: Partial<Note>): Promise<boolean> {
    try {
      // Generate a new embedding if content or title was updated
      if (updates.content || updates.title) {
        try {
          const existingNote = await this.getNoteById(id);
          if (existingNote) {
            const title = updates.title || existingNote.title || '';
            const content = updates.content || existingNote.content || '';
            
            // Generate embedding for combined text
            const combinedText = `${title} ${content}`.trim();
            const embedding = await this.embeddingService.generateEmbedding(combinedText);
            
            // Add embedding to updates
            updates.embedding = embedding;
          }
        } catch (error) {
          this.logger.error(`Error generating embedding for updated note: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
        }
      }
      
      // Add updated timestamp
      updates.updatedAt = new Date();
      
      // Update the note
      return this.storage.update(id, updates);
    } catch (error) {
      this.logger.error(`Failed to update note ${id}: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
      return false;
    }
  }
  
  /**
   * Delete a note by ID
   * @param id The ID of the note to delete
   * @returns True if the deletion was successful
   */
  async deleteNote(id: string): Promise<boolean> {
    try {
      return this.storage.delete(id);
    } catch (error) {
      this.logger.error(`Failed to delete note ${id}: ${error instanceof Error ? error.message : String(error)}`, { error, context: 'NoteContext' });
      return false;
    }
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
   * Implements StorageAccess interface
   * @returns The storage interface for notes
   */
  override getStorage(): NoteStorageAdapter {
    return this.storage;
  }
  
  /**
   * Get the formatter
   * Implements FormatterAccess interface
   * @returns The formatter
   */
  override getFormatter(): NoteFormatter {
    return this.formatter;
  }
  
  /**
   * Get a service by type from the registry
   * Implements ServiceAccess interface
   * @param serviceType Type of service to retrieve
   * @returns Service instance
   */
  override getService<T>(serviceType: new () => T): T {
    // Simple implementation that handles the common cases for NoteContext services
    
    if (serviceType.name === 'NoteEmbeddingService') {
      return this.embeddingService as unknown as T;
    }
    
    if (serviceType.name === 'NoteSearchService') {
      return this.searchService as unknown as T;
    }
    
    if (serviceType.name === 'NoteRepository') {
      return this.repository as unknown as T;
    }
    
    throw new Error(`Service not found: ${serviceType.name}`);
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by FullContextInterface
   * @returns The singleton instance
   */
  getInstance(): NoteContext {
    return NoteContext.getInstance();
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by FullContextInterface
   */
  resetInstance(): void {
    NoteContext.resetInstance();
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by FullContextInterface
   * @param options Optional configuration
   * @returns A new instance
   */
  createFresh(options?: Record<string, unknown>): NoteContext {
    return NoteContext.createFresh(options as NoteContextConfig);
  }
  
  /**
   * Instance method that delegates to the static method
   * Required by ExtendedContextInterface
   * @param dependencies The dependencies for the context
   * @returns A new instance with the provided dependencies
   */
  createWithDependencies(dependencies: ContextDependencies<NoteStorageAdapter, NoteFormatter>): NoteContext {
    // This is a bit more complex since our static method has a different signature
    // We need to translate between interfaces
    
    // If we have storage, we should use it
    if (dependencies.storage) {
      // Get the repository from the storage adapter
      const repository = dependencies.storage.getRepository();
      
      // Get services from the service registry
      const serviceRegistry = ServiceRegistry.getInstance();
      const embeddingService = serviceRegistry.getNoteEmbeddingService() as NoteEmbeddingService;
      const searchService = serviceRegistry.getNoteSearchService() as NoteSearchService;
      
      // Create a new context with the explicit dependencies
      return new NoteContext(
        { name: 'NoteBrain', version: '1.0.0' },
        repository,
        embeddingService,
        searchService,
        dependencies.storage,
      );
    }
    
    // Otherwise, fall back to the default behavior
    return NoteContext.createWithDependencies();
  }
}