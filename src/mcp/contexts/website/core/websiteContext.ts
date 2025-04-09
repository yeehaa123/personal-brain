import { BaseContext } from '@/mcp/contexts/core/baseContext';
import { InMemoryWebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import type { WebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import type { WebsiteConfig, LandingPageData } from '../storage/websiteStorage';

/**
 * Options for creating a WebsiteContext instance
 */
export interface WebsiteContextOptions {
  storage?: WebsiteStorageAdapter;
  name?: string;
  version?: string;
}

/**
 * WebsiteContext - Manages website generation and publication
 */
export class WebsiteContext extends BaseContext {
  private static instance: WebsiteContext | null = null;
  private storage: WebsiteStorageAdapter;
  private contextName: string;
  private contextVersion: string;
  
  /**
   * Create a new WebsiteContext instance
   */
  constructor(options?: WebsiteContextOptions) {
    super();
    
    this.contextName = options?.name || 'website';
    this.contextVersion = options?.version || '1.0.0';
    this.storage = options?.storage || new InMemoryWebsiteStorageAdapter();
  }
  
  /**
   * Get the name of this context
   */
  getContextName(): string {
    return this.contextName;
  }
  
  /**
   * Get the version of this context
   */
  getContextVersion(): string {
    return this.contextVersion;
  }
  
  /**
   * Initialize MCP components - resources and tools
   */
  protected initializeMcpComponents(): void {
    // No resources or tools yet, will be implemented in later phases
  }
  
  /**
   * Get the singleton instance of WebsiteContext
   */
  static override getInstance(options?: WebsiteContextOptions): WebsiteContext {
    if (!WebsiteContext.instance) {
      WebsiteContext.instance = new WebsiteContext(options);
    }
    return WebsiteContext.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static override resetInstance(): void {
    WebsiteContext.instance = null;
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   */
  static override createFresh(options?: WebsiteContextOptions): WebsiteContext {
    return new WebsiteContext(options);
  }
  
  /**
   * Initialize the WebsiteContext
   */
  override async initialize(): Promise<boolean> {
    await this.storage.initialize();
    this.setReadyState(true);
    return true;
  }
  
  /**
   * Set the ready state
   */
  setReadyState(ready: boolean): void {
    this.readyState = ready;
  }
  
  /**
   * Get the current website configuration
   */
  async getConfig(): Promise<WebsiteConfig> {
    return this.storage.getWebsiteConfig();
  }
  
  /**
   * Update the website configuration
   */
  async updateConfig(updates: Partial<WebsiteConfig>): Promise<WebsiteConfig> {
    return this.storage.updateWebsiteConfig(updates);
  }
  
  /**
   * Get current landing page data
   */
  async getLandingPageData(): Promise<LandingPageData | null> {
    return this.storage.getLandingPageData();
  }
  
  /**
   * Save landing page data
   */
  async saveLandingPageData(data: LandingPageData): Promise<void> {
    await this.storage.saveLandingPageData(data);
  }
  
  /**
   * Get the storage adapter (useful for testing)
   */
  getStorage(): WebsiteStorageAdapter {
    return this.storage;
  }
  
  /**
   * Set a new storage adapter
   */
  setStorage(storage: WebsiteStorageAdapter): void {
    this.storage = storage;
  }
}

/**
 * Export default instance
 */
export default WebsiteContext;