/**
 * NoteContext mock implementation
 * 
 * Provides a standardized mock for the NoteContext class.
 */

import { mock } from 'bun:test';

import type { Note, NoteSearchParams } from '@/models/note';

import { MockBaseContext } from './baseContext';
import type { MockNoteStorageAdapter } from './noteStorageAdapter';


/**
 * Mock implementation for the NoteContext
 */
export class MockNoteContext extends MockBaseContext {
  private static instance: MockNoteContext | null = null;
  
  // Mock services and dependencies
  protected storageAdapter: {
    read: (id: string) => Promise<Note | null>;
    search: (criteria: Record<string, unknown>) => Promise<Note[]>;
    create: (note: Partial<Note>) => Promise<string>;
    update: (id: string, note: Partial<Note>) => Promise<boolean>;
    delete: (id: string) => Promise<boolean>;
    list: (options?: Record<string, unknown>) => Promise<Note[]>;
    count: (criteria?: Record<string, unknown>) => Promise<number>;
    findBySource: (sourceId: string) => Promise<Note[]>;
    getRelated: (id: string, limit?: number) => Promise<Note[]>;
  };
  
  /**
   * Get singleton instance of MockNoteContext
   */
  public static override getInstance(): MockNoteContext {
    if (!MockNoteContext.instance) {
      MockNoteContext.instance = new MockNoteContext();
    }
    return MockNoteContext.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockNoteContext.instance = null;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static override createFresh(config: Record<string, unknown> = {}): MockNoteContext {
    return new MockNoteContext(config);
  }
  
  /**
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    super({
      name: config['name'] || 'NoteBrain',
      version: config['version'] || '1.0.0',
    });
    
    // Initialize mock storage adapter
    this.storageAdapter = {
      read: mock(() => Promise.resolve(null)),
      search: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve('note-123')),
      update: mock(() => Promise.resolve(true)),
      delete: mock(() => Promise.resolve(true)),
      list: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      findBySource: mock(() => Promise.resolve([])),
      getRelated: mock(() => Promise.resolve([])),
    };
    
    // Initialize mock resources
    this.resources = [
      {
        protocol: 'notes',
        path: 'list',
        handler: mock(() => Promise.resolve([])),
        name: 'List Notes',
        description: 'List all notes',
      },
      {
        protocol: 'notes',
        path: 'search',
        handler: mock(() => Promise.resolve([])),
        name: 'Search Notes',
        description: 'Search notes by criteria',
      },
    ];
    
    // Initialize mock tools
    this.tools = [
      {
        protocol: 'notes',
        path: 'get_note',
        handler: mock(() => Promise.resolve(null)),
        name: 'Get Note',
        description: 'Get a note by ID',
      },
      {
        protocol: 'notes',
        path: 'create_note',
        handler: mock(() => Promise.resolve('note-123')),
        name: 'Create Note',
        description: 'Create a new note',
      },
    ];
  }
  
  /**
   * Get the storage adapter
   */
  getStorage(): MockNoteStorageAdapter {
    return this.storageAdapter as unknown as MockNoteStorageAdapter;
  }
  
  /**
   * Set a new storage adapter
   */
  setStorage(storage: MockNoteStorageAdapter): void {
    this.storageAdapter = storage as unknown as typeof this.storageAdapter;
  }
  
  /**
   * Get a note by ID
   */
  async getNoteById(id: string): Promise<Note | null> {
    return this.storageAdapter.read(id);
  }
  
  /**
   * Search notes by criteria
   */
  async searchNotes(params: NoteSearchParams): Promise<Note[]> {
    return this.storageAdapter.search(params);
  }
  
  /**
   * Get recent notes
   */
  async getRecentNotes(limit = 10): Promise<Note[]> {
    return this.storageAdapter.list({ limit });
  }
  
  /**
   * Create a new note
   */
  async createNote(note: Partial<Note>): Promise<string> {
    return this.storageAdapter.create(note);
  }
  
  /**
   * Update a note
   */
  async updateNote(id: string, updates: Partial<Note>): Promise<boolean> {
    return this.storageAdapter.update(id, updates);
  }
  
  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    return this.storageAdapter.delete(id);
  }
  
  /**
   * Count notes
   */
  async getNoteCount(): Promise<number> {
    return this.storageAdapter.count();
  }
  
  /**
   * Find notes by source
   */
  async findNotesBySource(sourceId: string): Promise<Note[]> {
    return this.storageAdapter.findBySource(sourceId);
  }
  
  /**
   * Get related notes for a given note ID
   */
  async getRelatedNotes(id: string, limit = 5): Promise<Note[]> {
    return this.storageAdapter.getRelated(id, limit);
  }
}