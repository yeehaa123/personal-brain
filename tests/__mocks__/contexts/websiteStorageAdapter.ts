import { mock } from 'bun:test';

import type { 
  WebsiteStorageAdapter as IWebsiteStorageAdapter,
  WebsiteDataItem,
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
      livePort: 4322,
    },
  };
  
  private landingPageData: LandingPageData | null = null;
  
  // Storage for WebsiteDataItems
  private items: Map<string, WebsiteDataItem> = new Map();
  
  // Mock functions with implementation
  initialize = mock(() => {
    // Initialize items storage with config
    this.items.set('config', {
      id: 'config',
      type: 'config',
      data: this.config,
    });
    return Promise.resolve();
  });
  
  // Config methods removed - using config.ts directly
  
  getLandingPageData = mock(() => Promise.resolve(this.landingPageData));
  
  saveLandingPageData = mock((data: LandingPageData) => {
    this.landingPageData = data;
    // Update in items storage
    this.items.set('landingPage', {
      id: 'landingPage',
      type: 'landingPage',
      data,
    });
    return Promise.resolve();
  });
  
  // StorageInterface implementation
  create = mock((item: Partial<WebsiteDataItem>): Promise<string> => {
    if (!item.id) {
      throw new Error('Item ID is required');
    }
    this.items.set(item.id, item as WebsiteDataItem);
    return Promise.resolve(item.id);
  });
  
  read = mock((id: string): Promise<WebsiteDataItem | null> => {
    return Promise.resolve(this.items.get(id) || null);
  });
  
  update = mock((id: string, updates: Partial<WebsiteDataItem>): Promise<boolean> => {
    const existingItem = this.items.get(id);
    if (!existingItem) {
      return Promise.resolve(false);
    }
    
    this.items.set(id, { ...existingItem, ...updates });
    return Promise.resolve(true);
  });
  
  delete = mock((id: string): Promise<boolean> => {
    return Promise.resolve(this.items.delete(id));
  });
  
  search = mock((criteria: Record<string, unknown>): Promise<WebsiteDataItem[]> => {
    return Promise.resolve(Array.from(this.items.values()).filter(item => {
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
    }));
  });
  
  list = mock((options?: { limit?: number; offset?: number }): Promise<WebsiteDataItem[]> => {
    const items = Array.from(this.items.values());
    
    if (!options) {
      return Promise.resolve(items);
    }
    
    const { limit, offset } = options;
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return Promise.resolve(items.slice(start, end));
  });
  
  count = mock((criteria?: Record<string, unknown>): Promise<number> => {
    if (!criteria) {
      return Promise.resolve(this.items.size);
    }
    
    return this.search(criteria).then(items => items.length);
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
      // Clear all mock functions
      MockWebsiteStorageAdapter.instance.initialize.mockClear();
      MockWebsiteStorageAdapter.instance.getLandingPageData.mockClear();
      MockWebsiteStorageAdapter.instance.saveLandingPageData.mockClear();
      
      // Clear StorageInterface mock functions
      MockWebsiteStorageAdapter.instance.create.mockClear();
      MockWebsiteStorageAdapter.instance.read.mockClear();
      MockWebsiteStorageAdapter.instance.update.mockClear();
      MockWebsiteStorageAdapter.instance.delete.mockClear();
      MockWebsiteStorageAdapter.instance.search.mockClear();
      MockWebsiteStorageAdapter.instance.list.mockClear();
      MockWebsiteStorageAdapter.instance.count.mockClear();
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