/**
 * Mock Note Repository Implementation
 * 
 * This file provides a standardized mock implementation of the Note Repository
 * for use in tests across the codebase.
 */

import { notes } from '@/db/schema';
import type { NoteRepository } from '@/services/notes/noteRepository';
import type { Note } from '@models/note';

import { createMockNote, createMockNotes } from '@test/__mocks__/models/note';

/**
 * MockNoteRepository class with standardized interface
 * 
 * This repository mock includes:
 * - Singleton pattern with getInstance() and resetInstance()
 * - In-memory storage for notes
 * - CRUD operations (create, read, update, delete)
 * - Search and query operations
 * - Methods for test setup and verification
 */
export class MockNoteRepository implements Partial<NoteRepository> {
  private static instance: MockNoteRepository | null = null;
  notes: Note[] = [];
  
  /**
   * Private constructor to enforce singleton pattern
   */
  constructor(initialNotes: Note[] = createMockNotes()) {
    this.notes = [...initialNotes];
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockNoteRepository {
    if (!MockNoteRepository.instance) {
      MockNoteRepository.instance = new MockNoteRepository();
    }
    return MockNoteRepository.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockNoteRepository.instance = null;
  }
  
  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(initialNotes: Note[] = createMockNotes()): MockNoteRepository {
    return new MockNoteRepository(initialNotes);
  }
  
  /**
   * Get a note by ID - BaseRepository method
   */
  getById = async (id: string): Promise<Note | undefined> => {
    return this.notes.find(note => note.id === id);
  };
  
  /**
   * Insert note - BaseRepository method
   */
  insert = async (note: Note): Promise<Note> => {
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = note;
      return note;
    }
    this.notes.push(note);
    return note;
  };
  
  /**
   * Delete note by ID - BaseRepository method
   */
  deleteById = async (id: string): Promise<boolean> => {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    return this.notes.length < initialLength;
  };
  
  /**
   * Get a note by ID - matches the real implementation
   */
  getNoteById = async (id: string): Promise<Note | undefined> => {
    const note = this.notes.find(note => note.id === id);
    return note ? note : undefined;
  };
  
  /**
   * Get all notes
   */
  getAll = async (): Promise<Note[]> => {
    return [...this.notes];
  };
  
  /**
   * Create a new note
   */
  create = async (note: Omit<Note, 'id'>): Promise<Note> => {
    const newNote = { ...note, id: `note-${Date.now()}` } as Note;
    this.notes.push(newNote);
    return newNote;
  };
  
  /**
   * Insert a new note - matches the real implementation
   */
  insertNote = async (noteData: {
    id?: string;
    title: string;
    content: string;
    embedding?: number[];
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];
  }): Promise<string> => {
    const now = new Date();
    const id = noteData.id || `note-${Date.now()}`;
    const createdAt = noteData.createdAt || now;
    const updatedAt = noteData.updatedAt || now;
    
    const newNote: Note = {
      id,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      embedding: noteData.embedding || null,
      createdAt,
      updatedAt,
      tags: noteData.tags || [],
      source: 'import',
      confidence: null,
      conversationMetadata: null,
      verified: null,
    };
    
    this.notes.push(newNote);
    return id;
  };
  
  /**
   * Update an existing note
   */
  update = async (id: string, update: Partial<Note>): Promise<Note | null> => {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) return null;
    
    this.notes[index] = { ...this.notes[index], ...update };
    return this.notes[index];
  };
  
  /**
   * Update a note's embedding - matches the real implementation
   */
  updateNoteEmbedding = async (noteId: string, embedding: number[]): Promise<void> => {
    const index = this.notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
      this.notes[index] = { ...this.notes[index], embedding };
    }
  };
  
  /**
   * Delete a note by ID
   */
  delete = async (id: string): Promise<boolean> => {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    return this.notes.length < initialLength;
  };
  
  /**
   * Search notes by keywords - matches the real implementation
   */
  searchNotesByKeywords = async (
    query?: string, 
    tags?: string[], 
    limit: number = 10, 
    offset: number = 0,
  ): Promise<Note[]> => {
    let results = [...this.notes];
    
    // Filter by query if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(note => 
        note.title.toLowerCase().includes(lowerQuery) || 
        note.content.toLowerCase().includes(lowerQuery),
      );
    }
    
    // Filter by tags if provided
    if (tags && tags.length > 0) {
      results = results.filter(note => 
        note.tags?.some(tag => tags.includes(tag)),
      );
    }
    
    // Sort by updatedAt in descending order
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    // Apply pagination
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, offset);
    return results.slice(safeOffset, safeOffset + safeLimit);
  };
  
  /**
   * Get recent notes with optional limit - matches the real implementation
   */
  getRecentNotes = async (limit: number = 5): Promise<Note[]> => {
    // Sort by updatedAt in descending order
    const sorted = [...this.notes].sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    // Apply safe limits
    const safeLimit = Math.max(1, Math.min(limit, 100));
    return sorted.slice(0, safeLimit);
  };
  
  /**
   * Find notes by source - matches the real implementation
   */
  findBySource = async (source: 'import' | 'conversation' | 'user-created', limit = 10, offset = 0): Promise<Note[]> => {
    const results = this.notes.filter(note => note.source === source);
    const sorted = results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return sorted.slice(offset, offset + limit);
  };
  
  /**
   * Get notes without embeddings - matches the real implementation
   */
  getNotesWithoutEmbeddings = async (): Promise<Note[]> => {
    return this.notes.filter(note => note.embedding === null);
  };
  
  /**
   * Get notes with embeddings - matches the real implementation
   */
  getNotesWithEmbeddings = async (): Promise<Note[]> => {
    return this.notes.filter(note => note.embedding !== null);
  };
  
  /**
   * Implementation of the required abstract methods from BaseRepository
   * These are needed for TypeScript compatibility but aren't used in tests
   */
  get table() {
    return notes;
  }
  
  get entityName(): string {
    return 'note';
  }
  
  getIdColumn() {
    return notes.id;
  }
  
  /**
   * Mock implementation of insertNoteChunk
   */
  insertNoteChunk = async (chunk: {
    noteId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
  }): Promise<string> => {
    return `chunk-${chunk.noteId}-${chunk.chunkIndex}`;
  };
  
  /**
   * Get other notes with embeddings - matches the real implementation
   */
  getOtherNotesWithEmbeddings = async (excludeNoteId: string): Promise<Note[]> => {
    return this.notes.filter(note => 
      note.id !== excludeNoteId && note.embedding !== null,
    );
  };
  
  /**
   * Get count of notes - matches the real implementation
   */
  getNoteCount = async (): Promise<number> => {
    return this.notes.length;
  };
  
  /**
   * BaseRepository getCount implementation
   */
  getCount = async (): Promise<number> => {
    return this.notes.length;
  };
  
  /**
   * Find notes by conversation metadata - matches the real implementation
   */
  findByConversationMetadata = async (field: string, value: string): Promise<Note[]> => {
    return this.notes.filter(note => {
      if (!note.conversationMetadata) return false;
      
      // Type safe check for known fields
      if (field === 'conversationId' && note.conversationMetadata.conversationId === value) return true;
      if (field === 'userName' && note.conversationMetadata.userName === value) return true;
      if (field === 'promptSegment' && note.conversationMetadata.promptSegment === value) return true;
      
      return false;
    });
  };
  
  /**
   * Reset repository state
   */
  reset(): void {
    this.notes = createMockNotes();
  }
  
  /**
   * Clear all notes
   */
  clear(): void {
    this.notes = [];
  }
  
  /**
   * Add test notes
   */
  addTestNotes(count: number = 3): Note[] {
    const newNotes: Note[] = [];
    for (let i = 1; i <= count; i++) {
      const note = createMockNote(`test-note-${i}`, `Test Note ${i}`, [`tag${i}`]);
      this.notes.push(note);
      newNotes.push(note);
    }
    return newNotes;
  }
}

/**
 * Create a mock note repository
 */
export function createMockNoteRepository(initialNotes?: Note[]): MockNoteRepository {
  return MockNoteRepository.createFresh(initialNotes);
}

/**
 * Additional test utilities
 */
export const NoteRepositoryUtils = {
  createRepository: createMockNoteRepository,
  createWithNotes: (notes: Note[]): MockNoteRepository => createMockNoteRepository(notes),
};