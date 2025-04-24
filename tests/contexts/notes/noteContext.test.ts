/**
 * Unit tests for NoteContext that extends BaseContext
 * 
 * These tests only validate the interface and API of the NoteContext,
 * not the actual storage functionality.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';


import { NoteContext } from '@/contexts';
import { BaseContext } from '@/contexts/baseContext';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import type { NoteSearchService } from '@/services/notes/noteSearchService';
import { createMockMcpServer } from '@test/__mocks__/core/MockMcpServer';

// Create mock dependencies
const mockNoteRepository = {
  getNoteById: mock(() => Promise.resolve(null)),
  getRecentNotes: mock(() => Promise.resolve([])),
  searchNotesByKeywords: mock(() => Promise.resolve([])),
};

const mockNoteEmbeddingService = {
  findRelatedNotes: mock(() => Promise.resolve([])),
  createNoteChunks: mock(() => Promise.resolve(['chunk-1', 'chunk-2'])),
};

const mockNoteSearchService = {
  searchNotes: mock(() => Promise.resolve([])),
  findRelated: mock(() => Promise.resolve([])),
};

describe('NoteContext', () => {
  let noteContext: NoteContext;
  
  beforeEach(() => {
    // Reset singleton
    NoteContext.resetInstance();
    
    // Create a new context with direct dependency injection
    noteContext = new NoteContext(
      { 
        name: 'TestNoteBrain',
        version: '1.0.0-test',
        apiKey: 'mock-api-key',
      },
      mockNoteRepository as unknown as NoteRepository,
      mockNoteEmbeddingService as unknown as NoteEmbeddingService,
      mockNoteSearchService as unknown as NoteSearchService,
    );
  });
  
  afterEach(() => {
    NoteContext.resetInstance();
  });
  
  test('should extend BaseContext', () => {
    expect(noteContext).toBeInstanceOf(BaseContext);
  });
  
  test('getInstance should return a singleton instance', () => {
    // We need to mock createWithDependencies to ensure it returns our mocked context
    const origCreateWithDependencies = NoteContext.createWithDependencies;
    NoteContext.createWithDependencies = mock(() => {
      return new NoteContext(
        { apiKey: 'mock-api-key' },
        mockNoteRepository as unknown as NoteRepository,
        mockNoteEmbeddingService as unknown as NoteEmbeddingService,
        mockNoteSearchService as unknown as NoteSearchService,
      );
    });
    
    try {
      const instance1 = NoteContext.getInstance();
      const instance2 = NoteContext.getInstance();
      
      expect(instance1).toBe(instance2);
    } finally {
      // Restore original implementation
      NoteContext.createWithDependencies = origCreateWithDependencies;
    }
  });
  
  test('createFresh should return a new instance', () => {
    // We need to mock createWithDependencies to ensure it returns our mocked context
    const origCreateWithDependencies = NoteContext.createWithDependencies;
    NoteContext.createWithDependencies = mock(() => {
      return new NoteContext(
        { apiKey: 'mock-api-key' },
        mockNoteRepository as unknown as NoteRepository,
        mockNoteEmbeddingService as unknown as NoteEmbeddingService,
        mockNoteSearchService as unknown as NoteSearchService,
      );
    });
    
    try {
      const instance1 = NoteContext.getInstance();
      const instance2 = NoteContext.createFresh();
      
      expect(instance1).not.toBe(instance2);
    } finally {
      // Restore original implementation
      NoteContext.createWithDependencies = origCreateWithDependencies;
    }
  });
  
  test('resetInstance should clear the singleton instance', () => {
    // We need to mock createWithDependencies to ensure it returns our mocked context
    const origCreateWithDependencies = NoteContext.createWithDependencies;
    NoteContext.createWithDependencies = mock(() => {
      return new NoteContext(
        { apiKey: 'mock-api-key' },
        mockNoteRepository as unknown as NoteRepository,
        mockNoteEmbeddingService as unknown as NoteEmbeddingService,
        mockNoteSearchService as unknown as NoteSearchService,
      );
    });
    
    try {
      const instance1 = NoteContext.getInstance();
      NoteContext.resetInstance();
      const instance2 = NoteContext.getInstance();
      
      expect(instance1).not.toBe(instance2);
    } finally {
      // Restore original implementation
      NoteContext.createWithDependencies = origCreateWithDependencies;
    }
  });
  
  test('getContextName should return the configured name or default', () => {
    expect(noteContext.getContextName()).toBe('TestNoteBrain');
    
    // Create new context with default name
    const defaultContext = new NoteContext(
      {},
      mockNoteRepository as unknown as NoteRepository,
      mockNoteEmbeddingService as unknown as NoteEmbeddingService,
      mockNoteSearchService as unknown as NoteSearchService,
    );
    expect(defaultContext.getContextName()).toBe('NoteBrain');
  });
  
  test('getContextVersion should return the configured version or default', () => {
    expect(noteContext.getContextVersion()).toBe('1.0.0-test');
    
    // Create new context with default version
    const defaultContext = new NoteContext(
      {},
      mockNoteRepository as unknown as NoteRepository,
      mockNoteEmbeddingService as unknown as NoteEmbeddingService,
      mockNoteSearchService as unknown as NoteSearchService,
    );
    expect(defaultContext.getContextVersion()).toBe('1.0.0');
  });
  
  test('initialize should set readyState to true', async () => {
    const result = await noteContext.initialize();
    
    expect(result).toBe(true);
    expect(noteContext.isReady()).toBe(true);
  });
  
  test('getStatus should return correct status object', () => {
    const status = noteContext.getStatus();
    
    expect(status.name).toBe('TestNoteBrain');
    expect(status.version).toBe('1.0.0-test');
    expect(status.ready).toBeDefined();
    expect(status['resourceCount']).toBeGreaterThan(0);
    expect(status['toolCount']).toBeGreaterThan(0);
  });
  
  test('registerOnServer registers resources and tools', () => {
    // Create a standardized mock server
    const mockServer = createMockMcpServer('NoteBrainTest', '1.0.0');
    
    const result = noteContext.registerOnServer(mockServer);
    
    expect(result).toBe(true);
    
    // Verify resources and tools were registered
    const registeredResources = mockServer.getRegisteredResources();
    const registeredTools = mockServer.getRegisteredTools();
    
    // NoteContext should register 4 resources and 3 tools
    expect(registeredResources.length).toBe(4);
    expect(registeredTools.length).toBe(3);
    
    // Check that specific resource and tool paths are registered
    expect(registeredResources.some(r => r.path === ':id')).toBe(true);
    expect(registeredResources.some(r => r.path === 'search')).toBe(true);
    expect(registeredResources.some(r => r.path === 'recent')).toBe(true);
    expect(registeredResources.some(r => r.path === 'related/:id')).toBe(true);
    
    expect(registeredTools.some(t => t.path === 'create_note')).toBe(true);
    expect(registeredTools.some(t => t.path === 'generate_embeddings')).toBe(true);
    expect(registeredTools.some(t => t.path === 'search_with_embedding')).toBe(true);
  });
  
  test('getStorage should return storage adapter', () => {
    const storage = noteContext.getStorage();
    
    expect(storage).toBeDefined();
  });
});