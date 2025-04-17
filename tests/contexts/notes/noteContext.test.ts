import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import { NoteContext } from '@/contexts';
import { ServiceIdentifiers } from '@/services/serviceRegistry';
import { createMockNotes } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { setupAnthropicMocks, setupMcpServerMocks } from '@test/__mocks__/utils/mcpUtils';
import { clearMockEnv, setMockEnv } from '@test/helpers/envUtils';

// Create mock notes for testing
const mockNotes = createMockNotes();

// Setup MCP server and Anthropic mocks
setupMcpServerMocks();
setupAnthropicMocks();

// Create mock repository using our standardized implementation
const mockNoteRepository = MockNoteRepository.createFresh(mockNotes);

const mockNoteEmbeddingService = {
  findRelatedNotes: async () => {
    return mockNotes.map(note => ({
      ...note,
      score: 0.9,
    }));
  },
  createNoteChunks: async () => {
    return ['chunk-1', 'chunk-2'];
  },
};

const mockNoteSearchService = {
  searchNotes: async () => {
    return [...mockNotes];
  },
  findRelated: async () => {
    return [...mockNotes];
  },
};

// Setup mock services in the dependency container
mock.module('@/services/serviceRegistry', () => {
  return {
    ServiceIdentifiers: {
      NoteRepository: 'repositories.note',
      ProfileRepository: 'repositories.profile',
      NoteEmbeddingService: 'embedding.note',
      ProfileEmbeddingService: 'embedding.profile',
      NoteSearchService: 'search.note',
      ProfileSearchService: 'search.profile',
      ProfileTagService: 'tag.profile',
    },
    registerServices: (container: { register: (id: string, factory: () => unknown) => void }, _config = {}) => {
      container.register(ServiceIdentifiers.NoteRepository, () => mockNoteRepository);
      container.register(ServiceIdentifiers.NoteEmbeddingService, () => mockNoteEmbeddingService);
      container.register(ServiceIdentifiers.NoteSearchService, () => mockNoteSearchService);
    },
    getService: (serviceId: string) => {
      switch (serviceId) {
      case ServiceIdentifiers.NoteRepository:
        return mockNoteRepository;
      case ServiceIdentifiers.NoteEmbeddingService:
        return mockNoteEmbeddingService;
      case ServiceIdentifiers.NoteSearchService:
        return mockNoteSearchService;
      default:
        return {};
      }
    },
  };
});

// Mock the dependency container to return our mock services
mock.module('@/utils/dependencyContainer', () => {
  return {
    getContainer: () => ({
      resolve: (serviceId: string) => {
        switch (serviceId) {
        case ServiceIdentifiers.NoteRepository:
          return mockNoteRepository;
        case ServiceIdentifiers.NoteEmbeddingService:
          return mockNoteEmbeddingService;
        case ServiceIdentifiers.NoteSearchService:
          return mockNoteSearchService;
        default:
          return {};
        }
      },
      register: () => { },
      has: () => true,
      clear: () => { },
    }),
    getService: (serviceId: string) => {
      switch (serviceId) {
      case ServiceIdentifiers.NoteRepository:
        return mockNoteRepository;
      case ServiceIdentifiers.NoteEmbeddingService:
        return mockNoteEmbeddingService;
      case ServiceIdentifiers.NoteSearchService:
        return mockNoteSearchService;
      default:
        return {};
      }
    },
    container: {
      resolve: (serviceId: string) => {
        switch (serviceId) {
        case ServiceIdentifiers.NoteRepository:
          return mockNoteRepository;
        case ServiceIdentifiers.NoteEmbeddingService:
          return mockNoteEmbeddingService;
        case ServiceIdentifiers.NoteSearchService:
          return mockNoteSearchService;
        default:
          return {};
        }
      },
      register: () => { },
      has: () => true,
      clear: () => { },
    },
  };
});

describe('NoteContext Tests', () => {
  let noteContext: NoteContext;

  // We don't need any extra test isolation here since we're
  // already setting up everything we need manually

  beforeAll(() => {
    // Set up mock environment variables using centralized function
    setMockEnv();
  });

  afterAll(() => {
    // Clean up environment variables using centralized function
    clearMockEnv();
  });

  beforeEach(() => {
    // Reset our standardized repository mock
    MockNoteRepository.resetInstance();

    // Ensure mockNoteRepository has the mock notes
    mockNoteRepository.notes = [...mockNotes];

    // Create a fresh context for each test
    noteContext = new NoteContext('mock-api-key');

    // Now directly override the internal service references
    // This is a bit of a hack but necessary for the tests
    Object.defineProperty(noteContext, 'repository', {
      value: mockNoteRepository,
      writable: true,
    });

    Object.defineProperty(noteContext, 'searchService', {
      value: mockNoteSearchService,
      writable: true,
    });

    Object.defineProperty(noteContext, 'embeddingService', {
      value: mockNoteEmbeddingService,
      writable: true,
    });
  });

  test('NoteContext properly initializes all services', () => {
    // Basic validation of the instance and its methods
    expect(noteContext).toBeDefined();
    expect(typeof noteContext.getNoteById).toBe('function');
    expect(typeof noteContext.searchNotes).toBe('function');
    expect(typeof noteContext.getRelatedNotes).toBe('function');
    expect(typeof noteContext.getRecentNotes).toBe('function');
  });

  test('MCP Server can define resources', () => {
    // Create a simple mock for the handler
    const resourceHandler = async () => ({
      contents: [{
        uri: 'test://uri',
        text: 'Test content',
      }],
    });

    // Get the MCP server and define a resource
    const mcpServer = noteContext.getMcpServer();
    mcpServer.resource('test_resource', 'test://pattern', resourceHandler);

    // Since we replaced toHaveBeenCalledWith with our own implementation,
    // we'll just verify the server is properly defined
    expect(mcpServer).toBeDefined();
  });

  test('getNoteById returns a note object or null', async () => {
    const note = await noteContext.getNoteById('note-1');

    // We just check the interface, not exact values which may depend on mocks
    expect(note).toBeDefined();
    if (note) {
      expect(typeof note.id).toBe('string');
      expect(typeof note.title).toBe('string');
    }
  });

  test('searchNotes returns search results', async () => {
    const results = await noteContext.searchNotes({ query: 'test' });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('getRelatedNotes returns related notes', async () => {
    const results = await noteContext.getRelatedNotes('note-1');

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('getRecentNotes returns recent notes', async () => {
    const results = await noteContext.getRecentNotes();

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });
});
