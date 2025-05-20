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
  public static getInstance(): NoteRepository {
    if (!MockNoteRepository.instance) {
      MockNoteRepository.instance = new MockNoteRepository();
    }
    return MockNoteRepository.instance as unknown as NoteRepository;
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
  public static createFresh(initialNotes: Note[] = createMockNotes()): NoteRepository {
    return new MockNoteRepository(initialNotes) as unknown as NoteRepository;
  }

  /**
   * Get a note by ID - BaseRepository method
   */
  getById = async (id: string): Promise<Note> => {
    const note = this.notes.find(note => note.id === id);
    if (!note) {
      throw new Error(`Note with ID ${id} not found`);
    }
    return note;
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
   * Set the notes array (helper for tests)
   */
  setNotes(notes: Note[]): void {
    this.notes = [...notes];
  }

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
    const now = new Date();
    const id = `note-${Date.now()}`;
    const newNote: Note = {
      id,
      title: note.title || 'Untitled Note',
      content: note.content || '',
      tags: note.tags || [],
      source: note.source || 'user-created',
      embedding: note.embedding || [0.1, 0.2, 0.3, 0.4],
      confidence: note.confidence || null,
      conversationMetadata: note.conversationMetadata || null,
      verified: note.verified || null,
      createdAt: note.createdAt || now,
      updatedAt: note.updatedAt || now,
    };
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
    source?: 'import' | 'conversation' | 'user-created';
  }): Promise<string> => {
    const now = new Date();
    const id = noteData.id || `note-${Date.now()}`;
    const createdAt = noteData.createdAt || now;
    const updatedAt = noteData.updatedAt || now;

    const newNote: Note = {
      id,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      embedding: noteData.embedding || [0.1, 0.2, 0.3, 0.4],
      createdAt,
      updatedAt,
      tags: noteData.tags || [],
      source: noteData.source || 'user-created',
      confidence: null,
      conversationMetadata: null,
      verified: null,
    };

    this.notes.push(newNote);
    return id;
  };

  /**
   * Update an existing note - matches the BaseRepository implementation
   */
  update = async (id: string, updates: Partial<Note>): Promise<Note> => {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) {
      throw new Error(`Note with ID ${id} not found`);
    }

    this.notes[index] = { ...this.notes[index], ...updates };
    return this.notes[index];
  };

  /**
   * Find notes related to a conversation - matches the interface
   */
  findNotesByConversationId = async (conversationId: string): Promise<Note[]> => {
    return this.notes.filter(note => {
      if (note.conversationMetadata && typeof note.conversationMetadata === 'object') {
        return note.conversationMetadata.conversationId === conversationId;
      }
      return false;
    });
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
   * Find notes matching criteria - matches IBaseRepository interface
   */
  find = async (): Promise<Note[]> => {
    return [...this.notes];
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
  getRecentNotes = async (limit: number = 5, offset: number = 0): Promise<Note[]> => {
    // Sort by updatedAt in descending order
    const sorted = [...this.notes].sort((a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    // Apply safe limits
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, offset);
    return sorted.slice(safeOffset, safeOffset + safeLimit);
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
   * Count method - matches the real implementation
   */
  count = async (): Promise<number> => {
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
   * Search notes with filters - matches the real implementation
   */
  search = async (params: {
    query?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    source?: 'import' | 'conversation' | 'user-created' | 'landing-page' | 'profile';
    conversationId?: string;
  } = {}): Promise<Note[]> => {
    const { query, tags, limit = 10, offset = 0, source, conversationId } = params;
    
    // Start with all notes
    let results = [...this.notes];
    
    // Filter by source if specified
    if (source) {
      results = results.filter(note => note.source === source);
    }
    
    // Filter by conversationId if specified
    if (conversationId) {
      results = results.filter(note => 
        note.conversationMetadata?.conversationId === conversationId,
      );
    }
    
    // Filter by keywords if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      // Split by spaces and filter out short words
      const keywords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
      
      if (keywords.length > 0) {
        results = results.filter(note => {
          const lowerTitle = note.title.toLowerCase();
          const lowerContent = note.content.toLowerCase();
          
          return keywords.some(keyword => 
            lowerTitle.includes(keyword) || lowerContent.includes(keyword),
          );
        });
      }
    }
    
    // Filter by tags if provided
    if (tags && tags.length > 0) {
      results = results.filter(note => 
        tags.some(tag => note.tags?.includes(tag)),
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
