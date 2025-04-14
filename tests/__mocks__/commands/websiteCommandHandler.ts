/**
 * Mock WebsiteCommandHandler for testing
 */

import type { CommandInfo, CommandResult } from '@commands/core/commandTypes';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

export class MockWebsiteCommandHandler {
  static instance: MockWebsiteCommandHandler | null = null;
  private websiteContext: MockWebsiteContext;
  
  constructor() {
    // Get a reference to the MockWebsiteContext singleton
    this.websiteContext = MockWebsiteContext.getInstance();
  }
  
  static getInstance(): MockWebsiteCommandHandler {
    if (!MockWebsiteCommandHandler.instance) {
      MockWebsiteCommandHandler.instance = new MockWebsiteCommandHandler();
    }
    return MockWebsiteCommandHandler.instance;
  }
  
  static resetInstance(): void {
    MockWebsiteCommandHandler.instance = null;
  }
  
  static createFresh(): MockWebsiteCommandHandler {
    return new MockWebsiteCommandHandler();
  }
  
  canHandle(command: string): boolean {
    return [
      'website',
      'website-config',
      'landing-page',
      'website-build',
      'website-promote',
      'website-status',
    ].includes(command);
  }
  
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'website',
        description: 'Display website commands and help',
        usage: 'website',
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
  
  async execute(command: string, args: string): Promise<CommandResult> {
    // Use directly the websiteContext instance that was created in the constructor
    const websiteContext = this.websiteContext;
    
    switch (command) {
    case 'website':
      return {
        type: 'website-help',
        commands: this.getCommands(),
      };
        
    case 'website-config':
      if (!websiteContext.isReady()) {
        return {
          type: 'website-config',
          success: false,
          message: 'Website context not available',
        };
      }
        
      if (!args.trim()) {
        const config = await websiteContext.getConfig();
        return {
          type: 'website-config',
          success: true,
          config: config,
          message: 'Current website configuration',
        };
      }
        
      {
        // Parse key=value pairs from arguments
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
            type: 'website-config',
            success: false,
            message: 'Invalid configuration format. Use key="value" format.',
          };
        }
        
        await websiteContext.updateConfig(configUpdates);
        const updatedConfig = await websiteContext.getConfig();
      
        return {
          type: 'website-config',
          success: true,
          config: updatedConfig,
          message: 'Configuration updated successfully',
        };
      }
        
    case 'landing-page': {
      if (!websiteContext.isReady()) {
        return {
          type: 'landing-page',
          success: false,
          message: 'Website context not available',
        };
      }
        
      const action = args.trim().toLowerCase();
        
      if (action === 'generate') {
        const result = await websiteContext.generateLandingPage();
        return {
          type: 'landing-page',
          success: result.success,
          message: result.message,
          data: result.data,
        };
      } else if (action === 'view' || !action) {
        const astroService = await websiteContext.getAstroContentService();
        const landingPageData = await astroService.readLandingPageContent();
        return {
          type: 'landing-page',
          data: landingPageData || undefined,
        };
      }
        
      return {
        type: 'landing-page',
        success: false,
        message: 'Invalid action. Use "landing-page generate" or "landing-page view".',
      };
    }
        
    case 'website-build': {
      const result = await websiteContext.handleWebsiteBuild();
      return {
        type: 'website-build',
        success: result.success,
        message: result.message,
        url: result.url,
      };
    }
    
    case 'website-promote': {
      const result = await websiteContext.handleWebsitePromote();
      return {
        type: 'website-promote',
        success: result.success,
        message: result.message,
        url: result.url,
      };
    }
    
    case 'website-status': {
      const environment = args.trim().toLowerCase() === 'production' ? 'production' : 'preview';
      const result = await websiteContext.handleWebsiteStatus(environment);
      return {
        type: 'website-status',
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }
        
    default:
      return {
        type: 'error',
        message: `Unknown website command: ${command}`,
      };
    }
  }
}