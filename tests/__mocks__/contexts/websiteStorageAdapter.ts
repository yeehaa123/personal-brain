import { mock } from 'bun:test';

import type { 
  WebsiteStorageAdapter as IWebsiteStorageAdapter,
} from '@/contexts/website/adapters/websiteStorageAdapter';
import type {
  LandingPageData,
  WebsiteConfig,
} from '@/contexts/website/websiteStorage';

/**
 * Mock implementation of WebsiteStorageAdapter for testing
 */
export class MockWebsiteStorageAdapter implements IWebsiteStorageAdapter {
  private static instance: MockWebsiteStorageAdapter | null = null;
  
  // Mock state
  private config: WebsiteConfig = {
    title: 'Test Website',
    description: 'Test Description',
    author: 'Test Author',
    baseUrl: 'http://localhost:4321',
    astroProjectPath: 'src/website',
    deployment: {
      type: 'local-dev',
      previewPort: 4321,
      productionPort: 4322,
    },
  };
  
  private landingPageData: LandingPageData | null = null;
  
  // Mock functions with implementation
  initialize = mock(() => Promise.resolve());
  getWebsiteConfig = mock(() => Promise.resolve(this.config));
  updateWebsiteConfig = mock((updates: Partial<WebsiteConfig>) => {
    this.config = { ...this.config, ...updates };
    return Promise.resolve(this.config);
  });
  getLandingPageData = mock(() => Promise.resolve(this.landingPageData));
  saveLandingPageData = mock((data: LandingPageData) => {
    this.landingPageData = data;
    return Promise.resolve();
  });
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockWebsiteStorageAdapter {
    if (!MockWebsiteStorageAdapter.instance) {
      MockWebsiteStorageAdapter.instance = new MockWebsiteStorageAdapter();
    }
    return MockWebsiteStorageAdapter.instance;
  }
  
  /**
   * Reset the singleton instance (for test isolation)
   */
  static resetInstance(): void {
    if (MockWebsiteStorageAdapter.instance) {
      MockWebsiteStorageAdapter.instance.initialize.mockClear();
      MockWebsiteStorageAdapter.instance.getWebsiteConfig.mockClear();
      MockWebsiteStorageAdapter.instance.updateWebsiteConfig.mockClear();
      MockWebsiteStorageAdapter.instance.getLandingPageData.mockClear();
      MockWebsiteStorageAdapter.instance.saveLandingPageData.mockClear();
    }
    MockWebsiteStorageAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance (for test isolation)
   */
  static createFresh(): MockWebsiteStorageAdapter {
    return new MockWebsiteStorageAdapter();
  }
  
  /**
   * Set initial data for testing
   */
  setConfig(config: Partial<WebsiteConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Set landing page data for testing
   */
  setLandingPageData(data: LandingPageData | null): void {
    this.landingPageData = data;
  }
}