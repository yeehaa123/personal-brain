import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ContextCapabilities, ContextStatus, MCPContext, MCPFormatterInterface, MCPStorageInterface } from '@/contexts/MCPContext';
import type { Note } from '@/models/note';
import type { NoteSearchOptions } from '@/services/notes/noteSearchService';

/**
 * Mock implementation of MCPNoteContext for testing
 */
export class MockMCPNoteContext implements MCPContext {
  private static instance: MockMCPNoteContext | null = null;
  private notes: Map<string, Note> = new Map();
  private mockFormatter: MCPFormatterInterface = {
    format: (data: unknown) => JSON.stringify(data, null, 2),
  };
  private mockStorage: MCPStorageInterface = {
    create: async (_data: unknown) => `mock-id-${Date.now()}`,
    read: async (id: string) => this.notes.get(id) || null,
    update: async (_id: string, _data: unknown) => true,
    delete: async (id: string) => {
      this.notes.delete(id);
      return true;
    },
    list: async () => Array.from(this.notes.values()),
    count: async () => this.notes.size,
    search: async (_query: Record<string, unknown>) => Array.from(this.notes.values()),
  };

  private constructor() {}

  public static getInstance(): MockMCPNoteContext {
    if (!MockMCPNoteContext.instance) {
      MockMCPNoteContext.instance = new MockMCPNoteContext();
    }
    return MockMCPNoteContext.instance;
  }

  public static resetInstance(): void {
    MockMCPNoteContext.instance = null;
  }

  public static createFresh(): MockMCPNoteContext {
    return new MockMCPNoteContext();
  }

  // MCPContext interface methods
  getContextName(): string {
    return 'MockNoteBrain';
  }

  getContextVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<boolean> {
    return true;
  }

  isReady(): boolean {
    return true;
  }

  getStatus(): ContextStatus {
    return { 
      name: 'MockNoteBrain',
      version: '1.0.0',
      ready: true,
      status: 'ready',
    };
  }

  registerOnServer(_server: McpServer): boolean {
    return true;
  }

  getMcpServer(): McpServer {
    throw new Error('Mock MCP server not available');
  }

  getCapabilities(): ContextCapabilities {
    return { 
      tools: [], 
      resources: [],
      features: [],
    };
  }

  async cleanup(): Promise<void> {
    this.notes.clear();
  }

  getStorage(): MCPStorageInterface {
    return this.mockStorage;
  }

  getFormatter(): MCPFormatterInterface {
    return this.mockFormatter;
  }

  // Note-specific methods
  public async createNote(note: Partial<Note>): Promise<string> {
    const newNote: Note = {
      id: `mock-note-${Date.now()}`,
      title: note.title || '',
      content: note.content || '',
      tags: note.tags || [],
      createdAt: note.createdAt || new Date(),
      updatedAt: note.updatedAt || new Date(),
      source: note.source || 'user-created',
      conversationMetadata: note.conversationMetadata || null,
      confidence: note.confidence || null,
      verified: note.verified || false,
      embedding: note.embedding || [0.1, 0.2, 0.3, 0.4],
    };
    this.notes.set(newNote.id, newNote);
    return newNote.id;
  }

  public async getNoteById(id: string): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  public async updateNote(id: string, updates: Partial<Note>): Promise<boolean> {
    const note = this.notes.get(id);
    if (!note) {
      return false;
    }
    const updatedNote = { ...note, ...updates, updatedAt: new Date() };
    this.notes.set(id, updatedNote);
    return true;
  }

  public async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  public async searchNotes(options: NoteSearchOptions): Promise<Note[]> {
    const allNotes = Array.from(this.notes.values());
    
    // Filter by query if provided
    let results = allNotes;
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(note => 
        note.content.toLowerCase().includes(query) ||
        note.title.toLowerCase().includes(query),
      );
    }
    
    // Filter by tags if provided
    if (options.tags?.length) {
      results = results.filter(note => 
        note.tags && note.tags.length > 0 && note.tags.some(tag => options.tags?.includes(tag)),
      );
    }
    
    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }

  public async getRecentNotes(limit = 5): Promise<Note[]> {
    const sortedNotes = Array.from(this.notes.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return sortedNotes.slice(0, limit);
  }

  public async getRelatedNotes(noteId: string, maxResults = 5): Promise<Note[]> {
    const sourceNote = this.notes.get(noteId);
    if (!sourceNote || !sourceNote.tags || sourceNote.tags.length === 0) {
      return [];
    }
    
    // Mock implementation: return notes with shared tags
    const relatedNotes = Array.from(this.notes.values())
      .filter(note => 
        note.id !== noteId && 
        note.tags && note.tags.length > 0 &&
        note.tags.some(tag => sourceNote.tags!.includes(tag)),
      )
      .slice(0, maxResults);
    
    return relatedNotes;
  }

  public async searchWithEmbedding(text: string, limit = 10, tags?: string[]): Promise<Note[]> {
    // Mock implementation: simple text search
    let results = Array.from(this.notes.values()).filter(note => 
      note.content.toLowerCase().includes(text.toLowerCase()) ||
      note.title.toLowerCase().includes(text.toLowerCase()),
    );
    
    // Filter by tags if provided
    if (tags?.length) {
      results = results.filter(note => 
        note.tags && note.tags.length > 0 && note.tags.some(tag => tags.includes(tag)),
      );
    }
    
    return results.slice(0, limit);
  }

  public async generateEmbeddingsForAllNotes(): Promise<{ updated: number; failed: number }> {
    return { updated: this.notes.size, failed: 0 };
  }

  public async getNoteCount(): Promise<number> {
    return this.notes.size;
  }

  // Test helper methods
  public addMockNote(note: Note): void {
    this.notes.set(note.id, note);
  }

  public clearMockNotes(): void {
    this.notes.clear();
  }
}