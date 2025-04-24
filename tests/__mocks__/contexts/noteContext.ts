/**
 * NoteContext mock implementation
 * 
 * Provides a standardized mock for the NoteContext class.
 * Implements the full FullContextInterface through BaseContext.
 */

import { mock } from 'bun:test';

import type { FormattingOptions } from '@/contexts/formatterInterface';
import type { Note, NoteSearchParams } from '@/models/note';

import { MockBaseContext } from './baseContext';
import { MockNoteFormatter } from './notes/noteFormatter';
import { MockNoteStorageAdapter } from './noteStorageAdapter';


/**
 * Mock implementation for the NoteContext
 * Implements FullContextInterface through BaseContext
 */
export class MockNoteContext extends MockBaseContext<
  MockNoteStorageAdapter,
  MockNoteFormatter,
  Note,
  string
> {
  private static instance: MockNoteContext | null = null;

  // Mock storage implementation - override protected property from base class
  protected override storage: MockNoteStorageAdapter;

  // Mock formatter implementation - override protected property from base class
  protected override formatter: MockNoteFormatter;

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
   * Factory method that creates a new instance with dependencies
   * @param config Configuration options or dependencies
   * @returns A new MockNoteContext instance
   */
  public static createWithDependencies(config: Record<string, unknown> = {}): MockNoteContext {
    // Handle the case where storage or formatter are provided as dependencies
    const storage = config['storage'] as MockNoteStorageAdapter;
    const formatter = config['formatter'] as MockNoteFormatter;

    const instance = new MockNoteContext(config);

    if (storage) {
      instance.setStorage(storage);
    }

    if (formatter) {
      instance.formatter = formatter;
    }

    return instance;
  }

  /**
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    super({
      name: config['name'] || 'NoteBrain',
      version: config['version'] || '1.0.0',
    });

    // Initialize storage adapter
    this.storage = MockNoteStorageAdapter.createFresh();

    // Initialize formatter
    this.formatter = MockNoteFormatter.createFresh();

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
   * Overrides the base class implementation
   */
  override getStorage(): MockNoteStorageAdapter {
    return this.storage;
  }

  /**
   * Get the formatter implementation
   * Overrides the base class implementation
   */
  override getFormatter(): MockNoteFormatter {
    return this.formatter;
  }

  /**
   * Format data using the context's formatter
   * Overrides the base class implementation
   */
  override format(data: Note, options?: FormattingOptions): string {
    return this.formatter.format(data, options);
  }

  /**
   * Set a new storage adapter
   */
  setStorage(storage: MockNoteStorageAdapter): void {
    this.storage = storage;
  }

  /**
   * Get a note by ID
   */
  async getNoteById(id: string): Promise<Note | null> {
    return this.storage.read(id);
  }

  /**
   * Search notes by criteria
   */
  async searchNotes(params: NoteSearchParams): Promise<Note[]> {
    return this.storage.search(params);
  }

  /**
   * Get recent notes
   */
  async getRecentNotes(limit = 10): Promise<Note[]> {
    return this.storage.list({ limit });
  }

  /**
   * Create a new note
   */
  async createNote(note: Partial<Note>): Promise<string> {
    return this.storage.create(note);
  }

  /**
   * Update a note
   */
  async updateNote(id: string, updates: Partial<Note>): Promise<boolean> {
    return this.storage.update(id, updates);
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  /**
   * Count notes
   */
  async getNoteCount(): Promise<number> {
    return this.storage.count();
  }

  /**
   * Find notes by source
   */
  async findNotesBySource(sourceId: string): Promise<Note[]> {
    return this.storage.findBySource(sourceId);
  }

  /**
   * Get related notes for a given note ID
   */
  async getRelatedNotes(_id: string, _limit = 5): Promise<Note[]> {
    // MockNoteStorageAdapter doesn't have a getRelated method
    // In a real implementation, this would delegate to the storage adapter's getRelated method
    // For mock purposes, we'll just return an empty array
    return [];
  }

  /**
   * Instance method that delegates to static createWithDependencies
   * Required for FullContextInterface compatibility
   * @param dependencies Dependencies for the context
   * @returns A new instance with provided dependencies
   */
  override createWithDependencies(dependencies: Record<string, unknown>): MockNoteContext {
    return MockNoteContext.createWithDependencies(dependencies);
  }
}
