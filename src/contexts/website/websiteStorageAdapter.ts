import config from '@/config';
import { Logger } from '@/utils/logger';

import type { LandingPageData, WebsiteConfig } from './websiteStorage';

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
    astroProjectPath: 'src/website',
    deployment: {
      type: 'local-dev',
      previewPort: 4321,
      productionPort: 4322,
    },
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

/**
 * Global config-based implementation of WebsiteStorageAdapter
 * Uses the website section of the global config for static configuration values
 */
export class GlobalConfigWebsiteStorageAdapter implements WebsiteStorageAdapter {
  private logger = Logger.getInstance();
  private inMemoryStorage = new InMemoryWebsiteStorageAdapter();
  
  async initialize(): Promise<void> {
    // Initialize in-memory storage with global config values
    const globalConfig = this.mapGlobalConfigToWebsiteConfig();
    await this.inMemoryStorage.updateWebsiteConfig(globalConfig);
  }
  
  /**
   * Map global configuration to website configuration
   */
  private mapGlobalConfigToWebsiteConfig(): WebsiteConfig {
    const { website } = config;
    
    // Transform global config format to website config format
    return {
      title: website.title,
      description: website.description,
      author: website.author,
      baseUrl: website.baseUrl,
      astroProjectPath: website.astroProjectPath,
      deployment: {
        type: website.deployment.type as 'local-dev' | 'caddy',
        previewDir: website.deployment.previewDir,
        productionDir: website.deployment.productionDir,
        previewPort: website.deployment.previewPort,
        productionPort: website.deployment.productionPort,
        domain: website.deployment.domain,
      },
    };
  }
  
  // Deployment-related methods removed - Caddy is now the only approach
  
  async getWebsiteConfig(): Promise<WebsiteConfig> {
    // Always return fresh config from global config
    // This ensures we get the latest values without needing to restart
    const globalConfig = this.mapGlobalConfigToWebsiteConfig();
    await this.inMemoryStorage.updateWebsiteConfig(globalConfig);
    return this.inMemoryStorage.getWebsiteConfig();
  }
  
  async updateWebsiteConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    this.logger.info('Updating website configuration', {
      updates,
      context: 'GlobalConfigWebsiteStorageAdapter',
    });
    
    // Note: This only updates the local in-memory copy
    // Global config values from environment variables remain unchanged
    return this.inMemoryStorage.updateWebsiteConfig(updates);
  }
  
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.inMemoryStorage.getLandingPageData();
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    await this.inMemoryStorage.saveLandingPageData(data);
  }
}