/**
 * ExternalSourceContext mock implementation
 * 
 * Provides a standardized mock for the ExternalSourceContext class.
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { mock } from 'bun:test';

import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { StorageInterface } from '@/contexts/storageInterface';

import { MockBaseContext } from './baseContext';
import { MockExternalSourceFormatter } from './externalSources/formatters/externalSourceFormatter';
import { MockExternalSourceStorageAdapter } from './externalSourceStorageAdapter';

/**
 * Mock implementation for the ExternalSourceContext
 */
export class MockExternalSourceContext extends MockBaseContext<
  StorageInterface<ExternalSourceResult>,
  MockExternalSourceFormatter,
  ExternalSourceResult[],
  string
> {
  private static instance: MockExternalSourceContext | null = null;

  // Mock sources
  protected sources: Array<{
    name: string;
    search: (query: string, options?: Record<string, unknown>) => Promise<ExternalSourceResult[]>;
    semanticSearch: (query: string, options?: Record<string, unknown>) => Promise<ExternalSourceResult[]>;
    checkAvailability: () => Promise<boolean>;
    isAvailable: boolean;
  }> = [];

  /**
   * Get singleton instance of MockExternalSourceContext
   */
  public static override getInstance(): MockExternalSourceContext {
    if (!MockExternalSourceContext.instance) {
      MockExternalSourceContext.instance = new MockExternalSourceContext();
    }
    return MockExternalSourceContext.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockExternalSourceContext.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static override createFresh(config: Record<string, unknown> = {}): MockExternalSourceContext {
    return new MockExternalSourceContext(config);
  }

  /**
   * Create with dependencies factory method
   */
  public static createWithDependencies(config: Record<string, unknown> = {}): MockExternalSourceContext {
    return new MockExternalSourceContext(config);
  }

  /**
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    super({
      name: config['name'] || 'ExternalSourceBrain',
      version: config['version'] || '1.0.0',
    });

    // Set up storage and formatter
    this.storage = config['storage'] as StorageInterface<ExternalSourceResult> ||
      MockExternalSourceStorageAdapter.createFresh();

    this.formatter = config['formatter'] as MockExternalSourceFormatter ||
      MockExternalSourceFormatter.createFresh();

    // Initialize mock sources
    this.sources = [
      {
        name: 'Wikipedia',
        search: mock(() => Promise.resolve([])),
        semanticSearch: mock(() => Promise.resolve([])),
        checkAvailability: mock(() => Promise.resolve(true)),
        isAvailable: true,
      },
      {
        name: 'NewsAPI',
        search: mock(() => Promise.resolve([])),
        semanticSearch: mock(() => Promise.resolve([])),
        checkAvailability: mock(() => Promise.resolve(true)),
        isAvailable: true,
      },
    ];

    // Initialize mock resources
    this.resources = [
      {
        protocol: 'externalSources',
        path: 'list',
        handler: mock(() => Promise.resolve(this.sources.map(s => ({ name: s.name, available: s.isAvailable })))),
        name: 'List Sources',
        description: 'List all available external sources',
      },
    ];

    // Initialize mock tools
    this.tools = [
      {
        protocol: 'externalSources',
        path: 'search',
        handler: mock(() => Promise.resolve([])),
        name: 'Search External Sources',
        description: 'Search external sources for information',
      },
    ];
  }

  /**
   * Set up mock sources for testing
   * @param sources Array of sources to use
   */
  setMockSources(sources: typeof this.sources): void {
    this.sources = sources;
  }

  /**
   * Add a mock source for testing
   * @param source Source to add
   */
  addMockSource(source: typeof this.sources[0]): void {
    this.sources.push(source);
  }

  /**
   * Search all sources
   */
  async search(query: string, options: Record<string, unknown> = {}): Promise<ExternalSourceResult[]> {
    // Combine results from all available sources
    const results: ExternalSourceResult[] = [];

    for (const source of this.sources) {
      if (source.isAvailable) {
        const sourceResults = await source.search(query, options);
        results.push(...sourceResults);
      }
    }

    return results;
  }

  /**
   * Semantic search across all sources
   */
  async semanticSearch(query: string, options: Record<string, unknown> = {}): Promise<ExternalSourceResult[]> {
    // Combine results from all available sources
    const results: ExternalSourceResult[] = [];

    for (const source of this.sources) {
      if (source.isAvailable) {
        const sourceResults = await source.semanticSearch(query, options);
        results.push(...sourceResults);
      }
    }

    return results;
  }

  /**
   * Check if sources are available
   */
  async checkSourcesAvailability(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    for (const source of this.sources) {
      const isAvailable = await source.checkAvailability();
      source.isAvailable = isAvailable;
      result[source.name] = isAvailable;
    }

    return result;
  }

  /**
   * Get enabled sources
   */
  getEnabledSources(): Array<{
    name: string;
    search: (query: string, options?: Record<string, unknown>) => Promise<ExternalSourceResult[]>;
    checkAvailability: () => Promise<boolean>;
  }> {
    return this.sources.filter(source => source.isAvailable);
  }

  /**
   * Get all available source names
   */
  getAvailableSources(): string[] {
    return this.sources
      .filter(source => source.isAvailable)
      .map(source => source.name);
  }

  /**
   * Required implementation of interface methods from FullContextInterface
   */
  override getInstance(): MockExternalSourceContext {
    return MockExternalSourceContext.getInstance();
  }

  override resetInstance(): void {
    MockExternalSourceContext.resetInstance();
  }

  override createFresh(options?: Record<string, unknown>): MockExternalSourceContext {
    return MockExternalSourceContext.createFresh(options);
  }

  override createWithDependencies(dependencies: Record<string, unknown>): MockExternalSourceContext {
    return MockExternalSourceContext.createWithDependencies(dependencies);
  }
}
