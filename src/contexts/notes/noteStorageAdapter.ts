/**
 * NoteStorageAdapter for adapting the NoteRepository to the StorageInterface
 * 
 * This adapter provides a bridge between the generic StorageInterface pattern
 * and the specific implementation details of the NoteRepository.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Factory method for creating an instance with resolved dependencies
 */

import type { ListOptions, SearchCriteria, StorageInterface } from '@/contexts/storageInterface';
import type { Note } from '@/models/note';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { ServiceRegistry } from '@/services/serviceRegistry';
import { Logger } from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

/**
 * Adapter to provide standard StorageInterface for notes
 * Implements the StorageInterface and follows the Component Interface Standardization pattern
 */
export class NoteStorageAdapter implements StorageInterface<Note, string> {
  /** The singleton instance */
  private static instance: NoteStorageAdapter | null = null;
  
  /** Logger instance for this class */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /** The note repository instance */
  public readonly repository: NoteRepository;

  /**
   * Create a new NoteStorageAdapter with explicit dependency injection
   * @param repository Note repository instance to use
   */
  constructor(repository: NoteRepository) {
    this.repository = repository;
  }
  
  /**
   * Factory method for creating an instance with dependencies from ServiceRegistry
   * Use this method instead of direct ServiceRegistry access
   * 
   * @returns A new NoteStorageAdapter instance with resolved dependencies
   */
  public static createWithDependencies(): NoteStorageAdapter {
    const serviceRegistry = ServiceRegistry.getInstance();
    const repository = serviceRegistry.getNoteRepository() as NoteRepository;
    return new NoteStorageAdapter(repository);
  }
  
  /**
   * Get the singleton instance of NoteStorageAdapter
   * 
   * @param repository Optional repository to use (useful for testing)
   * @returns The shared NoteStorageAdapter instance
   */
  public static getInstance(repository?: NoteRepository): NoteStorageAdapter {
    if (!NoteStorageAdapter.instance) {
      if (repository) {
        NoteStorageAdapter.instance = new NoteStorageAdapter(repository);
      } else {
        NoteStorageAdapter.instance = NoteStorageAdapter.createWithDependencies();
      }
    }
    return NoteStorageAdapter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    NoteStorageAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param repository Repository to use (required)
   * @returns A new NoteStorageAdapter instance
   */
  public static createFresh(repository: NoteRepository): NoteStorageAdapter {
    return new NoteStorageAdapter(repository);
  }

  /**
   * Create a new note
   * @param item The note data to create
   * @returns Promise that resolves to the ID of the created note
   */
  async create(item: Partial<Note>): Promise<string> {
    try {
      const now = new Date();
      
      // Prepare note data with required fields
      const noteData = {
        id: item.id || `note-${Date.now()}`,
        title: isNonEmptyString(item.title) ? item.title : '',
        content: isNonEmptyString(item.content) ? item.content : '',
        tags: item.tags || undefined,
        createdAt: item.createdAt || now, 
        updatedAt: item.updatedAt || now,
        embedding: item.embedding || undefined,
      };
      
      return await this.repository.insertNote(noteData);
    } catch (error) {
      this.logger.error('Failed to create note', { error, context: 'NoteStorageAdapter' });
      throw error;
    }
  }

  /**
   * Read a note by ID
   * @param id The ID of the note to read
   * @returns Promise that resolves to the note or null if not found
   */
  async read(id: string): Promise<Note | null> {
    try {
      const note = await this.repository.getNoteById(id);
      return note || null;
    } catch (error) {
      this.logger.error(`Failed to read note with ID ${id}`, { error, context: 'NoteStorageAdapter' });
      return null;
    }
  }

  /**
   * Update an existing note
   * @param id The ID of the note to update
   * @param updates The partial note with updates to apply
   * @returns Promise that resolves to true if update was successful
   */
  async update(id: string, updates: Partial<Note>): Promise<boolean> {
    try {
      // Ensure updatedAt is set
      const noteUpdates: Partial<Note> = {
        ...updates,
        updatedAt: new Date(),
      };
      
      // Use generic method from BaseRepository
      const note = await this.repository.getById(id);
      if (!note) return false;
      
      // Update the note in the database
      await this.repository.insert({
        ...note,
        ...noteUpdates,
      } as Note);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to update note with ID ${id}`, { error, context: 'NoteStorageAdapter' });
      return false;
    }
  }

  /**
   * Delete a note by ID
   * @param id The ID of the note to delete
   * @returns Promise that resolves to true if deletion was successful
   */
  async delete(id: string): Promise<boolean> {
    try {
      return await this.repository.deleteById(id);
    } catch (error) {
      this.logger.error(`Failed to delete note with ID ${id}`, { error, context: 'NoteStorageAdapter' });
      return false;
    }
  }

  /**
   * Search for notes matching criteria
   * @param criteria The search criteria to use
   * @returns Promise that resolves to an array of matching notes
   */
  async search(criteria: SearchCriteria): Promise<Note[]> {
    try {
      // Extract search parameters from criteria
      const query = criteria['query'] as string | undefined;
      const tags = criteria['tags'] as string[] | undefined;
      const limit = criteria['limit'] as number | undefined;
      const offset = criteria['offset'] as number | undefined;
      
      // If we have a query or tags, use the searchNotesByKeywords function
      if (query || tags) {
        return await this.repository.searchNotesByKeywords(query, tags, limit, offset);
      }
      
      // Otherwise, just return recent notes
      return await this.list({ limit, offset });
    } catch (error) {
      this.logger.error('Failed to search notes', { error, context: 'NoteStorageAdapter' });
      return [];
    }
  }

  /**
   * List notes with pagination
   * @param options Options for listing notes
   * @returns Promise that resolves to an array of notes
   */
  async list(options?: ListOptions): Promise<Note[]> {
    try {
      // Default limit and offset
      const limit = options?.limit || 10;
      
      return await this.repository.getRecentNotes(limit);
    } catch (error) {
      this.logger.error('Failed to list notes', { error, context: 'NoteStorageAdapter' });
      return [];
    }
  }

  /**
   * Count notes matching criteria
   * @param criteria Optional search criteria to count matching notes
   * @returns Promise that resolves to the count of matching notes
   */
  async count(_criteria?: SearchCriteria): Promise<number> {
    try {
      // For now, just return total count
      return await this.repository.getNoteCount();
    } catch (error) {
      this.logger.error('Failed to count notes', { error, context: 'NoteStorageAdapter' });
      return 0;
    }
  }

  /**
   * Get notes by specific source
   * @param source The source to filter by ("import", "conversation", "user-created")
   * @param limit Maximum number of notes to return
   * @param offset Number of notes to skip
   * @returns Promise that resolves to an array of matching notes
   */
  async findBySource(source: 'import' | 'conversation' | 'user-created', limit = 10, offset = 0): Promise<Note[]> {
    try {
      if (typeof this.repository.findBySource === 'function') {
        return await this.repository.findBySource(source, limit, offset);
      }
      // Fallback if the method doesn't exist
      return [];
    } catch (error) {
      this.logger.error(`Failed to find notes with source ${source}`, { error, context: 'NoteStorageAdapter' });
      return [];
    }
  }
  
  /**
   * Direct access to the repository for special operations
   * @returns The note repository instance
   */
  getRepository(): NoteRepository {
    return this.repository;
  }
}