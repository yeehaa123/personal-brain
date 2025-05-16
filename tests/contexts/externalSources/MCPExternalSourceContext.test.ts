import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { ExternalSourceStorageAdapter } from '@/contexts/externalSources/externalSourceStorageAdapter';
import type { MCPExternalSourceContextDependencies } from '@/contexts/externalSources/MCPExternalSourceContext';
import { MCPExternalSourceContext } from '@/contexts/externalSources/MCPExternalSourceContext';
import type { ExternalSourceInterface, ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';
import type { EmbeddingService } from '@/resources/ai/embedding';
import { Logger } from '@/utils/logger';
import { MockExternalSourceContext } from '@test/__mocks__/contexts/externalSourceContext';
import { MockExternalSourceStorageAdapter } from '@test/__mocks__/contexts/externalSourceStorageAdapter';

describe('MCPExternalSourceContext', () => {
  // Sample external source results for testing
  const mockResults: ExternalSourceResult[] = [
    {
      content: 'Test content 1',
      title: 'Test Result 1',
      url: 'https://example.com/1',
      source: 'Wikipedia',
      sourceType: 'wiki',
      timestamp: new Date(),
      confidence: 0.9,
    },
    {
      content: 'Test content 2',
      title: 'Test Result 2',
      url: 'https://example.com/2',
      source: 'NewsAPI',
      sourceType: 'news',
      timestamp: new Date(),
      confidence: 0.8,
    },
  ];

  // Test dependencies
  let mockStorageAdapter: MockExternalSourceStorageAdapter;
  let logger: Logger;
  let mockEmbeddingService: EmbeddingService;
  let mockSources: ExternalSourceInterface[];

  // Helper to create testable context
  const createTestableExternalSourceContext = (
    config = {},
    overrides?: Partial<MCPExternalSourceContextDependencies>,
  ) => {
    const dependencies: MCPExternalSourceContextDependencies = {
      storage: mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      embeddingService: mockEmbeddingService,
      logger,
      ...overrides,
    };

    const context = MCPExternalSourceContext.createFresh(config, dependencies);

    return {
      context,
      mocks: {
        storage: mockStorageAdapter,
        embeddingService: mockEmbeddingService,
        logger,
      },
    };
  };

  beforeEach(() => {
    // Reset singletons before each test
    MCPExternalSourceContext.resetInstance();
    MockExternalSourceContext.resetInstance();
    MockExternalSourceStorageAdapter.resetInstance();

    // Create fresh instances
    mockStorageAdapter = MockExternalSourceStorageAdapter.createFresh();
    logger = Logger.getInstance();
    
    // Create mock sources
    mockSources = [
      {
        name: 'Wikipedia',
        search: async () => [],
        checkAvailability: async () => true,
        getSourceMetadata: async () => ({}),
      },
      {
        name: 'NewsAPI',
        search: async () => [],
        checkAvailability: async () => true,
        getSourceMetadata: async () => ({}),
      },
    ];
    
    // Register mock sources in the storage adapter
    mockSources.forEach(source => {
      mockStorageAdapter.registerSource(source);
    });
    
    // Mock the embedding service
    mockEmbeddingService = {
      getEmbedding: async () => {
        // Return a mock embedding
        return new Array(1536).fill(0.1);
      },
      calculateSimilarity: () => {
        // Return a mock similarity score
        return 0.85;
      },
    } as unknown as EmbeddingService;

    // Mock the logger methods properly for Bun
    spyOn(logger, 'error').mockImplementation(() => {});
    spyOn(logger, 'debug').mockImplementation(() => {});
    spyOn(logger, 'warn').mockImplementation(() => {});
  });

  describe('System Integration', () => {
    test('follows Component Interface Standardization pattern', () => {
      expect(MCPExternalSourceContext.getInstance).toBeDefined();
      expect(MCPExternalSourceContext.resetInstance).toBeDefined();
      expect(MCPExternalSourceContext.createFresh).toBeDefined();
    });

    test('implements MCPContext interface', () => {
      const { context } = createTestableExternalSourceContext();

      // Core MCPContext methods
      expect(context.getContextName).toBeDefined();
      expect(context.getContextVersion).toBeDefined();
      expect(context.initialize).toBeDefined();
      expect(context.isReady).toBeDefined();
      expect(context.getStatus).toBeDefined();
      expect(context.getStorage).toBeDefined();
      expect(context.getFormatter).toBeDefined();
      expect(context.registerOnServer).toBeDefined();
      expect(context.getMcpServer).toBeDefined();
      expect(context.getCapabilities).toBeDefined();
      expect(context.cleanup).toBeDefined();
    });
  });

  describe('Context Initialization', () => {
    test('initializes with default configuration', async () => {
      const { context } = createTestableExternalSourceContext();

      const result = await context.initialize();
      expect(result).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('initializes with custom configuration', async () => {
      const customConfig = {
        name: 'CustomExternalBrain',
        version: '2.0.0',
        apiKey: 'test-api-key',
        newsApiKey: 'test-news-key',
      };

      const { context } = createTestableExternalSourceContext(customConfig);

      await context.initialize();
      expect(context.getContextName()).toBe('CustomExternalBrain');
      expect(context.getContextVersion()).toBe('2.0.0');
    });

  });

  describe('Search Operations', () => {
    test('performs basic search', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      spyOn(mocks.storage, 'search').mockResolvedValue(mockResults);

      const results = await context.search('test query', { limit: 10 });
      
      expect(results).toEqual(mockResults);
      expect(mocks.storage.search).toHaveBeenCalledWith({
        query: 'test query',
        limit: 10,
        addEmbeddings: undefined,
      });
    });

  });

  describe('Source Management', () => {
    test('checks sources availability', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      const mockAvailability = {
        Wikipedia: true,
        NewsAPI: false,
      };

      spyOn(mocks.storage, 'checkSourcesAvailability').mockResolvedValue(mockAvailability);

      const availability = await context.checkSourcesAvailability();
      
      expect(availability).toEqual(mockAvailability);
      expect(mocks.storage.checkSourcesAvailability).toHaveBeenCalled();
    });

    test('gets enabled sources', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      const mockSources: ExternalSourceInterface[] = [
        {
          name: 'Wikipedia',
          search: async () => [],
          checkAvailability: async () => true,
          getSourceMetadata: async () => ({}),
        },
      ];

      spyOn(mocks.storage, 'getEnabledSources').mockReturnValue(mockSources);

      const sources = context.getEnabledSources();
      
      expect(sources).toEqual([
        { name: 'Wikipedia', enabled: true },
      ]);
      expect(mocks.storage.getEnabledSources).toHaveBeenCalled();
    });

    test('updates enabled sources in memory', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      // Get initial sources
      const initialSources = context.getEnabledSources();
      expect(initialSources.length).toBeGreaterThan(0);

      // Update to only Wikipedia
      await context.updateEnabledSources(['Wikipedia']);
      
      const updatedSources = context.getEnabledSources();
      expect(updatedSources).toHaveLength(1);
      expect(updatedSources[0].name).toBe('Wikipedia');
      expect(updatedSources[0].enabled).toBe(true);

      // Update to multiple sources
      await context.updateEnabledSources(['Wikipedia', 'NewsAPI']);
      
      const multiSources = context.getEnabledSources();
      expect(multiSources).toHaveLength(2);
      expect(multiSources.map(s => s.name)).toEqual(['Wikipedia', 'NewsAPI']);
    });

    test('search respects enabled sources override', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      // Update to only Wikipedia
      await context.updateEnabledSources(['Wikipedia']);

      spyOn(mocks.storage, 'search').mockResolvedValue(mockResults);

      // Perform search
      await context.search('test query', { limit: 5 });

      // Verify storage.search was called with the override sources
      expect(mocks.storage.search).toHaveBeenCalledWith({
        query: 'test query',
        limit: 5,
        sources: ['Wikipedia'],
      });
    });
  });

  describe('Storage Interface', () => {
    test('implements MCPStorageInterface', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const storage = context.getStorage();

      expect(storage.create).toBeDefined();
      expect(storage.read).toBeDefined();
      expect(storage.update).toBeDefined();
      expect(storage.delete).toBeDefined();
      expect(storage.search).toBeDefined();
      expect(storage.list).toBeDefined();
      expect(storage.count).toBeDefined();
    });

    test('storage operations throw errors for read-only sources', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const storage = context.getStorage();
      
      await expect(storage.create({})).rejects.toThrow('External sources are read-only');
      await expect(storage.update('id', {})).rejects.toThrow('External sources are read-only');
      await expect(storage.delete('id')).rejects.toThrow('External sources are read-only');
    });

    test('storage read throws error for external sources', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const storage = context.getStorage();
      await expect(storage.read('wiki:test')).rejects.toThrow('External sources do not support direct read by ID');
    });

    test('storage list returns available sources', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      const mockSources = [
        { name: 'Wikipedia', checkAvailability: async () => true },
        { name: 'NewsAPI', checkAvailability: async () => true },
      ];

      spyOn(mocks.storage, 'getEnabledSources').mockReturnValue(mockSources as ExternalSourceInterface[]);

      const storage = context.getStorage();
      const result = await storage.list();

      expect(result).toEqual([
        { name: 'Wikipedia', available: true },
        { name: 'NewsAPI', available: true },
      ]);
    });
  });

  describe('MCP Resources and Tools', () => {
    test('provides search resource', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      spyOn(mocks.storage, 'search').mockResolvedValue(mockResults);

      const capabilities = context.getCapabilities();
      expect(capabilities.resources).toHaveLength(2);

      const searchResource = capabilities.resources[0];
      expect(searchResource.protocol).toBe('external');
      expect(searchResource.path).toBe('search');

      // Test the handler
      const result = await searchResource.handler({}, { query: 'test' });
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('count');
    });

    test('provides sources resource', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      const mockAvailability = {
        Wikipedia: true,
        NewsAPI: true,
      };

      spyOn(mocks.storage, 'checkSourcesAvailability').mockResolvedValue(mockAvailability);

      const capabilities = context.getCapabilities();
      const sourcesResource = capabilities.resources[1];
      
      expect(sourcesResource.protocol).toBe('external');
      expect(sourcesResource.path).toBe('sources');

      // Test the handler - should return all enabled sources
      const result = await sourcesResource.handler({});
      expect(result).toHaveProperty('sources');
      expect((result as { sources: unknown[] }).sources).toHaveLength(2);
    });

    test('provides search and source tools', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const capabilities = context.getCapabilities();
      expect(capabilities.tools).toHaveLength(3);

      const searchTool = capabilities.tools[0];
      expect(searchTool.protocol).toBe('external');
      expect(searchTool.path).toBe('search');

      const sourcesTool = capabilities.tools[1];
      expect(sourcesTool.protocol).toBe('external');
      expect(sourcesTool.path).toBe('toggle_source');
    });
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const instance1 = MCPExternalSourceContext.getInstance();
      const instance2 = MCPExternalSourceContext.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('resetInstance clears singleton', () => {
      const instance1 = MCPExternalSourceContext.getInstance();
      MCPExternalSourceContext.resetInstance();
      const instance2 = MCPExternalSourceContext.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    test('createFresh creates new instance', () => {
      const instance1 = MCPExternalSourceContext.getInstance();
      const instance2 = MCPExternalSourceContext.createFresh({});

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Status and Capabilities', () => {
    test('reports context status', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const status = context.getStatus();

      expect(status['name']).toBe('ExternalBrain');
      expect(status['version']).toBe('1.0.0');
      expect(status['ready']).toBe(true);
      expect(status['resourceCount']).toBe(2);
      expect(status['toolCount']).toBe(3);
    });

    test('reports context capabilities', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const capabilities = context.getCapabilities();

      expect(capabilities.resources).toHaveLength(2);
      expect(capabilities.tools).toHaveLength(3);
      expect(capabilities.features).toEqual([]);
    });
  });
});