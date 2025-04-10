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
  private mockInitialized = false;
  private mockConfig: WebsiteConfig = {
    title: 'Personal Brain Website',
    description: 'My personal website',
    author: 'Test Author',
    baseUrl: 'https://example.com',
    deploymentType: 'local',
    astroProjectPath: 'src/website',
  };
  private mockPreviewUrl = 'http://localhost:4321';
  private mockPreviewRunning = false;

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
      if (command === 'dev') {
        this.mockPreviewRunning = true; // Update preview state
        return Promise.resolve({
          success: true,
          output: `Local: ${this.mockPreviewUrl}`,
        });
      }
      if (command === 'build') {
        return Promise.resolve({
          success: true,
          output: 'Build completed successfully',
        });
      }
      return Promise.resolve({ success: false, output: 'Unknown command' });
    });

    this.mockAstroContentService.killProcess = mock(() => {
      this.mockPreviewRunning = false; // Update preview state
      return Promise.resolve(true);
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
  async initialize(): Promise<void> {
    this.mockInitialized = true;
    return Promise.resolve();
  }

  isReady(): boolean {
    return this.mockInitialized;
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

  async previewWebsite(): Promise<{ success: boolean; url?: string; message: string; output?: string }> {
    // Check if website is initialized
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }

    // Check if preview is already running
    if (this.isPreviewRunning()) {
      return {
        success: false,
        message: 'Preview server is already running. Use "website-preview-stop" to stop it first.',
      };
    }

    // Use startDevServer for PM2-based preview
    const result = await this.mockAstroContentService.startDevServer();

    // Set preview running state based on result
    if (result.success) {
      this.mockPreviewRunning = true;
    }

    return {
      success: result.success,
      url: result.url,
      message: result.success ? 'Website preview started with PM2' : 'Failed to start website preview',
      output: result.output,
    };
  }

  async stopPreviewWebsite(): Promise<{ success: boolean; message: string }> {
    // Check if website is initialized
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }

    // Check if preview is running
    if (!this.isPreviewRunning()) {
      return {
        success: false,
        message: 'No preview server is currently running.',
      };
    }

    // Use stopDevServer for PM2-based management
    const success = await this.mockAstroContentService.stopDevServer();

    // Update preview state
    if (success) {
      this.mockPreviewRunning = false;
    }

    return {
      success,
      message: success ? 'Website preview server stopped successfully' : 'Failed to stop website preview server',
    };
  }

  isPreviewRunning(): boolean {
    return this.mockPreviewRunning;
  }

  async getAstroContentService(): Promise<AstroContentService> {
    return this.mockAstroContentService as unknown as AstroContentService;
  }

  getLandingPageGenerationService(): LandingPageGenerationService {
    return this.mockLandingPageGenerationService as unknown as LandingPageGenerationService;
  }

  // Test helpers to modify internal state directly
  setMockInitialized(initialized: boolean): void {
    this.mockInitialized = initialized;
  }

  setMockPreviewRunning(running: boolean): void {
    this.mockPreviewRunning = running;
  }

  setMockConfig(config: Partial<WebsiteConfig>): void {
    this.mockConfig = { ...this.mockConfig, ...config };
  }

  getMockPreviewUrl(): string {
    return this.mockPreviewUrl;
  }
}
