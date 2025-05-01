/**
 * Caddy Deployment Manager
 * 
 * Implementation of WebsiteDeploymentManager for Caddy server
 * Handles deployment to production servers with Caddy
 */

import config from '@/config';
import { Logger } from '@/utils/logger';

import type { DeploymentEnvironment, EnvironmentStatus, PromotionResult, WebsiteDeploymentManager } from './deploymentManager';

/**
 * Configuration options for CaddyDeploymentManager
 */
export interface CaddyDeploymentManagerOptions {
  baseDir?: string;
}

/**
 * Caddy implementation of WebsiteDeploymentManager
 * Uses Caddy for serving websites
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class CaddyDeploymentManager implements WebsiteDeploymentManager {
  /**
   * Singleton instance
   */
  private static instance: CaddyDeploymentManager | null = null;
  
  /**
   * Get the singleton instance of CaddyDeploymentManager
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param options Configuration options
   * @returns The singleton instance
   */
  public static getInstance(options?: CaddyDeploymentManagerOptions): CaddyDeploymentManager {
    if (!CaddyDeploymentManager.instance) {
      CaddyDeploymentManager.instance = new CaddyDeploymentManager(options);
      
      const logger = Logger.getInstance();
      logger.debug('CaddyDeploymentManager singleton instance created');
    }
    
    return CaddyDeploymentManager.instance;
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
      if (CaddyDeploymentManager.instance) {
        // Resource cleanup if needed
      }
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Error during CaddyDeploymentManager instance reset:', error);
    } finally {
      CaddyDeploymentManager.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('CaddyDeploymentManager singleton instance reset');
    }
  }
  
  /**
   * Create a fresh CaddyDeploymentManager instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param options Configuration options
   * @returns A new CaddyDeploymentManager instance
   */
  public static createFresh(options?: CaddyDeploymentManagerOptions): CaddyDeploymentManager {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh CaddyDeploymentManager instance');
    
    return new CaddyDeploymentManager(options);
  }
  
  /**
   * Create a new deployment manager with dependencies
   * 
   * Part of the Component Interface Standardization pattern.
   * This method follows the standard pattern for dependency injection.
   * 
   * @param configOrDependencies Configuration options or dependencies object
   * @returns A new CaddyDeploymentManager instance
   */
  public static createWithDependencies(
    configOrDependencies: Record<string, unknown> = {},
  ): CaddyDeploymentManager {
    const logger = Logger.getInstance();
    logger.debug('Creating CaddyDeploymentManager with dependencies');
    
    // For this manager, we don't have external dependencies, just configuration options
    // Convert generic config to our specific options type
    const options: CaddyDeploymentManagerOptions = {
      baseDir: configOrDependencies['baseDir'] as string,
    };
    
    return new CaddyDeploymentManager(options);
  }
  
  private readonly logger = Logger.getInstance();
  private readonly baseDir: string;
  
  /**
   * Create a new CaddyDeploymentManager
   * 
   * Private constructor to enforce use of factory methods
   * Part of the Component Interface Standardization pattern
   * 
   * @param options Configuration options
   */
  private constructor(options?: CaddyDeploymentManagerOptions) {
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
      // Use HTTP for localhost, HTTPS for real domains
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const url = `${protocol}://${domain}`;
      
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
          context: 'CaddyDeploymentManager',
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
          context: 'CaddyDeploymentManager',
        });
      }
      
      this.logger.info(`Website status check completed for ${environment}`, {
        buildStatus,
        fileCount,
        serverStatus,
        accessStatus,
        context: 'CaddyDeploymentManager',
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
        context: 'CaddyDeploymentManager',
      });
      
      // Return a default error status
      const domain = this.getDomainForEnvironment(environment);
      // Use HTTP for localhost, HTTPS for real domains
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      
      return {
        environment,
        buildStatus: 'Not Built',
        fileCount: 0,
        serverStatus: 'Unknown',
        domain,
        accessStatus: 'Error',
        url: `${protocol}://${domain}`,
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
      // The preview site is built to src/website/dist by Astro build
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
          context: 'CaddyDeploymentManager',
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
              context: 'CaddyDeploymentManager',
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
          context: 'CaddyDeploymentManager',
        });
        
        // Make sure the preview directory has files to copy
        const previewContents = await fs.readdir(previewDir);
        this.logger.info('Preview directory contents:', {
          fileCount: previewContents.length,
          fileList: previewContents.join(', '),
          context: 'CaddyDeploymentManager',
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
            context: 'CaddyDeploymentManager',
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
          context: 'CaddyDeploymentManager',
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
                context: 'CaddyDeploymentManager',
              });
            } else {
              // Direct file copy
              await fs.copyFile(sourcePath, destPath);
              this.logger.info(`Copied file: ${file}`, {
                context: 'CaddyDeploymentManager',
              });
            }
          } catch (copyError) {
            this.logger.error(`Error copying ${file}`, {
              error: copyError,
              context: 'CaddyDeploymentManager',
            });
            // Continue with other files even if one fails
          }
        }
        
        // Verify the production directory has the copied files
        const productionContents = await fs.readdir(productionDir);
        this.logger.info('Production directory contents after copy:', {
          fileCount: productionContents.length,
          fileList: productionContents.join(', '),
          context: 'CaddyDeploymentManager',
        });
        
        // Verify index.html exists in production
        const prodIndexExists = await fs.stat(path.join(productionDir, 'index.html'))
          .then(stats => stats.isFile())
          .catch(() => false);
          
        if (!prodIndexExists) {
          this.logger.error('index.html missing from production directory after copy', {
            productionDir,
            context: 'CaddyDeploymentManager',
          });
          throw new Error('index.html not found in production directory after copy');
        }
        
        // Force Caddy to fully restart to clear any caches
        try {
          // First try to restart Caddy completely instead of just reloading
          this.logger.info('Attempting to restart Caddy server completely', {
            context: 'CaddyDeploymentManager',
          });
          
          try {
            // Try restart first (preserves state but more thorough than reload)
            await execPromise('systemctl is-active --quiet caddy && systemctl restart caddy');
            this.logger.info('Restarted Caddy server', {
              context: 'CaddyDeploymentManager',
            });
          } catch (restartError) {
            // If restart fails, try reload as fallback
            this.logger.warn('Could not restart Caddy, trying reload instead', {
              error: restartError,
              context: 'CaddyDeploymentManager',
            });
            
            await execPromise('systemctl is-active --quiet caddy && systemctl reload caddy');
            this.logger.info('Reloaded Caddy server', {
              context: 'CaddyDeploymentManager',
            });
          }
          
          // Add a short delay to ensure Caddy is fully restarted before returning
          await new Promise(resolve => global.setTimeout(resolve, 1000));
          
        } catch (caddyError) {
          this.logger.warn('Could not refresh Caddy server, but files were copied successfully', {
            error: caddyError,
            context: 'CaddyDeploymentManager',
          });
          // Continue even if Caddy operations fail - it might not be managed by systemd
        }
        
        // Verify the files were copied
        const productionFiles = await fs.readdir(productionDir);
        
        // Use the PM2 restart command to restart the production server
        // This will force a clean restart with the new files
        try {
          this.logger.info('Restarting production server to load new files', {
            context: 'CaddyDeploymentManager',
          });
          await execPromise('bun run pm2 restart website-production || true');
        } catch (restartError) {
          this.logger.warn('Failed to restart production server', {
            error: restartError,
            context: 'CaddyDeploymentManager',
          });
        }
        
        // Use HTTP for localhost, HTTPS for real domains
        const protocol = productionDomain.includes('localhost') ? 'http' : 'https';
        const siteUrl = `${protocol}://${productionDomain}`;
        
        // Determine if we're in dev mode for messaging
        const isDevMode = productionDomain.includes('localhost');
        
        return {
          success: true,
          message: isDevMode
            ? `Preview successfully promoted to live site (${productionFiles.length} files). Available at ${siteUrl} (development mode)`
            : `Preview successfully promoted to production (${productionFiles.length} files).`,
          url: siteUrl,
        };
      } catch (fsError) {
        throw new Error(`File system error during promotion: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
      }
    } catch (error) {
      this.logger.error('Error promoting website to production', {
        error,
        context: 'CaddyDeploymentManager',
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
    // Use the configuration from the imported config object
    const baseDomain = config.website.deployment.domain;
    
    // Use actual hostname with port for local development environments
    if (baseDomain === 'localhost' || baseDomain === 'example.com') {
      return environment === 'production'
        ? `localhost:${config.website.deployment.productionPort}`
        : `localhost:${config.website.deployment.previewPort}`;
    }
    
    // For real domains, use subdomain for preview
    return environment === 'production' 
      ? baseDomain
      : `preview.${baseDomain}`;
  }
}