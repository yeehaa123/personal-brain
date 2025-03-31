import { describe, test, expect, mock } from 'bun:test';
import { NoteService } from '@mcp/protocol/components/noteService';
import { NoteContext } from '@mcp/context/noteContext';
import type { Note } from '@models/note';
import { createMockEmbedding } from '@test/mocks';

// Define a search options type to avoid 'any'
interface SearchOptions {
  query?: string;
  tags?: string[];
  semanticSearch?: boolean;
  limit?: number;
  offset?: number;
}

describe('NoteService', () => {
  // Sample notes
  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      title: 'First Note',
      content: 'This is the first note about MCP architecture.',
      tags: ['MCP', 'architecture'],
      embedding: createMockEmbedding('MCP architecture'),
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: 'This is the second note about ecosystem design.',
      tags: ['ecosystem', 'design'],
      embedding: createMockEmbedding('ecosystem design'),
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-04'),
    },
    {
      id: 'note-3',
      title: 'Third Note',
      content: 'This is the third note about quantum computing basics.',
      tags: ['quantum', 'computing'],
      embedding: createMockEmbedding('quantum computing'),
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-06'),
    },
  ];

  // Create mock functions with type annotations to help TypeScript
  const mockSearchNotes = mock<(options: SearchOptions) => Promise<Note[]>>(async ({ query, tags, semanticSearch }) => {
    // Simple mock implementation
    if (semanticSearch) {
      if (query?.includes('MCP') || tags?.includes('MCP')) {
        return [sampleNotes[0]];
      } else if (query?.includes('ecosystem') || tags?.includes('ecosystem')) {
        return [sampleNotes[1]];
      } else if (query?.includes('quantum') || tags?.includes('quantum')) {
        return [sampleNotes[2]];
      }
    } else {
      // Keyword search fallback
      if (query?.includes('MCP') || tags?.includes('MCP')) {
        return [sampleNotes[0]];
      } else if (query?.includes('ecosystem') || tags?.includes('ecosystem')) {
        return [sampleNotes[1]];
      } else if (query?.includes('quantum') || tags?.includes('quantum')) {
        return [sampleNotes[2]];
      }
    }
    return [];
  });
  
  const mockGetRecentNotes = mock<(limit?: number) => Promise<Note[]>>(async (limit) => {
    return sampleNotes.slice(0, limit || 3);
  });
  
  const mockGetRelatedNotes = mock<(noteId: string, limit?: number) => Promise<Note[]>>(async (noteId, limit) => {
    // Simple mock: return different notes than the one requested
    if (noteId === 'note-1') {
      return [sampleNotes[1], sampleNotes[2]].slice(0, limit || 2);
    } else {
      return [sampleNotes[0]].slice(0, limit || 1);
    }
  });
  
  // Create the mock context
  const mockNoteContext = {
    searchNotes: mockSearchNotes,
    getRecentNotes: mockGetRecentNotes,
    getRelatedNotes: mockGetRelatedNotes,
  } as unknown as NoteContext;

  const noteService = new NoteService(mockNoteContext);

  test('should fetch relevant context with explicit query', async () => {
    const results = await noteService.fetchRelevantContext('Tell me about MCP architecture');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-1');
    expect(mockSearchNotes.mock.calls.length).toBeGreaterThan(0);
  });

  test('should fetch relevant context with tags in query', async () => {
    const results = await noteService.fetchRelevantContext('What is #MCP all about?');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-1');
    expect(mockSearchNotes.mock.calls.length).toBeGreaterThan(0);
    
    // The search params should have MCP as a tag
    const searchParams = mockSearchNotes.mock.calls[0][0];
    expect(searchParams.tags).toContain('MCP');
    expect(searchParams.query).not.toContain('#MCP');
  });

  test('should detect MCP topic keywords and add MCP tag', async () => {
    const results = await noteService.fetchRelevantContext('Explain the Model-Context-Protocol to me');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-1');
    
    // The search params should have MCP as a tag even though not explicitly tagged
    const searchParams = mockSearchNotes.mock.calls[0][0];
    expect(searchParams.tags).toContain('MCP');
  });

  test('should try tag-only search if semantic search fails', async () => {
    // Mock implementation that returns empty for first call and then returns results
    const mockFailSearch = mock<(options: SearchOptions) => Promise<Note[]>>(async ({ tags, semanticSearch }) => {
      if (semanticSearch) {
        return []; // First call fails
      } else if (tags?.includes('ecosystem')) {
        return [sampleNotes[1]]; // Second call succeeds
      }
      return [];
    });
    
    const failFirstSearchNoteContext = {
      ...mockNoteContext,
      searchNotes: mockFailSearch,
    } as unknown as NoteContext;
    
    const service = new NoteService(failFirstSearchNoteContext);
    
    const results = await service.fetchRelevantContext('Tell me about #ecosystem design patterns');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-2');
    
    // Should have called searchNotes multiple times
    expect(mockFailSearch.mock.calls.length).toBeGreaterThan(1);
  });

  test('should fall back to keyword search if semantic search fails', async () => {
    // Mock implementation that returns empty for first calls and then returns for keyword search
    const mockFailSearch = mock<(options: SearchOptions) => Promise<Note[]>>(async ({ query, semanticSearch }) => {
      if (semanticSearch) {
        return []; // First call fails
      } else if (!semanticSearch && query?.includes('quantum')) {
        return [sampleNotes[2]]; // Keyword search succeeds
      }
      return [];
    });
    
    const failFirstSearchNoteContext = {
      ...mockNoteContext,
      searchNotes: mockFailSearch,
    } as unknown as NoteContext;
    
    const service = new NoteService(failFirstSearchNoteContext);
    
    const results = await service.fetchRelevantContext('Tell me about quantum computing');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('note-3');
  });

  test('should fall back to recent notes if all searches fail', async () => {
    // Mock implementation that fails all searches
    const mockFailAllSearch = mock<(options: SearchOptions) => Promise<Note[]>>(async () => []);
    const mockGetRecent = mock<(limit?: number) => Promise<Note[]>>(async () => [sampleNotes[0], sampleNotes[1]]);
    
    const failAllSearchNoteContext = {
      ...mockNoteContext,
      searchNotes: mockFailAllSearch,
      getRecentNotes: mockGetRecent,
    } as unknown as NoteContext;
    
    const service = new NoteService(failAllSearchNoteContext);
    
    const results = await service.fetchRelevantContext('Something completely unrelated');
    
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('note-1');
    expect(results[1].id).toBe('note-2');
    expect(mockGetRecent.mock.calls.length).toBeGreaterThan(0);
  });

  test('should get related notes based on primary note', async () => {
    const relevantNotes = [sampleNotes[0]]; // First note as the most relevant
    
    const relatedNotes = await noteService.getRelatedNotes(relevantNotes);
    
    expect(relatedNotes).toHaveLength(2);
    expect(relatedNotes[0].id).toBe('note-2');
    expect(relatedNotes[1].id).toBe('note-3');
    
    expect(mockGetRelatedNotes.mock.calls.length).toBeGreaterThan(0);
    expect(mockGetRelatedNotes.mock.calls[0][0]).toBe('note-1');
  });

  test('should get recent notes when no relevant notes provided', async () => {
    const relatedNotes = await noteService.getRelatedNotes([]);
    
    expect(relatedNotes).toHaveLength(3);
    expect(mockGetRecentNotes.mock.calls.length).toBeGreaterThan(0);
    expect(mockGetRecentNotes.mock.calls[0][0]).toBe(3);
  });
});