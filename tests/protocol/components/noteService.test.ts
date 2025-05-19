import { beforeEach, describe, expect, test } from 'bun:test';

import type { MCPNoteContext } from '@/contexts/notes';
import { NoteService } from '@/protocol/components/noteService';
import type { NoteSearchOptions } from '@/services/notes/noteSearchService';
import { MockMCPNoteContext } from '@test/__mocks__/contexts/notes/MCPNoteContext';
import { createMockNote } from '@test/__mocks__/models/note';

describe('NoteService', () => {
  let noteService: NoteService;
  let mockContext: MockMCPNoteContext;

  beforeEach(() => {
    // Reset the standardized NoteContext mock before each test
    MockMCPNoteContext.resetInstance();

    // Create fresh context using our standardized mock
    mockContext = MockMCPNoteContext.createFresh();
    
    // Use factory method to create the service with the mock context
    noteService = NoteService.createFresh({ 
      context: mockContext as unknown as MCPNoteContext, 
    });
  });

  test('should initialize correctly', () => {
    expect(noteService).toBeDefined();
  });

  test('should get related notes for a given note', async () => {
    const relevantNotes = [
      createMockNote('note-1', 'Test Note 1', []),
    ];

    const relatedNotes = await noteService.getRelatedNotes(relevantNotes, 3);

    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
  });

  test('should fall back to recent notes when no relevant notes are provided', async () => {
    // Mock implementation in MockNoteContext will return notes
    const relatedNotes = await noteService.getRelatedNotes([], 3);

    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
  });

  test('should fetch relevant context based on query', async () => {
    const results = await noteService.fetchRelevantContext('test query');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('should extract tags from query', async () => {
    const results = await noteService.fetchRelevantContext('find notes about #test and #example');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('should detect MCP topics and add MCP tag', async () => {
    const results = await noteService.fetchRelevantContext('How does Model-Context-Protocol work?');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('should try tags-only search if combined search fails', async () => {
    // Create a custom instance for this specific test scenario
    const customContext = MockMCPNoteContext.createFresh();
    
    // Override the searchNotes method for this specific test case
    customContext.searchNotes = async (params: NoteSearchOptions) => {
      const tags = params.tags;
      const semanticSearch = params.semanticSearch;

      // Return empty results for the first call with semanticSearch true
      // Return actual results for the second call with tags only
      if (semanticSearch && !tags) {
        return [];
      } else if (tags) {
        return [
          createMockNote('note-tags', 'Tags Only Result', ['test']),
        ];
      }

      return [];
    };

    const service = NoteService.createFresh({
      context: customContext as unknown as MCPNoteContext,
    });
    const results = await service.fetchRelevantContext('#test query with tags');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should fall back to keyword search if semantic search fails', async () => {
    // Create a custom instance for this specific test scenario
    const customContext = MockMCPNoteContext.createFresh();
    
    // Override the searchNotes method for this specific test case
    customContext.searchNotes = async (params: NoteSearchOptions) => {
      const semanticSearch = params.semanticSearch;

      if (semanticSearch) {
        return [];
      } else {
        return [
          createMockNote('note-keyword', 'Keyword Result'),
        ];
      }
    };

    const service = NoteService.createFresh({
      context: customContext as unknown as MCPNoteContext,
    });
    const results = await service.fetchRelevantContext('keyword search');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should fall back to recent notes if all search methods fail', async () => {
    // Create a custom instance for this specific test scenario
    const customContext = MockMCPNoteContext.createFresh();
    
    // Override methods for this specific test case
    customContext.searchNotes = async () => [];
    customContext.getRecentNotes = async (limit: number) => [
      createMockNote('recent-note', 'Recent Note'),
    ].slice(0, limit);

    const service = NoteService.createFresh({
      context: customContext as unknown as MCPNoteContext,
    });
    const results = await service.fetchRelevantContext('query with no results');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('recent-note');
  });
});
