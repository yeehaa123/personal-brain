/**
 * Mock WebsiteCommandHandler for testing
 */

import type { LandingPageData } from '@/contexts/website/websiteStorage';
import type { CommandInfo, CommandResult } from '@commands/core/commandTypes';
import { MockMCPWebsiteContext } from '@test/__mocks__/contexts/MCPWebsiteContext';

export class MockWebsiteCommandHandler {
  static instance: MockWebsiteCommandHandler | null = null;
  private websiteContext: MockMCPWebsiteContext;
  
  constructor() {
    // Get a reference to the MockWebsiteContext singleton
    this.websiteContext = MockMCPWebsiteContext.getInstance();
    
    // Make sure the mock methods are properly bound
    this.websiteContext.handleWebsiteBuild = this.websiteContext.handleWebsiteBuild.bind(this.websiteContext);
    this.websiteContext.handleWebsitePromote = this.websiteContext.handleWebsitePromote.bind(this.websiteContext);
    this.websiteContext.getWebsiteStatus = this.websiteContext.getWebsiteStatus.bind(this.websiteContext);
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
        
        // updateConfig functionality was removed
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
        
        // Type guard to safely access result properties
        // We need to use any here to bypass strict type checking in this test mock
         
        interface LandingPageResult {
          success?: boolean;
          message?: string;
          data?: LandingPageData;
        }
        
        const typedResult = result as LandingPageResult;
        
        return {
          type: 'landing-page',
          success: typedResult?.success,
          message: typedResult?.message || 'Generated landing page',
          data: typedResult?.data,
        };
      } else if (action === 'view' || !action) {
        const astroService = await websiteContext.getAstroContentService();
        const landingPageData = await astroService.readLandingPageContent();
        return {
          type: 'landing-page',
          data: landingPageData as LandingPageData,
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
      // We simply pass nothing to the mock handler, which will use the default 'preview' environment
      const result = await websiteContext.getWebsiteStatus();
      return {
        type: 'website-status',
        success: result.status !== 'error',
        message: result.message,
        data: {
          environment: 'preview',
          buildStatus: result.status,
          fileCount: result.fileCount || 0,
          serverStatus: result.status,
          domain: 'localhost',
          accessStatus: result.message,
          url: result.url || '',
        },
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