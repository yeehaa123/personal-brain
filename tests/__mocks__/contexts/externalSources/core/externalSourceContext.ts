/**
 * ExternalSourceContext mock implementation
 * 
 * Provides a standardized mock for the ExternalSourceContext class.
 * Uses the MockExternalSourceStorageAdapter for storage.
 */

import { mock } from 'bun:test';

import type { ExternalSourceResult } from '@/contexts/externalSources/sources/externalSourceInterface';

import { MockBaseContext } from '../../baseContext';
import { MockExternalSourceStorageAdapter } from '../adapters/externalSourceStorageAdapter';

/**
 * Mock implementation for the ExternalSourceContext
 */
export class MockExternalSourceContext extends MockBaseContext {
  private static instance: MockExternalSourceContext | null = null;
  
  // Mock storage adapter
  private storageAdapter = MockExternalSourceStorageAdapter.getInstance();
  
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
    
    // Initialize mock resources
    this.resources = [
      {
        protocol: 'externalSources',
        path: 'list',
        handler: mock(() => Promise.resolve(
          this.storageAdapter.getEnabledSources().map(s => ({ name: s.name, available: true })),
        )),
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
   * Search all sources
   */
  async search(query: string, options: Record<string, unknown> = {}): Promise<ExternalSourceResult[]> {
    return this.storageAdapter.search({
      query,
      limit: options['limit'] as number,
      addEmbeddings: options['addEmbeddings'] as boolean,
    });
  }
  
  /**
   * Semantic search across all sources
   */
  async semanticSearch(query: string, options: Record<string, unknown> = {}): Promise<ExternalSourceResult[]> {
    return this.storageAdapter.search({
      query,
      limit: options['limit'] as number,
      addEmbeddings: true,
    });
  }
  
  /**
   * Check if any sources are available
   */
  async checkSourcesAvailability(): Promise<boolean> {
    const availability = await this.storageAdapter.checkSourcesAvailability();
    return Object.values(availability).some(available => available);
  }
  
  /**
   * Get all available sources
   */
  getAvailableSources(): string[] {
    return this.storageAdapter.getEnabledSources().map(source => source.name);
  }
}