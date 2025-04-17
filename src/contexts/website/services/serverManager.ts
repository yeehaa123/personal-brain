/**
 * Server Manager
 *
 * A dedicated module for managing server lifecycle across the application,
 * independent of context initialization.
 */

import { Logger } from '@/utils/logger';

import { type DeploymentAdapter, getDeploymentAdapter } from '../adapters/deploymentAdapter';

/**
 * ServerManager options 
 */
export interface ServerManagerOptions {
  /** Deployment adapter to use (used for testing) */
  deploymentAdapter?: DeploymentAdapter;
}

/**
 * ServerManager class
 * 
 * Singleton class that manages the lifecycle of website servers
 */
export class ServerManager {
  private static instance: ServerManager | null = null;
  private readonly logger = Logger.getInstance();
  private readonly deploymentAdapter: DeploymentAdapter;
  private initialized = false;
  // Flag to track if cleanup is in progress to prevent duplicate cleanup attempts
  private isCleaningUp = false;
  // Counter for active servers that we're managing
  private activeServerCount = 0;
  
  /**
   * Get the singleton instance of ServerManager
   * @param options Options for the ServerManager
   * @returns The singleton instance
   */
  public static getInstance(options?: ServerManagerOptions): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager(options);
    }
    return ServerManager.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (ServerManager.instance) {
      // Attempt to stop servers before resetting
      ServerManager.instance.stopServers().catch(error => {
        console.error('Error stopping servers during reset:', error);
      });
    }
    ServerManager.instance = null;
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * @param options Options for the ServerManager
   * @returns A new ServerManager instance
   */
  public static createFresh(options?: ServerManagerOptions): ServerManager {
    return new ServerManager(options);
  }
  
  /**
   * Private constructor to enforce the use of getInstance()
   * @param options Options for the ServerManager
   */
  private constructor(options?: ServerManagerOptions) {
    this.deploymentAdapter = options?.deploymentAdapter || getDeploymentAdapter();
    
    // IMPORTANT: We don't register any signal handlers here
    // All signal and exit handlers are now consolidated in the main CLI and Matrix interfaces
    // to avoid conflicting handlers that might cause race conditions
    
    // No exit handlers, no SIGINT or SIGTERM handlers here
    // Those handlers in CLI and Matrix will call ServerManager.cleanup() directly when needed
  }
  
  /**
   * Full cleanup that forcefully stops all servers
   * This method should be used when shutting down the application
   */
  async cleanup(): Promise<void> {
    // Prevent duplicate cleanup attempts
    if (this.isCleaningUp) {
      this.logger.info('Cleanup already in progress, ignoring duplicate request', {
        context: 'ServerManager',
      });
      return;
    }
    
    this.isCleaningUp = true;
    
    this.logger.info(`Performing emergency server cleanup (active count: ${this.activeServerCount})`, {
      context: 'ServerManager',
    });
    
    try {
      // Normal graceful stop with force=true to bypass the cleaning up check
      await this.stopServers(true);
      
      // Use PM2 command directly as a backup in case stopServers fails
      // This ensures servers are killed even if our state tracking is wrong
      try {
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        // Force stop and delete by name, ignore errors with || true
        this.logger.info('Forcefully stopping all servers via PM2 as cleanup fallback', {
          context: 'ServerManager',
        });
        
        await execPromise('bun run pm2 stop website-preview || true');
        await execPromise('bun run pm2 delete website-preview || true');
        await execPromise('bun run pm2 stop website-production || true');
        await execPromise('bun run pm2 delete website-production || true');
        
        // Reset active server count as we've forcefully stopped everything
        this.activeServerCount = 0;
        
        this.logger.info('Forced cleanup completed successfully', {
          context: 'ServerManager',
        });
      } catch (pmError) {
        this.logger.error('Error during forced PM2 cleanup', {
          error: pmError,
          context: 'ServerManager',
        });
      }
    } catch (error) {
      this.logger.error('Error during server cleanup', {
        error,
        context: 'ServerManager',
      });
    } finally {
      this.isCleaningUp = false;
    }
  }
  
  /**
   * Initialize the server manager
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    try {
      // Initialize the deployment adapter
      const adapterInitialized = await this.deploymentAdapter.initialize();
      if (!adapterInitialized) {
        this.logger.warn('Deployment adapter initialization returned false', {
          context: 'ServerManager',
        });
        // Continue anyway as this might be recoverable
      }
      
      this.initialized = true;
      
      // Define the production directory path
      const productionDir = `${process.cwd()}/dist/production`;
      
      // Always ensure the production directory exists with a default HTML file
      // This ensures the production server can start properly in any environment
      await this.ensureProductionDirectory(productionDir);
      
      return true;
    } catch (error) {
      this.logger.error('Error initializing ServerManager', {
        error,
        context: 'ServerManager',
      });
      return false;
    }
  }
  
  /**
   * Start preview and production servers
   * @returns true if both servers are running, false otherwise
   */
  async startServers(): Promise<boolean> {
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult) {
        this.logger.error('Server manager failed to initialize, cannot start servers', {
          context: 'ServerManager',
        });
        return false;
      }
    }
    
    try {
      this.logger.info('Starting website servers', {
        context: 'ServerManager',
      });
      
      // First check if servers are already running
      let previewRunning = false;
      let productionRunning = false;
      
      try {
        previewRunning = await this.deploymentAdapter.isServerRunning('preview');
        productionRunning = await this.deploymentAdapter.isServerRunning('production');
      } catch (checkError) {
        this.logger.warn('Error checking server status, assuming servers are not running', {
          error: checkError,
          context: 'ServerManager',
        });
        // Continue with starting the servers
      }
      
      // Skip starting if already running
      if (previewRunning && productionRunning) {
        this.logger.info('Website servers are already running', {
          context: 'ServerManager',
        });
        return true;
      }
      
      // Default ports from configuration
      const previewPort = Number(process.env['WEBSITE_PREVIEW_PORT']) || 4321;
      const productionPort = Number(process.env['WEBSITE_PRODUCTION_PORT']) || 4322;
      
      // Start the preview server if not running
      if (!previewRunning) {
        try {
          const previewSuccess = await this.deploymentAdapter.startServer(
            'preview',
            previewPort,
            `${process.cwd()}/src/website`,
          );
          
          if (!previewSuccess) {
            this.logger.error('Failed to start preview server', {
              context: 'ServerManager',
            });
          } else {
            // Track that we've started a server
            this.activeServerCount++;
            this.logger.info('Preview server started successfully', {
              port: previewPort,
              context: 'ServerManager',
            });
          }
        } catch (previewError) {
          this.logger.error('Error starting preview server', {
            error: previewError,
            context: 'ServerManager',
          });
        }
      } else if (previewRunning) {
        // Already running server counts too
        this.activeServerCount++;
      }
      
      // Start the production server if not running
      if (!productionRunning) {
        // Define the production directory
        const productionDir = `${process.cwd()}/dist/production`;
        
        try {
          const productionSuccess = await this.deploymentAdapter.startServer(
            'production',
            productionPort,
            productionDir,
          );
          
          if (!productionSuccess) {
            this.logger.error('Failed to start production server', {
              context: 'ServerManager',
            });
          } else {
            // Track that we've started a server
            this.activeServerCount++;
            this.logger.info('Production server started successfully', {
              port: productionPort,
              context: 'ServerManager',
            });
          }
        } catch (productionError) {
          this.logger.error('Error starting production server', {
            error: productionError,
            context: 'ServerManager',
          });
        }
      } else if (productionRunning) {
        // Already running server counts too
        this.activeServerCount++;
      }
      
      // Check if servers are now running
      let finalPreviewRunning = false;
      let finalProductionRunning = false;
      
      try {
        finalPreviewRunning = await this.deploymentAdapter.isServerRunning('preview');
        finalProductionRunning = await this.deploymentAdapter.isServerRunning('production');
      } catch (finalCheckError) {
        this.logger.error('Error checking final server status', {
          error: finalCheckError,
          context: 'ServerManager',
        });
        // Use best guess based on success of start operations
        finalPreviewRunning = previewRunning || (this.activeServerCount > 0);
        finalProductionRunning = productionRunning || (this.activeServerCount > 1);
      }
      
      this.logger.info('Server status after startup attempt', {
        preview: finalPreviewRunning ? 'Running' : 'Not Running',
        production: finalProductionRunning ? 'Running' : 'Not Running',
        activeCount: this.activeServerCount,
        context: 'ServerManager',
      });
      
      return finalPreviewRunning && finalProductionRunning;
    } catch (error) {
      this.logger.error('Error starting website servers', {
        error,
        context: 'ServerManager',
      });
      return false;
    }
  }
  
  /**
   * Stop all servers
   * @param force If true, ignore the cleaning up flag (used by cleanup method)
   */
  async stopServers(force: boolean = false): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      // Don't stop if we're already cleaning up, unless forced
      if (this.isCleaningUp && !force) {
        this.logger.info('Server cleanup already in progress, ignoring duplicate request', {
          context: 'ServerManager',
        });
        return;
      }
      
      this.logger.info(`Stopping all website servers (active count: ${this.activeServerCount})`, {
        context: 'ServerManager',
      });
      
      // Stop both preview and production servers
      const previewResult = await this.deploymentAdapter.stopServer('preview');
      if (previewResult) {
        this.activeServerCount = Math.max(0, this.activeServerCount - 1);
      }
      
      const productionResult = await this.deploymentAdapter.stopServer('production');
      if (productionResult) {
        this.activeServerCount = Math.max(0, this.activeServerCount - 1);
      }
      
      this.logger.info(`All website servers stopped (remaining: ${this.activeServerCount})`, {
        context: 'ServerManager',
      });
    } catch (error) {
      this.logger.error('Error stopping website servers', {
        error,
        context: 'ServerManager',
      });
    }
  }
  
  /**
   * Ensure the production directory exists and has at least a basic HTML file
   * This prevents errors when starting the production server before promotion
   */
  private async ensureProductionDirectory(productionDir: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if the directory exists
      let dirExists = false;
      try {
        const stats = await fs.stat(productionDir);
        dirExists = stats.isDirectory();
      } catch (_error) {
        dirExists = false;
      }
      
      // Create the directory if it doesn't exist
      if (!dirExists) {
        this.logger.info(`Creating production directory: ${productionDir}`, {
          context: 'ServerManager',
        });
        await fs.mkdir(productionDir, { recursive: true });
      }
      
      // Check if index.html exists in the directory
      let hasIndex = false;
      try {
        const files = await fs.readdir(productionDir);
        hasIndex = files.includes('index.html');
      } catch (_error) {
        hasIndex = false;
      }
      
      // Create a default index.html file if it doesn't exist
      if (!hasIndex) {
        this.logger.info('Creating default index.html in production directory', {
          context: 'ServerManager',
        });
        
        // Path to the template file
        const templatePath = path.join(process.cwd(), 'src', 'mcp', 'contexts', 'website', 'services', 'deployment', 'productionTemplate.html');
        
        try {
          // Read the template file
          const template = await fs.readFile(templatePath, 'utf-8');
          
          // Write the template file to index.html
          await fs.writeFile(path.join(productionDir, 'index.html'), template);
          
          this.logger.info('Default index.html created from template file', {
            context: 'ServerManager',
          });
        } catch (templateError) {
          this.logger.error('Error reading template file, falling back to simple HTML', {
            error: templateError,
            templatePath,
            context: 'ServerManager',
          });
          
          // Create a simple HTML file as fallback
          const fallbackTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Personal Brain - Production Site</title>
</head>
<body>
  <h1>Personal Brain - Production Site</h1>
  <p>This is a placeholder. Use 'website-promote' to update with your content.</p>
</body>
</html>`;
          
          await fs.writeFile(path.join(productionDir, 'index.html'), fallbackTemplate);
        }
      }
    } catch (error) {
      this.logger.error('Error ensuring production directory exists', {
        error,
        productionDir,
        context: 'ServerManager',
      });
      // Continue even if this fails - the server will try to start anyway
    }
  }
  
  /**
   * Check if servers are running
   */
  async areServersRunning(): Promise<{ preview: boolean; production: boolean }> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const previewRunning = await this.deploymentAdapter.isServerRunning('preview');
      const productionRunning = await this.deploymentAdapter.isServerRunning('production');
      
      return {
        preview: previewRunning,
        production: productionRunning,
      };
    } catch (error) {
      this.logger.error('Error checking server status', {
        error,
        context: 'ServerManager',
      });
      
      return {
        preview: false,
        production: false,
      };
    }
  }
}

/**
 * Export the getInstance method directly for convenience
 */
export const getServerManager = ServerManager.getInstance;