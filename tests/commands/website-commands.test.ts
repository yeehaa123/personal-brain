import { beforeEach, describe, expect, test } from 'bun:test';

import { RendererRegistry } from '@/utils/registry/rendererRegistry';
import { WebsiteCommandHandler } from '@commands/handlers/websiteCommands';

describe('WebsiteCommandHandler Behavior', () => {
  let handler: WebsiteCommandHandler;
  
  beforeEach(() => {
    // Mock RendererRegistry - register a mock CLI renderer that implements IProgressTracker
    RendererRegistry.resetInstance();
    const mockCLIRenderer = {
      withProgress: async (_title: string, _steps: string[], fn: (update: () => void) => Promise<unknown>) => {
        // Call the progress function immediately
        const result = await fn(() => {});
        return result;
      },
    };
    RendererRegistry.getInstance().registerRenderer('cli', mockCLIRenderer);
    
    // Simple mock that simulates website context behavior
    const mockContext = {
      isReady: () => true,
      initialize: () => Promise.resolve(),
      getConfig: () => ({
        title: 'Test Site',
        description: 'Test Description',
        author: 'Test Author',
        baseUrl: 'https://test.com',
      }),
      generateLandingPage: () => Promise.resolve({
        success: true,
        message: 'Generated',
        data: {
          name: 'Test Page',
          title: 'Test Title',
          tagline: 'Test Tagline',
        },
      }),
      getLandingPageData: () => ({
        name: 'Test Page',
        title: 'Test Title',
        tagline: 'Test Tagline',
      }),
      handleWebsiteBuild: () => Promise.resolve({
        success: true,
        message: 'Built successfully',
      }),
      handleWebsitePromote: () => Promise.resolve({
        success: true,
        message: 'Promoted successfully',
      }),
      getWebsiteStatus: () => Promise.resolve({
        status: 'running',
        message: 'Website is running',
        url: 'https://test.com',
      }),
    };
    
    const mockBrainProtocol = {
      getContextManager: () => ({
        getWebsiteContext: () => mockContext,
      }),
      getInterfaceType: () => 'cli',
      getConversationManager: () => ({
        getCurrentRoom: () => 'test-room',
      }),
    };
    
    // Type assertion for mock brain protocol
    handler = WebsiteCommandHandler.createFresh(mockBrainProtocol as unknown as {
      getContextManager: () => { getWebsiteContext: () => typeof mockContext };
      getInterfaceType: () => string;
      getConversationManager: () => { getCurrentRoom: () => string };
    });
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