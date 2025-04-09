import type { LandingPageData, WebsiteConfig } from '../storage/websiteStorage';

/**
 * Storage adapter interface for the Website Context
 */
export interface WebsiteStorageAdapter {
  /**
   * Initialize storage adapter
   */
  initialize(): Promise<void>;
  // Config management
  getWebsiteConfig(): Promise<WebsiteConfig>;
  updateWebsiteConfig(config: Partial<WebsiteConfig>): Promise<WebsiteConfig>;
  
  // Landing page data
  getLandingPageData(): Promise<LandingPageData | null>;
  saveLandingPageData(data: LandingPageData): Promise<void>;
}

/**
 * In-memory implementation of WebsiteStorageAdapter for development
 */
export class InMemoryWebsiteStorageAdapter implements WebsiteStorageAdapter {
  private config: WebsiteConfig = {
    title: 'Personal Brain',
    description: 'My personal website',
    author: 'Anonymous',
    baseUrl: 'http://localhost:4321',
    deploymentType: 'local',
    astroProjectPath: 'src/website',
  };
  
  private landingPageData: LandingPageData | null = null;
  
  async initialize(): Promise<void> {
    // Nothing to initialize for in-memory storage
  }
  
  async getWebsiteConfig(): Promise<WebsiteConfig> {
    return this.config;
  }
  
  async updateWebsiteConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    this.config = { ...this.config, ...updates };
    return this.config;
  }
  
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.landingPageData;
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    this.landingPageData = data;
  }
}