import { beforeEach, describe, expect, test } from 'bun:test';

import type { IBrainProtocol } from '@/protocol/types';
import type { RendererRegistry } from '@/utils/registry/rendererRegistry';
import { WebsiteCommandHandler } from '@commands/handlers/websiteCommands';
import { MockMCPWebsiteContext } from '@test/__mocks__/contexts/website/MCPWebsiteContext';

describe('WebsiteCommandHandler Behavior', () => {
  let handler: WebsiteCommandHandler;
  let mockWebsiteContext: MockMCPWebsiteContext;
  
  beforeEach(() => {
    // Create a mock progress tracker for the CLI interface
    const mockProgressTracker = {
      withProgress: async (_title: string, _steps: string[], fn: (updateStep: (index: number) => void) => Promise<unknown>) => {
        // Call the function with a simple update function that does nothing
        return await fn(() => {});
      },
    };
    
    // Create a mock renderer registry that returns our progress tracker
    const mockRendererRegistry = {
      getProgressTracker: () => mockProgressTracker,
    } as unknown as RendererRegistry;
    
    // Create a fresh website context mock
    MockMCPWebsiteContext.resetInstance();
    mockWebsiteContext = MockMCPWebsiteContext.createFresh();
    
    // Enhance the mock with test-specific data
    mockWebsiteContext.generateLandingPage = async () => ({
      success: true,
      message: 'Generated',
      data: {
        name: 'Test Page',
        title: 'Test Title',
        tagline: 'Test Tagline',
      },
    });
    
    mockWebsiteContext.getConfig = async () => ({
      title: 'Test Site',
      description: 'Test Description',
      author: 'Test Author',
      baseUrl: 'https://test.com',
    });
    
    mockWebsiteContext.handleWebsiteBuild = async () => ({
      success: true, 
      message: 'Built successfully',
    });
    
    mockWebsiteContext.handleWebsitePromote = async () => ({
      success: true,
      message: 'Promoted successfully',
    });
    
    mockWebsiteContext.getWebsiteStatus = async () => ({
      status: 'running',
      message: 'Website is running',
      url: 'https://test.com',
    });
    
    mockWebsiteContext.getLandingPageData = async () => ({
      name: 'Test Page',
      title: 'Test Title',
      tagline: 'Test Tagline',
    });
    
    // Create a simple mock brain protocol that just returns our website context
    const mockBrainProtocol = {
      getContextManager: () => ({
        getWebsiteContext: () => mockWebsiteContext,
      }),
      getInterfaceType: () => 'cli',
      getConversationManager: () => ({
        getCurrentRoom: () => 'test-room',
      }),
    };
    
    // Create handler with our simplified mock and renderer registry
    // Cast to IBrainProtocol to satisfy the type system without adding all methods
    handler = WebsiteCommandHandler.createFresh(
      mockBrainProtocol as unknown as IBrainProtocol, 
      mockRendererRegistry,
    );
  });

  test('provides website commands', () => {
    const commands = handler.getCommands();
    const commandNames = commands.map(cmd => cmd.command);
    
    expect(commandNames).toContain('website-config');
    expect(commandNames).toContain('landing-page');
    expect(commandNames).toContain('website-build');
    expect(commandNames).toContain('website-promote');
    expect(commandNames).toContain('website-status');
  });

  test('shows website configuration', async () => {
    const result = await handler.execute('website-config', '');
    
    expect(result.type).toBe('website-config');
    if (result.type === 'website-config') {
      expect(result.config).toBeDefined();
      expect(result.config?.title).toBe('Test Site');
    }
  });

  test('generates landing page', async () => {
    const result = await handler.execute('landing-page', 'generate');
    
    expect(result.type).toBe('landing-page');
    if (result.type === 'landing-page') {
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Page');
    }
  });

  test('views landing page', async () => {
    const result = await handler.execute('landing-page', 'view');
    
    expect(result.type).toBe('landing-page');
    if (result.type === 'landing-page') {
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('Test Title');
    }
  });

  test('builds website', async () => {
    const result = await handler.execute('website-build', '');
    
    expect(result.type).toBe('website-build');
    if (result.type === 'website-build') {
      expect(result.success).toBe(true);
      expect(result.message).toContain('Website built successfully');
    }
  });

  test('promotes website to production', async () => {
    const result = await handler.execute('website-promote', '');
    
    expect(result.type).toBe('website-promote');
    if (result.type === 'website-promote') {
      expect(result.success).toBe(true);
      expect(result.message).toContain('Promoted successfully');
    }
  });

  test('checks website status', async () => {
    const result = await handler.execute('website-status', '');
    
    expect(result.type).toBe('website-status');
    if (result.type === 'website-status') {
      expect(result.success).toBe(true);
      expect(result.message).toContain('Website is running');
    }
  });
});