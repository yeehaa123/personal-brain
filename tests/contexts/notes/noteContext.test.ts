/**
 * Unit tests for NoteContext that extends BaseContext
 * 
 * These tests validate the interface and API of the NoteContext using standardized mocks.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { NoteContext } from '@/contexts';
import { BaseContext } from '@/contexts/baseContext';
import { MockNoteStorageAdapter } from '@test/__mocks__/contexts/noteStorageAdapter';
import { createMockMcpServer } from '@test/__mocks__/core/MockMcpServer';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { MockNoteEmbeddingService } from '@test/__mocks__/services/notes/noteEmbeddingService';
import { MockNoteSearchService } from '@test/__mocks__/services/notes/noteSearchService';

describe('NoteContext', () => {
  // Reset all singletons before each test to ensure isolation
  beforeEach(() => {
    NoteContext.resetInstance();
    MockNoteRepository.resetInstance();
    MockNoteEmbeddingService.resetInstance();
    MockNoteSearchService.resetInstance();
    MockNoteStorageAdapter.resetInstance();
  });

  afterEach(() => {
    NoteContext.resetInstance();
    MockNoteRepository.resetInstance();
    MockNoteEmbeddingService.resetInstance();
    MockNoteSearchService.resetInstance();
    MockNoteStorageAdapter.resetInstance();
  });

  test('basic functionality - inheritance, initialization, and status', async () => {
    // Group related basic functionality tests into one
    // Create context with mocked dependencies
    const noteContext = NoteContext.createFresh({
      name: 'TestNoteBrain',
      version: '1.0.0-test',
      apiKey: 'mock-api-key',
    });
    
    // Initialize the context
    const initResult = await noteContext.initialize();
    
    // Get status
    const status = noteContext.getStatus();
    
    // Single consolidated assertion for all basic functionality
    expect({
      inheritance: noteContext instanceof BaseContext,
      initialization: {
        result: initResult,
        isReady: noteContext.isReady(),
      },
      status: {
        name: status.name,
        version: status.version,
        hasReady: 'ready' in status,
        resourceCount: status && typeof status === 'object' && 'resourceCount' in status && 
                    (status['resourceCount'] as number) > 0,
        toolCount: status && typeof status === 'object' && 'toolCount' in status && 
                  (status['toolCount'] as number) > 0,
      },
    }).toMatchObject({
      inheritance: true,
      initialization: {
        result: true,
        isReady: true,
      },
      status: {
        name: 'TestNoteBrain',
        version: '1.0.0-test',
        hasReady: true,
        resourceCount: true,
        toolCount: true,
      },
    });
  });

  test('registerOnServer registers resources and tools', () => {
    // Create a standardized mock server
    const mockServer = createMockMcpServer('NoteBrainTest', '1.0.0');
    const context = NoteContext.createFresh();

    const result = context.registerOnServer(mockServer);
    
    // Verify resources and tools were registered
    const registeredResources = mockServer.getRegisteredResources();
    const registeredTools = mockServer.getRegisteredTools();
    
    // Expected resources and tools
    const expectedResourcePaths = [':id', 'search', 'recent', 'related/:id'];
    const expectedToolPaths = [
      'create_note', 'generate_embeddings', 'search_with_embedding', 
      'search_notes', 'get_note',
    ];

    // Single consolidated assertion for registration validation
    expect({
      registrationResult: result,
      resources: {
        count: registeredResources.length,
        paths: expectedResourcePaths.map(path => 
          registeredResources.some(r => r.path === path),
        ),
      },
      tools: {
        count: registeredTools.length,
        paths: expectedToolPaths.map(path => 
          registeredTools.some(t => t.path === path),
        ),
      },
    }).toMatchObject({
      registrationResult: true,
      resources: {
        count: 4,
        paths: expectedResourcePaths.map(() => true),
      },
      tools: {
        count: expect.any(Number),
        paths: expectedToolPaths.map(() => true),
      },
    });
  });

  test('getStorage provides access to storage adapter', () => {
    const context = NoteContext.createFresh();
    const storage = context.getStorage();

    // Simple assertion
    expect(storage !== undefined).toBe(true);
  });

  test('searchWithEmbedding should work with tags filtering', async () => {
    // Create standardized mock embedding service with controlled response
    const embeddingService = MockNoteEmbeddingService.createFresh();

    // Setup mock implementation for searchSimilarNotes
    embeddingService.searchSimilarNotes = async () => {
      return [
        { ...createMockNote('note-1', 'Test Note 1', ['test']), score: 0.95 },
        { ...createMockNote('note-2', 'Test Note 2', ['example']), score: 0.85 },
        { ...createMockNote('note-3', 'Test Note 3', ['test', 'example']), score: 0.75 },
      ];
    };

    // Create standardized mock repository and search service
    const repository = MockNoteRepository.createFresh();
    const searchService = MockNoteSearchService.createFresh();

    // Create the context with our mock dependencies
    const context = NoteContext.createFresh(
      { name: 'TestNoteBrain' },
      {
        repository,
        embeddingService,
        searchService,
      },
    );

    // Call the method under test with tag filtering
    const results = await context.searchWithEmbedding('test query', 5, ['test']);

    // Single consolidated assertion for search results validation
    expect({
      basics: {
        isDefined: results !== undefined,
        isArray: Array.isArray(results),
        filteredLength: results.length,
      },
      content: {
        firstNoteId: results[0]?.id,
        secondNoteId: results[1]?.id,
        allHaveTestTag: results.every(note => note.tags?.includes('test')),
      },
    }).toMatchObject({
      basics: {
        isDefined: true,
        isArray: true,
        filteredLength: 2,  // Should only include notes with 'test' tag
      },
      content: {
        firstNoteId: 'note-1',
        secondNoteId: 'note-3',
        allHaveTestTag: true,
      },
    });
  });
});
