/**
 * NoteStorageAdapter for adapting the NoteRepository to the StorageInterface
 * 
 * This adapter provides a bridge between the generic StorageInterface pattern
 * and the specific implementation details of the NoteRepository.
 */

import type { Note } from '@/models/note';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { getService, ServiceIdentifiers } from '@/services/serviceRegistry';
import logger from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

import type { ListOptions, SearchCriteria, StorageInterface } from '../../core/storageInterface';

/**
 * Adapter to provide standard StorageInterface for notes
 */
export class NoteStorageAdapter implements StorageInterface<Note> {
  private repository: NoteRepository;

  /**
   * Create a new NoteStorageAdapter
   * @param repository Optional repository to use (useful for testing)
   */
  constructor(repository?: NoteRepository) {
    this.repository = repository || getService<NoteRepository>(ServiceIdentifiers.NoteRepository);
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
      logger.error('Failed to create note', { error, context: 'NoteStorageAdapter' });
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
      logger.error(`Failed to read note with ID ${id}`, { error, context: 'NoteStorageAdapter' });
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
      logger.error(`Failed to update note with ID ${id}`, { error, context: 'NoteStorageAdapter' });
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
      logger.error(`Failed to delete note with ID ${id}`, { error, context: 'NoteStorageAdapter' });
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
      logger.error('Failed to search notes', { error, context: 'NoteStorageAdapter' });
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
      logger.error('Failed to list notes', { error, context: 'NoteStorageAdapter' });
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
      logger.error('Failed to count notes', { error, context: 'NoteStorageAdapter' });
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
      logger.error(`Failed to find notes with source ${source}`, { error, context: 'NoteStorageAdapter' });
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