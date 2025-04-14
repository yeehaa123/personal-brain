/**
 * Website Deployment Manager
 * 
 * Handles low-level operations for deploying websites with Caddy
 */

import { Logger } from '@/utils/logger';

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
  caddyStatus: 'Running' | 'Not Running' | 'Not Found' | 'Error' | 'Unknown';
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
}

/**
 * Local file system implementation of WebsiteDeploymentManager
 * Uses Caddy for serving websites
 */
export class LocalCaddyDeploymentManager implements WebsiteDeploymentManager {
  private readonly logger = Logger.getInstance();
  private readonly baseDir: string;
  
  /**
   * Create a new LocalCaddyDeploymentManager
   * @param options Configuration options
   */
  constructor(options?: { baseDir?: string }) {
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
      } catch (fsError) {
        // Directory doesn't exist
        buildStatus = 'Not Built';
        this.logger.warn(`Directory for ${environment} environment does not exist`, {
          directory: targetDir,
          context: 'LocalCaddyDeploymentManager',
        });
      }
      
      // Check Caddy status
      let caddyStatus: 'Running' | 'Not Running' | 'Not Found' | 'Error' | 'Unknown' = 'Unknown';
      try {
        const execPromise = util.promisify(childProcess.exec);
        await execPromise('systemctl is-active --quiet caddy');
        caddyStatus = 'Running';
      } catch (caddyError) {
        const error = caddyError as { code?: number };
        if (error.code === 3) { // systemctl exit code 3 means service is not active
          caddyStatus = 'Not Running';
        } else if (error.code === 127) { // command not found
          caddyStatus = 'Not Found';
        } else {
          caddyStatus = 'Error';
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
        caddyStatus,
        accessStatus,
        context: 'LocalCaddyDeploymentManager',
      });
      
      return {
        environment,
        buildStatus,
        fileCount,
        caddyStatus,
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
        caddyStatus: 'Unknown',
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
      const previewDir = path.join(this.baseDir, 'preview', 'dist');
      const productionDir = path.join(this.baseDir, 'production', 'dist');
      
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
        } catch (err) {
          // Directory doesn't exist, which is fine
        }
        
        // Create production directory
        await fs.mkdir(productionDir, { recursive: true });
        
        // Copy all files from preview to production
        const execPromise = util.promisify(childProcess.exec);
        await execPromise(`cp -R ${previewDir}/* ${productionDir}/`);
        
        // Optional: Reload Caddy to ensure it picks up any changes
        try {
          await execPromise('systemctl is-active --quiet caddy && systemctl reload caddy');
          this.logger.info('Reloaded Caddy server', {
            context: 'LocalCaddyDeploymentManager',
          });
        } catch (caddyError) {
          this.logger.warn('Could not reload Caddy server, but files were copied successfully', {
            error: caddyError,
            context: 'LocalCaddyDeploymentManager',
          });
          // Continue even if Caddy reload fails - it might not be managed by systemd
        }
        
        // Verify the files were copied
        const productionFiles = await fs.readdir(productionDir);
        
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
export class DeploymentManagerFactory {
  private static instance: DeploymentManagerFactory | null = null;
  
  /**
   * Get the singleton instance
   */
  static getInstance(): DeploymentManagerFactory {
    if (!DeploymentManagerFactory.instance) {
      DeploymentManagerFactory.instance = new DeploymentManagerFactory();
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
  static createFresh(): DeploymentManagerFactory {
    return new DeploymentManagerFactory();
  }
  
  /**
   * Create a deployment manager instance
   * @returns A WebsiteDeploymentManager implementation
   */
  createDeploymentManager(): WebsiteDeploymentManager {
    // For now, we only support the local Caddy implementation
    return new LocalCaddyDeploymentManager();
  }
}