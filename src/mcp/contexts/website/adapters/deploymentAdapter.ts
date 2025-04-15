/**
 * Deployment adapter interface for website deployment
 * Handles actual server process management
 */

import { Logger } from '@/utils/logger';

/**
 * Interface for deployment adapters
 */
export interface DeploymentAdapter {
  /**
   * Initialize the adapter
   */
  initialize(): Promise<boolean>;
  
  /**
   * Start servers for the given environment
   * @param environment The environment to start servers for (preview or production)
   * @param port The port to use for the server
   * @param directory The directory to serve
   * @param serverScript Optional script to use for the server
   */
  startServer(
    environment: 'preview' | 'production', 
    port: number, 
    directory: string,
    serverScript?: string
  ): Promise<boolean>;
  
  /**
   * Stop servers for the given environment
   * @param environment The environment to stop servers for (preview or production)
   */
  stopServer(environment: 'preview' | 'production'): Promise<boolean>;
  
  /**
   * Check if a server is running for the given environment
   * @param environment The environment to check
   * @returns true if the server is running, false otherwise
   */
  isServerRunning(environment: 'preview' | 'production'): Promise<boolean>;
  
  /**
   * Clean up all resources
   */
  cleanup(): Promise<void>;
  
  /**
   * Get the configuration for the deployment adapter
   * @returns Configuration object with deployment type and proxy settings
   */
  getDeploymentConfig(): {
    type: string;
    useReverseProxy: boolean;
    previewPort: number;
    productionPort: number;
    domain: string;
  };
}

/**
 * PM2 implementation of the deployment adapter
 */
export class PM2DeploymentAdapter implements DeploymentAdapter {
  private readonly logger = Logger.getInstance();
  private initialized = false;
  
  /**
   * Default server names
   */
  private readonly serverNames = {
    preview: 'website-preview',
    production: 'website-production',
  };
  
  /**
   * Default server scripts
   */
  private readonly defaultScripts = {
    preview: 'website:preview',
    production: 'website:production',
  };
  
  /**
   * Deployment configuration
   */
  protected readonly config = {
    type: process.env['WEBSITE_DEPLOYMENT_TYPE'] || 'local-dev',
    useReverseProxy: process.env['WEBSITE_DEPLOYMENT_TYPE'] === 'caddy',
    previewPort: Number(process.env['WEBSITE_PREVIEW_PORT']) || 4321,
    productionPort: Number(process.env['WEBSITE_PRODUCTION_PORT']) || 4322,
    domain: process.env['WEBSITE_DOMAIN'] || 'example.com',
  };
  
  constructor() {
    // IMPORTANT: We don't register any handlers here to avoid conflicts
    // All signal handlers are now consolidated in the main CLI and Matrix interfaces
    // Those handlers will call cleanup through the ServerManager when needed
  }
  
  /**
   * Initialize the adapter
   */
  async initialize(): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      // Check if PM2 is available
      await execPromise('bun run pm2 --version');
      
      this.initialized = true;
      return true;
    } catch (error) {
      this.logger.error('Error initializing PM2DeploymentAdapter', {
        error,
        context: 'PM2DeploymentAdapter',
      });
      return false;
    }
  }
  
  /**
   * Start a server for the given environment
   */
  async startServer(
    environment: 'preview' | 'production', 
    port: number, 
    directory: string,
    serverScript?: string,
  ): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      // Use the provided script or default
      const script = serverScript || this.defaultScripts[environment];
      const serverName = this.serverNames[environment];
      
      // First stop any existing server
      await this.stopServer(environment);
      
      // Build the command
      let command: string;
      
      if (environment === 'preview') {
        command = `bun run pm2 start "bun run ${script} --port ${port}" --name ${serverName} --interpreter none`;
      } else {
        // For production, pass PORT environment variable
        command = `bun run pm2 start "bun run ${script}" --name ${serverName} --interpreter none --env PORT=${port}`;
      }
      
      this.logger.info(`Starting ${environment} server on port ${port}`, {
        context: 'PM2DeploymentAdapter',
        directory,
        serverName,
      });
      
      await execPromise(command);
      return true;
    } catch (error) {
      this.logger.error(`Error starting ${environment} server`, {
        error,
        context: 'PM2DeploymentAdapter',
      });
      return false;
    }
  }
  
  /**
   * Stop a server for the given environment
   */
  async stopServer(environment: 'preview' | 'production'): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      const serverName = this.serverNames[environment];
      
      // Check if the server is running first
      const { stdout } = await execPromise('bun run pm2 list');
      
      if (stdout.includes(serverName)) {
        // Stop and delete the process
        this.logger.info(`Stopping ${environment} server`, {
          context: 'PM2DeploymentAdapter',
          serverName,
        });
        
        await execPromise(`bun run pm2 stop ${serverName} || true`);
        await execPromise(`bun run pm2 delete ${serverName} || true`);
        
        this.logger.info(`Stopped ${environment} server`, {
          context: 'PM2DeploymentAdapter',
        });
      } else {
        this.logger.info(`${environment} server is not running (no stop needed)`, {
          context: 'PM2DeploymentAdapter',
        });
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error stopping ${environment} server`, {
        error,
        context: 'PM2DeploymentAdapter',
      });
      return false;
    }
  }
  
  /**
   * Check if a server is running for the given environment
   */
  async isServerRunning(environment: 'preview' | 'production'): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      const serverName = this.serverNames[environment];
      
      // Check PM2 list for the server
      const { stdout } = await execPromise('bun run pm2 list');
      
      // Check if the server is running and online
      return stdout.includes(serverName) && stdout.includes('online');
    } catch (error) {
      this.logger.error(`Error checking if ${environment} server is running`, {
        error,
        context: 'PM2DeploymentAdapter',
      });
      return false;
    }
  }
  
  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      this.logger.info('Cleaning up all servers', {
        context: 'PM2DeploymentAdapter',
      });
      
      // Stop all servers
      await this.stopServer('preview');
      await this.stopServer('production');
      
      this.logger.info('All servers cleaned up', {
        context: 'PM2DeploymentAdapter',
      });
    } catch (error) {
      this.logger.error('Error during cleanup', {
        error,
        context: 'PM2DeploymentAdapter',
      });
    }
  }
  /**
   * Get the configuration for the deployment adapter
   */
  getDeploymentConfig(): {
    type: string;
    useReverseProxy: boolean;
    previewPort: number;
    productionPort: number;
    domain: string;
    } {
    return this.config;
  }
}

/**
 * Factory function to get a deployment adapter
 * @returns A deployment adapter instance
 */
export function getDeploymentAdapter(): DeploymentAdapter {
  return new PM2DeploymentAdapter();
}