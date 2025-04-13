import type { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import { BaseCommandHandler } from '@commands/core/baseCommandHandler';
import type { CommandInfo, CommandResult, WebsiteCommandResult } from '@commands/core/commandTypes';
import type { BrainProtocol } from '@mcp/protocol';

/**
 * Command handler for website-related commands
 */
export class WebsiteCommandHandler extends BaseCommandHandler {
  private static instance: WebsiteCommandHandler | null = null;
  private websiteContext: WebsiteContext | null = null;
  // Track preview state locally until WebsiteContext implements it
  private _previewRunning = false;
  
  /**
   * Check if website preview is currently running
   * @returns True if preview server is running
   */
  private isPreviewRunning(): boolean {
    return this._previewRunning;
  }
  
  /**
   * Set preview server running state
   * @param running Whether preview is running
   */
  private setPreviewRunning(running: boolean): void {
    this._previewRunning = running;
  }
  
  /**
   * Get singleton instance of WebsiteCommandHandler
   */
  public static getInstance(brainProtocol: BrainProtocol): WebsiteCommandHandler {
    if (!WebsiteCommandHandler.instance) {
      WebsiteCommandHandler.instance = new WebsiteCommandHandler(brainProtocol);
    }
    return WebsiteCommandHandler.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    WebsiteCommandHandler.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  public static createFresh(brainProtocol: BrainProtocol): WebsiteCommandHandler {
    return new WebsiteCommandHandler(brainProtocol);
  }
  
  /**
   * Constructor
   */
  constructor(brainProtocol: BrainProtocol) {
    super(brainProtocol);
  }
  
  /**
   * List of commands supported by this handler
   */
  private static readonly SUPPORTED_COMMANDS = [
    'website',
    'website-init',
    'website-config',
    'landing-page',
    'website-preview',
    'website-preview-stop',
    'website-build',
    'website-deploy',
    'website-deployment-status',
  ];

  /**
   * Check if this handler can process the given command
   */
  public canHandle(command: string): boolean {
    return WebsiteCommandHandler.SUPPORTED_COMMANDS.includes(command);
  }

  /**
   * Get list of commands supported by this handler
   */
  public getCommands(): CommandInfo[] {
    return [
      {
        command: 'website',
        description: 'Display website commands and help',
        usage: 'website',
      },
      {
        command: 'website-init',
        description: 'Initialize website configuration',
        usage: 'website-init',
        examples: ['website-init'],
      },
      {
        command: 'website-config',
        description: 'View or update website configuration',
        usage: 'website-config [key=value ...]',
        examples: ['website-config', 'website-config title="My Website" baseUrl="https://example.com"'],
      },
      {
        command: 'landing-page',
        description: 'Generate or view landing page content',
        usage: 'landing-page [generate|view]',
        examples: ['landing-page generate', 'landing-page view'],
      },
      {
        command: 'website-preview',
        description: 'Start local preview server',
        usage: 'website-preview',
      },
      {
        command: 'website-preview-stop',
        description: 'Stop the running preview server',
        usage: 'website-preview-stop',
      },
      {
        command: 'website-build',
        description: 'Build the website for deployment',
        usage: 'website-build',
      },
      {
        command: 'website-deploy',
        description: 'Deploy the website using the configured provider (creates site if needed)',
        usage: 'website-deploy',
        examples: ['website-deploy'],
      },
      {
        command: 'website-deployment-status',
        description: 'Check the deployment status of the website',
        usage: 'website-deployment-status',
      },
    ];
  }
  
  /**
   * Process website commands
   */
  public async execute(command: string, args: string): Promise<CommandResult> {
    try {
      // Initialize the website context if needed
      if (!this.websiteContext) {
        try {
          this.websiteContext = this.brainProtocol.getWebsiteContext();
        } catch (error) {
          this.logger.error('Failed to get website context', { error });
        }
      }
      
      // If we couldn't get a valid website context
      if (!this.websiteContext) {
        return {
          type: 'website-init',
          success: false,
          message: 'Website context not available. Try initializing the brain protocol first.',
        };
      }
      
      // Process the command
      switch (command) {
      case 'website':
        return this.handleWebsiteHelp();
      case 'website-init':
        return this.handleWebsiteInit();
      case 'website-config':
        return this.handleWebsiteConfig(args);
      case 'landing-page':
        return this.handleLandingPage(args);
      case 'website-preview':
        return this.handleWebsitePreview();
      case 'website-preview-stop':
        return this.handleWebsitePreviewStop();
      case 'website-build':
        return this.handleWebsiteBuild();
      case 'website-deploy':
        return this.handleWebsiteDeploy();
      case 'website-deployment-status':
        return this.handleWebsiteDeploymentStatus();
      default:
        return {
          type: 'website-init',
          success: false,
          message: `Unknown website command: ${command}`,
        };
      }
    } catch (error) {
      this.logger.error(`Error processing website command ${command}: ${error}`);
      return {
        type: 'website-init',
        success: false,
        message: `Failed to process website command: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website help command
   */
  private handleWebsiteHelp(): WebsiteCommandResult {
    return {
      type: 'website-help',
      commands: this.getCommands(),
    };
  }
  
  /**
   * Handle website initialization
   */
  private async handleWebsiteInit(): Promise<WebsiteCommandResult> {
    try {
      if (!this.websiteContext) {
        return {
          type: 'website-init',
          success: false,
          message: 'Website context not available',
        };
      }
      
      // Initialize the website context
      await this.websiteContext.initialize();
      this.logger.info('Website context initialized successfully');
      
      // Get current config for logging purposes
      const config = await this.websiteContext.getConfig();
      
      // Log deployment type information
      if (config.deploymentType === 's3') {
        this.logger.info('S3 deployment type detected.');
      }
      
      // Basic initialization succeeded
      return {
        type: 'website-init',
        success: true,
        message: 'Website initialized successfully' + 
          (config.deploymentType ? ` with ${config.deploymentType} deployment type` : ''),
      };
    } catch (error) {
      this.logger.error(`Error initializing website: ${error}`);
      return {
        type: 'website-init',
        success: false,
        message: `Failed to initialize website: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website configuration command
   */
  private async handleWebsiteConfig(args: string): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'website-config',
        success: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'website-config',
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    // If no args, display current config
    if (!args.trim()) {
      const config = await this.websiteContext.getConfig();
      return {
        type: 'website-config',
        config,
        message: 'Current website configuration',
      };
    }
    
    // Parse key=value pairs from arguments
    try {
      const configUpdates: Record<string, string> = {};
      const keyValuePairs = args.match(/(\w+)="([^"]*)"/g) || [];
      
      for (const pair of keyValuePairs) {
        const [key, value] = pair.split('=');
        const cleanKey = key.trim();
        const cleanValue = value.replace(/"/g, '').trim();
        
        if (cleanKey && cleanValue !== undefined) {
          configUpdates[cleanKey] = cleanValue;
        }
      }
      
      if (Object.keys(configUpdates).length === 0) {
        return {
          type: 'error',
          message: 'Invalid configuration format. Use key="value" format.',
        };
      }
      
      // Update configuration
      await this.websiteContext.updateConfig(configUpdates);
      
      // Get updated config
      const updatedConfig = await this.websiteContext.getConfig();
      
      return {
        type: 'website-config',
        success: true,
        config: updatedConfig,
        message: 'Configuration updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating website configuration: ${error}`);
      return {
        type: 'error',
        message: `Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle landing page commands
   */
  private async handleLandingPage(args: string): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'landing-page',
        success: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'landing-page',
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    const action = args.trim().toLowerCase();
    
    // Generate landing page
    if (action === 'generate') {
      try {
        const result = await this.websiteContext.generateLandingPage();
        
        return {
          type: 'landing-page',
          success: result.success,
          message: result.message,
          data: result.data,
        };
      } catch (error) {
        this.logger.error(`Error generating landing page: ${error}`);
        return {
          type: 'error',
          message: `Failed to generate landing page: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    } 
    // View landing page content
    else if (action === 'view' || !action) {
      try {
        // Try to read from existing file first
        const astroService = await this.websiteContext.getAstroContentService();
        const landingPageData = await astroService.readLandingPageContent();
        
        return {
          type: 'landing-page',
          data: landingPageData || undefined,
        };
      } catch (error) {
        this.logger.error(`Error reading landing page content: ${error}`);
        return {
          type: 'error',
          message: `Failed to read landing page content: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
    
    return {
      type: 'error',
      message: 'Invalid action. Use "landing-page generate" or "landing-page view".',
    };
  }
  
  /**
   * Handle website preview command
   */
  private async handleWebsitePreview(): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'website-preview',
        success: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'website-preview',
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    // Check if preview is already running
    if (this.isPreviewRunning()) {
      return {
        type: 'website-preview',
        success: false,
        message: 'Preview server is already running. Use "website-preview-stop" to stop it first.',
      };
    }
    
    try {
      const result = await this.websiteContext.previewWebsite();
      
      // Update the preview running state if successful
      if (result.success) {
        this.setPreviewRunning(true);
      }
      
      return {
        type: 'website-preview',
        success: result.success,
        url: result.url,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Error starting preview server: ${error}`);
      return {
        type: 'error',
        message: `Failed to start preview server: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website preview stop command
   */
  private async handleWebsitePreviewStop(): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'website-preview-stop',
        success: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'website-preview-stop',
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    // Check if preview is running
    if (!this.isPreviewRunning()) {
      return {
        type: 'website-preview-stop',
        success: false,
        message: 'No preview server is currently running.',
      };
    }
    
    try {
      // Use the new stopPreviewWebsite method in WebsiteContext
      const result = await this.websiteContext.stopPreviewWebsite();
      
      // Update our running state
      if (result.success) {
        this.setPreviewRunning(false);
      }
      
      return {
        type: 'website-preview-stop',
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Error stopping preview server: ${error}`);
      return {
        type: 'website-preview-stop',
        success: false,
        message: `Failed to stop preview server: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website build command
   */
  private async handleWebsiteBuild(): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'website-build',
        success: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'website-build',
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    try {
      const result = await this.websiteContext.buildWebsite();
      
      return {
        type: 'website-build',
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Error building website: ${error}`);
      return {
        type: 'error',
        message: `Failed to build website: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website deploy command
   */
  private async handleWebsiteDeploy(): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'website-deploy',
        success: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'website-deploy',
        success: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    try {
      this.logger.info('Starting website deployment process');
      
      const result = await this.websiteContext.deployWebsite();
      
      if (!result.success) {
        this.logger.error('Website deployment failed', {
          message: result.message,
          logs: result.logs,
        });
        
        // Display more detailed error information in the command result
        return {
          type: 'website-deploy',
          success: false,
          message: result.message,
          logs: result.logs ? `Deployment logs:\n${result.logs}` : 
            'No detailed error logs available. Try running with debug logging enabled.',
        };
      }
      
      // Use the original message for now
      const message = result.message;
      
      return {
        type: 'website-deploy',
        success: true,
        message: message,
        url: result.url,
        logs: result.logs,
      };
    } catch (error) {
      this.logger.error(`Error deploying website: ${error}`, {
        errorDetails: error instanceof Error ? { message: error.message, stack: error.stack } : 'Unknown error',
      });
      
      return {
        type: 'website-deploy',
        success: false,
        message: `Failed to deploy website: ${error instanceof Error ? error.message : String(error)}`,
        logs: error instanceof Error ? `Error details:\n${error.stack}` : 'No detailed error information available',
      };
    }
  }
  
  /**
   * Handle website deployment status command
   */
  private async handleWebsiteDeploymentStatus(): Promise<CommandResult> {
    if (!this.websiteContext) {
      return {
        type: 'website-deployment-status',
        success: false,
        isDeployed: false,
        message: 'Website context not available',
      };
    }
    
    if (!this.websiteContext.isReady()) {
      return {
        type: 'website-deployment-status',
        success: false,
        isDeployed: false,
        message: 'Website not initialized. Run "website-init" first.',
      };
    }
    
    try {
      const result = await this.websiteContext.getDeploymentStatus();
      
      // Create informative message for any deployment provider
      let message = result.message || '';
      
      if (result.isDeployed) {
        if (result.status === 'ready') {
          // For completed deployments
          message = `${message}

✅ The site is fully deployed and ready to view at ${result.url}

- Deployed: ${result.deployTime || 'unknown time'}`;
        } else if (result.status === 'error') {
          // For failed deployments
          message = `${message}

❌ The deployment failed with an error.

- Attempted: ${result.deployTime || 'unknown time'}
- State: ${result.status}
- Try running 'website-build' and then 'website-deploy' again`;
        }
      }
      
      return {
        type: 'website-deployment-status',
        success: result.success,
        isDeployed: result.isDeployed,
        provider: result.provider,
        url: result.url,
        message: message,
        // Additional properties not defined in type
        ...(result.status ? { statusDetails: result.status } : {}),
        ...(result.deployTime ? { deployTime: result.deployTime } : {}),
      };
    } catch (error) {
      this.logger.error(`Error checking deployment status: ${error}`);
      return {
        type: 'website-deployment-status',
        success: false,
        isDeployed: false,
        message: `Failed to check deployment status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
// Removed website-deployment-config command as it was redundant with website-config
}