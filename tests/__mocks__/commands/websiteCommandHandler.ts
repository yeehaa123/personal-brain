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
      'website-init',
      'website-config',
      'landing-page',
      'website-preview',
      'website-preview-stop',
      'website-build',
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
        command: 'website-init',
        description: 'Initialize website configuration',
        usage: 'website-init',
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
        
    case 'website-init':
      await websiteContext.initialize();
      return {
        type: 'website-init',
        success: true,
        message: 'Website initialized successfully',
      };
        
    case 'website-config':
      if (!websiteContext.isReady()) {
        return {
          type: 'website-config',
          success: false,
          message: 'Website not initialized. Run "website-init" first.',
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
          message: 'Website not initialized. Run "website-init" first.',
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
        
    case 'website-preview': {
      if (!websiteContext.isReady()) {
        return {
          type: 'website-preview',
          success: false,
          message: 'Website not initialized. Run "website-init" first.',
        };
      }
        
      if (websiteContext.isPreviewRunning()) {
        return {
          type: 'website-preview',
          success: false,
          message: 'Preview server is already running. Use "website-preview-stop" to stop it first.',
        };
      }
        
      const previewResult = await websiteContext.previewWebsite();
      return {
        type: 'website-preview',
        success: previewResult.success,
        url: previewResult.url,
        message: previewResult.message,
      };
    }
        
    case 'website-preview-stop': {
      if (!websiteContext.isReady()) {
        return {
          type: 'website-preview-stop',
          success: false,
          message: 'Website not initialized. Run "website-init" first.',
        };
      }
        
      if (!websiteContext.isPreviewRunning()) {
        return {
          type: 'website-preview-stop',
          success: false,
          message: 'No preview server is currently running.',
        };
      }
        
      const stopResult = await websiteContext.stopPreview();
      return {
        type: 'website-preview-stop',
        success: stopResult.success,
        message: stopResult.message,
      };
    }
        
    case 'website-build': {
      if (!websiteContext.isReady()) {
        return {
          type: 'website-build',
          success: false,
          message: 'Website not initialized. Run "website-init" first.',
        };
      }
        
      const buildResult = await websiteContext.buildWebsite();
      return {
        type: 'website-build',
        success: buildResult.success,
        message: buildResult.message,
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