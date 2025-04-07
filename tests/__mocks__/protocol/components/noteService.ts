/**
 * Standardized Note Service mocks
 * 
 * This file provides mock implementations for the Note Service components
 * following the standardized singleton pattern with getInstance(), resetInstance(), and createFresh().
 */

import { mock } from 'bun:test';

import type { Note } from '@models/note';
import { createMockEmbedding } from '@test/__mocks__/utils/embeddingUtils';

/**
 * Create a mock note with specified properties
 */
export function createMockNote(id: string, title: string, tags: string[] = []): Note {
  return {
    id,
    title,
    content: `This is the content of ${title}`,
    tags,
    embedding: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    source: 'import',
    confidence: null,
    conversationMetadata: null,
    verified: null,
  };
}

/**
 * Create a standard set of mock notes for testing
 */
export function createMockNotes(): Note[] {
  return [
    createMockNote('note-1', 'Test Note 1', ['tag1', 'tag2']),
    createMockNote('note-2', 'Test Note 2'),
  ];
}

/**
 * Mock Note Service implementation
 */
export class MockNoteService {
  private static instance: MockNoteService | null = null;
  private notes: Note[] = [];

  /**
   * Get singleton instance of MockNoteService
   */
  public static getInstance(): MockNoteService {
    if (!MockNoteService.instance) {
      MockNoteService.instance = new MockNoteService();
    }
    return MockNoteService.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockNoteService.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(initialNotes: Note[] = createMockNotes()): MockNoteService {
    return new MockNoteService(initialNotes);
  }

  constructor(initialNotes: Note[] = createMockNotes()) {
    this.notes = [...initialNotes];
  }

  // Core note operations
  getNoteById = mock<(id: string) => Promise<Note | null>>(async (id: string) => {
    return this.notes.find(note => note.id === id) || null;
  });

  getRecentNotes = mock<(limit?: number) => Promise<Note[]>>(async (limit: number = 5) => {
    return this.notes.slice(0, limit);
  });

  getAllNotes = mock<() => Promise<Note[]>>(async () => {
    return [...this.notes];
  });

  addNote = mock<(noteData: Partial<Note>) => Promise<Note>>(async (noteData: Partial<Note>) => {
    const id = `note-${Date.now()}`;
    const title = noteData.title || 'Untitled Note';
    const tags = noteData.tags || [];
    
    // Create the base note using createMockNote
    const newNote: Note = {
      ...createMockNote(id, title, tags),
      // Override with any specific properties provided
      content: noteData.content || `This is the content of ${title}`,
      embedding: noteData.embedding || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: noteData.source || 'import',
      confidence: noteData.confidence !== undefined ? noteData.confidence : null,
      conversationMetadata: noteData.conversationMetadata || null,
      verified: noteData.verified !== undefined ? noteData.verified : null,
    };
    
    this.notes.push(newNote);
    return newNote;
  });

  updateNote = mock<(id: string, update: Partial<Note>) => Promise<Note | null>>(async (id: string, update: Partial<Note>) => {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) return null;
    
    this.notes[index] = { ...this.notes[index], ...update, updatedAt: new Date() };
    return this.notes[index];
  });

  deleteNote = mock<(id: string) => Promise<boolean>>(async (id: string) => {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    return this.notes.length < initialLength;
  });

  // Search capabilities
  searchNotes = mock<(options: {
    query?: string;
    tags?: string[];
    limit?: number;
    semanticSearch?: boolean;
  }) => Promise<Note[]>>(async (options) => {
      const limit = options.limit || 5;
      return this.notes.slice(0, limit);
    });

  findRelated = mock<(noteId: string, limit?: number) => Promise<Note[]>>(async (noteId: string, limit: number = 5) => {
    return this.notes
      .filter(note => note.id !== noteId)
      .slice(0, limit);
  });

  // Embedding capabilities
  createEmbedding = mock<(text: string) => Promise<number[]>>(async (text: string) => {
    return createMockEmbedding(text);
  });

  findRelatedNotes = mock<(noteId: string, limit?: number) => Promise<Array<Note & { score: number }>>>(async (noteId: string, limit: number = 5) => {
    return this.notes
      .filter(note => note.id !== noteId)
      .slice(0, limit)
      .map(note => ({
        ...note,
        score: 0.85,
      }));
  });

  // Test helpers
  setNotes(notes: Note[]): void {
    this.notes = [...notes];
  }

  addNotes(notes: Note[]): void {
    this.notes.push(...notes);
  }

  clearNotes(): void {
    this.notes = [];
  }
}

/**
 * Mock NoteService Factory
 */
export class MockNoteServiceFactory {
  static createInstance(config: Record<string, unknown> = {}): Record<string, unknown> {
    const mockNotes = (config['initialNotes'] as Note[]) || createMockNotes();
    const noteService = MockNoteService.createFresh(mockNotes);
    
    return {
      getNoteById: noteService.getNoteById,
      getRecentNotes: noteService.getRecentNotes,
      getAllNotes: noteService.getAllNotes,
      addNote: noteService.addNote,
      updateNote: noteService.updateNote,
      deleteNote: noteService.deleteNote,
      searchNotes: noteService.searchNotes,
      findRelated: noteService.findRelated,
      createEmbedding: noteService.createEmbedding,
      findRelatedNotes: noteService.findRelatedNotes,
    };
  }
}