/**
 * Website Deployment Manager
 * 
 * Handles low-level operations for deploying websites with Caddy
 */

import { Logger } from '@/utils/logger';
import { LocalDevDeploymentManager } from './localDevDeploymentManager';

/**
 * Deployment environment type
 */
export type DeploymentEnvironment = 'preview' | 'production';

/**
 * Status response for website environments
 */
export interface EnvironmentStatus {
  environment: DeploymentEnvironment;
  buildStatus: 'Built' | 'Not Built' | 'Empty';
  fileCount: number;
  serverStatus: 'Running' | 'Not Running' | 'Not Found' | 'Error' | 'Unknown';
  domain: string;
  accessStatus: string;
  url: string;
}

/**
 * Promotion result
 */
export interface PromotionResult {
  success: boolean;
  message: string;
  url?: string;
}

/**
 * Website deployment manager interface
 */
export interface WebsiteDeploymentManager {
  /**
   * Get the status of an environment
   * @param environment The environment to check
   * @returns Status information for the environment
   */
  getEnvironmentStatus(environment: DeploymentEnvironment): Promise<EnvironmentStatus>;
  
  /**
   * Promote website from preview to production
   * @returns Result of the promotion operation
   */
  promoteToProduction(): Promise<PromotionResult>;
  
  /**
   * Start preview and production servers
   * @returns Promise indicating success
   */
  startServers?(): Promise<boolean>;
  
  /**
   * Stop preview and production servers
   */
  stopServers?(): Promise<void>;
}

/**
 * Configuration options for LocalCaddyDeploymentManager
 */
export interface LocalCaddyDeploymentManagerOptions {
  baseDir?: string;
}

/**
 * Local file system implementation of WebsiteDeploymentManager
 * Uses Caddy for serving websites
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class LocalCaddyDeploymentManager implements WebsiteDeploymentManager {
  /**
   * Singleton instance
   */
  private static instance: LocalCaddyDeploymentManager | null = null;
  
  /**
   * Get the singleton instance of LocalCaddyDeploymentManager
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options?: LocalCaddyDeploymentManagerOptions): LocalCaddyDeploymentManager {
    if (!LocalCaddyDeploymentManager.instance) {
      LocalCaddyDeploymentManager.instance = new LocalCaddyDeploymentManager(options);
      
      const logger = Logger.getInstance();
      logger.debug('LocalCaddyDeploymentManager singleton instance created');
    }
    
    return LocalCaddyDeploymentManager.instance;
  }
  
  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // No specific cleanup needed for this manager
      if (LocalCaddyDeploymentManager.instance) {
        // Resource cleanup if needed
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during LocalCaddyDeploymentManager instance reset:', error);
    } finally {
      LocalCaddyDeploymentManager.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('LocalCaddyDeploymentManager singleton instance reset');
    }
  }
  
  /**
   * Create a fresh LocalCaddyDeploymentManager instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param options Configuration options
   * @returns A new LocalCaddyDeploymentManager instance
   */
  public static createFresh(options?: LocalCaddyDeploymentManagerOptions): LocalCaddyDeploymentManager {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh LocalCaddyDeploymentManager instance');
    
    return new LocalCaddyDeploymentManager(options);
  }
  
  /**
   * Create a new deployment manager with dependencies
   * 
   * Part of the Component Interface Standardization pattern.
   * This method follows the standard pattern for dependency injection.
   * 
   * @param configOrDependencies Configuration options or dependencies object
   * @returns A new LocalCaddyDeploymentManager instance
   */
  public static createWithDependencies(
    configOrDependencies: Record<string, unknown> = {},
  ): LocalCaddyDeploymentManager {
    const logger = Logger.getInstance();
    logger.debug('Creating LocalCaddyDeploymentManager with dependencies');
    
    // For this manager, we don't have external dependencies, just configuration options
    // Convert generic config to our specific options type
    const options: LocalCaddyDeploymentManagerOptions = {
      baseDir: configOrDependencies['baseDir'] as string,
    };
    
    return new LocalCaddyDeploymentManager(options);
  }
  
  private readonly logger = Logger.getInstance();
  private readonly baseDir: string;
  
  /**
   * Create a new LocalCaddyDeploymentManager
   * 
   * Private constructor to enforce use of factory methods
   * Part of the Component Interface Standardization pattern
   * 
   * @param options Configuration options
   */
  private constructor(options?: LocalCaddyDeploymentManagerOptions) {
    this.baseDir = options?.baseDir || process.env['WEBSITE_BASE_DIR'] || '/opt/personal-brain-website';
  }
  
  /**
   * Get the status of an environment
   * @param environment The environment to check
   * @returns Status information for the environment
   */
  async getEnvironmentStatus(environment: DeploymentEnvironment): Promise<EnvironmentStatus> {
    try {
      // Import necessary modules
      const fs = await import('fs/promises');
      const path = await import('path');
      const childProcess = await import('child_process');
      const util = await import('util');
      const https = await import('https');
      
      // Define directory path
      const targetDir = path.join(this.baseDir, environment, 'dist');
      
      // Get domain based on environment
      const domain = this.getDomainForEnvironment(environment);
      const url = `https://${domain}`;
      
      // Check build status
      let buildStatus: 'Built' | 'Not Built' | 'Empty' = 'Not Built';
      let fileCount = 0;
      
      try {
        const stats = await fs.stat(targetDir);
        if (stats.isDirectory()) {
          const files = await fs.readdir(targetDir, { recursive: true });
          fileCount = files.length;
          buildStatus = fileCount > 0 ? 'Built' : 'Empty';
        }
      } catch (_fsError) {
        // Directory doesn't exist
        buildStatus = 'Not Built';
        this.logger.warn(`Directory for ${environment} environment does not exist`, {
          directory: targetDir,
          context: 'LocalCaddyDeploymentManager',
        });
      }
      
      // Check Caddy status
      let serverStatus: 'Running' | 'Not Running' | 'Not Found' | 'Error' | 'Unknown' = 'Unknown';
      try {
        const execPromise = util.promisify(childProcess.exec);
        await execPromise('systemctl is-active --quiet caddy');
        serverStatus = 'Running';
      } catch (caddyError) {
        const error = caddyError as { code?: number };
        if (error.code === 3) { // systemctl exit code 3 means service is not active
          serverStatus = 'Not Running';
        } else if (error.code === 127) { // command not found
          serverStatus = 'Not Found';
        } else {
          serverStatus = 'Error';
        }
      }
      
      // Check if site is accessible
      let accessStatus = 'Unknown';
      
      const checkAccess = () => {
        return new Promise<string>((resolve) => {
          const req = https.get(url, { 
            timeout: 3000,
            rejectUnauthorized: false, // Accept self-signed certs for testing
          }, (res) => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
              resolve('Accessible');
            } else {
              resolve(`Error: HTTP ${res.statusCode}`);
            }
          });
          
          req.on('error', () => {
            resolve('Not Accessible');
          });
          
          req.on('timeout', () => {
            req.destroy();
            resolve('Timeout');
          });
          
          // Ensure the request is ended
          req.end();
        });
      };
      
      try {
        accessStatus = await checkAccess();
      } catch (accessError) {
        accessStatus = 'Error Checking';
        this.logger.warn(`Error checking access for ${url}`, {
          error: accessError,
          context: 'LocalCaddyDeploymentManager',
        });
      }
      
      this.logger.info(`Website status check completed for ${environment}`, {
        buildStatus,
        fileCount,
        serverStatus,
        accessStatus,
        context: 'LocalCaddyDeploymentManager',
      });
      
      return {
        environment,
        buildStatus,
        fileCount,
        serverStatus,
        domain,
        accessStatus,
        url,
      };
    } catch (error) {
      this.logger.error('Error checking website status', {
        error,
        environment,
        context: 'LocalCaddyDeploymentManager',
      });
      
      // Return a default error status
      return {
        environment,
        buildStatus: 'Not Built',
        fileCount: 0,
        serverStatus: 'Unknown',
        domain: this.getDomainForEnvironment(environment),
        accessStatus: 'Error',
        url: `https://${this.getDomainForEnvironment(environment)}`,
      };
    }
  }
  
  /**
   * Promote website from preview to production
   * @returns Result of the promotion operation
   */
  async promoteToProduction(): Promise<PromotionResult> {
    try {
      // Import the fs and path modules for file operations
      const fs = await import('fs/promises');
      const path = await import('path');
      const childProcess = await import('child_process');
      const util = await import('util');
      
      // Define directory paths
      // The preview site is built to src/website/dist by Astro
      const previewDir = path.join(process.cwd(), 'src', 'website', 'dist');
      // The production server looks for files in dist/production, not baseDir/production/dist
      const productionDir = path.join(process.cwd(), 'dist', 'production');
      
      // Get domain for production environment
      const productionDomain = this.getDomainForEnvironment('production');
      
      // Check if preview directory exists and has files
      try {
        const previewStats = await fs.stat(previewDir);
        if (!previewStats.isDirectory()) {
          throw new Error(`Preview directory ${previewDir} is not a directory`);
        }
        
        // List files in preview directory to verify it has content
        const previewFiles = await fs.readdir(previewDir);
        if (previewFiles.length === 0) {
          throw new Error('Preview directory is empty. Please build the website first.');
        }
        
        this.logger.info('Promoting website from preview to production', {
          previewDir,
          productionDir,
          fileCount: previewFiles.length,
          context: 'LocalCaddyDeploymentManager',
        });
        
        // Ensure production directory exists
        await fs.mkdir(path.dirname(productionDir), { recursive: true });
        
        // Check if production directory already exists
        try {
          const prodStats = await fs.stat(productionDir);
          if (prodStats.isDirectory()) {
            // Remove existing production directory
            this.logger.info('Removing existing production directory', {
              productionDir,
              context: 'LocalCaddyDeploymentManager',
            });
            
            await fs.rm(productionDir, { recursive: true, force: true });
          }
        } catch (_err) {
          // Directory doesn't exist, which is fine
        }
        
        // Create production directory
        await fs.mkdir(productionDir, { recursive: true });
        
        // Copy all files from preview to production
        const execPromise = util.promisify(childProcess.exec);
        
        this.logger.info('Copying files from preview to production', {
          sourceDir: previewDir,
          destDir: productionDir,
          context: 'LocalCaddyDeploymentManager',
        });
        
        // Make sure the preview directory has files to copy
        const previewContents = await fs.readdir(previewDir);
        this.logger.info('Preview directory contents:', {
          fileCount: previewContents.length,
          fileList: previewContents.join(', '),
          context: 'LocalCaddyDeploymentManager',
        });
        
        if (previewContents.length === 0) {
          throw new Error(`Preview directory exists but is empty: ${previewDir}`);
        }
        
        // Verify index.html exists in preview
        const indexExists = await fs.stat(path.join(previewDir, 'index.html'))
          .then(stats => stats.isFile())
          .catch(() => false);
          
        if (!indexExists) {
          this.logger.error('index.html missing from preview directory', {
            previewDir,
            context: 'LocalCaddyDeploymentManager',
          });
          throw new Error('index.html not found in preview directory');
        }
        
        // Copy each file individually to ensure everything transfers correctly
        await fs.mkdir(productionDir, { recursive: true });
        
        // First copy index.html explicitly
        await fs.copyFile(
          path.join(previewDir, 'index.html'),
          path.join(productionDir, 'index.html'),
        );
        
        this.logger.info('index.html copied successfully', {
          source: path.join(previewDir, 'index.html'),
          destination: path.join(productionDir, 'index.html'),
          context: 'LocalCaddyDeploymentManager',
        });
        
        // Then copy the rest
        for (const file of previewContents) {
          if (file === 'index.html') continue; // Already copied
          
          const sourcePath = path.join(previewDir, file);
          const destPath = path.join(productionDir, file);
          
          try {
            const fileStats = await fs.stat(sourcePath);
            
            if (fileStats.isDirectory()) {
              // Use shell command for recursive directory copy
              await execPromise(`cp -R "${sourcePath}" "${destPath}"`);
              this.logger.info(`Copied directory: ${file}`, {
                context: 'LocalCaddyDeploymentManager',
              });
            } else {
              // Direct file copy
              await fs.copyFile(sourcePath, destPath);
              this.logger.info(`Copied file: ${file}`, {
                context: 'LocalCaddyDeploymentManager',
              });
            }
          } catch (copyError) {
            this.logger.error(`Error copying ${file}`, {
              error: copyError,
              context: 'LocalCaddyDeploymentManager',
            });
            // Continue with other files even if one fails
          }
        }
        
        // Verify the production directory has the copied files
        const productionContents = await fs.readdir(productionDir);
        this.logger.info('Production directory contents after copy:', {
          fileCount: productionContents.length,
          fileList: productionContents.join(', '),
          context: 'LocalCaddyDeploymentManager',
        });
        
        // Verify index.html exists in production
        const prodIndexExists = await fs.stat(path.join(productionDir, 'index.html'))
          .then(stats => stats.isFile())
          .catch(() => false);
          
        if (!prodIndexExists) {
          this.logger.error('index.html missing from production directory after copy', {
            productionDir,
            context: 'LocalCaddyDeploymentManager',
          });
          throw new Error('index.html not found in production directory after copy');
        }
        
        // Force Caddy to fully restart to clear any caches
        try {
          // First try to restart Caddy completely instead of just reloading
          this.logger.info('Attempting to restart Caddy server completely', {
            context: 'LocalCaddyDeploymentManager',
          });
          
          try {
            // Try restart first (preserves state but more thorough than reload)
            await execPromise('systemctl is-active --quiet caddy && systemctl restart caddy');
            this.logger.info('Restarted Caddy server', {
              context: 'LocalCaddyDeploymentManager',
            });
          } catch (restartError) {
            // If restart fails, try reload as fallback
            this.logger.warn('Could not restart Caddy, trying reload instead', {
              error: restartError,
              context: 'LocalCaddyDeploymentManager',
            });
            
            await execPromise('systemctl is-active --quiet caddy && systemctl reload caddy');
            this.logger.info('Reloaded Caddy server', {
              context: 'LocalCaddyDeploymentManager',
            });
          }
          
          // Add a short delay to ensure Caddy is fully restarted before returning
          await new Promise(resolve => global.setTimeout(resolve, 1000));
          
        } catch (caddyError) {
          this.logger.warn('Could not refresh Caddy server, but files were copied successfully', {
            error: caddyError,
            context: 'LocalCaddyDeploymentManager',
          });
          // Continue even if Caddy operations fail - it might not be managed by systemd
        }
        
        // Verify the files were copied
        const productionFiles = await fs.readdir(productionDir);
        
        // Use the PM2 restart command to restart the production server
        // This will force a clean restart with the new files
        try {
          this.logger.info('Restarting production server to load new files', {
            context: 'LocalCaddyDeploymentManager',
          });
          await execPromise('bun run pm2 restart website-production || true');
        } catch (restartError) {
          this.logger.warn('Failed to restart production server', {
            error: restartError,
            context: 'LocalCaddyDeploymentManager',
          });
        }
        
        return {
          success: true,
          message: `Preview successfully promoted to production (${productionFiles.length} files).`,
          url: `https://${productionDomain}`,
        };
      } catch (fsError) {
        throw new Error(`File system error during promotion: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
      }
    } catch (error) {
      this.logger.error('Error promoting website', {
        error,
        context: 'LocalCaddyDeploymentManager',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error promoting website',
      };
    }
  }
  
  /**
   * Get the domain for a specific environment
   * @param environment The environment to get the domain for
   * @returns The domain name
   */
  private getDomainForEnvironment(environment: DeploymentEnvironment): string {
    // In a real implementation, this would come from configuration
    // For now, we'll use a placeholder domain
    const baseDomain = process.env['WEBSITE_DOMAIN'] || 'example.com';
    
    return environment === 'production' 
      ? baseDomain
      : `preview.${baseDomain}`;
  }
}

/**
 * Factory for creating WebsiteDeploymentManager instances
 */
export interface DeploymentManagerOptions {
  baseDir?: string;
  deploymentType?: string;
  deploymentConfig?: {
    previewPort?: number;
    productionPort?: number;
  };
}

/**
 * Interface for deployment manager classes that follow
 * the Component Interface Standardization pattern
 */
export interface DeploymentManager {
  // Static methods required by the Component Interface Standardization pattern
  getInstance(options?: DeploymentManagerOptions): WebsiteDeploymentManager;
  resetInstance(): void;
  createFresh(options?: DeploymentManagerOptions): WebsiteDeploymentManager;
  createWithDependencies?(config: Record<string, unknown>): WebsiteDeploymentManager;
}

export class DeploymentManagerFactory {
  private static instance: DeploymentManagerFactory | null = null;
  private deploymentManagerClass: DeploymentManager;
  
  /**
   * Constructor for DeploymentManagerFactory
   * @param deploymentManagerClass The deployment manager class to use
   */
  constructor(deploymentManagerClass?: DeploymentManager) {
    // Default to LocalCaddyDeploymentManager if no class is provided
    this.deploymentManagerClass = deploymentManagerClass || LocalCaddyDeploymentManager;
  }
  
  /**
   * Get the singleton instance
   */
  static getInstance(deploymentManagerClass?: DeploymentManager): DeploymentManagerFactory {
    if (!DeploymentManagerFactory.instance) {
      DeploymentManagerFactory.instance = new DeploymentManagerFactory(deploymentManagerClass);
    }
    return DeploymentManagerFactory.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    DeploymentManagerFactory.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(deploymentManagerClass?: DeploymentManager): DeploymentManagerFactory {
    return new DeploymentManagerFactory(deploymentManagerClass);
  }
  
  /**
   * Set the deployment manager class
   * @param deploymentManagerClass The deployment manager class to use
   */
  setDeploymentManagerClass(deploymentManagerClass: DeploymentManager): void {
    this.deploymentManagerClass = deploymentManagerClass;
  }
  
  /**
   * Determine the appropriate deployment manager based on deployment type
   * @param deploymentType The deployment type from configuration
   * @returns The deployment manager class to use
   */
  selectDeploymentManager(deploymentType: string): DeploymentManager {
    const logger = Logger.getInstance();
    
    logger.info('Selecting deployment manager', {
      deploymentType,
      context: 'DeploymentManagerFactory',
    });
    
    if (deploymentType === 'local-dev') {
      logger.info('Selected LocalDevDeploymentManager', {
        context: 'DeploymentManagerFactory',
      });
      return LocalDevDeploymentManager;
    } else {
      logger.info('Selected LocalCaddyDeploymentManager', {
        context: 'DeploymentManagerFactory',
      });
      return LocalCaddyDeploymentManager;
    }
  }
  
  /**
   * Create a deployment manager instance
   * @param options Configuration options
   * @returns A WebsiteDeploymentManager implementation
   */
  create(options?: DeploymentManagerOptions): WebsiteDeploymentManager {
    // If deploymentType is provided, determine the appropriate manager class
    if (options?.deploymentType) {
      this.deploymentManagerClass = this.selectDeploymentManager(options.deploymentType);
    }
    
    // Create an instance of the configured deployment manager class using the standardized pattern
    return this.deploymentManagerClass.getInstance(options);
  }
}