import { BaseContext } from '@/contexts/core/baseContext';
import { ProfileContext } from '@/contexts/profiles';
import { Logger } from '@/utils/logger';

import { AstroContentService } from './services/astroContentService';
import { DeploymentManagerFactory } from './services/deployment';
import type { WebsiteDeploymentManager } from './services/deployment';
import { LandingPageGenerationService } from './services/landingPageGenerationService';
import type { LandingPageData, WebsiteConfig } from './websiteStorage';
import { GlobalConfigWebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
import type { WebsiteStorageAdapter } from './adapters/websiteStorageAdapter';

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
  deploymentManager?: WebsiteDeploymentManager;
}

/**
 * WebsiteContext - Manages website generation and publication
 */
export class WebsiteContext extends BaseContext {
  private static instance: WebsiteContext | null = null;
  private storage: WebsiteStorageAdapter;
  private contextName: string;
  private contextVersion: string;
  protected override logger = Logger.getInstance({ silent: process.env['NODE_ENV'] === 'test' });
  private astroContentService: AstroContentService | null = null;
  private landingPageGenerationService: LandingPageGenerationService | null = null;
  private profileContext: ProfileContext | null = null;
  private deploymentManager: WebsiteDeploymentManager | null = null;
  
  // No need to track server processes - the deployment manager handles that
  
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
    
    if (options?.deploymentManager) {
      this.deploymentManager = options.deploymentManager;
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
  
  // Server management is now handled by the deployment manager
  // The resetInstance method directly calls the deployment manager to stop servers
  
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
    
    this.logger.info('Initializing WebsiteContext', {
      context: 'WebsiteContext',
    });
    
    // Ensure production directory exists with default template
    await this.ensureProductionDirectory();
    
    this.setReadyState(true);
    return true;
  }
  
  /**
   * Ensure the production directory exists and has at least a basic HTML file
   * This prevents errors when starting the production server before promotion
   */
  private async ensureProductionDirectory(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Define the production directory
      const rootDir = process.cwd();
      const productionDir = path.join(rootDir, 'dist', 'production');
      
      this.logger.info(`Ensuring production directory exists: ${productionDir}`, {
        context: 'WebsiteContext',
      });
      
      // Create the directory if it doesn't exist
      await fs.mkdir(productionDir, { recursive: true });
      
      // Check if index.html exists in the directory
      let hasIndex = false;
      try {
        const files = await fs.readdir(productionDir);
        hasIndex = files.includes('index.html') && files.length > 0;
      } catch (_error) {
        hasIndex = false;
      }
      
      // Create a default index.html file if it doesn't exist
      if (!hasIndex) {
        this.logger.info('Creating default index.html in production directory', {
          context: 'WebsiteContext',
        });
        
        // Path to the template file
        const templatePath = path.join(rootDir, 'src', 'mcp', 'contexts', 'website', 'services', 'deployment', 'productionTemplate.html');
        
        // Read the template file and write it to the production directory
        const template = await fs.readFile(templatePath, 'utf-8');
        await fs.writeFile(path.join(productionDir, 'index.html'), template);
        
        this.logger.info('Default index.html created from template file', {
          context: 'WebsiteContext',
        });
      }
    } catch (error) {
      this.logger.error('Error ensuring production directory exists', {
        error,
        context: 'WebsiteContext',
      });
      // Continue even if this fails - the system will still function
    }
  }
  
  // Server management is now handled by the deployment manager
  
  
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
   * Get the deployment manager
   * @returns The deployment manager instance
   */
  async getDeploymentManager(): Promise<WebsiteDeploymentManager> {
    if (!this.deploymentManager) {
      // Get the configuration
      const config = await this.getConfig();
      
      // Check environment and configuration to determine which manager to use
      const factory = DeploymentManagerFactory.getInstance();
      
      this.logger.info('Initializing deployment manager', {
        deploymentType: config.deployment.type,
        context: 'WebsiteContext',
      });
      
      // Always use LocalDevDeploymentManager for local-dev deployment type
      // or when explicitly configured with WEBSITE_DEPLOYMENT_TYPE=local-dev
      if (config.deployment.type === 'local-dev' || 
          process.env['WEBSITE_DEPLOYMENT_TYPE'] === 'local-dev') {
        
        this.logger.info('Using LocalDevDeploymentManager', {
          context: 'WebsiteContext',
        });
        
        // Import the local development manager
        const { LocalDevDeploymentManager } = await import('./services/deployment/localDevDeploymentManager');
        factory.setDeploymentManagerClass(LocalDevDeploymentManager);
      }
      
      // Create the deployment manager with appropriate configuration
      this.deploymentManager = factory.createDeploymentManager({
        baseDir: config.astroProjectPath,
        deploymentConfig: {
          previewPort: config.deployment.previewPort,
          productionPort: config.deployment.productionPort,
        },
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
    
    this.logger.debug('Initialized LandingPageGenerationService with profile context', {
      context: 'WebsiteContext',
    });
    
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

      // Check if landing page data exists, and generate if not
      try {
        const landingPageData = await astroService.readLandingPageContent();
        if (!landingPageData) {
          this.logger.info('No landing page data found, generating it before build', {
            context: 'WebsiteContext',
          });
          
          // Generate landing page data
          const generationResult = await this.generateLandingPage();
          if (!generationResult.success) {
            this.logger.warn('Could not generate landing page data before build', {
              context: 'WebsiteContext',
              message: generationResult.message,
            });
          } else {
            this.logger.info('Successfully generated landing page data before build', {
              context: 'WebsiteContext',
            });
          }
        }
      } catch (contentError) {
        this.logger.warn('Error checking landing page content before build', {
          error: contentError,
          context: 'WebsiteContext',
        });
        // Continue with build even if this fails
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
   * Direct website build implementation (for Caddy-based hosting)
   * @returns Result of the build operation, with path to built files
   */
  async handleWebsiteBuild(): Promise<{ success: boolean; message: string; path?: string; url?: string }> {
    try {
      // Build the website first
      const buildResult = await this.buildWebsite();
      
      if (!buildResult.success) {
        return {
          success: false,
          message: `Failed to build website: ${buildResult.message}`,
        };
      }
      
      // Get current configuration for domain info
      const config = await this.getConfig();
      
      // URL based on deployment type
      let url: string;
      let path: string;
      
      if (config.deployment.type === 'local-dev') {
        // For local development, use localhost with configured port
        url = `http://localhost:${config.deployment.previewPort}`;
        path = `${config.astroProjectPath}/dist/preview`;
      } else {
        // For Caddy-based hosting, use the configured domain
        const domain = config.deployment.domain || new URL(config.baseUrl).hostname;
        url = `https://preview.${domain}`;
        path = `${config.deployment.previewDir || '/opt/personal-brain-website/preview'}/dist`;
      }
      
      return {
        success: true,
        message: `Website built successfully to preview environment. Available at ${url}`,
        path,
        url,
      };
    } catch (error) {
      this.logger.error('Error in direct website build', {
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
   * Promote preview to production (for Caddy-based hosting)
   * @returns Result of the promotion operation
   */
  async handleWebsitePromote(): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      // Get the deployment manager
      const deploymentManager = await this.getDeploymentManager();
      
      // Promote to production using the deployment manager
      const result = await deploymentManager.promoteToProduction();
      
      // Log the result
      if (result.success) {
        this.logger.info('Website promotion completed successfully', {
          url: result.url,
          context: 'WebsiteContext',
        });
      } else {
        this.logger.error('Website promotion failed', {
          message: result.message,
          context: 'WebsiteContext',
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Error promoting website', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error promoting website',
      };
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
   * @param environment The environment to check (preview or production)
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
      // Get the deployment manager - all status logic is now delegated here
      const deploymentManager = await this.getDeploymentManager();
      
      // Get environment status using the deployment manager
      const status = await deploymentManager.getEnvironmentStatus(environment as 'preview' | 'production');
      
      // Create a comprehensive status message (the deployment manager handles PM2 status checks now)
      const statusMessage = `${environment} website status: ${status.buildStatus}, Server: ${status.serverStatus}, Files: ${status.fileCount}, Access: ${status.accessStatus}`;
      
      // Return the status data
      return {
        success: true,
        message: statusMessage,
        data: {
          environment: status.environment,
          buildStatus: status.buildStatus,
          fileCount: status.fileCount,
          serverStatus: status.serverStatus,
          domain: status.domain,
          accessStatus: status.accessStatus,
          url: status.url,
        },
      };
    } catch (error) {
      this.logger.error('Error checking website status', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error checking website status',
      };
    }
  }
  
}
