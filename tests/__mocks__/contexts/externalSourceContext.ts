/**
 * ExternalSourceContext mock implementation
 * 
 * Provides a standardized mock for the ExternalSourceContext class.
 */

import { mock } from 'bun:test';

import type { ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';

import { MockBaseContext } from './baseContext';

/**
 * Mock implementation for the ExternalSourceContext
 */
export class MockExternalSourceContext extends MockBaseContext {
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
   * Constructor
   */
  constructor(config: Record<string, unknown> = {}) {
    super({
      name: config['name'] || 'ExternalSourceBrain',
      version: config['version'] || '1.0.0',
    });
    
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
   * Check if any sources are available
   */
  async checkSourcesAvailability(): Promise<boolean> {
    let anyAvailable = false;
    
    for (const source of this.sources) {
      const isAvailable = await source.checkAvailability();
      source.isAvailable = isAvailable;
      if (isAvailable) {
        anyAvailable = true;
      }
    }
    
    return anyAvailable;
  }
  
  /**
   * Get all available sources
   */
  getAvailableSources(): string[] {
    return this.sources
      .filter(source => source.isAvailable)
      .map(source => source.name);
  }
}