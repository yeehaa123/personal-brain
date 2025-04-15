/**
 * Local Development Deployment Manager
 * 
 * Implementation of WebsiteDeploymentManager for local development
 * Uses simple file operations in local directories and PM2 for process management
 */

import { Logger } from '@/utils/logger';

import type { DeploymentAdapter} from '../../adapters/deploymentAdapter';
import { getDeploymentAdapter } from '../../adapters/deploymentAdapter';

import type { DeploymentEnvironment, EnvironmentStatus, PromotionResult, WebsiteDeploymentManager } from './deploymentManager';

/**
 * Local development implementation of WebsiteDeploymentManager
 * Uses local directories for development and testing
 */
export class LocalDevDeploymentManager implements WebsiteDeploymentManager {
  private readonly logger = Logger.getInstance();
  private readonly baseDir: string;
  private readonly deploymentAdapter: DeploymentAdapter;
  
  /**
   * Create a new LocalDevDeploymentManager
   * @param options Configuration options
   */
  private readonly previewPort: number;
  private readonly productionPort: number;

  constructor(options?: { 
    baseDir?: string; 
    previewPort?: number; 
    productionPort?: number;
    deploymentConfig?: {
      previewPort?: number;
      productionPort?: number;
    },
    deploymentAdapter?: DeploymentAdapter
  }) {
    this.baseDir = options?.baseDir || process.cwd();
    // Prefer deploymentConfig properties if provided, fall back to direct options for backward compatibility
    this.previewPort = options?.deploymentConfig?.previewPort || options?.previewPort || 4321;
    this.productionPort = options?.deploymentConfig?.productionPort || options?.productionPort || 4322;
    
    // Use provided adapter or get a new one
    this.deploymentAdapter = options?.deploymentAdapter || getDeploymentAdapter();
  }
  
  /**
   * Start both preview and production servers using the deployment adapter
   * @returns Promise resolving to true if servers were started successfully
   */
  async startServers(): Promise<boolean> {
    try {
      // First make sure servers are stopped
      await this.stopServers();
      
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Define paths
      const rootDir = path.resolve(process.cwd());
      const productionDir = path.join(rootDir, 'dist', 'production');
      
      // Ensure production directory exists
      await fs.mkdir(productionDir, { recursive: true });
      
      // If no files exist in production, create a placeholder using the template
      let hasFiles = false;
      try {
        const files = await fs.readdir(productionDir);
        hasFiles = files.length > 0;
      } catch (_error) {
        hasFiles = false;
      }
      
      if (!hasFiles) {
        this.logger.info('Creating placeholder in production directory', {
          context: 'LocalDevDeploymentManager',
        });
        
        try {
          // Read the template file directly
          const templatePath = path.join(rootDir, 'src', 'mcp', 'contexts', 'website', 'services', 'deployment', 'productionTemplate.html');
          const template = await fs.readFile(templatePath, 'utf-8');
          
          // Write the template to the production directory
          await fs.writeFile(path.join(productionDir, 'index.html'), template);
        } catch (templateError) {
          this.logger.error('Error reading or writing template file', {
            error: templateError,
            context: 'LocalDevDeploymentManager',
          });
          // Create a basic HTML file as fallback
          await fs.writeFile(
            path.join(productionDir, 'index.html'), 
            '<html><body><h1>Production Site</h1><p>This is a placeholder. Your production site will appear here after promotion.</p></body></html>',
          );
        }
      }
      
      // Initialize the deployment adapter
      await this.deploymentAdapter.initialize();
      
      // Start the preview server
      const previewSuccess = await this.deploymentAdapter.startServer(
        'preview',
        this.previewPort,
        path.join(this.baseDir, 'src', 'website'),
      );
      
      // Start the production server
      const productionSuccess = await this.deploymentAdapter.startServer(
        'production',
        this.productionPort,
        productionDir,
      );
      
      return previewSuccess && productionSuccess;
    } catch (error) {
      this.logger.error('Error starting local development servers', {
        error,
        context: 'LocalDevDeploymentManager',
      });
      return false;
    }
  }
  
  /**
   * Stop both preview and production servers managed by PM2
   */
  async stopServers(): Promise<void> {
    try {
      this.logger.info('Stopping website servers', {
        context: 'LocalDevDeploymentManager',
      });
      
      // Initialize the deployment adapter
      await this.deploymentAdapter.initialize();
      
      // Stop both servers
      await this.deploymentAdapter.stopServer('preview');
      await this.deploymentAdapter.stopServer('production');
    } catch (error) {
      this.logger.error('Error stopping servers', {
        error,
        context: 'LocalDevDeploymentManager',
      });
    }
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
      const rootDir = process.cwd();
      // For preview, we use src/website/dist because that's where Astro builds to
      // For production, we use dist/production
      const targetDir = environment === 'preview' 
        ? path.join(rootDir, 'src', 'website', 'dist')
        : path.join(rootDir, 'dist', 'production');
      
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
      } catch (_e) {
        // Directory doesn't exist
        buildStatus = 'Not Built';
      }
      
      // Development server info
      const port = environment === 'preview' ? this.previewPort : this.productionPort;
      const domain = `localhost:${port}`;
      
      // Check server status using the deployment adapter
      let serverStatus: 'Running' | 'Not Running' | 'Not Found' | 'Error' | 'Unknown' = 'Unknown';
      
      try {
        // Initialize the deployment adapter
        await this.deploymentAdapter.initialize();
        
        // Check if the server is running
        const isRunning = await this.deploymentAdapter.isServerRunning(environment);
        
        serverStatus = isRunning ? 'Running' : 'Not Found';
      } catch (adapterError) {
        this.logger.warn(`Error checking server status for ${environment}`, {
          error: adapterError,
          context: 'LocalDevDeploymentManager',
        });
        serverStatus = 'Error';
      }
      
      // Check port accessibility
      let accessStatus = 'Unknown';
      try {
        const { default: net } = await import('net');
        
        // Create a promise that resolves if connection is successful
        const checkPort = () => new Promise<boolean>((resolve) => {
          const socket = new net.Socket();
          
          // Set a timeout (2 seconds)
          const timeout = global.setTimeout(() => {
            socket.destroy();
            resolve(false);
          }, 2000);
          
          // Try to connect
          socket.connect(port, 'localhost', () => {
            global.clearTimeout(timeout);
            socket.destroy();
            resolve(true);
          });
          
          // Handle errors
          socket.on('error', () => {
            global.clearTimeout(timeout);
            resolve(false);
          });
        });
        
        const portAccessible = await checkPort();
        accessStatus = portAccessible ? 'Accessible' : 'Not accessible';
      } catch (accessErr) {
        accessStatus = 'Error checking';
        this.logger.warn(`Error checking port accessibility for ${environment}`, {
          error: accessErr,
          context: 'LocalDevDeploymentManager',
        });
      }
      
      // Create the status response
      return {
        environment,
        buildStatus,
        fileCount,
        serverStatus,
        domain,
        accessStatus,
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
        serverStatus: 'Unknown',
        domain: `localhost:${environment === 'preview' ? this.previewPort : this.productionPort}`,
        accessStatus: 'Unknown',
        url: `http://localhost:${environment === 'preview' ? this.previewPort : this.productionPort}`,
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
      
      // Define paths for local development - make sure we're using the correct paths
      const rootDir = process.cwd();
      // The preview site is built to src/website/dist by Astro
      const previewDir = path.join(rootDir, 'src', 'website', 'dist');
      const productionDir = path.join(rootDir, 'dist', 'production');
      
      // Log the paths we're using
      this.logger.info('Promotion paths', {
        previewDir,
        productionDir,
        rootDir,
        context: 'LocalDevDeploymentManager',
      });
      
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
        
        // Ensure parent directories for production exist
        const prodParentDir = path.dirname(productionDir);
        this.logger.info(`Creating parent directory: ${prodParentDir}`, {
          context: 'LocalDevDeploymentManager',
        });
        await fs.mkdir(prodParentDir, { recursive: true });
        
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
        } catch (_err) {
          // Directory doesn't exist, which is fine
          this.logger.info('Production directory does not exist yet (this is normal)', {
            context: 'LocalDevDeploymentManager',
          });
        }
        
        // Create production directory
        this.logger.info(`Creating production directory: ${productionDir}`, {
          context: 'LocalDevDeploymentManager',
        });
        await fs.mkdir(productionDir, { recursive: true });
        
        // Copy files using a shell command for better reliability
        const cp = await import('child_process');
        const util = await import('util');
        const exec = util.promisify(cp.exec);
        
        // First check if source directory exists and has files
        const dirExists = await fs.stat(previewDir).then(() => true).catch(() => false);
        if (!dirExists) {
          this.logger.error(`Preview directory ${previewDir} does not exist`, {
            context: 'LocalDevDeploymentManager',
          });
          throw new Error(`Preview directory ${previewDir} does not exist`);
        }
        
        const previewFiles = await fs.readdir(previewDir).catch(() => []);
        this.logger.info(`Found ${previewFiles.length} entries in preview directory`, {
          previewFiles,
          context: 'LocalDevDeploymentManager',
        });
        
        // Use cp -r command with explicit paths - but excluding the 'production' subdirectory
        const cpCommand = `find "${previewDir}" -maxdepth 1 -not -name production -not -path "${previewDir}" -exec cp -r {} "${productionDir}/" \\;`;
        this.logger.info(`Copying files using shell command: ${cpCommand}`, {
          context: 'LocalDevDeploymentManager',
        });
        
        try {
          // Execute the copy command using find to exclude the production directory
          await exec(cpCommand);
          this.logger.info('Files copied successfully using shell command', {
            context: 'LocalDevDeploymentManager',
          });
        } catch (cpError) {
          this.logger.error('Error copying files with shell command', {
            error: cpError,
            context: 'LocalDevDeploymentManager',
          });
          
          // Fall back to the recursive copy method
          this.logger.info('Falling back to recursive copy method', {
            context: 'LocalDevDeploymentManager',
          });
          await this.copyDirectory(previewDir, productionDir);
        }
        
        // Verify the files were copied
        const productionFileCount = await this.countFiles(productionDir);
        
        return {
          success: true,
          message: `Preview successfully promoted to production (${productionFileCount} files). To serve the production site, run: npx serve ${productionDir} -p ${this.productionPort}`,
          url: `http://localhost:${this.productionPort}`, // Use configured production port
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
    
    try {
      // Log debugging information
      this.logger.info('Copying directory', {
        source,
        destination,
        context: 'LocalDevDeploymentManager',
      });
    
      // Create destination directory
      await fs.mkdir(destination, { recursive: true });
      
      // Read source directory
      const entries = await fs.readdir(source, { withFileTypes: true });
      
      // Copy each entry
      for (const entry of entries) {
        try {
          const srcPath = path.join(source, entry.name);
          const destPath = path.join(destination, entry.name);
          
          // Skip production directory to avoid infinite recursion
          if (entry.isDirectory() && entry.name === 'production') {
            this.logger.info('Skipping production directory to avoid recursion', {
              context: 'LocalDevDeploymentManager',
            });
            continue;
          }
          
          if (entry.isDirectory()) {
            // Recursively copy subdirectories
            await this.copyDirectory(srcPath, destPath);
          } else {
            // Copy file
            this.logger.debug(`Copying file ${entry.name}`, {
              context: 'LocalDevDeploymentManager',
            });
            await fs.copyFile(srcPath, destPath);
          }
        } catch (entryError) {
          this.logger.error(`Error copying entry ${entry.name}`, {
            error: entryError,
            context: 'LocalDevDeploymentManager',
          });
          // Continue with other entries
        }
      }
    } catch (copyError) {
      this.logger.error('Error in copyDirectory', {
        error: copyError,
        source,
        destination,
        context: 'LocalDevDeploymentManager',
      });
      throw copyError;
    }
  }
  
  /**
   * Count files in a directory recursively
   */
  private async countFiles(directory: string): Promise<number> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let count = 0;
    
    try {
      // Read directory
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      // Count each entry
      for (const entry of entries) {
        // Skip production directory to avoid recursion issues
        if (entry.isDirectory() && entry.name === 'production') {
          continue;
        }
        
        const entryPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively count files in subdirectories
          count += await this.countFiles(entryPath);
        } else {
          // Count this file
          count++;
        }
      }
    } catch (error) {
      this.logger.warn(`Error counting files in ${directory}`, {
        error,
        context: 'LocalDevDeploymentManager',
      });
      // Return current count on error
    }
    
    return count;
  }
}