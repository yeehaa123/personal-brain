/**
 * Local Development Deployment Manager
 * 
 * Implementation of WebsiteDeploymentManager for local development
 * Uses simple file operations in local directories
 */

import { Logger } from '@/utils/logger';
import type { DeploymentEnvironment, EnvironmentStatus, PromotionResult, WebsiteDeploymentManager } from './deploymentManager';

/**
 * Local development implementation of WebsiteDeploymentManager
 * Uses local directories for development and testing
 */
export class LocalDevDeploymentManager implements WebsiteDeploymentManager {
  private readonly logger = Logger.getInstance();
  private readonly baseDir: string;
  
  /**
   * Create a new LocalDevDeploymentManager
   * @param options Configuration options
   */
  constructor(options?: { baseDir?: string }) {
    this.baseDir = options?.baseDir || process.cwd();
  }
  
  /**
   * Get the status of an environment
   * @param environment The environment to check
   * @returns Status information for the environment
   */
  async getEnvironmentStatus(environment: DeploymentEnvironment): Promise<EnvironmentStatus> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Define target directory for this environment
      const targetDir = path.join(this.baseDir, 'dist', environment);
      
      // Check if directory exists and count files
      let buildStatus: 'Built' | 'Not Built' | 'Empty' = 'Not Built';
      let fileCount = 0;
      
      try {
        const stats = await fs.stat(targetDir);
        if (stats.isDirectory()) {
          // Count files recursively
          const files = await this.countFiles(targetDir);
          fileCount = files;
          buildStatus = fileCount > 0 ? 'Built' : 'Empty';
        }
      } catch (e) {
        // Directory doesn't exist
        buildStatus = 'Not Built';
      }
      
      // Development server info
      const domain = `localhost:${environment === 'preview' ? 4321 : 4322}`;
      
      // In development mode, we assume the bot's HTTP server is running
      const caddyStatus = 'Running';
      
      // Create the status response
      return {
        environment,
        buildStatus,
        fileCount,
        caddyStatus,
        domain,
        accessStatus: 'Accessible',
        url: `http://${domain}`,
      };
    } catch (error) {
      this.logger.error('Error checking local environment status', { 
        error,
        environment,
        context: 'LocalDevDeploymentManager',
      });
      
      // Return a default error status
      return {
        environment,
        buildStatus: 'Not Built',
        fileCount: 0,
        caddyStatus: 'Unknown',
        domain: `localhost:${environment === 'preview' ? 4321 : 4322}`,
        accessStatus: 'Unknown',
        url: `http://localhost:${environment === 'preview' ? 4321 : 4322}`,
      };
    }
  }
  
  /**
   * Promote website from preview to production
   * @returns Result of the promotion operation
   */
  async promoteToProduction(): Promise<PromotionResult> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Define paths for local development
      const previewDir = path.join(this.baseDir, 'dist', 'preview');
      const productionDir = path.join(this.baseDir, 'dist', 'production');
      
      // Check if preview directory exists and has content
      try {
        const previewStats = await fs.stat(previewDir);
        if (!previewStats.isDirectory()) {
          throw new Error(`Preview directory ${previewDir} is not a directory`);
        }
        
        // Count files in preview directory
        const fileCount = await this.countFiles(previewDir);
        if (fileCount === 0) {
          throw new Error('Preview directory is empty. Please build the website first.');
        }
        
        this.logger.info('Promoting website from preview to production in development mode', {
          previewDir,
          productionDir,
          fileCount,
          context: 'LocalDevDeploymentManager',
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
              context: 'LocalDevDeploymentManager',
            });
            
            await fs.rm(productionDir, { recursive: true, force: true });
          }
        } catch (err) {
          // Directory doesn't exist, which is fine
        }
        
        // Create production directory
        await fs.mkdir(productionDir, { recursive: true });
        
        // Copy files using the recursive copy method
        await this.copyDirectory(previewDir, productionDir);
        
        // Verify the files were copied
        const productionFileCount = await this.countFiles(productionDir);
        
        return {
          success: true,
          message: `Preview successfully promoted to production (${productionFileCount} files).`,
          url: 'http://localhost:4322', // Default port for local production
        };
      } catch (fsError) {
        throw new Error(`File system error during promotion: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
      }
    } catch (error) {
      this.logger.error('Error promoting website in development mode', {
        error,
        context: 'LocalDevDeploymentManager',
      });
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error promoting website',
      };
    }
  }
  
  /**
   * Utility to copy a directory recursively
   */
  private async copyDirectory(source: string, destination: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create destination directory
    await fs.mkdir(destination, { recursive: true });
    
    // Read source directory
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    // Copy each entry
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        await this.copyDirectory(srcPath, destPath);
      } else {
        // Copy file
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
  
  /**
   * Count files in a directory recursively
   */
  private async countFiles(directory: string): Promise<number> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let count = 0;
    
    // Read directory
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    // Count each entry
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively count files in subdirectories
        count += await this.countFiles(entryPath);
      } else {
        // Count this file
        count++;
      }
    }
    
    return count;
  }
}