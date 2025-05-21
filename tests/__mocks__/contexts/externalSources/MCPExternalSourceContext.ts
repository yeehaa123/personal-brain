import type { ContextStatus, ResourceDefinition } from '@/contexts/contextInterface';
import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { ExternalSourceToolContext } from '@/contexts/externalSources/tools';

/**
 * Mock implementation of MCPExternalSourceContext for testing
 * Implements the updated ExternalSourceToolContext interface
 */
export class MockMCPExternalSourceContext implements ExternalSourceToolContext {
  private static instance: MockMCPExternalSourceContext | null = null;
  private sources: string[] = ['WikipediaSource', 'NewsAPISource'];
  private enabled = true;
  private tools: ResourceDefinition[] = [];
  private resources: ResourceDefinition[] = [];

  private constructor() {
    // Initialize mock resources
    this.resources = [
      {
        protocol: 'external',
        path: 'search',
        handler: async () => ({ results: [] }),
        name: 'Search External Sources',
        description: 'Search across external knowledge sources',
      },
    ];

    // Initialize mock tools
    this.tools = [
      {
        protocol: 'external',
        path: 'search',
        handler: async () => ({ content: [{ type: 'text', text: 'Mock search results' }] }),
        name: 'search_external_sources',
        description: 'Search across external knowledge sources',
      },
    ];
  }

  public static getInstance(): MockMCPExternalSourceContext {
    if (!MockMCPExternalSourceContext.instance) {
      MockMCPExternalSourceContext.instance = new MockMCPExternalSourceContext();
    }
    return MockMCPExternalSourceContext.instance;
  }

  public static resetInstance(): void {
    MockMCPExternalSourceContext.instance = null;
  }

  public static createFresh(): MockMCPExternalSourceContext {
    return new MockMCPExternalSourceContext();
  }

  // MCP Context interface methods
  public getCapabilities(): { resources: ResourceDefinition[]; tools: ResourceDefinition[]; features: string[] } {
    return {
      resources: this.resources,
      tools: this.tools,
      features: ['external_search'],
    };
  }

  public getContextName(): string {
    return 'MockExternalSourceContext';
  }

  public getContextVersion(): string {
    return '1.0.0';
  }

  public async initialize(): Promise<boolean> {
    return true;
  }

  public isReady(): boolean {
    return this.enabled;
  }

  public getStatus(): ContextStatus {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      ready: this.enabled,
      initialized: true,
      error: null,
    };
  }

  public async cleanup(): Promise<void> {
    // No cleanup needed
  }

  // ExternalSourceToolContext interface implementation
  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public getEnabledSources(): { name: string; enabled: boolean }[] {
    return this.sources.map(name => ({ name, enabled: true }));
  }

  public async updateEnabledSources(sourceNames: string[]): Promise<void> {
    this.sources = [...sourceNames];
  }

  public async search(query: string, options?: { limit?: number; addEmbeddings?: boolean }): Promise<ExternalSourceResult[]> {
    const limit = options?.limit || 5;
    const results: ExternalSourceResult[] = Array(limit).fill(0).map((_, index) => ({
      source: 'WikipediaSource',
      title: `Mock Wikipedia ${index}: ${query}`,
      content: `This is mock content ${index} for ${query} from Wikipedia`,
      url: `https://wikipedia.org/wiki/${query}${index}`,
      timestamp: new Date(),
      sourceType: 'webpage' as const,
      confidence: 0.9,
      embedding: options?.addEmbeddings ? [0.1, 0.2, 0.3] : undefined,
    }));
    
    return results.slice(0, limit);
  }

  public async semanticSearch(query: string, limit?: number): Promise<ExternalSourceResult[]> {
    const results = await this.search(query, { limit, addEmbeddings: true });
    return results;
  }

  public async checkSourcesAvailability(): Promise<Record<string, boolean>> {
    return {
      WikipediaSource: true,
      NewsAPISource: true,
    };
  }

  public registerSource(source: { name: string }): void {
    this.sources.push(source.name);
  }
}