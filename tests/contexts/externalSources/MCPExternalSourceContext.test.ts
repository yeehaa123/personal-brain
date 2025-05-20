/**
 * Tests for MCPExternalSourceContext
 * 
 * These tests focus purely on behavior rather than implementation details.
 * The goal is to verify WHAT the context does, not HOW it does it.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, test } from 'bun:test';


import type { ExternalSourceStorageAdapter } from '@/contexts/externalSources/externalSourceStorageAdapter';
import type { MCPExternalSourceContextDependencies } from '@/contexts/externalSources/MCPExternalSourceContext';
import { MCPExternalSourceContext } from '@/contexts/externalSources/MCPExternalSourceContext';
import type { ExternalSourceInterface, ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';
import type { EmbeddingService } from '@/resources/ai/embedding';
import { Logger } from '@/utils/logger';
import { MockExternalSourceStorageAdapter } from '@test/__mocks__/contexts/externalSourceStorageAdapter';

// Test data
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

// Helper to create testable context
function createTestableExternalSourceContext(
  config = {},
  overrides?: Partial<MCPExternalSourceContextDependencies>,
) {
  const mockStorageAdapter = MockExternalSourceStorageAdapter.createFresh();
  const logger = Logger.getInstance();
  
  // Create mock sources
  const mockSources: ExternalSourceInterface[] = [
    {
      name: 'Wikipedia',
      search: async () => mockResults.filter(r => r.source === 'Wikipedia'),
      checkAvailability: async () => true,
      getSourceMetadata: async () => ({
        name: 'Wikipedia',
        description: 'Wikipedia API',
        version: '1.0.0',
      }),
    },
    {
      name: 'NewsAPI',
      search: async () => mockResults.filter(r => r.source === 'NewsAPI'),
      checkAvailability: async () => true,
      getSourceMetadata: async () => ({
        name: 'NewsAPI',
        description: 'News API',
        version: '1.0.0',
      }),
    },
  ];
  
  // Register mock sources
  mockSources.forEach(source => {
    mockStorageAdapter.registerSource(source);
  });
  
  // Create a minimal embedding service mock for testing
  const mockEmbeddingService = {
    getEmbedding: async () => new Array(1536).fill(0.1),
  } as unknown as EmbeddingService;

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
      sources: mockSources,
    },
  };
}

describe('External Source Integration System', () => {
  beforeEach(() => {
    MCPExternalSourceContext.resetInstance();
  });

  describe('System Initialization', () => {
    test('initializes and reports readiness', async () => {
      const { context } = createTestableExternalSourceContext();
      
      expect(context.isReady()).toBe(false);
      
      const result = await context.initialize();
      expect(result).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('provides system information', async () => {
      const { context } = createTestableExternalSourceContext({
        name: 'CustomExternalSourceBrain',
        version: '2.0.0',
      });

      await context.initialize();
      
      expect(context.getContextName()).toBe('CustomExternalSourceBrain');
      expect(context.getContextVersion()).toBe('2.0.0');
      
      const status = context.getStatus();
      expect(status.name).toBe('CustomExternalSourceBrain');
      expect(status.version).toBe('2.0.0');
      expect(status.ready).toBe(true);
    });
  });

  describe('Search Operations', () => {
    test('searches across all sources', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const results = await context.search('test query');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2); // Should have results from both sources
      expect(results[0].source).toMatch(/Wikipedia|NewsAPI/);
      expect(results[1].source).toMatch(/Wikipedia|NewsAPI/);
    });

    test('searches with source filter', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      // Set enabled sources to only Wikipedia
      await context.updateEnabledSources(['Wikipedia']);
      
      const results = await context.search('test query');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.every(r => r.source === 'Wikipedia')).toBe(true);
    });

    test('performs semantic search', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const results = await context.semanticSearch('test query', 2);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('handles invalid source gracefully', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      // Set enabled sources to invalid source
      await context.updateEnabledSources(['InvalidSource']);
      const results = await context.search('test query');
      expect(results).toEqual([]);
    });
  });

  describe('Source Management', () => {
    test('sets enabled sources', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      await context.updateEnabledSources(['Wikipedia']);
      
      // Search should only return results from enabled sources
      const results = await context.search('test query');
      expect(results.every(r => r.source === 'Wikipedia')).toBe(true);
    });

    test('verifies source availability', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const availability = await context.checkSourcesAvailability();
      
      expect(availability).toBeDefined();
      expect(availability['Wikipedia']).toBe(true);
      expect(availability['NewsAPI']).toBe(true);
    });
  });

  describe('MCP Server Integration', () => {
    test('registers external source capabilities with server', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const registrations = { tools: 0, resources: 0 };
      const mockServer = {
        tool: () => { registrations.tools++; },
        resource: () => { registrations.resources++; },
      };

      const success = context.registerOnServer(mockServer as unknown as McpServer);
      
      expect(success).toBe(true);
      expect(registrations.tools).toBeGreaterThan(0);
      expect(registrations.resources).toBeGreaterThan(0);
    });

    test('provides search capabilities', async () => {
      const { context } = createTestableExternalSourceContext();
      await context.initialize();

      const capabilities = context.getCapabilities();
      
      expect(capabilities.tools.length).toBeGreaterThan(0);
      expect(capabilities.resources.length).toBeGreaterThan(0);
      
      // Verify search tool exists
      const searchTool = capabilities.tools.find(t => t.path === 'search');
      expect(searchTool).toBeDefined();
      
      // Verify source listing resource exists (it's a resource, not a tool)
      const sourceListResource = capabilities.resources.find(r => r.path === 'sources');
      expect(sourceListResource).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles search errors gracefully', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      // Force one source to fail
      mocks.sources[0].search = async () => {
        throw new Error('Search failed');
      };

      const results = await context.search('test query');
      // Should still get results from the working source (NewsAPI)
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1); // Only NewsAPI should return results
      expect(results[0].source).toBe('NewsAPI');
    });

    test('handles semantic search errors gracefully', async () => {
      const { context, mocks } = createTestableExternalSourceContext();
      await context.initialize();

      // Force embedding to fail
      mocks.embeddingService.getEmbedding = async () => {
        throw new Error('Embedding failed');
      };

      // Should fall back to regular search
      const results = await context.semanticSearch('test query');
      expect(results).not.toBeNull();
      expect(Array.isArray(results)).toBe(true);
      // Should return results from regular search
      expect(results.length).toBeGreaterThan(0);
    });
  });
});