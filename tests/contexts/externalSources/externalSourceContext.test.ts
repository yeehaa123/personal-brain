/**
 * Tests for ExternalSourceContext
 * 
 * This test suite focuses on testing the ExternalSourceContext class in isolation,
 * using direct dependency injection for mocked dependencies.
 */

import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ExternalSourceContext } from '@/contexts';
import type { ExternalSourceContextConfig } from '@/contexts/externalSources/externalSourceContext';
import type { ExternalSourceStorageAdapter } from '@/contexts/externalSources/externalSourceStorageAdapter';
import type { ExternalSourceInterface, ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { EmbeddingService } from '@/resources/ai/embedding';
import { MockExternalSourceStorageAdapter } from '@test/__mocks__/contexts/externalSourceStorageAdapter';
import { MockLogger } from '@test/__mocks__/core/logger';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('ExternalSourceContext', () => {
  // Create mock dependencies directly
  let mockStorageAdapter: MockExternalSourceStorageAdapter;
  let mockEmbeddingService: MockEmbeddingService;

  // Set up before each test to ensure isolation
  beforeEach(() => {
    // Reset any instances
    ExternalSourceContext.resetInstance();
    MockEmbeddingService.resetInstance();
    MockLogger.resetInstance();

    // Create fresh mock dependencies for each test
    mockStorageAdapter = MockExternalSourceStorageAdapter.createFresh();
    mockEmbeddingService = MockEmbeddingService.createFresh();

    // Add spies to the embedding service methods we'll use
    mockEmbeddingService.getEmbedding = mock(() => Promise.resolve([0.1, 0.2, 0.3]));
    mockEmbeddingService.calculateSimilarity = mock(() => 0.85);
  });

  // Clean up after each test
  afterEach(() => {
    // Reset all instances to avoid test interference
    ExternalSourceContext.resetInstance();
  });

  // Clean up after all tests
  afterAll(() => {
    // Reset any static instances
    MockLogger.resetInstance();
  });

  test('should initialize with proper configuration', () => {
    // Create a context instance with direct dependency injection
    const context = new ExternalSourceContext(
      {
        name: 'TestContext',
        version: '2.0.0',
        apiKey: 'test-api-key',
        newsApiKey: 'test-news-api-key',
      },
      mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      mockEmbeddingService as unknown as EmbeddingService,
    );

    // Check context name and version
    expect(context.getContextName()).toBe('TestContext');
    expect(context.getContextVersion()).toBe('2.0.0');
  });



  test('should register a custom source', () => {
    // Setup mock for registerSource
    const registerSourceMock = mock(() => { });
    mockStorageAdapter.registerSource = registerSourceMock;

    // Create a context with direct dependency injection
    const context = new ExternalSourceContext(
      { name: 'TestContext' },
      mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      mockEmbeddingService as unknown as EmbeddingService,
    );

    // Create a mock custom source
    const mockSource: ExternalSourceInterface = {
      name: 'CustomSource',
      search: mock(() => Promise.resolve([])),
      checkAvailability: mock(() => Promise.resolve(true)),
      getSourceMetadata: mock(() => Promise.resolve({})),
    };

    // Register the custom source
    context.registerSource(mockSource);

    // Verify the source was registered
    expect(registerSourceMock).toHaveBeenCalledWith(mockSource);
  });

  test('should perform basic search', async () => {
    // Set up mock results
    const mockResults: ExternalSourceResult[] = [
      {
        title: 'Test Result 1',
        content: 'This is a test result',
        source: 'TestSource',
        sourceType: 'test',
        url: 'https://example.com/test1',
        timestamp: new Date(),
        confidence: 0.9,
      },
      {
        title: 'Test Result 2',
        content: 'This is another test result',
        source: 'TestSource',
        sourceType: 'test',
        url: 'https://example.com/test2',
        timestamp: new Date(),
        confidence: 0.8,
      },
    ];

    // Set up search method spy
    const searchSpy = mock((_criteria) => Promise.resolve(mockResults));
    mockStorageAdapter.search = searchSpy;

    // Create a context with direct dependency injection
    const context = new ExternalSourceContext(
      {} as ExternalSourceContextConfig,
      mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      mockEmbeddingService as unknown as EmbeddingService,
    );

    // Perform a search
    const results = await context.search('test query');

    // Verify our search was called with correct parameters
    expect(searchSpy).toHaveBeenCalledWith({
      query: 'test query',
      limit: undefined,
      addEmbeddings: undefined,
    });

    // Verify results
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
    expect(results[0].title).toBe('Test Result 1');
    expect(results[1].title).toBe('Test Result 2');
  });

  test('should perform semantic search', async () => {
    // Set up mock results with embeddings
    const mockResults: ExternalSourceResult[] = [
      {
        title: 'Test Result 1',
        content: 'This is a test result',
        source: 'TestSource',
        sourceType: 'test',
        url: 'https://example.com/test1',
        timestamp: new Date(),
        confidence: 0.9,
        embedding: [0.1, 0.2, 0.3],
      },
      {
        title: 'Test Result 2',
        content: 'This is another test result',
        source: 'TestSource',
        sourceType: 'test',
        url: 'https://example.com/test2',
        timestamp: new Date(),
        confidence: 0.8,
        embedding: [0.2, 0.3, 0.4],
      },
    ];

    // Set up search spy to return results with embeddings
    const searchSpy = mock(() => Promise.resolve(mockResults));
    mockStorageAdapter.search = searchSpy;

    // Create a context with direct dependency injection
    const context = new ExternalSourceContext(
      {} as ExternalSourceContextConfig,
      mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      mockEmbeddingService as unknown as EmbeddingService,
    );

    // Perform a semantic search
    const results = await context.semanticSearch('test query', 2);

    // Verify search was called with the right parameters
    expect(searchSpy).toHaveBeenCalledWith({
      query: 'test query',
      limit: undefined,
      addEmbeddings: true,
    });

    // Verify embedding service was used
    expect(mockEmbeddingService.getEmbedding).toHaveBeenCalledWith('test query');

    // Verify results
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);

    // Make sure the results don't have a similarityScore property
    const hasScores = results.some(result => 'similarityScore' in result);
    expect(hasScores).toBe(false);
  });

  test('should check sources availability', async () => {
    // Set up availability result
    const availabilityResult = {
      'Wikipedia': true,
      'NewsAPI': true,
    };

    // Set up checkSourcesAvailability spy
    const checkAvailabilitySpy = mock(() => Promise.resolve(availabilityResult));
    mockStorageAdapter.checkSourcesAvailability = checkAvailabilitySpy;

    // Create a context with direct dependency injection
    const context = new ExternalSourceContext(
      {} as ExternalSourceContextConfig,
      mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      mockEmbeddingService as unknown as EmbeddingService,
    );

    // Check sources availability
    const availability = await context.checkSourcesAvailability();

    // Verify our mock was called
    expect(checkAvailabilitySpy).toHaveBeenCalled();

    // Verify the result matches our mock
    expect(availability).toEqual(availabilityResult);
    expect(Object.keys(availability).length).toBe(2);
    expect(availability['Wikipedia']).toBe(true);
    expect(availability['NewsAPI']).toBe(true);
  });

  test('should provide access to enabled sources', () => {
    // Set up mock enabled sources
    const mockSources = [
      {
        name: 'Wikipedia',
        search: mock(() => Promise.resolve([])),
        checkAvailability: mock(() => Promise.resolve(true)),
        getSourceMetadata: mock(() => Promise.resolve({})),
      },
      {
        name: 'NewsAPI',
        search: mock(() => Promise.resolve([])),
        checkAvailability: mock(() => Promise.resolve(true)),
        getSourceMetadata: mock(() => Promise.resolve({})),
      },
    ];

    // Set up getEnabledSources spy
    const getEnabledSourcesSpy = mock(() => mockSources);
    mockStorageAdapter.getEnabledSources = getEnabledSourcesSpy;

    // Create a context with direct dependency injection
    const context = new ExternalSourceContext(
      {} as ExternalSourceContextConfig,
      mockStorageAdapter as unknown as ExternalSourceStorageAdapter,
      mockEmbeddingService as unknown as EmbeddingService,
    );

    // Get enabled sources
    const enabledSources = context.getEnabledSources();

    // Verify our mock was called
    expect(getEnabledSourcesSpy).toHaveBeenCalled();

    // Verify the result matches our mock
    expect(enabledSources).toEqual(mockSources);
    expect(enabledSources.length).toBe(2);
    expect(enabledSources[0].name).toBe('Wikipedia');
    expect(enabledSources[1].name).toBe('NewsAPI');
  });
});
