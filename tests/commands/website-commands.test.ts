import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { BrainProtocol } from '@/protocol/brainProtocol';
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
    };
  }

  // Keep old method for backward compatibility
  getWebsiteContext(): MockWebsiteContext {
    return this.websiteContext;
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

    // Create fresh test instances
    mockBrainProtocol = new TestBrainProtocol();
    mockWebsiteContext = mockBrainProtocol.getWebsiteContext();

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

  test('should handle website config command with updates', async () => {
    // Setup mock to return the updated config
    mockWebsiteContext.updateConfig = mock((updates) => Promise.resolve({
      title: updates.title as string || 'Personal Brain',
      description: 'Mock Description',
      author: updates.author as string || 'Anonymous',
      baseUrl: 'http://localhost:4321',
      astroProjectPath: 'src/website',
      deployment: {
        type: 'local-dev',
        previewPort: 4321,
        productionPort: 4322,
      },
    }));

    mockWebsiteContext.getConfig = mock(() => Promise.resolve({
      title: 'New Title',
      description: 'Mock Description',
      author: 'New Author',
      baseUrl: 'http://localhost:4321',
      astroProjectPath: 'src/website',
      deployment: {
        type: 'local-dev',
        previewPort: 4321,
        productionPort: 4322,
      },
    }));

    // Then update the config
    const result = await commandHandler.processCommand('website-config', 'title="New Title" author="New Author"');

    expect(result.type).toBe('website-config');
    const configResult = result as Extract<WebsiteCommandResult, { type: 'website-config' }>;
    expect(configResult.success).toBe(true);
    expect(configResult.config).toBeDefined();

    const config = configResult.config;
    expect(config?.title).toBe('New Title');
    expect(config?.author).toBe('New Author');
  });

  test('should handle landing-page generate command', async () => {
    // Then generate landing page
    const result = await commandHandler.processCommand('landing-page', 'generate');

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
      message: 'Website built successfully for preview',
      path: '/dist/preview',
      url: 'https://preview.example.com',
    }));

    // Build website
    const result = await commandHandler.processCommand('website-build', '');

    expect(result.type).toBe('website-build');
    const buildResult = result as Extract<WebsiteCommandResult, { type: 'website-build' }>;
    expect(buildResult.success).toBe(true);
    expect(buildResult.message).toContain('preview');
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
