/**
 * MCP and related services mock utilities for tests
 */
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { mock as viMock } from 'bun:test';

import type { McpServer } from '@/mcp';

/**
 * Set up mock environment for MCP tests
 */
export function setMockEnv(): void {
  // Set environment variables for testing
  process.env['ANTHROPIC_API_KEY'] = 'mock-api-key';
  process.env['OPENAI_API_KEY'] = 'mock-openai-key';
  process.env['NEWS_API_KEY'] = 'mock-news-api-key';
}

/**
 * Clear mock environment after tests
 */
export function clearMockEnv(): void {
  // Clean up environment variables
  delete process.env['ANTHROPIC_API_KEY'];
  delete process.env['OPENAI_API_KEY'];
  delete process.env['NEWS_API_KEY'];
}


// We're not using this function but keeping it commented out for future reference
/**
 * Helper function to create mock functions that return specific values
 * @param returnValue The value to be returned by the mock
 */
// function createMockWithReturnValue<T>(returnValue: T) {
//   return viMock(() => returnValue);
// }

/**
 * Helper function to create mock functions with a specific implementation
 * @param implementation The implementation function for the mock
 */
function createMockWithImplementation<T extends (...args: unknown[]) => unknown>(implementation: T) {
  return viMock(implementation);
}

/**
 * Simple mock function that returns undefined
 */
function createEmptyMock() {
  return viMock(() => {});
}

/**
 * Setup mocks for the Anthropic API
 * @param mock The Bun test mock function
 * @returns Mocked embedding function
 */
export function setupAnthropicMocks(mock: typeof viMock = viMock) {
  // Use a simple mock function directly
  const mockEmbeddingFn = viMock(function(_text: string) {
    const embedding = Array(1536).fill(0).map((_, i) => (i % 10) / 10);
    return {
      embedding,
      truncated: false,
    };
  });

  // Mock the anthropic modules
  mock.module('@anthropic-ai/sdk', () => {
    return {
      Anthropic: class MockAnthropic {
        constructor() {
          // Empty constructor
        }
        messages = {
          create: async () => ({
            content: [{ type: 'text', text: 'Mock response from Claude' }],
            id: 'msg_mock',
            model: 'claude-3-sonnet-20240229',
            role: 'assistant',
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 100,
              output_tokens: 50,
            },
          }),
        };
        completions = {
          create: async () => ({
            completion: 'Mock completion from Claude',
            id: 'cmpl_mock',
            model: 'claude-3-sonnet-20240229',
            stop_reason: 'stop_sequence',
          }),
        };
      },
    };
  });
  
  // Also mock the ai-sdk/anthropic
  mock.module('ai', () => {
    return {
      generateObject: async () => ({
        object: {
          tags: ['ecosystem-architecture', 'innovation', 'collaboration', 'regenerative'],
        },
      }),
    };
  });
  
  // Mock the anthropic function from ai-sdk
  mock.module('@ai-sdk/anthropic', () => {
    return {
      anthropic: () => {
        return {
          id: 'claude-3-sonnet-20240229',
          provider: 'anthropic',
        };
      },
    };
  });
  
  // Add additional mock for error handling tests
  mock.module('@/mcp/contexts/externalSources/externalSourceContext', () => {
    const mockSearchResult = [
      {
        title: 'Test External Result',
        content: 'This is a test result from external sources',
        url: 'https://example.com/result',
        source: 'Mock',
        embedding: Array(1536).fill(0).map((_, i) => (i % 10) / 10),
      },
    ];
  
    return {
      ExternalSourceContext: class MockExternalSourceContext {
        constructor() {
        }
        
        search() { 
          return Promise.resolve(mockSearchResult);
        }
        
        semanticSearch() { 
          return Promise.resolve(mockSearchResult);
        }
        
        getEnabledSources() {
          return [{
            name: 'MockSource',
            search: async () => mockSearchResult,
            checkAvailability: async () => true,
            getSourceMetadata: async () => ({ name: 'MockSource', description: 'Mock Source' }),
          }];
        }
        
        registerSource() {
          // Just a mock implementation
          return;
        }
        
        checkSourcesAvailability() {
          return Promise.resolve({ 'MockSource': true });
        }
        
        getMcpServer() {
          return {
            registerResource: () => ({}),
            registerTool: () => ({}),
          } as Record<string, unknown>;
        }
        
        registerMcpResources() {}
        registerMcpTools() {}
        registerOnServer() {}
      },
    };
  });

  // Return the mock embedding function for tests to use
  return mockEmbeddingFn;
}

/**
 * Setup mocks for the MCP Server
 * @returns A mocked MCP server
 */
export function setupMcpServerMocks() {
  // Create a basic mock of the Server class
  class MockServer {
    _serverInfo = {};
    _capabilities = {};
    registerCapabilities() {}
    assertCapabilityForMethod() { return true; }
    assertNotificationCapability() { return true; }
    assertRequestHandlerCapability() { return true; }
    _oninitialize() {}
    getClientCapabilities() { return {}; }
    connect() { return this; }
    sendMessage() {}
    close() {}
  }

  // Create the MCP server mock with implementation details
  const mockServer = {
    server: new MockServer(),
    // Standard McpServer methods
    registerResource: function() { return this as unknown as McpServer; },
    registerTool: function() { return this as unknown as McpServer; },
    resource: function() { return this as unknown as McpServer; },
    tool: function() { return this as unknown as McpServer; },
    prompt: function() { return this as unknown as McpServer; },
    onMessage: () => {},
    sendMessage: () => {},
    connect: async (_transport: Transport) => { return Promise.resolve(); },
    close: async () => { return Promise.resolve(); },
    setToolRequestHandlers: () => {},
    setCompletionRequestHandler: () => {},
    handlePromptCompletion: async () => ({}),
    handleToolRequest: async () => ({}),
    handleResourceCompletion: async () => ({}),
    setResourceRequestHandlers: () => {},
    setPromptRequestHandlers: () => {},
    
    // Additional methods needed for tests
    queryResourceUrl: async () => ({}),
    
    // Internal state properties used in tests
    _registeredResources: [] as Record<string, unknown>[],
    _registeredResourceTemplates: [] as Record<string, unknown>[],
    _registeredTools: [] as Record<string, unknown>[],
    _registeredPrompts: [] as Record<string, unknown>[],
    _toolHandlersInitialized: false,
    _resourceHandlersInitialized: false,
    _completionHandlerInitialized: false,
    _promptHandlersInitialized: false,
  } as unknown as McpServer;

  return mockServer as McpServer;
}

/**
 * Setup mocks for the dependency container
 * @param mock The Bun test mock function
 */
export function setupDependencyContainerMocks(mock: typeof viMock = viMock) {
  // Create a mock note for testing
  const mockNote = {
    id: 'note-1',
    title: 'Test Note 1',
    content: 'This is the content of Test Note 1',
    tags: ['tag1', 'tag2'],
    embedding: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  // Create a related note for testing
  const relatedNote = {
    id: 'related-note',
    title: 'Related Note',
    content: 'Related content',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create a mock profile for testing
  const mockProfile = {
    id: 'mock-profile-id',
    fullName: 'John Doe',
    occupation: 'Ecosystem Architect',
    summary: 'Experienced professional in ecosystem design',
    experiences: [
      {
        title: 'Senior Ecosystem Architect',
        company: 'Global Ecosystems Inc',
        startDate: '2020-01',
        endDate: '2023-12',
        description: 'Led ecosystem design initiatives',
      },
    ],
    education: [
      {
        institution: 'University of Innovation',
        degree: 'MS in Ecosystem Design',
        field: 'Sustainable Systems',
        startDate: '2015-09',
        endDate: '2017-06',
      },
    ],
    skills: ['ecosystem design', 'innovation', 'collaboration'],
    country: 'Global',
    followerCount: 5000,
    embedding: Array(1536).fill(0).map((_, i) => (i % 10) / 10),
    tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
  };

  // Mock external search result
  const mockWikipediaResult = {
    title: 'Mock Wikipedia Result',
    content: 'This is a mock Wikipedia result',
    url: 'https://en.wikipedia.org/wiki/Mock',
    source: 'Wikipedia',
    embedding: Array(1536).fill(0).map((_, i) => (i % 10) / 10),
  };

  const mockNewsResult = {
    title: 'Mock News Result',
    content: 'This is a mock news result',
    url: 'https://news.example.com/article/1',
    source: 'NewsAPI',
    embedding: Array(1536).fill(0).map((_, i) => (i % 10) / 10),
  };

  // Mock dependencies
  const mockDependencies = {
    noteRepository: {
      getNoteById: viMock(async (id: string) => id === 'note-1' ? {...mockNote} : null),
      getRecentNotes: viMock(async () => [{...mockNote}]),
      searchNotesByKeywords: viMock(async () => [{...mockNote}]),
      insertNote: createEmptyMock(),
      updateNote: createEmptyMock(),
      deleteNote: createEmptyMock(),
    },
    profileRepository: {
      getProfile: viMock(async () => ({...mockProfile})),
      insertProfile: viMock(async () => 'mock-profile-id'),
      updateProfile: viMock(async () => true),
      deleteProfile: createEmptyMock(),
    },
    noteEmbeddingService: {
      generateNoteEmbedding: createMockWithImplementation(async () => {
        return Array(1536).fill(0).map((_, i) => (i % 10) / 10);
      }),
      generateEmbeddingsForAllNotes: createMockWithImplementation(async () => {
        return { updated: 1, failed: 0 };
      }),
      searchSimilarNotes: viMock(async () => [{...mockNote, score: 0.9}]),
      findRelatedNotes: viMock(async () => [
        { ...mockNote, score: 0.9 },
      ]),
      createNoteChunks: createMockWithImplementation(async () => {
        return ['chunk-1', 'chunk-2'];
      }),
    },
    profileEmbeddingService: {
      generateEmbedding: viMock(async () => Array(1536).fill(0).map((_, i) => (i % 10) / 10)),
      generateEmbeddingForProfile: viMock(async () => ({ updated: true })),
      shouldRegenerateEmbedding: viMock(() => true),
      getProfileTextForEmbedding: viMock(() => 'John Doe is an Ecosystem Architect'),
    },
    noteSearchService: {
      searchNotes: viMock(async () => [{...mockNote}]),
      findRelated: viMock(async () => [{...relatedNote}]),
    },
    profileSearchService: {
      findRelatedNotes: viMock(async () => [
        {
          ...mockNote,
          similarity: 0.85,
        },
      ]),
      findNotesWithSimilarTags: viMock(async () => [
        {
          ...mockNote,
          similarity: 0.85,
        },
        {
          id: 'note-2',
          title: 'Building Communities',
          content: 'Content about community building',
          tags: ['community', 'collaboration'],
          similarity: 0.75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    },
    profileTagService: {
      updateProfileTags: viMock(async () => ['ecosystem-architecture', 'innovation', 'collaboration', 'regenerative']),
      generateProfileTags: viMock(async () => ['ecosystem-architecture', 'innovation', 'collaboration']),
      extractProfileKeywords: viMock(() => ['ecosystem', 'architect', 'innovation', 'collaboration', 'architecture']),
    },
    // External sources dependencies
    'external.embedding': {
      getEmbedding: viMock(async () => ({
        embedding: Array(1536).fill(0).map((_, i) => (i % 10) / 10),
        truncated: false,
      })),
      cosineSimilarity: viMock(() => 0.85),
    },
    'external.source.wikipedia': {
      name: 'Wikipedia',
      search: viMock(async () => [mockWikipediaResult]),
      checkAvailability: viMock(async () => true),
      getSourceMetadata: viMock(async () => ({ name: 'Wikipedia', description: 'Mock Wikipedia Source' })),
    },
    'external.source.newsapi': {
      name: 'NewsAPI',
      search: viMock(async () => [mockNewsResult]),
      checkAvailability: viMock(async () => true),
      getSourceMetadata: viMock(async () => ({ name: 'NewsAPI', description: 'Mock News API Source' })),
    },
  };

  // Create a container class that actually manages state
  class MockContainer {
    private services = new Map();
    
    constructor(initialServices: Record<string, unknown>) {
      // Initialize with mock services
      Object.entries(initialServices).forEach(([key, value]) => {
        this.services.set(key, value);
      });
    }

    get(key: string) {
      return this.services.get(key) || {};
    }

    register(key: string, value: unknown) {
      this.services.set(key, value);
    }

    resolve<T>(key: string): T {
      const service = this.services.get(key);
      if (!service) {
        throw new Error(`Service '${key}' not found in mock container`);
      }
      return service as T;
    }

    has(key: string): boolean {
      return this.services.has(key);
    }

    clear() {
      this.services.clear();
    }
  }

  // Create container instance with our dependencies
  const mockContainer = new MockContainer(mockDependencies);

  // Mock the DI container
  mock.module('@/utils/dependencyContainer', () => {
    return {
      container: mockContainer,
      getContainer: () => mockContainer,
      getService: <T>(serviceId: string): T => mockContainer.resolve<T>(serviceId),
      createContainer: () => new MockContainer(mockDependencies),
      setupDependencyContainer: () => new MockContainer(mockDependencies),
      useTestContainer: (_container?: unknown) => {
        return () => {}; // Mock cleanup function
      },
    };
  });

  return mockDependencies;
}

/**
 * Set up the dependency injection test suite
 * @param mock The Bun test mock function
 */
export function setupMcpTestSuite(mock: typeof viMock = viMock) {
  // Set up all mocks for MCP tests
  setupAnthropicMocks(mock);
  setupMcpServerMocks();
  setupDependencyContainerMocks(mock);
}