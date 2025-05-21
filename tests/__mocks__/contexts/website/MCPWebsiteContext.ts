import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ContextCapabilities, ContextStatus, MCPFormatterInterface, MCPStorageInterface, ResourceDefinition } from '@/contexts/MCPContext';
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
  public async generateLandingPage(): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
    return { 
      success: true, 
      message: 'Generated',
      data: {
        name: 'Test Page',
        title: 'Test Title',
        tagline: 'Test Tagline',
      },
    };
  }

  public async deployWebsite(): Promise<{ success: boolean }> {
    return { success: true };
  }

  public async getIdentity(): Promise<Record<string, unknown> | null> {
    return {
      brandIdentity: {
        companyName: 'Test Company',
        mission: 'Test Mission',
      },
      creativeContent: {
        tagline: 'Test Tagline',
      },
    };
  }

  public async generateIdentity(): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
    return {
      success: true,
      message: 'Identity generated',
      data: {
        brandIdentity: {
          companyName: 'Test Company',
          mission: 'Test Mission',
        },
        creativeContent: {
          tagline: 'Test Tagline',
        },
      },
    };
  }

  public async setIdentity(_identity: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  // Mock landing page data storage
  private landingPageData: Record<string, unknown> | null = {
    name: 'Test Page',
    title: 'Test Title',
    tagline: 'Test Tagline',
    sectionOrder: ['hero', 'about', 'services'],
  };

  public async saveLandingPageData(data: Record<string, unknown>): Promise<void> {
    this.landingPageData = data;
  }

  public async getLandingPageData(): Promise<Record<string, unknown> | null> {
    return this.landingPageData;
  }
  
  // Mock methods for website build and promote
  public async handleWebsiteBuild(): Promise<{ success: boolean; message: string; path?: string }> {
    return { 
      success: true, 
      message: 'Built successfully',
      path: './dist',
    };
  }
  
  public async handleWebsitePromote(): Promise<{ success: boolean; message: string; url?: string }> {
    return { 
      success: true, 
      message: 'Promoted successfully',
      url: 'https://example.com',
    };
  }
  
  // Mock assessment methods
  public async assessLandingPage(options?: { useIdentity?: boolean; regenerateFailingSections?: boolean }): Promise<{
    success: boolean;
    message: string;
    qualityAssessment?: {
      sections: Record<string, unknown>;
    };
    regenerationResult?: {
      success: boolean;
      message: string;
      data?: Record<string, unknown>;
    };
  }> {
    if (options?.regenerateFailingSections) {
      return {
        success: true,
        message: 'Assessment with regeneration completed',
        qualityAssessment: {
          sections: {
            hero: { score: 8, feedback: 'Good hero section' },
            about: { score: 6, feedback: 'Needs improvement' },
          },
        },
        regenerationResult: {
          success: true,
          message: 'Regeneration completed',
          data: this.landingPageData || {},
        },
      };
    }
    
    return {
      success: true,
      message: 'Assessment completed',
      qualityAssessment: {
        sections: {
          hero: { score: 8, feedback: 'Good hero section' },
          about: { score: 6, feedback: 'Needs improvement' },
        },
      },
    };
  }
  
  public async regenerateFailedLandingPageSections(): Promise<{
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  }> {
    if (!this.landingPageData) {
      return {
        success: false,
        message: 'No landing page data available to regenerate',
      };
    }
    
    return {
      success: true,
      message: 'Regenerated failed sections',
      data: this.landingPageData,
    };
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
  
  public async getWebsiteStatus(environment = 'preview'): Promise<{
    status: string;
    message: string;
    url?: string;
    fileCount?: number;
  }> {
    return {
      status: 'running',
      message: 'Website is ' + environment,
      url: 'http://example.com',
      fileCount: 10,
    };
  }
  
  // New MCP methods
  public getCapabilities(): ContextCapabilities {
    // Define mock resources
    const resources: ResourceDefinition[] = [
      {
        protocol: 'website',
        path: 'config',
        handler: async () => this.getConfig(),
        name: 'Website Configuration',
        description: 'Get website configuration settings',
      },
      {
        protocol: 'website',
        path: 'landing-page',
        handler: async () => this.getLandingPageData(),
        name: 'Landing Page Data',
        description: 'Get current landing page data',
      },
      {
        protocol: 'website',
        path: 'identity',
        handler: async () => this.getIdentity(),
        name: 'Website Identity',
        description: 'Get website brand identity',
      },
    ];
    
    // Define mock tools
    const tools: ResourceDefinition[] = [
      {
        protocol: 'tools',
        path: 'generate-landing-page',
        name: 'generate-landing-page',
        description: 'Generate a landing page',
        handler: async () => this.generateLandingPage(),
      },
      {
        protocol: 'tools',
        path: 'assess-landing-page',
        name: 'assess-landing-page',
        description: 'Assess landing page quality',
        handler: async (options?: Record<string, unknown>) => this.assessLandingPage(options as { useIdentity?: boolean; regenerateFailingSections?: boolean }),
      },
      {
        protocol: 'tools',
        path: 'regenerate-failed-sections',
        name: 'regenerate-failed-sections',
        description: 'Regenerate failed landing page sections',
        handler: async () => this.regenerateFailedLandingPageSections(),
      },
      {
        protocol: 'tools',
        path: 'build-website',
        name: 'build-website',
        description: 'Build the website',
        handler: async () => this.handleWebsiteBuild(),
      },
      {
        protocol: 'tools',
        path: 'promote-website',
        name: 'promote-website',
        description: 'Promote website to production',
        handler: async () => this.handleWebsitePromote(),
      },
      {
        protocol: 'tools',
        path: 'get-website-status',
        name: 'get-website-status',
        description: 'Get website status',
        handler: async (options?: Record<string, unknown>) => this.getWebsiteStatus(options && options['environment'] as string),
      },
      {
        protocol: 'tools',
        path: 'generate-identity',
        name: 'generate-identity',
        description: 'Generate website identity',
        handler: async () => this.generateIdentity(),
      },
    ];
    
    return {
      resources,
      tools,
      features: ['landing-page', 'website-identity', 'website-build', 'website-status'],
    };
  }
  
  public getStorage(): MCPStorageInterface {
    return {
      create: async (item: Record<string, unknown>) => {
        if (item['type'] === 'landingPage' && item['data']) {
          await this.saveLandingPageData(item['data'] as Record<string, unknown>);
          return 'landing-page';
        }
        throw new Error('Unsupported item type for website storage');
      },
      
      read: async (id: string) => {
        if (id === 'landing-page') {
          const data = await this.getLandingPageData();
          return data ? { type: 'landingPage', data } : null;
        }
        if (id === 'config') {
          const config = await this.getConfig();
          return { type: 'config', data: config };
        }
        return null;
      },
      
      update: async (id: string, updates: Record<string, unknown>) => {
        if (id === 'landing-page' && updates['data']) {
          await this.saveLandingPageData(updates['data'] as Record<string, unknown>);
          return true;
        }
        return false;
      },
      
      delete: async (_id: string) => {
        // Website storage doesn't support deletion
        return false;
      },
      
      search: async (_criteria: Record<string, unknown>) => {
        // Return empty list since we don't support search in the mock
        return [];
      },
      
      list: async (_options?: { limit?: number; offset?: number }) => {
        // Just return landing page data in a list if it exists
        const landingPageData = await this.getLandingPageData();
        return landingPageData ? [{ id: 'landing-page', data: landingPageData }] : [];
      },
      
      count: async (_criteria?: Record<string, unknown>) => {
        // Just return 1 if we have landing page data, 0 otherwise
        const landingPageData = await this.getLandingPageData();
        return landingPageData ? 1 : 0;
      },
    };
  }
  
  public getFormatter(): MCPFormatterInterface {
    return {
      format: (data: unknown) => {
        return { formatted: true, data };
      },
    };
  }
  
  public cleanup(): Promise<void> {
    return Promise.resolve();
  }
  
  public getStatus(): ContextStatus {
    return { 
      name: this.getContextName(),
      version: this.getContextVersion(),
      ready: true,
      status: 'ready', 
      message: 'Context is ready',
    };
  }
  
  public getMcpServer(): McpServer {
    // Create a minimal mock of McpServer
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      resource: () => {},
      tool: () => {},
    } as unknown as McpServer;
  }
  
  public registerOnServer(_server: McpServer): boolean {
    return true;
  }
}