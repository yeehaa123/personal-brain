import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock implementation of MCPWebsiteContext for testing
 */
export class MockMCPWebsiteContext {
  private static instance: MockMCPWebsiteContext | null = null;
  
  // Use standardized mock logger
  public logger = MockLogger.createFresh();

  private constructor() {}

  public static getInstance(): MockMCPWebsiteContext {
    if (!MockMCPWebsiteContext.instance) {
      MockMCPWebsiteContext.instance = new MockMCPWebsiteContext();
    }
    return MockMCPWebsiteContext.instance;
  }

  public static resetInstance(): void {
    MockMCPWebsiteContext.instance = null;
  }

  public static createFresh(): MockMCPWebsiteContext {
    return new MockMCPWebsiteContext();
  }

  // Mock website methods
  public async generateLandingPage(): Promise<{ success: boolean }> {
    return { success: true };
  }

  public async deployWebsite(): Promise<{ success: boolean }> {
    return { success: true };
  }


  public async getIdentity(): Promise<Record<string, unknown> | null> {
    return null;
  }

  public async setIdentity(_identity: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  // Mock landing page data storage
  private landingPageData: Record<string, unknown> | null = null;

  public async saveLandingPageData(data: Record<string, unknown>): Promise<void> {
    this.landingPageData = data;
  }

  public async getLandingPageData(): Promise<Record<string, unknown> | null> {
    return this.landingPageData;
  }
  
  // Mock methods for website build and promote
  public async handleWebsiteBuild(_environment: 'preview' | 'live'): Promise<{ success: boolean }> {
    return { success: true };
  }
  
  public async handleWebsitePromote(_environment: 'preview' | 'live'): Promise<{ success: boolean }> {
    return { success: true };
  }
  
  // Required MCPContext interface methods
  public isReady(): boolean {
    return true;
  }
  
  public async initialize(): Promise<boolean> {
    return true;
  }
  
  public getContextName(): string {
    return 'MockWebsiteBrain';
  }
  
  public getContextVersion(): string {
    return '1.0.0';
  }
  
  public async getConfig(): Promise<Record<string, unknown>> {
    return {
      title: 'Test Website',
      description: 'Test Website Description',
      author: 'Test Author',
      baseUrl: 'http://example.com',
      astroProjectPath: './src/website',
      deployment: {
        type: 'local-dev',
        previewPort: 3000,
        livePort: 4000,
        domain: 'example.com',
      },
    };
  }
  
  public async getWebsiteStatus(environment = 'preview'): Promise<Record<string, unknown>> {
    return {
      status: 'running',
      message: 'Website is ' + environment,
      url: 'http://example.com',
      fileCount: 10,
    };
  }
}