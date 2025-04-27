import { mock } from 'bun:test';

import { WebsiteContext } from '@/contexts/website';
import type { WebsiteContextOptions } from '@/contexts/website';
import type { WebsiteStorageAdapter } from '@/contexts/website/adapters/websiteStorageAdapter';
import type { WebsiteDeploymentManager } from '@/contexts/website/services/deployment';
import type { WebsiteConfig } from '@/contexts/website/websiteStorage';
import type { LandingPageData } from '@/contexts/website/websiteStorage';

/**
 * Mock implementation of WebsiteContext for testing
 */
export class MockWebsiteContext extends WebsiteContext {
  private static mockInstance: MockWebsiteContext | null = null;
  
  // Mock functions
  override initialize = mock(() => Promise.resolve(true));
  override getContextName = mock(() => super.getContextName());
  override getContextVersion = mock(() => super.getContextVersion());
  override setReadyState = mock((ready: boolean) => { super.setReadyState(ready); });
  override getConfig = mock(() => this.getStorage().getWebsiteConfig());
  override updateConfig = mock((updates: Partial<WebsiteConfig>) => this.getStorage().updateWebsiteConfig(updates));
  override getLandingPageData = mock(() => this.getStorage().getLandingPageData());
  override saveLandingPageData = mock((data: LandingPageData) => this.getStorage().saveLandingPageData(data));
  override getStorage = mock(() => super.getStorage());
  // For testing - allows changing the storage adapter
  override setStorage = mock((storage: WebsiteStorageAdapter) => { 
    // Recreate the context with the new storage
    const options = {
      storage: storage,
    };
    // Apply properties from this instance to the new instance
    Object.assign(this, new MockWebsiteContext(options));
  });
  override getDeploymentManager = mock(() => Promise.resolve(super.getDeploymentManager()));
  override getAstroContentService = mock(() => Promise.resolve(super.getAstroContentService()));
  override getProfileContext = mock(() => super.getProfileContext());
  override getLandingPageGenerationService = mock(() => super.getLandingPageGenerationService());
  override generateLandingPage = mock(() => Promise.resolve({
    success: true,
    message: 'Landing page generated',
    data: {
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
    },
  } as unknown as ReturnType<WebsiteContext['generateLandingPage']>));
  override buildWebsite = mock(() => Promise.resolve({
    success: true,
    message: 'Website built',
    output: 'Build completed successfully',
  }));
  override handleWebsiteBuild = mock(() => Promise.resolve({
    success: true,
    message: 'Website built',
    path: '/dist/preview',
    url: 'http://localhost:4321',
  }));
  override handleWebsitePromote = mock(() => Promise.resolve({
    success: true,
    message: 'Website promoted',
    url: 'http://localhost:4322',
  }));
  override handleWebsiteStatus = mock(() => Promise.resolve({
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
   * Get the singleton instance
   */
  static override getInstance(options?: WebsiteContextOptions): MockWebsiteContext {
    if (!MockWebsiteContext.mockInstance) {
      MockWebsiteContext.mockInstance = new MockWebsiteContext(options);
    }
    return MockWebsiteContext.mockInstance;
  }
  
  /**
   * Reset the singleton instance
   */
  static override resetInstance(): void {
    if (MockWebsiteContext.mockInstance) {
      const instance = MockWebsiteContext.mockInstance;
      instance.initialize.mockClear();
      instance.getContextName.mockClear();
      instance.getContextVersion.mockClear();
      instance.setReadyState.mockClear();
      instance.getConfig.mockClear();
      instance.updateConfig.mockClear();
      instance.getLandingPageData.mockClear();
      instance.saveLandingPageData.mockClear();
      instance.getStorage.mockClear();
      instance.setStorage.mockClear();
      instance.getDeploymentManager.mockClear();
      instance.getAstroContentService.mockClear();
      instance.getProfileContext.mockClear();
      instance.getLandingPageGenerationService.mockClear();
      instance.generateLandingPage.mockClear();
      instance.buildWebsite.mockClear();
      instance.handleWebsiteBuild.mockClear();
      instance.handleWebsitePromote.mockClear();
      instance.handleWebsiteStatus.mockClear();
    }
    MockWebsiteContext.mockInstance = null;
    WebsiteContext.resetInstance();
  }
  
  /**
   * Create a fresh instance
   */
  static override createFresh(options?: WebsiteContextOptions): MockWebsiteContext {
    return new MockWebsiteContext(options);
  }
  
  /**
   * Set the storage adapter
   */
  setTestStorage(storage: WebsiteStorageAdapter): void {
    this.setStorage(storage);
  }
  
  /**
   * Set the deployment manager for testing
   */
  setTestDeploymentManager(manager: WebsiteDeploymentManager): void {
    this.setDeploymentManagerForTesting(manager);
  }
}