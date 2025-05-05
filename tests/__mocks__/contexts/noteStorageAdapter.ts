/**
 * Mock NoteStorageAdapter for testing
 * 
 * Provides a standardized mock implementation following the Component Interface 
 * Standardization pattern with getInstance(), resetInstance(), and createFresh()
 */

import { mock } from 'bun:test';

import type { ListOptions, SearchCriteria } from '@/contexts/storageInterface';
import type { Note } from '@/models/note';
import type { NoteRepository } from '@/services/notes/noteRepository';

/**
 * Mock implementation of NoteStorageAdapter
 */
export class MockNoteStorageAdapter {
  private static instance: MockNoteStorageAdapter | null = null;
  
  
  // Mocked note repository
  public readonly repository: {
    getNoteById: (id: string) => Promise<Note | undefined>;
    insertNote: (note: Partial<Note>) => Promise<string>;
    deleteById: (id: string) => Promise<boolean>;
    getById: (id: string) => Promise<Note | undefined>;
    insert: (note: Note) => Promise<Note>;
    update: (id: string, updates: Partial<Note>) => Promise<boolean>;
    searchNotesByKeywords: (query?: string, tags?: string[], limit?: number, offset?: number) => Promise<Note[]>;
    getRecentNotes: (limit?: number) => Promise<Note[]>;
    getNoteCount: () => Promise<number>;
    findBySource: (source: string, limit?: number, offset?: number) => Promise<Note[]>;
  };
  
  // Mock notes for testing
  notes: Note[] = [];
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): MockNoteStorageAdapter {
    if (!MockNoteStorageAdapter.instance) {
      MockNoteStorageAdapter.instance = new MockNoteStorageAdapter();
    }
    return MockNoteStorageAdapter.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockNoteStorageAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance
   * 
   * @param initialNotes Optional array of notes to initialize with
   * @returns A new MockNoteStorageAdapter instance
   */
  public static createFresh(initialNotes: Note[] = []): MockNoteStorageAdapter {
    const adapter = new MockNoteStorageAdapter();
    adapter.notes = [...initialNotes];
    return adapter;
  }
  
  /**
   * Constructor
   */
  constructor() {
    this.repository = {
      getNoteById: mock((id: string) => Promise.resolve(this.notes.find(n => n.id === id))),
      insertNote: mock((note: Partial<Note>) => Promise.resolve(note.id || 'note-123')), // Fixed ID for testing
      deleteById: mock((id: string) => {
        const initialLength = this.notes.length;
        this.notes = this.notes.filter(n => n.id !== id);
        return Promise.resolve(initialLength > this.notes.length);
      }),
      getById: mock((id: string) => Promise.resolve(this.notes.find(n => n.id === id))),
      insert: mock((note: Note) => {
        const index = this.notes.findIndex(n => n.id === note.id);
        if (index >= 0) {
          this.notes[index] = note;
        } else {
          this.notes.push(note);
        }
        return Promise.resolve(note);
      }),
      update: mock((id: string, updates: Partial<Note>) => {
        const index = this.notes.findIndex(n => n.id === id);
        if (index >= 0) {
          this.notes[index] = { ...this.notes[index], ...updates };
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }),
      searchNotesByKeywords: mock((query?: string, tags?: string[], limit?: number) => {
        let result = [...this.notes];
        
        // Filter by query if provided
        if (query) {
          const lowerQuery = query.toLowerCase();
          result = result.filter(n => {
            return (
              (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
              (n.content && n.content.toLowerCase().includes(lowerQuery))
            );
          });
        }
        
        // Filter by tags if provided
        if (tags && tags.length > 0) {
          result = result.filter(n => {
            return n.tags && n.tags.some(tag => tags.includes(tag));
          });
        }
        
        // Apply limit if provided
        if (limit && limit > 0) {
          result = result.slice(0, limit);
        }
        
        return Promise.resolve(result);
      }),
      getRecentNotes: mock((limit?: number) => {
        const sorted = [...this.notes].sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA; // Descending order
        });
        
        return Promise.resolve(limit ? sorted.slice(0, limit) : sorted);
      }),
      getNoteCount: mock(() => Promise.resolve(this.notes.length)),
      findBySource: mock((source: string, limit?: number) => {
        const result = this.notes.filter(n => n.source === source);
        return Promise.resolve(limit ? result.slice(0, limit) : result);
      }),
    };
  }
  
  /**
   * Create a new note
   */
  async create(item: Partial<Note>): Promise<string> {
    return this.repository.insertNote(item);
  }
  
  /**
   * Read a note by ID
   */
  async read(id: string): Promise<Note | null> {
    const result = await this.repository.getNoteById(id);
    return result || null;
  }
  
  /**
   * Update an existing note
   */
  async update(id: string, updates: Partial<Note>): Promise<boolean> {
    return this.repository.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }
  
  /**
   * Delete a note
   */
  async delete(id: string): Promise<boolean> {
    return this.repository.deleteById(id);
  }
  
  /**
   * Search for notes
   */
  async search(criteria: SearchCriteria): Promise<Note[]> {
    const query = criteria['query'] as string | undefined;
    const tags = criteria['tags'] as string[] | undefined;
    const limit = criteria['limit'] as number | undefined;
    
    if (query || tags) {
      return this.repository.searchNotesByKeywords(query, tags, limit);
    }
    
    return this.list({ limit });
  }
  
  /**
   * List notes
   */
  async list(options?: ListOptions): Promise<Note[]> {
    const limit = options?.limit || 10;
    return this.repository.getRecentNotes(limit);
  }
  
  /**
   * Count notes
   */
  async count(_criteria?: SearchCriteria): Promise<number> {
    return this.repository.getNoteCount();
  }
  
  /**
   * Find notes by source
   */
  async findBySource(source: string, limit = 10, offset = 0): Promise<Note[]> {
    return this.repository.findBySource(source, limit, offset);
  }
  
  /**
   * Get the repository
   */
  getRepository(): NoteRepository {
    return this.repository as unknown as NoteRepository;
  }
}