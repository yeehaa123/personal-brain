/**
 * Mocks for NoteService tests
 */

import type { McpServer } from '@/mcp';
import type { NoteContext } from '@/mcp/contexts/notes';
import type { Note } from '@models/note';
import { createMockEmbedding } from '@test/utils/embeddingUtils';
import { setupMcpServerMocks } from '@test/utils/mcpUtils';



// Create a mock note with specified properties
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

// Create a standard set of mock notes for testing
export function createMockNotes(): Note[] {
  return [
    createMockNote('note-1', 'Test Note 1', ['tag1', 'tag2']),
    createMockNote('note-2', 'Test Note 2'),
  ];
}

// Mock Note Repository
export class MockNoteRepository {
  notes: Note[] = [];
  
  constructor(initialNotes: Note[] = createMockNotes()) {
    this.notes = [...initialNotes];
  }
  
  async getNoteById(id: string): Promise<Note | null> {
    return this.notes.find(note => note.id === id) || null;
  }
  
  async getRecentNotes(limit: number = 5): Promise<Note[]> {
    return this.notes.slice(0, limit);
  }
  
  async getAllNotes(): Promise<Note[]> {
    return [...this.notes];
  }
  
  async addNote(noteData: Partial<Note>): Promise<Note> {
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
  }
  
  async updateNote(id: string, update: Partial<Note>): Promise<Note | null> {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) return null;
    
    this.notes[index] = { ...this.notes[index], ...update, updatedAt: new Date() };
    return this.notes[index];
  }
  
  async deleteNote(id: string): Promise<boolean> {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    return this.notes.length < initialLength;
  }
}

// Mock Note Search Service
export class MockNoteSearchService {
  repository: MockNoteRepository;
  
  constructor(repository: MockNoteRepository) {
    this.repository = repository;
  }
  
  async searchNotes(options: {
    query?: string;
    tags?: string[];
    limit?: number;
    semanticSearch?: boolean;
  }): Promise<Note[]> {
    const limit = options.limit || 5;
    return this.repository.notes.slice(0, limit);
  }
  
  async findRelated(noteId: string, limit: number = 5): Promise<Note[]> {
    // Exclude the note itself from results
    return this.repository.notes
      .filter(note => note.id !== noteId)
      .slice(0, limit);
  }
}

// Mock Note Embedding Service
export class MockNoteEmbeddingService {
  repository: MockNoteRepository;
  
  constructor(repository: MockNoteRepository) {
    this.repository = repository;
  }
  
  async createEmbedding(text: string): Promise<number[]> {
    return createMockEmbedding(text);
  }
  
  async findRelatedNotes(noteId: string, limit: number = 5): Promise<Array<Note & { score: number }>> {
    // Return all notes except the one provided, with a mock similarity score
    return this.repository.notes
      .filter(note => note.id !== noteId)
      .slice(0, limit)
      .map(note => ({
        ...note,
        score: 0.85,
      }));
  }
}

// Mock NoteContext for NoteService tests
export class MockNoteContext implements Partial<NoteContext> {
  repository: MockNoteRepository;
  searchService: MockNoteSearchService;
  embeddingService: MockNoteEmbeddingService;
  private mcpServer: McpServer;
  
  constructor() {
    this.repository = new MockNoteRepository();
    this.searchService = new MockNoteSearchService(this.repository);
    this.embeddingService = new MockNoteEmbeddingService(this.repository);
    this.mcpServer = setupMcpServerMocks();
  }
  
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
}