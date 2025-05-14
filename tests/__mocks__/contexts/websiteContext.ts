/**
 * Completely standalone mock implementation of WebsiteContext
 * 
 * This mock doesn't extend any base classes and is purpose-built for testing.
 */

import { mock } from 'bun:test';

import type { WebsiteContextConfig, WebsiteContextDependencies } from '@/contexts/website';
import type { WebsiteStorageAdapter } from '@/contexts/website/adapters/websiteStorageAdapter';
import type { WebsiteFormatter } from '@/contexts/website/formatters';
import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import type { AstroContentService } from '@/contexts/website/services/astroContentService';
import type { WebsiteDeploymentManager } from '@/contexts/website/services/deployment';
import type { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { WebsiteIdentityService } from '@/contexts/website/services/websiteIdentityService';
import type { LandingPageGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import type { LandingPageData, WebsiteConfig } from '@/contexts/website/websiteStorage';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';

import { MockWebsiteStorageAdapter } from './website/adapters/websiteStorageAdapter';

/**
 * Mock implementation of WebsiteContext for testing
 * 
 * This is a standalone mock class that doesn't extend any real implementation
 * classes. It just implements the interface methods needed for testing.
 */
export class MockWebsiteContext {
  private static mockInstance: MockWebsiteContext | null = null;
  
  // Mock state
  private readyState: boolean = true;
  private mockResources: Array<Record<string, unknown>> = [];
  private mockTools: Array<Record<string, unknown>> = [];
  
  // Test dependencies
  private storage: WebsiteStorageAdapter;
  private formatter: WebsiteFormatter;
  private astroContentService: AstroContentService | null = null;
  private landingPageGenerationService: LandingPageGenerationService | null = null;
  private mediator: ContextMediator | null = null;
  private deploymentManager: WebsiteDeploymentManager | null = null;
  private identityService: WebsiteIdentityService | null = null;
  
  // Standard context methods
  initialize = mock(async (): Promise<boolean> => {
    this.readyState = true;
    return true;
  });

  isReady = mock((): boolean => {
    return this.readyState;
  });

  getContextName = mock((): string => {
    return 'website';
  });

  getContextVersion = mock((): string => {
    return '1.0.0';
  });

  getStatus = mock(() => {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      ready: this.readyState,
      resourceCount: this.mockResources.length,
      toolCount: this.mockTools.length,
    };
  });

  // Resources and tools
  getResources = mock(() => [...this.mockResources]);
  getTools = mock(() => [...this.mockTools]);
  
  getCapabilities = mock(() => {
    return {
      resources: this.getResources(),
      tools: this.getTools(),
      features: [],
    };
  });

  // MCP related methods
  getMcpServer = mock(() => {
    return {
      name: this.getContextName(),
      version: this.getContextVersion(),
      resource: () => {},
      tool: () => {},
    };
  });

  registerOnServer = mock(() => true);

  // Other standard methods
  cleanup = mock(async () => {});
  
  // Website context specific methods
  getConfig = mock(() => {
    return {
      title: 'Test Website',
      description: 'A test website description',
      author: 'Test Author',
      baseUrl: 'http://localhost:4321',
      astroProjectPath: 'src/website',
      deployment: {
        type: 'local-dev',
        previewPort: 4321,
        livePort: 4322,
      },
    } as WebsiteConfig;
  });
  
  getLandingPageData = mock(() => {
    if (this.storage && this.storage.getLandingPageData) {
      return this.storage.getLandingPageData();
    }
    return Promise.resolve({ title: 'Test Landing Page' } as LandingPageData);
  });
  
  saveLandingPageData = mock((data: LandingPageData) => {
    if (this.storage && this.storage.saveLandingPageData) {
      return this.storage.saveLandingPageData(data);
    }
    return Promise.resolve(true);
  });
  getWebsiteRoot = mock(() => '/mock/website/root');
  resolveWebsitePath = mock((relativePath: string) => `/mock/website/root/${relativePath}`);
  getWebsiteServiceUrl = mock(() => 'http://localhost:4321');
  
  // Website identity methods
  generateWebsiteIdentity = mock((forceRegenerate = false) => {
    if (this.identityService && this.identityService.getIdentity) {
      return this.identityService.getIdentity(forceRegenerate);
    }
    
    return Promise.resolve({
      brandIdentity: {
        name: 'Test Brand',
        tagline: 'Test Tagline',
        description: 'Test description',
      },
      creativeContent: {
        tone: 'Professional',
        style: 'Modern',
        examples: ['Example 1', 'Example 2'],
      },
      personalData: {
        name: 'Test User',
        email: 'test@example.com',
      },
    } as unknown as WebsiteIdentityData);
  });
  
  regenerateWebsiteIdentity = mock(() => this.generateWebsiteIdentity(true));
  
  getWebsiteIdentity = mock((forceRegenerate = false) => {
    if (this.identityService && this.identityService.getIdentity) {
      return this.identityService.getIdentity(forceRegenerate);
    }
    
    return Promise.resolve({
      brandIdentity: {
        name: 'Test Brand',
        tagline: 'Test Tagline',
        description: 'Test description',
      },
      creativeContent: {
        tone: 'Professional',
        style: 'Modern',
        examples: ['Example 1', 'Example 2'],
      },
      personalData: {
        name: 'Test User',
        email: 'test@example.com',
      },
    } as unknown as WebsiteIdentityData);
  });
  
  // Landing page methods
  generateLandingPage = mock(async () => {
    if (this.landingPageGenerationService) {
      // First get the identity
      await this.getWebsiteIdentity();
      
      // Then call the landing page generation service
      const service = this.landingPageGenerationService as unknown as { generateLandingPageData: () => Promise<unknown> };
      const result = await service.generateLandingPageData();
      return result;
    }
    
    return {
      title: 'Test Page',
      name: 'Test Name',
      tagline: 'Test Tagline',
      description: 'Test description',
      sectionOrder: ['hero', 'services', 'cta', 'footer'],
      hero: {
        headline: 'Test Headline',
        subheading: 'Test Subheading',
        ctaText: 'Test CTA',
        ctaLink: '#contact',
      },
      services: {
        title: 'Test Services',
        items: [
          {
            title: 'Service 1',
            description: 'Description 1',
          },
        ],
      },
      cta: {
        title: 'Test CTA',
        buttonText: 'Get Started',
        buttonLink: '#contact',
        enabled: true,
      },
      footer: {
        copyrightText: 'Test Copyright',
        enabled: true,
      },
    } as LandingPageData;
  });
  
  getLandingPage = mock(() => Promise.resolve({
    title: 'Test Page',
    name: 'Test Name',
    tagline: 'Test Tagline',
    description: 'Test description',
    sectionOrder: ['hero', 'services', 'cta', 'footer'],
    hero: {
      headline: 'Test Headline',
      subheading: 'Test Subheading',
      ctaText: 'Test CTA',
      ctaLink: '#contact',
    },
    services: {
      title: 'Test Services',
      items: [
        {
          title: 'Service 1',
          description: 'Description 1',
        },
      ],
    },
    cta: {
      title: 'Test CTA',
      buttonText: 'Get Started',
      buttonLink: '#contact',
      enabled: true,
    },
    footer: {
      copyrightText: 'Test Copyright',
      enabled: true,
    },
  } as LandingPageData));
  
  getLandingPageStatus = mock(() => Promise.resolve({
    status: 'completed',
    sections: {
      hero: { status: 'completed' },
      services: { status: 'completed' },
      cta: { status: 'completed' },
      footer: { status: 'completed' },
    },
  } as unknown as LandingPageGenerationStatus));
  
  deployWebsite = mock(() => Promise.resolve(true));
  
  generateLandingPageSection = mock((sectionId: string) => Promise.resolve(`Mock content for section ${sectionId}`));
  
  assessLandingPageSections = mock(() => Promise.resolve({
    hero: { quality: 'high', issues: [], score: 95 },
    services: { quality: 'high', issues: [], score: 90 },
    cta: { quality: 'high', issues: [], score: 85 },
    footer: { quality: 'high', issues: [], score: 80 },
  } as Record<string, Record<string, unknown>>));
  
  regenerateLandingPageSection = mock((sectionId: string) => Promise.resolve({
    success: true,
    message: `Successfully regenerated ${sectionId} section`,
  }));
  
  regenerateFailedLandingPageSections = mock(() => Promise.resolve({
    success: true,
    message: 'Successfully regenerated all failed sections',
    results: {
      attempted: 2,
      succeeded: 2,
      failed: 0,
      sections: {
        'pricing': { success: true, message: 'Successfully regenerated pricing section' },
        'faq': { success: true, message: 'Successfully regenerated faq section' },
      },
    },
  }));
  
  saveToAstroContent = mock(() => Promise.resolve(true));
  
  // Identity-related methods
  getIdentity = mock((_forceRegenerate = false) => Promise.resolve({
    brandIdentity: {
      name: 'Test Brand',
      tagline: 'Test Tagline',
      description: 'Test description',
    },
    creativeContent: {
      tone: 'Professional',
      style: 'Modern',
      examples: ['Example 1', 'Example 2'],
    },
    personalData: {
      name: 'Test User',
      email: 'test@example.com',
    },
  } as unknown as WebsiteIdentityData));
  
  generateIdentity = mock(() => Promise.resolve({
    success: true,
    data: {
      brandIdentity: {
        name: 'Test Brand',
        tagline: 'Test Tagline',
        description: 'Test description',
      },
      creativeContent: {
        tone: 'Professional',
        style: 'Modern',
        examples: ['Example 1', 'Example 2'],
      },
      personalData: {
        name: 'Test User',
        email: 'test@example.com',
      },
    } as unknown as WebsiteIdentityData,
  }));
  
  updateIdentity = mock((updates: Record<string, unknown>) => Promise.resolve({
    success: true,
    data: {
      brandIdentity: {
        name: 'Updated Brand',
        tagline: 'Updated Tagline',
        description: 'Updated description',
      },
      creativeContent: {
        tone: 'Professional',
        style: 'Modern',
        examples: ['Example 1', 'Example 2'],
      },
      personalData: {
        name: 'Test User',
        email: 'test@example.com',
      },
      ...updates,
    } as unknown as WebsiteIdentityData,
  }));
  
  // Landing page editing functions
  editLandingPage = mock(() => Promise.resolve({
    success: true,
    message: 'Successfully edited landing page',
  }));
  
  assessLandingPage = mock(() => Promise.resolve({
    success: true,
    message: 'Successfully assessed landing page',
    data: {
      quality: 'high',
      score: 90,
      issues: [],
    },
  }));
  
  // Build and deployment methods
  buildWebsite = mock(() => Promise.resolve({
    success: true,
    message: 'Website built',
    output: 'Build completed successfully',
  }));
  
  handleWebsiteBuild = mock(() => Promise.resolve({
    success: true,
    message: 'Website built',
    path: '/dist/preview',
    url: 'http://localhost:4321',
  }));
  
  handleWebsitePromote = mock(async () => {
    if (this.deploymentManager && this.deploymentManager.promoteToLive) {
      return this.deploymentManager.promoteToLive();
    }
    
    return Promise.resolve({
      success: true,
      message: 'Website promoted',
      url: 'http://localhost:4322',
    });
  });
  
  handleWebsiteStatus = mock(() => Promise.resolve({
    success: true,
    message: 'Website status',
    data: {
      environment: 'preview',
      buildStatus: 'built',
      fileCount: 10,
      serverStatus: 'running',
      domain: 'localhost',
      accessStatus: 'online',
      url: 'http://localhost:4321',
    },
  }));
  
  /**
   * Create a mock WebsiteContext
   */
  constructor(
    _config: WebsiteContextConfig = {},
    dependencies: Partial<WebsiteContextDependencies> = {},
  ) {
    // Set up dependencies
    this.storage = dependencies.storage || MockWebsiteStorageAdapter.getInstance();
    this.formatter = dependencies.formatter || {
      formatAsText: () => 'Formatted text',
      formatAsMarkdown: () => '# Formatted markdown',
      formatAsJson: () => '{}',
      formatConfig: () => 'Config',
      formatLandingPage: () => 'Landing page',
      formatIdentity: () => 'Identity',
      format: () => 'Formatted',
      formatBuildStatus: () => 'Build status',
    } as unknown as WebsiteFormatter;
    this.astroContentService = dependencies.astroContentService || null;
    this.landingPageGenerationService = dependencies.landingPageGenerationService || null;
    this.mediator = dependencies.mediator || null;
    this.deploymentManager = dependencies.deploymentManager || null;
    this.identityService = dependencies.identityService || null;
    
    // Add some mock resources and tools
    this.mockResources = [
      {
        protocol: 'website',
        path: 'get',
        handler: async () => {
          return { success: true };
        },
        name: 'Get Website',
        description: 'Get website details',
      },
    ];
    
    this.mockTools = [
      {
        protocol: 'website',
        path: 'deploy',
        handler: async () => {
          return { success: true };
        },
        name: 'Deploy Website',
        description: 'Deploy the website',
      },
    ];
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(
    config: WebsiteContextConfig = {},
    dependencies: Partial<WebsiteContextDependencies> = {},
  ): MockWebsiteContext {
    if (!MockWebsiteContext.mockInstance) {
      MockWebsiteContext.mockInstance = new MockWebsiteContext(config, dependencies);
    }
    return MockWebsiteContext.mockInstance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    if (MockWebsiteContext.mockInstance) {
      const instance = MockWebsiteContext.mockInstance;
      
      // Clear all basic mocks
      instance.initialize.mockClear();
      instance.isReady.mockClear();
      instance.getContextName.mockClear();
      instance.getContextVersion.mockClear();
      instance.getStatus.mockClear();
      instance.getResources.mockClear();
      instance.getTools.mockClear();
      instance.getCapabilities.mockClear();
      instance.getMcpServer.mockClear();
      instance.registerOnServer.mockClear();
      instance.cleanup.mockClear();
      
      // Clear website-specific mocks
      instance.getConfig.mockClear();
      instance.getLandingPageData.mockClear();
      instance.saveLandingPageData.mockClear();
      instance.getWebsiteRoot.mockClear();
      instance.resolveWebsitePath.mockClear();
      instance.getWebsiteServiceUrl.mockClear();
      instance.generateWebsiteIdentity.mockClear();
      instance.regenerateWebsiteIdentity.mockClear();
      instance.getWebsiteIdentity.mockClear();
      instance.generateLandingPage.mockClear();
      instance.getLandingPage.mockClear();
      instance.getLandingPageStatus.mockClear();
      instance.deployWebsite.mockClear();
      instance.generateLandingPageSection.mockClear();
      instance.assessLandingPageSections.mockClear();
      instance.regenerateLandingPageSection.mockClear();
      instance.regenerateFailedLandingPageSections.mockClear();
      instance.saveToAstroContent.mockClear();
      instance.buildWebsite.mockClear();
      instance.handleWebsiteBuild.mockClear();
      instance.handleWebsitePromote.mockClear();
      instance.handleWebsiteStatus.mockClear();
      instance.getIdentity.mockClear();
      instance.generateIdentity.mockClear();
      instance.updateIdentity.mockClear();
      instance.editLandingPage.mockClear();
      instance.assessLandingPage.mockClear();
    }
    MockWebsiteContext.mockInstance = null;
  }
  
  /**
   * Create a fresh instance
   */
  public static createFresh(
    config: WebsiteContextConfig = {},
    dependencies: Partial<WebsiteContextDependencies> = {},
  ): MockWebsiteContext {
    return new MockWebsiteContext(config, dependencies);
  }
  
  /**
   * Get the storage adapter
   */
  getStorage(): WebsiteStorageAdapter {
    return this.storage;
  }
  
  /**
   * Get the formatter
   */
  getFormatter(): WebsiteFormatter {
    return this.formatter;
  }
  
  /**
   * Get profile data using messaging (new implementation)
   */
  getProfileData = mock(async (): Promise<Record<string, string> | null> => {
    if (!this.mediator) {
      return null;
    }
    
    return {
      displayName: 'Test User',
      email: 'test@example.com',
      headline: 'Test Headline',
      summary: 'Test Bio',
    };
  });
  
  /**
   * Get the context mediator for messaging
   */
  getMediator(): ContextMediator | null {
    return this.mediator;
  }
  
  /**
   * Set the context mediator for testing
   */
  setMediator(mediator: ContextMediator): void {
    this.mediator = mediator;
  }
  
  /**
   * Get the deployment manager
   */
  getDeploymentManager(): Promise<WebsiteDeploymentManager> {
    return Promise.resolve(this.deploymentManager as WebsiteDeploymentManager);
  }
  
  /**
   * Get the Astro content service
   */
  getAstroContentService(): Promise<AstroContentService> {
    return Promise.resolve(this.astroContentService || {
      // Only add the methods we need for the failing tests
      readLandingPageContent: async () => {
        return {
          title: 'Test Page',
          name: 'Test Name',
          tagline: 'Test Tagline',
          description: 'Test description',
          sectionOrder: ['hero', 'services', 'cta', 'footer'],
          services: {
            title: 'Test Services',
            items: [{title: 'Service 1', description: 'Description 1'}],
          },
          hero: {
            headline: 'Test Headline',
            subheading: 'Test Subheading',
            ctaText: 'Test CTA',
          },
        } as LandingPageData;
      },
      writeLandingPageContent: async () => true,
    } as unknown as AstroContentService);
  }
  
  /**
   * Get the landing page generation service
   */
  getLandingPageGenerationService(): LandingPageGenerationService {
    return this.landingPageGenerationService as LandingPageGenerationService;
  }
  
  /**
   * Get the identity service
   */
  getIdentityService(): WebsiteIdentityService {
    return this.identityService as WebsiteIdentityService;
  }
  
  /**
   * Set the ready state
   */
  setReadyState(ready: boolean): void {
    this.readyState = ready;
  }
  
  /**
   * Set the storage adapter for testing
   */
  setTestStorage(storage: WebsiteStorageAdapter): void {
    this.storage = storage;
  }
  
  /**
   * Set the deployment manager for testing
   */
  setTestDeploymentManager(manager: WebsiteDeploymentManager): void {
    this.deploymentManager = manager;
  }
  
  /**
   * Set the landing page generation service for testing
   */
  setTestLandingPageGenerationService(service: LandingPageGenerationService): void {
    this.landingPageGenerationService = service;
  }
  
  /**
   * Set the Astro content service for testing
   */
  setTestAstroContentService(service: AstroContentService): void {
    this.astroContentService = service;
  }
  
  /**
   * Set the identity service for testing
   */
  setTestIdentityService(service: WebsiteIdentityService): void {
    this.identityService = service;
  }
}

export default MockWebsiteContext;