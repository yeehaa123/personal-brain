import type { WebsiteContext } from '@/contexts/website';
import type { IBrainProtocol } from '@/protocol/types';
import { BaseCommandHandler } from '@commands/core/baseCommandHandler';
import type { CommandInfo, CommandResult } from '@commands/core/commandTypes';
// Direct file access replaced with WebsiteContext delegation

/**
 * Command handler for website-related commands
 */
export class WebsiteCommandHandler extends BaseCommandHandler {
  private static instance: WebsiteCommandHandler | null = null;
  private websiteContext: WebsiteContext | null = null;
  
  /**
   * Helper method to get domain for environment (removed - now handled by WebsiteContext)
   */
  
  /**
   * Get singleton instance of WebsiteCommandHandler
   */
  public static getInstance(brainProtocol: IBrainProtocol): WebsiteCommandHandler {
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
  public static createFresh(brainProtocol: IBrainProtocol): WebsiteCommandHandler {
    return new WebsiteCommandHandler(brainProtocol);
  }
  
  /**
   * Constructor
   */
  constructor(brainProtocol: IBrainProtocol) {
    super(brainProtocol);
    // Initialize the website context from contextManager
    this.websiteContext = brainProtocol.getContextManager().getWebsiteContext();
  }
  
  /**
   * List of commands supported by this handler
   */
  private static readonly SUPPORTED_COMMANDS = [
    'website-config',
    'landing-page',
    'website-build',
    'website-promote',
    'website-status',
  ];
  
  // Directory paths now managed by WebsiteContext

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
        command: 'website-build',
        description: 'Build the website (always to preview environment)',
        usage: 'website-build',
      },
      {
        command: 'website-promote',
        description: 'Promote preview to production',
        usage: 'website-promote',
      },
      {
        command: 'website-status',
        description: 'Check status of website environments',
        usage: 'website-status [preview|production]',
        examples: ['website-status', 'website-status production'],
      },
    ];
  }
  
  /**
   * Process website commands
   */
  public async execute(command: string, args: string): Promise<CommandResult> {
    try {
      // If we don't have a website context, this is an error
      if (!this.websiteContext) {
        return {
          type: 'error',
          message: 'Website context not available. Try initializing the brain protocol first.',
        };
      }
      
      // Process the command
      switch (command) {
      case 'website-config':
        return this.handleWebsiteConfig(args);
      case 'landing-page':
        return this.handleLandingPage(args);
      case 'website-build':
        return this.handleWebsiteBuild();
      case 'website-promote':
        return this.handleWebsitePromote();
      case 'website-status':
        return this.handleWebsiteStatus(args);
      default:
        return {
          type: 'error',
          message: `Unknown website command: ${command}`,
        };
      }
    } catch (error) {
      this.logger.error(`Error processing website command ${command}: ${error}`);
      return {
        type: 'error',
        message: `Failed to process website command: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Website initialization - removed as it's no longer needed 
   * The bot-controlled approach with Caddy doesn't require initialization
   */
  
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
    
    // Initialize the context if it's not ready
    if (!this.websiteContext.isReady()) {
      try {
        await this.websiteContext.initialize();
      } catch (error) {
        this.logger.error('Failed to initialize website context', { error });
        return {
          type: 'website-config',
          success: false,
          message: 'Failed to initialize website context',
        };
      }
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
    
    // Initialize the context if it's not ready
    if (!this.websiteContext.isReady()) {
      try {
        await this.websiteContext.initialize();
      } catch (error) {
        this.logger.error('Failed to initialize website context', { error });
        return {
          type: 'landing-page',
          success: false,
          message: 'Failed to initialize website context',
        };
      }
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
  
  // Preview server methods removed - Caddy is always running in the new approach
  
  /**
   * Handle website build command - always builds to preview environment
   */
  private async handleWebsiteBuild(): Promise<CommandResult> {
    try {
      this.logger.info('Building website to preview environment');
      
      if (!this.websiteContext) {
        return {
          type: 'website-build',
          success: false,
          message: 'Website context not available',
        };
      }
      
      // Delegate to WebsiteContext implementation
      const result = await this.websiteContext.handleWebsiteBuild();
      
      return {
        type: 'website-build',
        success: result.success,
        message: result.message,
        url: result.url,
      };
    } catch (error) {
      this.logger.error(`Error in website build command: ${error}`);
      return {
        type: 'website-build',
        success: false,
        message: `Failed to build website: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website promote command
   * Copies the built files from preview to production
   */
  private async handleWebsitePromote(): Promise<CommandResult> {
    try {
      this.logger.info('Promoting website from preview to production');
      
      if (!this.websiteContext) {
        return {
          type: 'website-promote',
          success: false,
          message: 'Website context not available',
        };
      }
      
      // Delegate to WebsiteContext implementation
      const result = await this.websiteContext.handleWebsitePromote();
      
      return {
        type: 'website-promote',
        success: result.success,
        message: result.message,
        url: result.url,
      };
    } catch (error) {
      this.logger.error(`Error in website promote command: ${error}`);
      return {
        type: 'website-promote',
        success: false,
        message: `Failed to promote to production: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Handle website status command
   * Provides information about build status and accessibility
   */
  private async handleWebsiteStatus(args: string = ''): Promise<CommandResult> {
    try {
      // Parse environment from args
      const environment = args.trim().toLowerCase() === 'production' ? 'production' : 'preview';
      this.logger.info(`Checking status of ${environment} environment`);
      
      if (!this.websiteContext) {
        return {
          type: 'website-status',
          success: false,
          message: 'Website context not available',
        };
      }
      
      // Make sure the context is initialized
      if (!this.websiteContext.isReady()) {
        this.logger.info('Initializing website context before checking status');
        await this.websiteContext.initialize();
      }
      
      // Delegate to WebsiteContext implementation
      const result = await this.websiteContext.handleWebsiteStatus(environment);
      
      // Pass the data through directly
      const statusData = result.data;
      
      return {
        type: 'website-status',
        success: result.success,
        message: result.message,
        data: statusData,
      };
    } catch (error) {
      this.logger.error(`Error in website status command: ${error}`);
      return {
        type: 'website-status',
        success: false,
        message: `Failed to check ${args || 'preview'} status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  
// Removed website-deployment-config command as it was redundant with website-config
}