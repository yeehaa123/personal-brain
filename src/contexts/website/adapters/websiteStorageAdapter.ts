import config from '@/config';
import type { ListOptions, SearchCriteria, StorageInterface } from '@/contexts/core/storageInterface';
import { Logger } from '@/utils/logger';

import type { LandingPageData, WebsiteConfig } from '../storage/websiteStorage';


/**
 * Website data type for StorageInterface compatibility
 */
export interface WebsiteDataItem {
  id: string;
  type: 'config' | 'landingPage';
  data: WebsiteConfig | LandingPageData;
}

/**
 * Storage adapter interface for the Website Context
 */
export interface WebsiteStorageAdapter extends StorageInterface<WebsiteDataItem> {
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
  private items: Map<string, WebsiteDataItem> = new Map();
  
  async initialize(): Promise<void> {
    // Nothing to initialize for in-memory storage
    // Set up default items
    this.items.set('config', {
      id: 'config',
      type: 'config',
      data: this.config,
    });
  }
  
  async getWebsiteConfig(): Promise<WebsiteConfig> {
    return this.config;
  }
  
  async updateWebsiteConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    this.config = { ...this.config, ...updates };
    // Update in items store too
    this.items.set('config', {
      id: 'config',
      type: 'config',
      data: this.config,
    });
    return this.config;
  }
  
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.landingPageData;
  }
  
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    this.landingPageData = data;
    // Update in items store too
    this.items.set('landingPage', {
      id: 'landingPage',
      type: 'landingPage',
      data,
    });
  }
  
  // StorageInterface implementation
  
  async create(item: Partial<WebsiteDataItem>): Promise<string> {
    if (!item.id) {
      throw new Error('Item ID is required');
    }
    this.items.set(item.id, item as WebsiteDataItem);
    return item.id;
  }
  
  async read(id: string): Promise<WebsiteDataItem | null> {
    return this.items.get(id) || null;
  }
  
  async update(id: string, updates: Partial<WebsiteDataItem>): Promise<boolean> {
    const existingItem = this.items.get(id);
    if (!existingItem) {
      return false;
    }
    
    this.items.set(id, { ...existingItem, ...updates });
    return true;
  }
  
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  
  async search(criteria: SearchCriteria): Promise<WebsiteDataItem[]> {
    return Array.from(this.items.values()).filter(item => {
      // Simple matching logic - match any property in criteria
      return Object.entries(criteria).every(([key, value]) => {
        if (key === 'type' && item.type) {
          return item.type === value;
        }
        // Handle nested data searches
        if (key.startsWith('data.') && item.data) {
          const dataKey = key.substring(5);
          const dataRecord = item.data as Record<string, unknown>;
          return dataRecord[dataKey] === value;
        }
        // Use type assertion through unknown to avoid direct conversion
        const itemAsRecord = item as unknown as Record<string, unknown>;
        return itemAsRecord[key] === value;
      });
    });
  }
  
  async list(options?: ListOptions): Promise<WebsiteDataItem[]> {
    const items = Array.from(this.items.values());
    
    if (!options) {
      return items;
    }
    
    const { limit, offset } = options;
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return items.slice(start, end);
  }
  
  async count(criteria?: SearchCriteria): Promise<number> {
    if (!criteria) {
      return this.items.size;
    }
    
    const items = await this.search(criteria);
    return items.length;
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
    await this.inMemoryStorage.initialize();
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
  
  // StorageInterface implementation - delegate to in-memory storage
  
  async create(item: Partial<WebsiteDataItem>): Promise<string> {
    return this.inMemoryStorage.create(item);
  }
  
  async read(id: string): Promise<WebsiteDataItem | null> {
    return this.inMemoryStorage.read(id);
  }
  
  async update(id: string, updates: Partial<WebsiteDataItem>): Promise<boolean> {
    return this.inMemoryStorage.update(id, updates);
  }
  
  async delete(id: string): Promise<boolean> {
    return this.inMemoryStorage.delete(id);
  }
  
  async search(criteria: SearchCriteria): Promise<WebsiteDataItem[]> {
    return this.inMemoryStorage.search(criteria);
  }
  
  async list(options?: ListOptions): Promise<WebsiteDataItem[]> {
    return this.inMemoryStorage.list(options);
  }
  
  async count(criteria?: SearchCriteria): Promise<number> {
    return this.inMemoryStorage.count(criteria);
  }
}