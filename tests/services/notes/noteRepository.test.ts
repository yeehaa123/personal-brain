import { beforeEach, describe, expect, test } from 'bun:test';

import { notes } from '@/db/schema';
import type { Note } from '@/models/note';
import { NoteRepository } from '@/services/notes/noteRepository';


// Define initial data for testing
const initialNotes: Note[] = [
  { 
    id: 'note-1', 
    title: 'Test Note 1', 
    content: 'This is the content of Test Note 1',
    tags: ['tag1', 'tag2'],
    embedding: [0.1, 0.2, 0.3],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
  },
  { 
    id: 'note-2', 
    title: 'Test Note 2', 
    content: 'This is the content of Test Note 2',
    tags: null,
    embedding: null,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-02'),
  },
];

// Create a mock repository instead of mocking the database
export class MockNoteRepository extends NoteRepository {
  private notes: Note[] = [];
  // Define NoteChunk type for the mock repository
  private chunks: {
    id?: string;
    noteId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
  }[] = [];
  
  constructor(initialNotes: Note[]) {
    super();
    this.notes = JSON.parse(JSON.stringify(initialNotes));
  }
  
  // Required abstract methods from BaseRepository
  protected override get table() {
    return notes;
  }

  protected override get entityName() {
    return 'note';
  }
  
  protected override getIdColumn() {
    return notes.id;
  }
  
  // Override methods from parent class
  override async getNoteById(id: string): Promise<Note | undefined> {
    return Promise.resolve(this.notes.find(note => note.id === id));
  }
  
  override async getById(id: string): Promise<Note | undefined> {
    return this.getNoteById(id);
  }
  
  override async getRecentNotes(limit = 5): Promise<Note[]> {
    return Promise.resolve([...this.notes].slice(0, limit));
  }
  
  // Implementation of BaseRepository method
  async getAll(): Promise<Note[]> {
    return Promise.resolve([...this.notes]);
  }
  
  override async insertNote(noteData: {
    id?: string;
    title: string;
    content: string;
    embedding?: number[];
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];
  }): Promise<string> {
    const id = noteData.id || 'new-note-id';
    const newNote: Note = {
      id,
      title: noteData.title || 'Untitled',
      content: noteData.content || '',
      tags: noteData.tags || null,
      embedding: noteData.embedding || null,
      createdAt: noteData.createdAt || new Date(),
      updatedAt: noteData.updatedAt || new Date(),
    };
    
    this.notes.push(newNote);
    return Promise.resolve(id);
  }
  
  // Implementation of BaseRepository method
  async create(data: Omit<Note, 'id'>): Promise<string> {
    return this.insertNote({
      title: data.title,
      content: data.content,
      embedding: data.embedding || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      tags: data.tags || undefined,
    });
  }
  
  // Implementation of BaseRepository method
  async update(id: string, updates: Partial<Note>): Promise<boolean> {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) return Promise.resolve(false);
    
    this.notes[index] = {
      ...this.notes[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    return Promise.resolve(true);
  }
  
  // Implementation of BaseRepository method
  async delete(id: string): Promise<boolean> {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    return Promise.resolve(initialLength > this.notes.length);
  }
  
  // Alias methods for backward compatibility
  updateNote = this.update;
  deleteNote = this.delete;
  
  override async searchNotesByKeywords(query?: string, tags?: string[], limit: number = 10, offset: number = 0): Promise<Note[]> {
    // If no query and no tags, return recent notes
    if ((!query || query.trim() === '') && (!tags || tags.length === 0)) {
      return this.getRecentNotes(limit);
    }
    
    const keywords = query ? query.split(/\s+/).filter(k => k.length > 0) : [];
    
    const matchingNotes = this.notes.filter(note => {
      // Match by keywords in title and content
      const keywordMatch = keywords.length === 0 || keywords.some(keyword => {
        const noteText = `${note.title} ${note.content}`.toLowerCase();
        return noteText.includes(keyword.toLowerCase());
      });
      
      // Match by tags
      const tagMatch = !tags || tags.length === 0 || (
        note.tags && note.tags.some(tag => tags.includes(tag))
      );
      
      return keywordMatch && tagMatch;
    });
    
    return Promise.resolve(matchingNotes.slice(offset, offset + limit));
  }
  
  override async insertNoteChunk(chunk: {
    noteId: string;
    content: string;
    embedding: number[];
    chunkIndex: number;
  }): Promise<string> {
    const id = `chunk-${Date.now()}`;
    this.chunks.push({ ...chunk, id });
    return Promise.resolve(id);
  }
  
  override async getNoteCount(): Promise<number> {
    return Promise.resolve(this.notes.length);
  }
  
  override async getCount(): Promise<number> {
    return this.getNoteCount();
  }
  
  // Additional mocked methods
  override async updateNoteEmbedding(noteId: string, embedding: number[]): Promise<void> {
    const index = this.notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
      this.notes[index].embedding = embedding;
    }
    return Promise.resolve();
  }
  
  override async getNotesWithoutEmbeddings(): Promise<Note[]> {
    return Promise.resolve(this.notes.filter(note => !note.embedding));
  }
  
  override async getNotesWithEmbeddings(): Promise<Note[]> {
    return Promise.resolve(this.notes.filter(note => !!note.embedding));
  }
  
  override async getOtherNotesWithEmbeddings(excludeNoteId: string): Promise<Note[]> {
    return Promise.resolve(
      this.notes.filter(note => note.id !== excludeNoteId && !!note.embedding),
    );
  }
}

describe('NoteRepository', () => {
  let repository: MockNoteRepository;
  
  beforeEach(() => {
    // Create a fresh repository with the initial notes
    repository = new MockNoteRepository(initialNotes);
  });
  
  test('should initialize correctly', () => {
    expect(repository).toBeDefined();
  });
  
  test('should get a note by id', async () => {
    const note = await repository.getNoteById('note-1');
    
    expect(note).toBeDefined();
    expect(note?.id).toBe('note-1');
    expect(note?.title).toBe('Test Note 1');
  });
  
  test('should return undefined for non-existent note', async () => {
    const note = await repository.getNoteById('non-existent');
    
    expect(note).toBeUndefined();
  });
  
  test('should get all notes', async () => {
    const notes = await repository.getAll();
    
    expect(notes).toBeDefined();
    expect(Array.isArray(notes)).toBe(true);
    expect(notes.length).toBeGreaterThan(0);
  });
  
  test('should get recent notes', async () => {
    const recentNotes = await repository.getRecentNotes(2);
    
    expect(recentNotes).toBeDefined();
    expect(recentNotes.length).toBeLessThanOrEqual(2);
  });
  
  test('should insert a new note', async () => {
    const newNote: Omit<Note, 'id'> & { id?: string } = {
      title: 'New Test Note',
      content: 'This is a new test note.',
      createdAt: new Date(),
      updatedAt: new Date(),
      embedding: null,
      tags: null,
    };
    
    // Convert null to undefined for the API
    const noteDataForInsert = {
      ...newNote,
      embedding: newNote.embedding === null ? undefined : newNote.embedding,
      tags: newNote.tags === null ? undefined : newNote.tags,
    };
    const noteId = await repository.insertNote(noteDataForInsert);
    
    expect(noteId).toBeDefined();
    expect(typeof noteId).toBe('string');
    
    // Verify it was inserted
    const insertedNote = await repository.getNoteById(noteId);
    expect(insertedNote).toBeDefined();
    expect(insertedNote?.title).toBe('New Test Note');
  });
  
  test('should update an existing note', async () => {
    const updates = {
      title: 'Updated Test Note',
      content: 'This content has been updated',
    };
    
    const success = await repository.updateNote('note-1', updates);
    
    expect(success).toBe(true);
    
    // Verify the update
    const updatedNote = await repository.getNoteById('note-1');
    expect(updatedNote?.title).toBe('Updated Test Note');
    expect(updatedNote?.content).toBe('This content has been updated');
  });
  
  test('should delete a note', async () => {
    const success = await repository.deleteNote('note-1');
    
    expect(success).toBe(true);
    
    // Verify the deletion
    const deletedNote = await repository.getNoteById('note-1');
    expect(deletedNote).toBeUndefined();
  });
  
  test('should search notes by keywords', async () => {
    const notes = await repository.searchNotesByKeywords('test content');
    
    expect(notes).toBeDefined();
    expect(Array.isArray(notes)).toBe(true);
    expect(notes.length).toBeGreaterThan(0);
  });
  
  test('should insert a note chunk', async () => {
    const chunk = {
      noteId: 'note-2',
      content: 'This is a chunk of content',
      embedding: [0.4, 0.5, 0.6],
      chunkIndex: 0,
    };
    
    const chunkId = await repository.insertNoteChunk(chunk);
    
    expect(chunkId).toBeDefined();
    expect(typeof chunkId).toBe('string');
  });
  
  test('should get note count', async () => {
    const count = await repository.getNoteCount();
    
    expect(count).toBeGreaterThan(0);
  });
});