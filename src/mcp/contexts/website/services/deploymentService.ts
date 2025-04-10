import { Logger } from '@/utils/logger';

/**
 * Result of a deployment operation
 */
export interface DeploymentResult {
  success: boolean;
  message: string;
  url?: string;
  logs?: string;
}

/**
 * Configuration for a deployment provider
 */
export interface DeploymentConfig {
  // Base configuration fields applicable to all providers
  siteId?: string;
  token?: string;
  team?: string;
  buildCommand?: string;
  buildDir?: string;
  
  // Provider-specific configuration can be added by implementations
  [key: string]: unknown;
}

/**
 * Test helper interface for deployment service mocks
 */
export interface DeploymentServiceTestHelpers {
  // Configure deploy to return success/failure
  setDeploySuccess(success: boolean, url?: string): void;
  
  // Configure getSiteInfo to return specific data
  setSiteInfo(siteId: string, url: string): void;
}

/**
 * Interface for deployment services that deploy websites
 */
export interface DeploymentService {
  /**
   * Get the name of this deployment provider
   */
  getProviderName(): string;
  
  /**
   * Initialize the deployment service with configuration
   * @param config Configuration for this deployment provider
   */
  initialize(config: DeploymentConfig): Promise<boolean>;
  
  /**
   * Check if the service is properly configured and can deploy
   */
  isConfigured(): boolean;
  
  /**
   * Deploy the website
   * @param sitePath Path to the built website (dist folder)
   */
  deploy(sitePath: string): Promise<DeploymentResult>;
  
  /**
   * Get information about the deployed site
   */
  getSiteInfo(): Promise<{ siteId: string; url: string } | null>;
}

/**
 * Base implementation of deployment service with common functionality
 */
export abstract class BaseDeploymentService implements DeploymentService {
  protected config: DeploymentConfig = {};
  protected isInitialized = false;
  protected logger = Logger.getInstance();
  
  /**
   * Get the name of this deployment provider
   */
  abstract getProviderName(): string;
  
  /**
   * Initialize the deployment service with configuration
   * @param config Configuration for this deployment provider
   */
  async initialize(config: DeploymentConfig): Promise<boolean> {
    this.config = config;
    
    try {
      // Validate required configuration
      this.validateConfig();
      this.isInitialized = true;
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.getProviderName()} deployment service`, {
        error,
        context: this.getProviderName(),
      });
      return false;
    }
  }
  
  /**
   * Check if the service is properly configured and can deploy
   */
  isConfigured(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Validate the configuration
   * @throws Error if configuration is invalid
   */
  protected abstract validateConfig(): void;
  
  /**
   * Deploy the website
   * @param sitePath Path to the built website (dist folder)
   */
  abstract deploy(sitePath: string): Promise<DeploymentResult>;
  
  /**
   * Get information about the deployed site
   */
  abstract getSiteInfo(): Promise<{ siteId: string; url: string } | null>;
}

/**
 * Factory for creating deployment service instances
 */
export class DeploymentServiceFactory {
  private static instance: DeploymentServiceFactory | null = null;
  private logger = Logger.getInstance();
  
  /**
   * Private constructor (use getInstance instead)
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  static getInstance(): DeploymentServiceFactory {
    if (!DeploymentServiceFactory.instance) {
      DeploymentServiceFactory.instance = new DeploymentServiceFactory();
    }
    return DeploymentServiceFactory.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    DeploymentServiceFactory.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): DeploymentServiceFactory {
    return new DeploymentServiceFactory();
  }
  
  /**
   * Create a deployment service for the given provider
   * @param providerType Type of deployment provider (netlify, github, etc.)
   */
  async createDeploymentService(providerType: string): Promise<DeploymentService | null> {
    // Import the appropriate service based on provider type
    try {
      const type = providerType.toLowerCase();
      if (type === 'netlify') {
        // Using dynamic import to avoid circular dependencies
        const { NetlifyDeploymentService } = await import('./netlifyDeploymentService');
        return NetlifyDeploymentService.getInstance();
      } else if (type === 'github') {
        // To be implemented in the future
        throw new Error('GitHub Pages deployment not yet implemented');
      } else {
        throw new Error(`Unknown deployment provider: ${providerType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create deployment service for provider ${providerType}`, {
        error,
        context: 'DeploymentServiceFactory',
      });
      return null;
    }
  }
}

export default DeploymentServiceFactory;