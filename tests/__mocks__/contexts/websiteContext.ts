import { mock } from 'bun:test';

import type { AstroContentService } from '@/mcp/contexts/website/services/astroContentService';
import type { LandingPageGenerationService } from '@/mcp/contexts/website/services/landingPageGenerationService';
import type { LandingPageData, WebsiteConfig } from '@/mcp/contexts/website/storage/websiteStorage';
// Import the mock implementations from the contexts/website/services directory
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockLandingPageGenerationService } from '@test/__mocks__/contexts/website/services/landingPageGenerationService';

/**
 * Mock implementation of WebsiteContext for testing
 * This implementation follows the Component Interface Standardization pattern
 */
export class MockWebsiteContext {
  private static instance: MockWebsiteContext | null = null;

  // Mock state tracking
  private mockConfig: WebsiteConfig = {
    title: 'Personal Brain Website',
    description: 'My personal website',
    author: 'Test Author',
    baseUrl: 'https://example.com',
    astroProjectPath: 'src/website',
  };

  // Use the existing MockAstroContentService and MockLandingPageGenerationService
  private mockAstroContentService: MockAstroContentService;
  private mockLandingPageGenerationService: MockLandingPageGenerationService;

  constructor() {
    // Create instances of the mock services
    this.mockAstroContentService = MockAstroContentService.createFresh();
    this.mockLandingPageGenerationService = MockLandingPageGenerationService.createFresh();

    // Set up default landing page data
    const landingPageData: LandingPageData = {
      name: 'Test User',
      title: 'Developer & Architect',
      tagline: 'Building software that matters',
    };

    // Configure mocks with behavior that tracks state in this class
    this.mockAstroContentService.readLandingPageContent = mock(() => Promise.resolve(landingPageData));

    this.mockAstroContentService.runAstroCommand = mock((command: string) => {
      if (command === 'build') {
        return Promise.resolve({
          success: true,
          output: 'Build completed successfully',
        });
      }
      return Promise.resolve({ success: false, output: 'Unknown command' });
    });

    this.mockLandingPageGenerationService.generateLandingPageData = mock(() => Promise.resolve(landingPageData));
  }

  /**
   * Get the singleton instance of MockWebsiteContext
   */
  static getInstance(): MockWebsiteContext {
    if (!MockWebsiteContext.instance) {
      MockWebsiteContext.instance = new MockWebsiteContext();
    }
    return MockWebsiteContext.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockWebsiteContext.instance = null;
  }

  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(): MockWebsiteContext {
    return new MockWebsiteContext();
  }

  // Core WebsiteContext methods that would be used by command handlers
  isReady(): boolean {
    return true;
  }

  async getConfig(): Promise<WebsiteConfig> {
    return Promise.resolve(this.mockConfig);
  }

  async updateConfig(config: Partial<WebsiteConfig>): Promise<void> {
    this.mockConfig = { ...this.mockConfig, ...config };
    return Promise.resolve();
  }

  async generateLandingPage(): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
    // Check if website is initialized
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }

    // Generate landing page data
    const data = await this.mockLandingPageGenerationService.generateLandingPageData();
    
    // Need to cast to access the properly typed mock
    const astroService = this.mockAstroContentService as MockAstroContentService;
    await astroService.writeLandingPageContent(data);
    return {
      success: true,
      message: 'Landing page generated successfully',
      data,
    };
  }

  async buildWebsite(): Promise<{ success: boolean; message: string }> {
    // Check if website is initialized
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }

    const result = await this.mockAstroContentService.runAstroCommand('build');
    return {
      success: result.success,
      message: result.output,
    };
  }

  // Preview methods removed - Caddy is always running in the new approach

  // Preview state tracking removed - Caddy is always running

  async getAstroContentService(): Promise<AstroContentService> {
    return this.mockAstroContentService as unknown as AstroContentService;
  }

  getLandingPageGenerationService(): LandingPageGenerationService {
    return this.mockLandingPageGenerationService as unknown as LandingPageGenerationService;
  }

  // New methods for bot-controlled website deployment
  async handleWebsiteBuild(): Promise<{ success: boolean; message: string; url?: string }> {
    return {
      success: true,
      message: 'Website built successfully for preview',
      url: 'https://preview.example.com',
    };
  }

  async handleWebsitePromote(): Promise<{ success: boolean; message: string; url?: string }> {
    return {
      success: true,
      message: 'Preview successfully promoted to production',
      url: 'https://example.com',
    };
  }

  async handleWebsiteStatus(environment: string = 'preview'): Promise<{ 
    success: boolean; 
    message: string;
    data?: {
      environment: string;
      buildStatus: string;
      fileCount: number;
      caddyStatus: string;
      domain: string;
      accessStatus: string;
      url: string;
    }
  }> {
    return {
      success: true,
      message: `${environment} website status: Built, Caddy: Running, Files: 42, Access: Accessible`,
      data: {
        environment,
        buildStatus: 'Built',
        fileCount: 42,
        caddyStatus: 'Running',
        domain: environment === 'preview' ? 'preview.example.com' : 'example.com',
        accessStatus: 'Accessible',
        url: `https://${environment === 'preview' ? 'preview.example.com' : 'example.com'}`,
      },
    };
  }

  // Test helpers to modify internal state directly

  // Preview state tracking removed - Caddy is always running

  setMockConfig(config: Partial<WebsiteConfig>): void {
    this.mockConfig = { ...this.mockConfig, ...config };
  }

  // No longer needed with Caddy approach
}
