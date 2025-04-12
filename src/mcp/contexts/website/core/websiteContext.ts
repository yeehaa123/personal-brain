import { BaseContext } from '@/mcp/contexts/core/baseContext';
import { ProfileContext } from '@/mcp/contexts/profiles';
import { Logger } from '@/utils/logger';

import { GlobalConfigWebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import type { WebsiteStorageAdapter } from '../adapters/websiteStorageAdapter';
import { AstroContentService } from '../services/astroContentService';
import { DeploymentServiceFactory } from '../services/deploymentService';
import type { DeploymentService } from '../services/deploymentService';
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
  deploymentServiceFactory?: DeploymentServiceFactory;
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
  private deploymentServiceFactory: DeploymentServiceFactory | null = null;
  private deploymentService: DeploymentService | null = null;
  
  /**
   * Create a new WebsiteContext instance
   */
  constructor(options?: WebsiteContextOptions) {
    super();
    
    this.contextName = options?.name || 'website';
    this.contextVersion = options?.version || '1.0.0';
    this.storage = options?.storage || new GlobalConfigWebsiteStorageAdapter();
    
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
    
    if (options?.deploymentServiceFactory) {
      this.deploymentServiceFactory = options.deploymentServiceFactory;
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
  async generateLandingPage(): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
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
   * Preview the website using Astro dev server managed by PM2
   * @returns Result of the preview operation, including URL if successful
   */
  async previewWebsite(): Promise<{ success: boolean; message: string; url?: string; output?: string }> {
    try {
      const astroService = await this.getAstroContentService();
      const result = await astroService.startDevServer();
      
      return {
        success: result.success,
        message: result.success ? 'Website preview started with PM2' : 'Failed to start website preview',
        url: result.url,
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
  
  /**
   * Stop the website preview server managed by PM2
   * @returns Result of the stop operation
   */
  async stopPreviewWebsite(): Promise<{ success: boolean; message: string }> {
    try {
      const astroService = await this.getAstroContentService();
      const result = await astroService.stopDevServer();
      
      return {
        success: result,
        message: result ? 'Website preview server stopped successfully' : 'Failed to stop website preview server',
      };
    } catch (error) {
      this.logger.error('Error stopping website preview', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error stopping website preview',
      };
    }
  }
  
  /**
   * Get the deployment service factory
   */
  private getDeploymentServiceFactory(): DeploymentServiceFactory {
    if (!this.deploymentServiceFactory) {
      this.deploymentServiceFactory = DeploymentServiceFactory.getInstance();
    }
    return this.deploymentServiceFactory;
  }
  
  /**
   * Get a deployment service for the configured provider
   */
  private async getDeploymentService(): Promise<DeploymentService | null> {
    // If we already have a deployment service, return it
    if (this.deploymentService) {
      return this.deploymentService;
    }
    
    try {
      // Get website configuration
      const config = await this.getConfig();
      
      // If no deployment type is configured, we can't create a service
      if (!config.deploymentType) {
        return null;
      }
      
      // Create a deployment service for the configured provider
      const factory = this.getDeploymentServiceFactory();
      const service = await factory.createDeploymentService(config.deploymentType);
      
      if (!service) {
        this.logger.error(`Unknown deployment provider: ${config.deploymentType}`, {
          context: 'WebsiteContext',
        });
        return null;
      }
      
      // Initialize with configuration
      const deploymentConfig = config.deploymentConfig || {};
      const initialized = await service.initialize(deploymentConfig);
      
      if (!initialized) {
        this.logger.error('Failed to initialize deployment service', {
          context: 'WebsiteContext',
          provider: config.deploymentType,
        });
        return null;
      }
      
      // Cache the service
      this.deploymentService = service;
      return service;
    } catch (error) {
      this.logger.error('Error creating deployment service', {
        error,
        context: 'WebsiteContext',
      });
      return null;
    }
  }
  
  /**
   * Deploy the website to the configured provider
   * @returns Result of the deployment operation
   */
  async deployWebsite(): Promise<{ success: boolean; message: string; url?: string; logs?: string }> {
    try {
      // Get website configuration
      const config = await this.getConfig();
      
      this.logger.info('Starting website deployment process', {
        context: 'WebsiteContext',
        deploymentType: config.deploymentType || 'not configured',
        astroProjectPath: config.astroProjectPath,
      });
      
      // Check if deployment configuration exists
      if (!config.deploymentType) {
        return {
          success: false,
          message: 'Deployment type not configured. Run \'website-config\' to set a deployment provider.',
          logs: 'Missing configuration. You need to set deploymentType in your website configuration.',
        };
      }
      
      // Step 1: Build the website
      this.logger.info('Building website for deployment', {
        context: 'WebsiteContext',
      });
      
      const buildResult = await this.buildWebsite();
      
      if (!buildResult.success) {
        this.logger.error('Website build failed', {
          context: 'WebsiteContext',
          buildOutput: buildResult.output,
        });
        
        return {
          success: false,
          message: `Failed to build website for deployment: ${buildResult.message}`,
          logs: buildResult.output,
        };
      }
      
      this.logger.info('Website built successfully', {
        context: 'WebsiteContext',
      });
      
      // Step 2: Get deployment service
      const deploymentService = await this.getDeploymentService();
      
      if (!deploymentService) {
        this.logger.error('Failed to get deployment service', {
          context: 'WebsiteContext',
          deploymentType: config.deploymentType,
        });
        
        return {
          success: false,
          message: `Unknown or unconfigured deployment type: ${config.deploymentType}`,
          logs: `Check your configuration settings with 'website-config' and ensure you have the required environment variables for ${config.deploymentType} deployment.`,
        };
      }
      
      // Step 3: Deploy the website
      this.logger.info(`Deploying website using ${deploymentService.getProviderName()}`, {
        context: 'WebsiteContext',
        astroProjectPath: config.astroProjectPath,
      });
      
      const deployResult = await deploymentService.deploy(config.astroProjectPath);
      
      if (!deployResult.success) {
        this.logger.error('Deployment failed', {
          context: 'WebsiteContext',
          message: deployResult.message,
          logs: deployResult.logs,
        });
      } else {
        this.logger.info('Deployment successful', {
          context: 'WebsiteContext',
          url: deployResult.url,
        });
      }
      
      return {
        success: deployResult.success,
        message: deployResult.message,
        url: deployResult.url,
        logs: deployResult.logs,
      };
    } catch (error) {
      this.logger.error('Error deploying website', {
        error,
        context: 'WebsiteContext',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error deploying website',
        logs: error instanceof Error ? error.stack : 'No detailed error information available',
      };
    }
  }
  
  /**
   * Get the deployment status of the website
   * @returns Deployment status information
   */
  async getDeploymentStatus(): Promise<{ 
    success: boolean; 
    isDeployed: boolean; 
    provider?: string;
    url?: string; 
    message?: string;
  }> {
    try {
      // Get deployment service
      const deploymentService = await this.getDeploymentService();
      
      if (!deploymentService) {
        return {
          success: false,
          isDeployed: false,
          message: 'No deployment provider configured',
        };
      }
      
      // Get site info
      const siteInfo = await deploymentService.getSiteInfo();
      
      if (!siteInfo) {
        return {
          success: true,
          isDeployed: false,
          provider: deploymentService.getProviderName(),
          message: 'Website is not currently deployed',
        };
      }
      
      return {
        success: true,
        isDeployed: true,
        provider: deploymentService.getProviderName(),
        url: siteInfo.url,
        message: `Website is deployed at ${siteInfo.url}`,
      };
    } catch (error) {
      this.logger.error('Error checking deployment status', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        isDeployed: false,
        message: error instanceof Error ? error.message : 'Error checking deployment status',
      };
    }
  }
}

/**
 * Export default instance
 */
export default WebsiteContext;