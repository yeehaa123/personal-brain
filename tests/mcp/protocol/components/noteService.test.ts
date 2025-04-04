import { beforeEach, describe, expect, test } from 'bun:test';


import type { McpServer } from '@/mcp';
import type { NoteContext } from '@/mcp/contexts/notes/noteContext';
import { NoteService } from '@/mcp/protocol/components/noteService';
import type { Note } from '@/models/note';
import {
  createMockNotes,
} from '@test';



// Define interface for search options
interface SearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
  semanticSearch?: boolean;
}

// Define our own NoteRepository and service types to avoid circular dependencies
interface INoteRepository {
  getNoteById: (id: string) => Promise<Note | undefined>;
  getRecentNotes: (limit?: number) => Promise<Note[]>;
  addNote: (note: Record<string, unknown>) => Promise<Note>;
}

interface INoteSearchService {
  searchNotes: (options: SearchOptions) => Promise<Note[]>;
  findRelated: (noteId: string, limit?: number) => Promise<Note[]>;
}

interface INoteEmbeddingService {
  findRelatedNotes: (noteId: string, limit?: number) => Promise<Array<Note & { score: number }>>;
}

class MockNoteContext implements Partial<NoteContext> {
  repository: INoteRepository;
  searchService: INoteSearchService;
  embeddingService: INoteEmbeddingService;
  mcpServer: McpServer;

  constructor() {
    const mockNotes = createMockNotes();
    // Create repository with proper interface
    this.repository = {
      getNoteById: async (id: string) => mockNotes.find(note => note.id === id) || undefined,
      getRecentNotes: async (limit = 5) => mockNotes.slice(0, limit),
      addNote: async (note: Record<string, unknown>) => {
        const newNote: Note = {
          id: `note-${Date.now()}`,
          title: note['title'] as string || 'Untitled',
          content: note['content'] as string || '',
          tags: note['tags'] as string[] || null,
          embedding: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return newNote;
      },
    };

    // Create search service with proper interface
    this.searchService = {
      searchNotes: async (_options: SearchOptions) => mockNotes,
      findRelated: async (_noteId: string, limit = 5) => mockNotes.slice(0, limit),
    };

    // Create embedding service with proper interface
    this.embeddingService = {
      findRelatedNotes: async (_noteId: string, limit = 5) => mockNotes.slice(0, limit).map(note => ({
        ...note,
        score: 0.85,
      })),
    };

    // Create simple MCP server mock
    this.mcpServer = {
      registerResource: () => this.mcpServer,
      registerTool: () => this.mcpServer,
      resource: () => this.mcpServer,
      tool: () => this.mcpServer,
      prompt: () => this.mcpServer,
      onMessage: () => {},
      sendMessage: () => {},
      server: {
        connect: () => ({}),
        sendMessage: () => {},
        close: () => {},
      },
      _registeredResources: [],
      _registeredResourceTemplates: [],
      _registeredTools: [],
    } as unknown as McpServer;
  }

  // Required methods
  registerMcpResources() { }
  registerMcpTools() { }
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
  registerOnServer() { }

  // Core API methods
  async getNoteById(id: string) {
    return this.repository.getNoteById(id);
  }

  async getRecentNotes(limit = 5) {
    return this.repository.getRecentNotes(limit);
  }

  async searchNotes(options: SearchOptions) {
    return this.searchService.searchNotes(options);
  }

  async getRelatedNotes(noteId: string, limit = 5, _maxDistance = 0.5) {
    return this.searchService.findRelated(noteId, limit);
  }

  async createNote(note: Omit<Note, 'embedding'> & { embedding?: number[] }): Promise<string> {
    await this.repository.addNote(note as unknown as Record<string, unknown>);
    return 'note-mock-id';
  }

  async searchNotesWithEmbedding(_embedding: number[], maxResults = 5) {
    return this.embeddingService.findRelatedNotes('dummy-id', maxResults)
      .then(notes => notes.map(({ score: _score, ...note }) => note));
  }

  async generateEmbeddingsForAllNotes() {
    return { updated: 0, failed: 0 };
  }

  async getNoteCount() {
    return 0;
  }
}

describe('NoteService', () => {
  let noteService: NoteService;
  let mockContext: MockNoteContext;

  beforeEach(() => {
    mockContext = new MockNoteContext();
    // Use type assertion for compatibility
    noteService = new NoteService(mockContext as unknown as NoteContext);
  });

  test('should initialize correctly', () => {
    expect(noteService).toBeDefined();
  });

  test('should get related notes for a given note', async () => {
    const relevantNotes = [
      {
        id: 'note-1',
        title: 'Test Note 1',
        content: 'Test content',
        tags: null,
        embedding: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const relatedNotes = await noteService.getRelatedNotes(relevantNotes, 3);

    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
    expect(relatedNotes.length).toBeGreaterThan(0);
  });

  test('should fall back to recent notes when no relevant notes are provided', async () => {
    const relatedNotes = await noteService.getRelatedNotes([], 3);

    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
    expect(relatedNotes.length).toBeGreaterThan(0);
  });

  test('should fetch relevant context based on query', async () => {
    const results = await noteService.fetchRelevantContext('test query');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should extract tags from query', async () => {
    const results = await noteService.fetchRelevantContext('find notes about #test and #example');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should detect MCP topics and add MCP tag', async () => {
    const results = await noteService.fetchRelevantContext('How does Model-Context-Protocol work?');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('should try tags-only search if combined search fails', async () => {
    // Mock a scenario where the combined search would fail
    const customContext = new MockNoteContext();
    customContext.searchNotes = async (options: SearchOptions) => {
      const { tags, semanticSearch } = options;

      // Return empty results for the first call with semanticSearch true
      // Return actual results for the second call with tags only
      if (semanticSearch && !tags) {
        return [];
      } else if (tags) {
        return [
          {
            id: 'note-tags',
            title: 'Tags Only Result',
            content: 'Found by tags only',
            tags: ['test'],
            embedding: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }

      return [];
    };

    const service = new NoteService(customContext as unknown as NoteContext);
    const results = await service.fetchRelevantContext('#test query with tags');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should fall back to keyword search if semantic search fails', async () => {
    // Create a custom mock where semantic search returns empty but keyword search works
    const customContext = new MockNoteContext();
    customContext.searchNotes = async (options: SearchOptions) => {
      const { semanticSearch } = options;

      if (semanticSearch) {
        return [];
      } else {
        return [
          {
            id: 'note-keyword',
            title: 'Keyword Result',
            content: 'Found by keyword',
            tags: null,
            embedding: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }
    };

    const service = new NoteService(customContext as unknown as NoteContext);
    const results = await service.fetchRelevantContext('keyword search');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should fall back to recent notes if all search methods fail', async () => {
    // Create a custom mock where all searches fail but getRecentNotes works
    const customContext = new MockNoteContext();
    customContext.searchNotes = async () => [];
    customContext.getRecentNotes = async (limit: number) => [
      {
        id: 'recent-note',
        title: 'Recent Note',
        content: 'This is a recent note',
        tags: null,
        embedding: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ].slice(0, limit);

    const service = new NoteService(customContext as unknown as NoteContext);
    const results = await service.fetchRelevantContext('query with no results');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('recent-note');
  });
});
