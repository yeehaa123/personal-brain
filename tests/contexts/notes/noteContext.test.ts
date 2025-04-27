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

  test('should extend BaseContext', () => {
    // No need to create mock instances for this test

    // Create context with mocked dependencies
    const noteContext = NoteContext.createFresh({
      name: 'TestNoteBrain',
      version: '1.0.0-test',
      apiKey: 'mock-api-key',
    });

    expect(noteContext).toBeInstanceOf(BaseContext);
  });

  test('initialize should set readyState to true', async () => {
    const context = NoteContext.createFresh();
    const result = await context.initialize();

    expect(result).toBe(true);
    expect(context.isReady()).toBe(true);
  });

  test('getStatus should return correct status object', () => {
    const context = NoteContext.createFresh({
      name: 'TestNoteBrain',
      version: '1.0.0-test',
    });

    const status = context.getStatus();

    expect(status.name).toBe('TestNoteBrain');
    expect(status.version).toBe('1.0.0-test');
    expect(status.ready).toBeDefined();
    expect(status['resourceCount']).toBeGreaterThan(0);
    expect(status['toolCount']).toBeGreaterThan(0);
  });

  test('registerOnServer registers resources and tools', () => {
    // Create a standardized mock server
    const mockServer = createMockMcpServer('NoteBrainTest', '1.0.0');
    const context = NoteContext.createFresh();

    const result = context.registerOnServer(mockServer);

    expect(result).toBe(true);

    // Verify resources and tools were registered
    const registeredResources = mockServer.getRegisteredResources();
    const registeredTools = mockServer.getRegisteredTools();

    // NoteContext should register 4 resources and multiple tools
    expect(registeredResources.length).toBe(4);
    expect(registeredTools.length).toBeGreaterThanOrEqual(5); // At least 5 tools should be registered

    // Check that specific resource and tool paths are registered
    expect(registeredResources.some(r => r.path === ':id')).toBe(true);
    expect(registeredResources.some(r => r.path === 'search')).toBe(true);
    expect(registeredResources.some(r => r.path === 'recent')).toBe(true);
    expect(registeredResources.some(r => r.path === 'related/:id')).toBe(true);

    // Verify essential tools are present
    expect(registeredTools.some(t => t.path === 'create_note')).toBe(true);
    expect(registeredTools.some(t => t.path === 'generate_embeddings')).toBe(true);
    expect(registeredTools.some(t => t.path === 'search_with_embedding')).toBe(true);
    expect(registeredTools.some(t => t.path === 'search_notes')).toBe(true);
    expect(registeredTools.some(t => t.path === 'get_note')).toBe(true);
  });

  test('getStorage should return storage adapter', () => {
    const context = NoteContext.createFresh();
    const storage = context.getStorage();

    expect(storage).toBeDefined();
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

    // Create standardized mock repository
    const repository = MockNoteRepository.createFresh();

    // Create standardized mock search service
    const searchService = MockNoteSearchService.createFresh();

    // Create the context with our mock dependencies
    const context = NoteContext.createWithDependencies(
      { name: 'TestNoteBrain' },
      {
        repository,
        embeddingService,
        searchService,
      },
    );

    // Call the method under test with tag filtering
    const results = await context.searchWithEmbedding('test query', 5, ['test']);

    // Verify the results
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2); // Should only include notes with 'test' tag
    expect(results[0].id).toBe('note-1');
    expect(results[1].id).toBe('note-3');
    expect(results.every(note => note.tags?.includes('test'))).toBe(true);
  });
});
