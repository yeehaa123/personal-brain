import { BaseContext } from '@/mcp/contexts/core/baseContext';
import { ProfileContext } from '@/mcp/contexts/profiles';
import { Logger } from '@/utils/logger';

import { InMemoryWebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import type { WebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import { AstroContentService } from '../services/astroContentService';
import { LandingPageGenerationService } from '../services/landingPageGenerationService';
import type { LandingPageData, WebsiteConfig } from '../storage/websiteStorage';

/**
 * Options for creating a WebsiteContext instance
 */
export interface WebsiteContextOptions {
  storage?: WebsiteStorageAdapter;
  name?: string;
  version?: string;
  astroContentService?: AstroContentService;
  landingPageGenerationService?: LandingPageGenerationService;
  profileContext?: ProfileContext;
}

/**
 * WebsiteContext - Manages website generation and publication
 */
export class WebsiteContext extends BaseContext {
  private static instance: WebsiteContext | null = null;
  private storage: WebsiteStorageAdapter;
  private contextName: string;
  private contextVersion: string;
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  private astroContentService: AstroContentService | null = null;
  private landingPageGenerationService: LandingPageGenerationService | null = null;
  private profileContext: ProfileContext | null = null;
  
  /**
   * Create a new WebsiteContext instance
   */
  constructor(options?: WebsiteContextOptions) {
    super();
    
    this.contextName = options?.name || 'website';
    this.contextVersion = options?.version || '1.0.0';
    this.storage = options?.storage || new InMemoryWebsiteStorageAdapter();
    
    // Initialize services if provided (primarily for testing)
    if (options?.astroContentService) {
      this.astroContentService = options.astroContentService;
    }
    
    if (options?.landingPageGenerationService) {
      this.landingPageGenerationService = options.landingPageGenerationService;
    }
    
    if (options?.profileContext) {
      this.profileContext = options.profileContext;
    }
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
  
  /**
   * Get the AstroContentService instance
   * @returns AstroContentService for working with Astro project
   */
  async getAstroContentService(): Promise<AstroContentService> {
    // Return injected service if available (primarily for testing)
    if (this.astroContentService) {
      return this.astroContentService;
    }
    
    try {
      // Get configuration to determine Astro project path
      const config = await this.getConfig();
      // Create a new service instance
      this.astroContentService = new AstroContentService(config.astroProjectPath);
      
      // Verify Astro project exists
      const exists = await this.astroContentService.verifyAstroProject();
      if (!exists) {
        this.logger.warn('Astro project not found at configured path', {
          path: config.astroProjectPath,
          context: 'WebsiteContext',
        });
      }
    } catch (error) {
      this.logger.error('Error initializing AstroContentService', {
        error,
        context: 'WebsiteContext',
      });
      throw error;
    }
    
    return this.astroContentService;
  }
  
  /**
   * Get the ProfileContext instance
   * @returns ProfileContext for user profile operations
   */
  getProfileContext(): ProfileContext {
    if (!this.profileContext) {
      // If no profile context was injected, use the singleton instance
      this.profileContext = ProfileContext.getInstance();
    }
    
    return this.profileContext;
  }
  
  /**
   * Get the LandingPageGenerationService instance
   * @returns LandingPageGenerationService for generating landing page content
   */
  getLandingPageGenerationService(): LandingPageGenerationService {
    // Return injected service if available (primarily for testing)
    if (this.landingPageGenerationService) {
      return this.landingPageGenerationService;
    }
    
    // Create a new service instance
    this.landingPageGenerationService = LandingPageGenerationService.getInstance();
    
    // Set profile context for retrieving profile data
    this.landingPageGenerationService.setProfileContext(this.getProfileContext());
    
    return this.landingPageGenerationService;
  }
  
  /**
   * Generate a landing page from profile data
   * @returns Result of the generation operation
   */
  async generateLandingPage(): Promise<{ success: boolean; message: string }> {
    try {
      // Get services
      const landingPageService = this.getLandingPageGenerationService();
      const astroService = await this.getAstroContentService();
      
      // Generate data
      const landingPageData = await landingPageService.generateLandingPageData();
      
      // Save to storage and Astro content
      await this.saveLandingPageData(landingPageData);
      const writeSuccess = await astroService.writeLandingPageContent(landingPageData);
      
      if (!writeSuccess) {
        throw new Error('Failed to write landing page data to Astro content');
      }
      
      return {
        success: true,
        message: 'Successfully generated landing page from profile',
      };
    } catch (error) {
      this.logger.error('Error generating landing page', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error generating landing page',
      };
    }
  }
  
  /**
   * Build the website using Astro
   * @returns Result of the build operation
   */
  async buildWebsite(): Promise<{ success: boolean; message: string; output?: string }> {
    try {
      const astroService = await this.getAstroContentService();
      const result = await astroService.runAstroCommand('build');
      
      return {
        success: result.success,
        message: result.success ? 'Website built successfully' : 'Failed to build website',
        output: result.output,
      };
    } catch (error) {
      this.logger.error('Error building website', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error building website',
      };
    }
  }
  
  /**
   * Preview the website using Astro dev server
   * @returns Result of the preview operation, including URL if successful
   */
  async previewWebsite(): Promise<{ success: boolean; message: string; url?: string; output?: string }> {
    try {
      const astroService = await this.getAstroContentService();
      const result = await astroService.runAstroCommand('dev');
      
      // Extract URL from output
      const urlMatch = result.output.match(/Local:\s+(http:\/\/[^\s]+)/);
      const url = urlMatch ? urlMatch[1] : undefined;
      
      return {
        success: result.success,
        message: result.success ? 'Website preview started' : 'Failed to start website preview',
        url,
        output: result.output,
      };
    } catch (error) {
      this.logger.error('Error previewing website', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error previewing website',
      };
    }
  }
}

/**
 * Export default instance
 */
export default WebsiteContext;