import type { ExternalSourceResult } from '@/contexts/externalSources/sources';

/**
 * Mock implementation of MCPExternalSourceContext for testing
 */
export class MockMCPExternalSourceContext {
  private static instance: MockMCPExternalSourceContext | null = null;
  private sources: string[] = ['WikipediaSource', 'NewsAPISource'];
  private enabled = true;

  private constructor() {}

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

  // Mock methods
  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public getEnabledSources(): { name: string }[] {
    return this.sources.map(name => ({ name }));
  }

  public async search(query: string): Promise<ExternalSourceResult[]> {
    return [
      {
        source: 'WikipediaSource',
        title: `Mock Wikipedia: ${query}`,
        content: `This is mock content for ${query} from Wikipedia`,
        url: `https://wikipedia.org/wiki/${query}`,
        timestamp: new Date(),
        sourceType: 'webpage' as const,
        confidence: 0.9,
      },
    ];
  }

  public async semanticSearch(query: string, limit?: number): Promise<ExternalSourceResult[]> {
    const results = await this.search(query);
    return results.slice(0, limit || 5);
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