import * as path from 'path';

import config from '@/config';
import { BaseContext } from '@/contexts/baseContext';
import type { ContextDependencies, ContextInterface } from '@/contexts/contextInterface';
import type { FormatterInterface, FormattingOptions } from '@/contexts/formatterInterface';
import { ProfileContext } from '@/contexts/profiles';
import type { StorageInterface } from '@/contexts/storageInterface';
import { Logger } from '@/utils/logger';
import { getProjectRoot, resolvePath } from '@/utils/pathUtils';
import { Registry } from '@/utils/registry';
import type { LandingPageData } from '@website/schemas';
import type { AssessedSection } from '@website/schemas/sectionQualitySchema';

import { InMemoryWebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
import type { WebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
import { type WebsiteData, WebsiteFormatter } from './formatters';
import { AstroContentService } from './services/astroContentService';
import { DeploymentManagerFactory } from './services/deployment';
import type { WebsiteDeploymentManager } from './services/deployment';
import { LandingPageGenerationService } from './services/landingPageGenerationService';
import { WebsiteToolService } from './tools';
import type { WebsiteConfig } from './websiteStorage';

/**
 * Options for creating a WebsiteContext instance
 */
export interface WebsiteContextOptions {
  storage?: WebsiteStorageAdapter;
  formatter?: WebsiteFormatter;
  name?: string;
  version?: string;
  astroContentService?: AstroContentService;
  landingPageGenerationService?: LandingPageGenerationService;
  profileContext?: ProfileContext;
  deploymentManager?: WebsiteDeploymentManager;
}

/**
 * WebsiteContext - Manages website generation and publication
 * 
 * Implements FullContextInterface to provide standardized access methods
 * for storage, formatting, and service dependencies.
 */
export class WebsiteContext extends BaseContext<
  WebsiteStorageAdapter,
  WebsiteFormatter,
  WebsiteData,
  string
> implements ContextInterface<
  WebsiteStorageAdapter,
  WebsiteFormatter,
  WebsiteData,
  string
> {
  private static instance: WebsiteContext | null = null;
  private contextName: string;
  private contextVersion: string;
  protected override logger = Logger.getInstance();
  private astroContentService: AstroContentService | null = null;
  private landingPageGenerationService: LandingPageGenerationService | null = null;
  private profileContext: ProfileContext | null = null;
  private deploymentManager: WebsiteDeploymentManager | null = null;
  
  /**
   * Create a new WebsiteContext instance
   */
  protected storage!: WebsiteStorageAdapter;
  protected formatter!: WebsiteFormatter;
  
  constructor(options?: WebsiteContextOptions) {
    super({});
    
    this.contextName = options?.name || 'website';
    this.contextVersion = options?.version || '1.0.0';
    this.storage = options?.storage || new InMemoryWebsiteStorageAdapter();
    this.formatter = options?.formatter || WebsiteFormatter.getInstance();
    
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
    
    if (options?.deploymentManager) {
      this.deploymentManager = options.deploymentManager;
    }
  }
  
  /**
   * Get the name of this context
   */
  override getContextName(): string {
    return this.contextName;
  }
  
  /**
   * Get the version of this context
   */
  override getContextVersion(): string {
    return this.contextVersion;
  }
  
  /**
   * Initialize MCP components - resources and tools
   */
  protected override initializeMcpComponents(): void {
    // Get the website tool service
    const toolService = WebsiteToolService.getInstance();
    
    // Register website tools for MCP Inspector visibility
    this.tools = toolService.getTools(this);
    
    this.logger.debug('Initialized WebsiteContext MCP components', { 
      toolCount: this.tools.length,
      context: 'WebsiteContext', 
    });
  }
  
  /**
   * Get the singleton instance of WebsiteContext
   */
  static override getInstance(options?: WebsiteContextOptions): WebsiteContext {
    if (!WebsiteContext.instance) {
      WebsiteContext.instance = options ? new WebsiteContext(options) : WebsiteContext.createWithDependencies();
    }
    return WebsiteContext.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static override resetInstance(): void {
    // Stop any running servers before resetting the instance
    if (WebsiteContext.instance && WebsiteContext.instance.deploymentManager) {
      // Best-effort attempt to stop servers - we can't await here in a static method
      if ('stopServers' in WebsiteContext.instance.deploymentManager) {
        try {
          // This is just a type assertion to access the method
          const manager = WebsiteContext.instance.deploymentManager as unknown as { stopServers(): Promise<void> };
          manager.stopServers().catch(error => {
            console.error('Error stopping servers during reset:', error);
          });
        } catch (error) {
          console.error('Error stopping servers during reset:', error);
        }
      }
    }
    WebsiteContext.instance = null;
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   */
  static override createFresh(options?: WebsiteContextOptions): WebsiteContext {
    return new WebsiteContext(options);
  }
  
  /**
   * Factory method for creating an instance with proper dependencies
   * This is the preferred way to create a new instance with all required dependencies
   * 
   * @param configOrDependencies Configuration or dependencies for the context
   * @returns A new WebsiteContext instance with resolved dependencies
   */
  public static override createWithDependencies(
    configOrDependencies: WebsiteContextOptions | Record<string, unknown> = {},
  ): WebsiteContext {
    // Handle the case where this is called with a dependencies object that has specific properties
    if ('storage' in configOrDependencies || 'formatter' in configOrDependencies) {
      const dependencies = configOrDependencies as WebsiteContextOptions;
      
      // Create and return context with explicit dependencies
      return new WebsiteContext(dependencies);
    }
    
    // Handle the case where this is called with a config object
    // Create storage adapter
    const storage = new InMemoryWebsiteStorageAdapter();
    
    // Initialize with values from global config
    const websiteConfig = {
      title: config.website.title,
      description: config.website.description,
      author: config.website.author,
      baseUrl: config.website.baseUrl,
      astroProjectPath: config.website.astroProjectPath,
      deployment: {
        type: config.website.deployment.type as 'local-dev' | 'caddy',
        previewPort: config.website.deployment.previewPort,
        livePort: config.website.deployment.livePort,
        domain: config.website.deployment.domain,
      },
    };
    
    // We need to initialize the adapter before we can update it
    storage.initialize().then(() => {
      storage.updateWebsiteConfig(websiteConfig).catch(error => {
        Logger.getInstance().error('Error updating website config during initialization', {
          error: error instanceof Error ? error.message : String(error),
          context: 'WebsiteContext',
        });
      });
    }).catch(error => {
      Logger.getInstance().error('Error initializing website storage adapter', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteContext',
      });
    });
    
    // Create formatter
    const formatter = WebsiteFormatter.getInstance();
    
    // Create AstroContentService - doesn't use getInstance pattern, so create directly
    const astroContentService = new AstroContentService(websiteConfig.astroProjectPath);
    
    // Create LandingPageGenerationService
    const landingPageGenerationService = LandingPageGenerationService.getInstance();
    
    // Get ProfileContext - optional dependency
    const profileContext = ProfileContext.getInstance();
    
    // Create DeploymentManager with a fresh factory to ensure it respects current config
    const factory = DeploymentManagerFactory.createFresh();
    const deploymentManager = factory.create({
      baseDir: websiteConfig.astroProjectPath,
      deploymentType: websiteConfig.deployment.type,
      deploymentConfig: {
        previewPort: websiteConfig.deployment.previewPort,
        livePort: websiteConfig.deployment.livePort,
      },
    });
    
    // Create context with all dependencies
    return new WebsiteContext({
      storage,
      formatter,
      astroContentService,
      landingPageGenerationService,
      profileContext,
      deploymentManager,
    });
  }
  
  /**
   * Initialize the WebsiteContext
   */
  override async initialize(): Promise<boolean> {
    await this.storage.initialize();
    
    this.logger.info('Initializing WebsiteContext', {
      context: 'WebsiteContext',
    });
    
    // Ensure live site directory exists with default template
    // No need to call ensureLiveDirectory - ServerManager handles this now
    
    this.setReadyState(true);
    return true;
  }
  
  /**
   * Get the path for a specific environment
   * @param environment The environment to get the path for
   * @returns The absolute path for the environment
   */
  private async getEnvironmentPath(environment: 'preview' | 'live'): Promise<string> {
    if (environment === 'preview') {
      // For preview, use the build output directory
      const astroContentService = await this.getAstroContentService();
      return astroContentService.getBuildDir();
    } else {
      // For live, use the standard live directory
      return resolvePath(getProjectRoot(), path.join('dist', 'live'));
    }
  }
  
  
  
  /**
   * Set the ready state
   */
  setReadyState(ready: boolean): void {
    this.readyState = ready;
  }
  
  /**
   * Standardized error handler for website operations
   * @param error The error that occurred
   * @param operation The operation that failed
   * @returns A standardized error response
   */
  private handleError(error: unknown, operation: string): { success: false; message: string } {
    this.logger.error(`Error ${operation}`, {
      error,
      context: 'WebsiteContext',
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : `Unknown error ${operation}`,
    };
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
   * Get the storage adapter
   * Implements StorageAccess interface
   */
  override getStorage(): WebsiteStorageAdapter {
    return this.storage;
  }
  
  /**
   * Set a new storage adapter
   * Mainly used for testing
   * @param storage The new storage adapter
   */
  setStorage(storage: WebsiteStorageAdapter): void {
    this.storage = storage;
  }
  
  /**
   * Get the formatter implementation
   * Implements FormatterAccess interface
   */
  override getFormatter(): WebsiteFormatter {
    return this.formatter;
  }
  
  /**
   * Format website data using the formatter
   * Implements FormatterAccess interface
   * 
   * @param data The data to format
   * @param options Optional formatting options
   * @returns Formatted data
   */
  override format(data: WebsiteData, options?: FormattingOptions): string {
    return this.formatter.format(data, options);
  }
  
  /**
   * Get a service by type
   * Implements ServiceAccess interface
   * 
   * @param serviceType Type of service to retrieve
   * @returns Service instance
   */
  override getService<T>(serviceType: new () => T): T {
    // First check for known service types
    if (serviceType === AstroContentService as unknown as new () => T) {
      return this.getAstroContentService() as unknown as T;
    }
    
    if (serviceType === LandingPageGenerationService as unknown as new () => T) {
      return this.getLandingPageGenerationService() as unknown as T;
    }
    
    if (serviceType === ProfileContext as unknown as new () => T) {
      return this.getProfileContext() as unknown as T;
    }
    
    if (serviceType === WebsiteToolService as unknown as new () => T) {
      return WebsiteToolService.getInstance() as unknown as T;
    }
    
    // Use registry for other service types
    const registry = Registry.getInstance();
    return registry.resolve<T>(serviceType.name);
  }
  
  // Instance method implementations are defined at the end of the class
  // to comply with FullContextInterface requirements
  
  /**
   * Get the deployment manager
   * @returns The deployment manager instance
   */
  async getDeploymentManager(): Promise<WebsiteDeploymentManager> {
    // Simply return the existing deployment manager that was created during initialization
    if (!this.deploymentManager) {
      this.logger.warn('No deployment manager found. This should not happen if context was properly initialized.', {
        context: 'WebsiteContext',
      });
      
      // If somehow we don't have a deployment manager, get the config and create one
      const config = await this.getConfig();
      
      // Create with a fresh factory
      const factory = DeploymentManagerFactory.createFresh();
      this.deploymentManager = factory.create({
        baseDir: config.astroProjectPath,
        deploymentType: config.deployment.type,
        deploymentConfig: {
          previewPort: config.deployment.previewPort,
          livePort: config.deployment.livePort,
        },
      });
      
      this.logger.info('Created missing deployment manager', {
        context: 'WebsiteContext',
        type: config.deployment.type,
      });
    }
    
    return this.deploymentManager;
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
      // Re-throw this error as it's a critical dependency
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
    
    this.logger.debug('Initialized LandingPageGenerationService', {
      context: 'WebsiteContext',
    });
    
    return this.landingPageGenerationService;
  }
  
  /**
   * Generate a landing page from profile data
   * This method generates content without holistic editing
   * 
   * @returns Result of the generation operation
   */
  async generateLandingPage(): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
    try {
      // Get services
      const landingPageService = this.getLandingPageGenerationService();
      const astroService = await this.getAstroContentService();
      
      // Generate landing page data (no holistic editing)
      const landingPageData = await landingPageService.generateLandingPageData();
      
      // Save to storage and Astro content
      await this.saveLandingPageData(landingPageData);
      const writeSuccess = await astroService.writeLandingPageContent(landingPageData);
      
      if (!writeSuccess) {
        throw new Error('Failed to write landing page data to Astro content');
      }
      
      return {
        success: true,
        message: 'Successfully generated landing page content (without editing)',
        data: landingPageData,
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
   * Edit a landing page for consistency across sections
   * This is a separate step from generation for better reliability
   * 
   * @returns Result of the editing operation
   */
  async editLandingPage(): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
    try {
      // Get services
      const landingPageService = this.getLandingPageGenerationService();
      const astroService = await this.getAstroContentService();
      
      // Get current landing page data
      const currentLandingPage = await this.getLandingPageData();
      if (!currentLandingPage) {
        return {
          success: false,
          message: 'No landing page data found. Generate a landing page first.',
        };
      }
      
      // Perform holistic editing
      const editedLandingPage = await landingPageService.editLandingPage(currentLandingPage);
      
      // Save edited content
      await this.saveLandingPageData(editedLandingPage);
      const writeSuccess = await astroService.writeLandingPageContent(editedLandingPage);
      
      if (!writeSuccess) {
        throw new Error('Failed to write edited landing page data to Astro content');
      }
      
      return {
        success: true,
        message: 'Successfully edited landing page for consistency',
        data: editedLandingPage,
      };
    } catch (error) {
      this.logger.error('Error editing landing page', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error editing landing page',
      };
    }
  }
  
  /**
   * Assess the quality of an existing landing page
   * This is a separate step from generation that can be run on demand
   * 
   * @param options Configuration options for quality assessment
   * @param options.qualityThresholds Custom thresholds for quality assessment
   * @param options.applyRecommendations Whether to apply quality recommendations (enable/disable sections)
   * @returns Result of the quality assessment operation
   */
  async assessLandingPage(options?: {
    qualityThresholds?: {
      minCombinedScore?: number;
      minQualityScore?: number;
      minConfidenceScore?: number;
    };
    applyRecommendations?: boolean;
  }): Promise<{ 
    success: boolean; 
    message: string; 
    data?: LandingPageData; 
    assessments?: Record<string, AssessedSection<unknown>>;
  }> {
    try {
      // Get services
      const landingPageService = this.getLandingPageGenerationService();
      const astroService = await this.getAstroContentService();
      
      // Get current landing page data
      const currentLandingPage = await this.getLandingPageData();
      if (!currentLandingPage) {
        return {
          success: false,
          message: 'No landing page data found. Generate a landing page first.',
        };
      }
      
      // Assess quality
      const { landingPage, assessments } = await landingPageService.assessLandingPageQuality(
        currentLandingPage,
        {
          qualityThresholds: options?.qualityThresholds,
          applyRecommendations: options?.applyRecommendations,
        },
      );
      
      // If we're applying recommendations, save the updated landing page
      if (options?.applyRecommendations) {
        await this.saveLandingPageData(landingPage);
        const writeSuccess = await astroService.writeLandingPageContent(landingPage);
        
        if (!writeSuccess) {
          throw new Error('Failed to write updated landing page data to Astro content');
        }
      }
      
      return {
        success: true,
        message: options?.applyRecommendations 
          ? 'Successfully assessed landing page and applied quality recommendations'
          : 'Successfully assessed landing page quality',
        data: landingPage,
        assessments,
      };
    } catch (error) {
      this.logger.error('Error assessing landing page quality', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error assessing landing page quality',
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
      
      // Check if Astro project exists
      const projectExists = await astroService.verifyAstroProject();
      if (!projectExists) {
        this.logger.error('Cannot build website - Astro project not found', {
          context: 'WebsiteContext',
          astroProjectPath: this.getConfig().then(config => config.astroProjectPath),
        });
        
        return {
          success: false,
          message: 'Cannot build website - Astro project not found. Check the astroProjectPath in your configuration.',
        };
      }

      // Check if landing page data exists, but don't auto-generate
      try {
        const landingPageData = await astroService.readLandingPageContent();
        if (!landingPageData) {
          this.logger.warn('No landing page data found', {
            context: 'WebsiteContext',
          });
          
          return {
            success: false,
            message: 'No landing page data found. Please run "website landing-page generate" first.',
          };
        }
      } catch (contentError) {
        this.logger.error('Error checking landing page content before build', {
          error: contentError,
          context: 'WebsiteContext',
        });
        
        return {
          success: false,
          message: 'Error checking landing page content. Please make sure landing page data exists.',
        };
      }
      
      // Build the website
      this.logger.info('Running Astro build command', {
        context: 'WebsiteContext',
        astroProjectPath: (await this.getConfig()).astroProjectPath,
      });
      
      const result = await astroService.runAstroCommand('build');
      
      if (result.success) {
        this.logger.info('Website built successfully', {
          context: 'WebsiteContext',
          output: result.output,
        });
      } else {
        this.logger.error('Failed to build website', {
          context: 'WebsiteContext',
          output: result.output,
        });
      }
      
      return {
        success: result.success,
        message: result.success ? 'Website built successfully' : 'Failed to build website',
        output: result.output,
      };
    } catch (error) {
      return this.handleError(error, 'building website');
    }
  }
  
  /**
   * Direct website build implementation (for Caddy-based hosting)
   * @returns Result of the build operation, with path to built files
   */
  async handleWebsiteBuild(): Promise<{ success: boolean; message: string; path?: string; url?: string }> {
    try {
      this.logger.info('Starting website build process', {
        context: 'WebsiteContext',
      });
      
      // Build the website
      const buildResult = await this.buildWebsite();
      
      if (!buildResult.success) {
        return {
          success: false,
          message: `Failed to build website: ${buildResult.message}`,
        };
      }
      
      // Get the deployment manager for URL generation
      const deploymentManager = await this.getDeploymentManager();
      
      // Get environment status for preview
      const status = await deploymentManager.getEnvironmentStatus('preview');
      
      // Get the build path
      const path = await this.getEnvironmentPath('preview');
      
      this.logger.info('Website build completed', {
        context: 'WebsiteContext',
        environment: 'preview',
        url: status.url,
        path,
      });
      
      // Determine if we're in dev mode
      const isDevMode = status.url.includes('localhost');
      
      return {
        success: true,
        message: isDevMode 
          ? `Website built successfully. Available at ${status.url} (development mode)`
          : 'Website built successfully',
        path,
        url: status.url,
      };
    } catch (error) {
      return this.handleError(error, 'building website');
    }
  }
  
  /**
   * Promote preview to live site
   * @returns Result of the promotion operation
   */
  async handleWebsitePromote(): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      const deploymentManager = await this.getDeploymentManager();
      const result = await deploymentManager.promoteToLive();
      
      // Just log and return the result directly
      this.logger.info(result.success ? 'Website promotion completed' : 'Website promotion failed', {
        success: result.success,
        url: result.url,
        context: 'WebsiteContext',
      });
      
      return result;
    } catch (error) {
      return this.handleError(error, 'promoting website');
    }
  }
  
  /**
   * TESTING ONLY: Set deployment manager directly for tests
   * This method should only be used in tests to avoid working with private fields
   * @param manager The deployment manager to set
   */
  setDeploymentManagerForTesting(manager: WebsiteDeploymentManager): void {
    this.deploymentManager = manager;
  }

  /**
   * Get website environment status (for local development or Caddy-based hosting)
   * @param environment The environment to check (preview or live)
   * @returns Status information for the specified environment
   */
  async handleWebsiteStatus(environment: string = 'preview'): Promise<{ 
    success: boolean; 
    message: string;
    data?: {
      environment: string;
      buildStatus: string;
      fileCount: number;
      serverStatus: string;
      domain: string;
      accessStatus: string;
      url: string;
    }
  }> {
    try {
      // Use the deployment manager for status
      const deploymentManager = await this.getDeploymentManager();
      const typedEnv = environment as 'preview' | 'live';
      const status = await deploymentManager.getEnvironmentStatus(typedEnv);
      
      // Create simple status message
      const statusMessage = `${environment} website: ${status.buildStatus}, Server: ${status.serverStatus}, URL: ${status.url}`;
      
      return {
        success: true,
        message: statusMessage,
        data: status,
      };
    } catch (error) {
      return this.handleError(error, 'checking website status');
    }
  }

  /**
   * Instance method that delegates to static getInstance
   * Required by FullContextInterface
   * @returns The singleton instance
   */
  getInstance(): WebsiteContext {
    return WebsiteContext.getInstance();
  }
  
  /**
   * Instance method that delegates to static resetInstance
   * Required by FullContextInterface
   */
  resetInstance(): void {
    WebsiteContext.resetInstance();
  }
  
  /**
   * Instance method that delegates to static createFresh
   * Required by FullContextInterface
   * @param options Optional configuration
   * @returns A new instance
   */
  createFresh(options?: WebsiteContextOptions): WebsiteContext {
    return WebsiteContext.createFresh(options);
  }
  
  /**
   * Instance method that delegates to static createWithDependencies
   * Required by FullContextInterface
   * 
   * @param config Configuration options
   * @param dependencies Optional dependencies for the context
   * @returns A new instance with the provided dependencies
   */
  createWithDependencies<
    TStorage extends StorageInterface<unknown, unknown>,
    TFormatter extends FormatterInterface<unknown, unknown>
  >(
    config: Record<string, unknown>,
    dependencies?: ContextDependencies<TStorage, TFormatter>,
  ): WebsiteContext {
    // Convert the parameters to WebsiteContextOptions for backward compatibility
    const options: WebsiteContextOptions = { ...config };
    if (dependencies?.storage) {
      options.storage = dependencies.storage as unknown as WebsiteStorageAdapter;
    }
    if (dependencies?.formatter) {
      options.formatter = dependencies.formatter as unknown as WebsiteFormatter;
    }
    
    return WebsiteContext.createWithDependencies(options);
  }
}