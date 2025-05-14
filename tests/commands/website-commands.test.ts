import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import type { BrainProtocol } from '@/protocol/brainProtocol';
import { RendererRegistry } from '@/utils/registry/rendererRegistry';
import { CommandHandler } from '@commands/core/commandHandler';
import type { WebsiteCommandResult } from '@commands/core/commandTypes';
import { WebsiteCommandHandler } from '@commands/handlers/websiteCommands';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

// Create a mock BrainProtocol that returns our mock WebsiteContext
class TestBrainProtocol {
  private websiteContext: MockWebsiteContext;

  constructor() {
    this.websiteContext = MockWebsiteContext.createFresh();
  }

  // The new method that follows the refactored pattern
  getContextManager() {
    return {
      getWebsiteContext: () => this.websiteContext,
      // Added for renderer registry tests
      getRenderer: () => null,
    };
  }

  // Keep old method for backward compatibility
  getWebsiteContext(): MockWebsiteContext {
    return this.websiteContext;
  }
  
  // Added for renderer registry tests
  getInterfaceType() {
    return 'cli';
  }
  
  // Added for Matrix-specific tests
  getConversationManager() {
    return {
      getCurrentRoom: () => null,
    };
  }
}

describe('WebsiteCommandHandler', () => {
  let commandHandler: CommandHandler;
  let websiteCommandHandler: WebsiteCommandHandler;
  let mockBrainProtocol: TestBrainProtocol;
  let mockWebsiteContext: MockWebsiteContext;


  beforeEach(() => {
    // Reset all instances
    CommandHandler.resetInstance();
    WebsiteCommandHandler.resetInstance();
    MockWebsiteContext.resetInstance();
    RendererRegistry.resetInstance();

    // Create fresh test instances
    mockBrainProtocol = new TestBrainProtocol();
    mockWebsiteContext = mockBrainProtocol.getWebsiteContext();

    // Create a mock progress tracker
    const mockProgressTracker = {
      withProgress: async <T>(
        _title: string,
        steps: string[],
        task: (updateStep: (stepIndex: number) => void) => Promise<T>,
        _roomId?: string,
      ): Promise<T> => {
        // Simple implementation that just runs the task without tracking
        return task((stepIndex) => {
          // No-op update step function
          console.log(`Mock progress update: step ${stepIndex + 1}/${steps.length}`);
        });
      },
    };

    // Create a mock renderer registry that returns our mock progress tracker
    const mockRegistry = {
      getProgressTracker: () => mockProgressTracker,
    };

    // Mock the static getInstance method to return our mock registry
    spyOn(RendererRegistry, 'getInstance').mockImplementation(() => mockRegistry as unknown as RendererRegistry);

    // Create the command handler with our test BrainProtocol
    commandHandler = CommandHandler.createFresh(mockBrainProtocol as unknown as BrainProtocol);

    // Create the real website command handler (what we're testing)
    websiteCommandHandler = WebsiteCommandHandler.createFresh(mockBrainProtocol as unknown as BrainProtocol);

    // Register the handler with the command handler
    commandHandler.registerHandler(websiteCommandHandler);
  });

  test('should register website commands', () => {
    const commands = commandHandler.getCommands();
    const commandNames = commands.map((cmd) => cmd.command);

    // Check if website commands are registered
    expect(commandNames).toContain('website-config');
    expect(commandNames).toContain('landing-page');
    expect(commandNames).toContain('website-build');
    expect(commandNames).toContain('website-promote');
    expect(commandNames).toContain('website-status');
  });

  // });

  test('should handle website config command with no args', async () => {
    // Then get the config
    const result = await commandHandler.processCommand('website-config', '');

    expect(result.type).toBe('website-config');
    const configResult = result as Extract<WebsiteCommandResult, { type: 'website-config' }>;
    expect(configResult.config).toBeDefined();

    const config = configResult.config;
    expect(config?.title).toBeDefined();
    expect(config?.description).toBeDefined();
    expect(config?.author).toBeDefined();
    expect(config?.baseUrl).toBeDefined();
  });

  // test for updating website config removed since updateConfig functionality has been removed

  test('should handle landing-page generate command', async () => {
    // Use a type assertion for the mock function
    // This tells TypeScript to treat our mock as having the correct signature
    mockWebsiteContext.generateLandingPage = mock(function mockLandingPageGenerator(options?: Record<string, unknown>) {
      // Simulate progress updates
      if (options && 'onProgress' in options && typeof options['onProgress'] === 'function') {
        for (let i = 0; i < 11; i++) {
          (options['onProgress'] as (step: string, index: number) => void)(`Step ${i+1}`, i);
        }
      }
      
      // Return success with mock data that matches the expected format
      return Promise.resolve({
        success: true,
        message: 'Landing page generated successfully',
        data: {
          name: 'Mock Landing Page',
          title: 'Mock Title',
          tagline: 'Mock Tagline',
          description: 'Mock description',
          // The keys below are required to satisfy the LandingPageData type
          services: {
            title: 'Services',
            items: [{ title: 'Service 1', description: 'Description 1' }],
            introduction: 'Our services',
          },
          hero: {
            headline: 'Headline',
            subheading: 'Subheading',
            ctaText: 'Click here',
          },
          problemStatement: {
            title: 'Problems We Solve',
            problems: ['Problem 1'],
          },
          sections: {},
          sectionOrder: ['hero', 'services'],
        },
      });
    }) as unknown as typeof mockWebsiteContext.generateLandingPage;
    
    // Then generate landing page
    const result = await commandHandler.processCommand('landing-page', 'generate');

    // Log the result for debugging if it fails
    if (result.type !== 'landing-page') {
      console.error('Landing page generate command failed:', result);
    }

    expect(result.type).toBe('landing-page');
    const landingPageResult = result as Extract<WebsiteCommandResult, { type: 'landing-page' }>;
    expect(landingPageResult.success).toBe(true);
    expect(landingPageResult.data).toBeDefined();

    const data = landingPageResult.data;
    expect(data?.name).toBeDefined();
    expect(data?.title).toBeDefined();
    expect(data?.tagline).toBeDefined();
  });

  test('should handle landing-page view command', async () => {
    // Then view landing page
    const result = await commandHandler.processCommand('landing-page', 'view');

    expect(result.type).toBe('landing-page');
    const landingPageResult = result as Extract<WebsiteCommandResult, { type: 'landing-page' }>;
    expect(landingPageResult.data).toBeDefined();

    const data = landingPageResult.data;
    expect(data?.name).toBeDefined();
    expect(data?.title).toBeDefined();
    expect(data?.tagline).toBeDefined();
  });

  // PM2 and preview tests are no longer needed with Caddy approach

  test('should handle website-build command (always to preview)', async () => {
    // Setup mock for the new function
    mockWebsiteContext.handleWebsiteBuild = mock(() => Promise.resolve({
      success: true,
      message: 'Website built successfully',
      path: '/dist/preview',
      url: 'https://preview.example.com',
    }));

    // Build website
    const result = await commandHandler.processCommand('website-build', '');

    expect(result.type).toBe('website-build');
    const buildResult = result as Extract<WebsiteCommandResult, { type: 'website-build' }>;
    expect(buildResult.success).toBe(true);
    expect(buildResult.message).toContain('Run "website-status"');
    expect(mockWebsiteContext.handleWebsiteBuild).toHaveBeenCalled();
  });

  test('should handle website-promote command', async () => {
    // Setup mock for the new function
    mockWebsiteContext.handleWebsitePromote = mock(() => Promise.resolve({
      success: true,
      message: 'Preview successfully promoted to production',
      url: 'https://example.com',
    }));

    // Promote preview to production
    const result = await commandHandler.processCommand('website-promote', '');

    expect(result.type).toBe('website-promote');
    const promoteResult = result as Extract<WebsiteCommandResult, { type: 'website-promote' }>;
    expect(promoteResult.success).toBe(true);
    expect(promoteResult.message).toContain('production');
    expect(mockWebsiteContext.handleWebsitePromote).toHaveBeenCalled();
  });

  test('should handle website-status command', async () => {
    // Setup mock for the new function
    mockWebsiteContext.handleWebsiteStatus = mock(() => Promise.resolve({
      success: true,
      message: 'preview website status: Built, Caddy: Running, Files: 42, Access: Accessible',
      data: {
        environment: 'preview',
        buildStatus: 'Built' as const,
        fileCount: 42,
        serverStatus: 'Running' as const,
        domain: 'preview.example.com',
        accessStatus: 'Accessible',
        url: 'https://preview.example.com',
      },
    }));

    // Check status
    const result = await commandHandler.processCommand('website-status', '');

    expect(result.type).toBe('website-status');
    const statusResult = result as Extract<WebsiteCommandResult, { type: 'website-status' }>;
    expect(statusResult.success).toBe(true);
    expect(statusResult.message).toContain('preview');
    expect(mockWebsiteContext.handleWebsiteStatus).toHaveBeenCalled();
  });
});
