import * as path from 'path';
import { setTimeout } from 'timers/promises';

import { websiteConfig } from '@/config';
import { BaseContext } from '@/contexts/baseContext';
import type { ContextInterface } from '@/contexts/contextInterface';
import type { FormattingOptions } from '@/contexts/formatterInterface';
import { ProfileContext } from '@/contexts/profiles';
import { Logger } from '@/utils/logger';
import { getProjectRoot, resolvePath } from '@/utils/pathUtils';
import { Registry } from '@/utils/registry';
import type { LandingPageData } from '@website/schemas';
import type { AssessedSection } from '@website/schemas/sectionQualitySchema';

import { PersistentWebsiteStorageAdapter } from './adapters/persistentWebsiteStorageAdapter';
import { WebsiteIdentityNoteAdapter } from './adapters/websiteIdentityNoteAdapter';
import type { WebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
import { type WebsiteData, WebsiteFormatter } from './formatters';
import type { WebsiteIdentityData } from './schemas/websiteIdentitySchema';
import { AstroContentService } from './services/astroContentService';
import { DeploymentManagerFactory } from './services/deployment';
import type { WebsiteDeploymentManager } from './services/deployment';
import { LandingPageGenerationService } from './services/landingPageGenerationService';
import { WebsiteIdentityService } from './services/websiteIdentityService';
import { WebsiteToolService } from './tools';
import type { WebsiteConfig } from './websiteStorage';

/**
 * Configuration for WebsiteContext
 * Note: This extends Record<string, unknown> to ensure compatibility with BaseContext
 */
export interface WebsiteContextConfig extends Record<string, unknown> {
  /**
   * Name for the context (defaults to 'website')
   */
  name?: string;

  /**
   * Version for the context (defaults to '1.0.0')
   */
  version?: string;
}

/**
 * Dependencies for WebsiteContext
 */
export interface WebsiteContextDependencies {
  /** Storage adapter instance */
  storage: WebsiteStorageAdapter;
  
  /** Formatter instance */
  formatter: WebsiteFormatter;
  
  /** AstroContentService instance */
  astroContentService: AstroContentService;
  
  /** LandingPageGenerationService instance */
  landingPageGenerationService: LandingPageGenerationService;
  
  /** ProfileContext instance */
  profileContext: ProfileContext;
  
  /** DeploymentManager instance */
  deploymentManager: WebsiteDeploymentManager;
  
  /** WebsiteIdentityService instance */
  identityService: WebsiteIdentityService;
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
  private identityService: WebsiteIdentityService | null = null;
  
  /**
   * Create a new WebsiteContext instance
   */
  protected storage!: WebsiteStorageAdapter;
  protected formatter!: WebsiteFormatter;
  
  constructor(
    config: WebsiteContextConfig = {},
    dependencies: WebsiteContextDependencies,
  ) {
    super(config);
    
    // Initialize from config
    this.contextName = config.name as string || 'website';
    this.contextVersion = config.version as string || '1.0.0';
    
    // Initialize from required dependencies
    this.storage = dependencies.storage;
    this.formatter = dependencies.formatter;
    this.astroContentService = dependencies.astroContentService;
    this.landingPageGenerationService = dependencies.landingPageGenerationService;
    this.profileContext = dependencies.profileContext;
    this.deploymentManager = dependencies.deploymentManager;
    this.identityService = dependencies.identityService;
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
   * 
   * @param config Configuration options
   * @param dependencies Optional dependencies (will use defaults if not provided)
   * @returns The singleton instance
   */
  static override getInstance(
    config: WebsiteContextConfig = {},
    dependencies?: Partial<WebsiteContextDependencies>,
  ): WebsiteContext {
    if (!WebsiteContext.instance) {
      // Create a new instance with the provided config and dependencies (or defaults)
      WebsiteContext.instance = WebsiteContext.createFresh(config, dependencies);
      
      const logger = Logger.getInstance();
      logger.debug('WebsiteContext singleton instance created');
    } else if (Object.keys(config).length > 0) {
      // Log at debug level if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
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
   * 
   * @param config Configuration options
   * @param dependencies Dependencies for the context (will use defaults if not provided)
   * @returns A new WebsiteContext instance
   */
  static override createFresh(
    config: WebsiteContextConfig = {},
    partialDependencies?: Partial<WebsiteContextDependencies>,
  ): WebsiteContext {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh WebsiteContext instance');
    
    // Get default dependencies
    const defaultDependencies = WebsiteContext.createDefaultDependencies();
    
    // Merge with provided dependencies if any
    const dependencies = partialDependencies 
      ? { ...defaultDependencies, ...partialDependencies }
      : defaultDependencies;
    
    // Create and return a new instance with the config and dependencies
    return new WebsiteContext(config, dependencies);
  }
  
  /**
   * Create default dependencies for WebsiteContext
   * This helps with creating instances without having to specify all dependencies
   * @returns Default WebsiteContextDependencies
   */
  private static createDefaultDependencies(): WebsiteContextDependencies {
    // Create storage and formatter
    const storage = PersistentWebsiteStorageAdapter.getInstance();
    const formatter = WebsiteFormatter.getInstance();
    
    // Get the astro project path from config
    const astroProjectPath = websiteConfig.astroProjectPath;
    
    // Create service instances
    const astroContentService = AstroContentService.getInstance({
      astroProjectPath,
    });
    const landingPageGenerationService = LandingPageGenerationService.getInstance();
    const profileContext = ProfileContext.getInstance();
    
    // Create deployment manager using config
    const deploymentManager = DeploymentManagerFactory.getInstance().create({
      deploymentType: websiteConfig.deployment.type,
    });
    
    // Create identity service
    const identityAdapter = WebsiteIdentityNoteAdapter.getInstance();
    const identityService = WebsiteIdentityService.getInstance({}, {
      profileContext,
      identityAdapter,
    });
    
    return {
      storage,
      formatter,
      astroContentService,
      landingPageGenerationService,
      profileContext,
      deploymentManager,
      identityService,
    };
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
    
    if (serviceType === WebsiteIdentityService as unknown as new () => T) {
      return this.getIdentityService() as unknown as T;
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
      // Get or create an instance using the standardized pattern and config
      this.astroContentService = AstroContentService.getInstance({
        astroProjectPath: websiteConfig.astroProjectPath,
      });
      
      // Verify Astro project exists
      const exists = await this.astroContentService.verifyAstroProject();
      if (!exists) {
        this.logger.warn('Astro project not found at configured path', {
          path: websiteConfig.astroProjectPath,
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
   * Get the WebsiteIdentityService instance
   * @returns WebsiteIdentityService for managing website identity information
   */
  getIdentityService(): WebsiteIdentityService {
    // Return injected service if available (primarily for testing)
    if (this.identityService) {
      return this.identityService;
    }
    
    // Create a new service instance with dependencies
    const identityAdapter = WebsiteIdentityNoteAdapter.getInstance();
    this.identityService = WebsiteIdentityService.getInstance({}, {
      profileContext: this.getProfileContext(),
      identityAdapter,
    });
    
    this.logger.debug('Initialized WebsiteIdentityService', {
      context: 'WebsiteContext',
    });
    
    return this.identityService;
  }
  
  /**
   * Generate a landing page from profile data
   * This method generates content without holistic editing
   * 
   * @param useIdentity Whether to use website identity for generation (default: true)
   * @param regenerateIdentity Whether to regenerate identity before generating landing page (default: false)
   * @returns Result of the generation operation
   */
  async generateLandingPage(
    options?: {
      useIdentity?: boolean;
      regenerateIdentity?: boolean;
      onProgress?: (step: string, index: number) => void;
    },
  ): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
    // Default values
    const useIdentity = options?.useIdentity ?? true;
    const regenerateIdentity = options?.regenerateIdentity ?? false;
    const onProgress = options?.onProgress;
    try {
      // Get services
      const landingPageService = this.getLandingPageGenerationService();
      const astroService = await this.getAstroContentService();
      
      // Step 1: Get or generate identity if requested
      onProgress?.('Retrieving website identity', 0);
      let identity = null;
      if (useIdentity) {
        this.logger.debug('Using website identity for landing page generation', {
          context: 'WebsiteContext',
          regenerateIdentity,
        });
        
        identity = await this.getIdentity(regenerateIdentity);
        
        if (!identity) {
          this.logger.warn('Failed to get website identity, proceeding without identity information', {
            context: 'WebsiteContext',
          });
        } else {
          this.logger.debug('Successfully retrieved website identity', {
            context: 'WebsiteContext',
          });
        }
      }
      
      // Step 2: Analyze site requirements - prepare for generation
      onProgress?.('Analyzing site requirements', 1);
      await setTimeout(500); // Short pause before generation
      
      // Generate landing page data - onProgress will be called for each section
      const landingPageData = await landingPageService.generateLandingPageData(identity, onProgress);
      
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
   * @param useIdentity Whether to use website identity for editing (default: true)
   * @returns Result of the editing operation
   */
  async editLandingPage(useIdentity = true): Promise<{ success: boolean; message: string; data?: LandingPageData }> {
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
      
      // Get identity if requested
      let identity = null;
      if (useIdentity) {
        this.logger.debug('Using website identity for landing page editing', {
          context: 'WebsiteContext',
        });
        
        identity = await this.getIdentity(false);
        
        if (!identity) {
          this.logger.warn('Failed to get website identity, proceeding without identity information', {
            context: 'WebsiteContext',
          });
        } else {
          this.logger.debug('Successfully retrieved website identity for editing', {
            context: 'WebsiteContext',
          });
        }
      }
      
      // Perform holistic editing
      const editedLandingPage = await landingPageService.editLandingPage(currentLandingPage, identity);
      
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
   * Get the current website identity information
   * @param forceRegenerate Whether to force regeneration of identity
   * @returns The website identity information or null if not available
   */
  async getIdentity(forceRegenerate = false): Promise<WebsiteIdentityData | null> {
    try {
      const identityService = this.getIdentityService();
      return await identityService.getIdentity(forceRegenerate);
    } catch (error) {
      this.logger.error('Error getting website identity', {
        error,
        context: 'WebsiteContext',
      });
      return null;
    }
  }
  
  /**
   * Generate new website identity
   * @returns The generated identity data
   */
  async generateIdentity(): Promise<{ success: boolean; message: string; data?: WebsiteIdentityData }> {
    try {
      const identityService = this.getIdentityService();
      const identityData = await identityService.generateIdentity();
      
      return {
        success: true,
        message: 'Successfully generated website identity',
        data: identityData,
      };
    } catch (error) {
      this.logger.error('Error generating website identity', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error generating website identity',
      };
    }
  }
  
  /**
   * Update website identity with partial new data
   * @param updates Partial data to update identity with
   * @param shallow Whether to replace entire sections (shallow=true) or merge properties (shallow=false)
   * @returns The updated identity data
   */
  async updateIdentity(
    updates: Partial<WebsiteIdentityData>,
    shallow = false,
  ): Promise<{ success: boolean; message: string; data?: WebsiteIdentityData }> {
    try {
      const identityService = this.getIdentityService();
      const updatedData = await identityService.updateIdentity(updates, shallow);
      
      if (!updatedData) {
        return {
          success: false,
          message: 'Failed to update website identity',
        };
      }
      
      return {
        success: true,
        message: 'Successfully updated website identity',
        data: updatedData,
      };
    } catch (error) {
      this.logger.error('Error updating website identity', {
        error,
        context: 'WebsiteContext',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error updating website identity',
      };
    }
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

}