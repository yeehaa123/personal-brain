import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CommandHandler } from '@commands/core/commandHandler';
import type { WebsiteCommandResult } from '@commands/core/commandTypes';
import { WebsiteCommandHandler } from '@commands/handlers/websiteCommands';
import type { BrainProtocol } from '@mcp/protocol/brainProtocol';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';
import { clearMockEnv, setMockEnv } from '@test/helpers/envUtils';

// Create a mock BrainProtocol that returns our mock WebsiteContext
class TestBrainProtocol {
  private websiteContext: MockWebsiteContext;

  constructor() {
    this.websiteContext = MockWebsiteContext.createFresh();
  }

  getWebsiteContext(): MockWebsiteContext {
    return this.websiteContext;
  }
}

describe('WebsiteCommandHandler', () => {
  let commandHandler: CommandHandler;
  let websiteCommandHandler: WebsiteCommandHandler;
  let mockBrainProtocol: TestBrainProtocol;
  let mockWebsiteContext: MockWebsiteContext;

  beforeAll(() => {
    setMockEnv();
  });

  afterAll(() => {
    clearMockEnv();
  });

  beforeEach(() => {
    // Reset all instances
    CommandHandler.resetInstance();
    WebsiteCommandHandler.resetInstance();
    MockWebsiteContext.resetInstance();

    // Create fresh test instances
    mockBrainProtocol = new TestBrainProtocol();
    mockWebsiteContext = mockBrainProtocol.getWebsiteContext();

    // Set initial state - not initialized, no preview running
    mockWebsiteContext.setMockInitialized(false);
    mockWebsiteContext.setMockPreviewRunning(false);

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
    expect(commandNames).toContain('website');
    expect(commandNames).toContain('website-init');
    expect(commandNames).toContain('website-config');
    expect(commandNames).toContain('landing-page');
    expect(commandNames).toContain('website-preview');
    expect(commandNames).toContain('website-preview-stop');
    expect(commandNames).toContain('website-build');
  });

  test('should handle website help command', async () => {
    const result = await commandHandler.processCommand('website', '');

    expect(result.type).toBe('website-help');
    const websiteHelpResult = result as Extract<WebsiteCommandResult, { type: 'website-help' }>;
    expect(Array.isArray(websiteHelpResult.commands)).toBe(true);

    const commands = websiteHelpResult.commands;
    expect(commands.length).toBeGreaterThan(0);

    // Verify that each command has the required properties
    commands.forEach((cmd) => {
      expect(cmd.command).toBeDefined();
      expect(cmd.description).toBeDefined();
      expect(cmd.usage).toBeDefined();
    });
  });

  test('should handle website init command', async () => {
    const result = await commandHandler.processCommand('website-init', '');

    expect(result.type).toBe('website-init');
    const initResult = result as Extract<WebsiteCommandResult, { type: 'website-init' }>;
    expect(initResult.success).toBe(true);
    expect(initResult.message).toBe('Website initialized successfully');

    // Verify that the website context is marked as initialized
    expect(mockWebsiteContext.isReady()).toBe(true);
  });

  test('should handle website config command with no args', async () => {
    // First initialize the website
    mockWebsiteContext.setMockInitialized(true);

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
    // First initialize the website
    mockWebsiteContext.setMockInitialized(true);

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

  test('should reject website config command when not initialized', async () => {
    // Make sure website is not initialized
    mockWebsiteContext.setMockInitialized(false);

    // Try to get config without initializing
    const result = await commandHandler.processCommand('website-config', '');

    expect(result.type).toBe('website-config');
    const configResult = result as Extract<WebsiteCommandResult, { type: 'website-config' }>;
    expect(configResult.success).toBe(false);
    expect(configResult.message).toContain('not initialized');
  });

  test('should handle landing-page generate command', async () => {
    // First initialize the website
    mockWebsiteContext.setMockInitialized(true);

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
    // First initialize the website
    mockWebsiteContext.setMockInitialized(true);

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

  test('should reject landing-page commands when not initialized', async () => {
    // Make sure website is not initialized
    mockWebsiteContext.setMockInitialized(false);

    // Try to generate landing page without initializing
    const result = await commandHandler.processCommand('landing-page', 'generate');

    expect(result.type).toBe('landing-page');
    const landingPageResult = result as Extract<WebsiteCommandResult, { type: 'landing-page' }>;
    expect(landingPageResult.success).toBe(false);
    expect(landingPageResult.message).toContain('not initialized');
  });

  test('should handle website-preview command with PM2', async () => {
    // First initialize the website
    mockWebsiteContext.setMockInitialized(true);

    // Then start preview with PM2
    const result = await commandHandler.processCommand('website-preview', '');

    expect(result.type).toBe('website-preview');
    const previewResult = result as Extract<WebsiteCommandResult, { type: 'website-preview' }>;
    expect(previewResult.success).toBe(true);
    expect(previewResult.url).toBe('http://localhost:4321');
    expect(previewResult.message).toBe('Website preview started with PM2');

    // Verify that preview is marked as running in the handler and context
    expect(mockWebsiteContext.isPreviewRunning()).toBe(true);
  });

  test('should reject second website-preview when already running', async () => {
    // First initialize the website and set preview as running
    mockWebsiteContext.setMockInitialized(true);
    mockWebsiteContext.setMockPreviewRunning(true);

    // Try to start preview again
    const result = await commandHandler.processCommand('website-preview', '');

    expect(result.type).toBe('website-preview');
    const previewResult = result as Extract<WebsiteCommandResult, { type: 'website-preview' }>;
    expect(previewResult.success).toBe(false);
    expect(previewResult.message).toContain('already running');
  });

  test('should handle website-preview-stop command with PM2', async () => {
    // First initialize the website and set preview as running
    mockWebsiteContext.setMockInitialized(true);

    // First start the preview to set internal state in the handler
    await commandHandler.processCommand('website-preview', '');

    // Verify preview is running
    expect(mockWebsiteContext.isPreviewRunning()).toBe(true);

    // Then stop preview with PM2
    const result = await commandHandler.processCommand('website-preview-stop', '');

    expect(result.type).toBe('website-preview-stop');
    const stopResult = result as Extract<WebsiteCommandResult, { type: 'website-preview-stop' }>;
    expect(stopResult.success).toBe(true);
    expect(stopResult.message).toBe('Website preview server stopped successfully');

    // Verify that preview is marked as stopped
    expect(mockWebsiteContext.isPreviewRunning()).toBe(false);
  });

  test('should reject website-preview-stop when no preview is running', async () => {
    // First initialize the website but no preview running
    mockWebsiteContext.setMockInitialized(true);
    mockWebsiteContext.setMockPreviewRunning(false);

    // Try to stop preview when none is running
    const result = await commandHandler.processCommand('website-preview-stop', '');

    expect(result.type).toBe('website-preview-stop');
    const stopResult = result as Extract<WebsiteCommandResult, { type: 'website-preview-stop' }>;
    expect(stopResult.success).toBe(false);
    expect(stopResult.message).toContain('No preview server is currently running');
  });

  test('should handle website-build command', async () => {
    // First initialize the website
    mockWebsiteContext.setMockInitialized(true);

    // Then build website
    const result = await commandHandler.processCommand('website-build', '');

    expect(result.type).toBe('website-build');
    const buildResult = result as Extract<WebsiteCommandResult, { type: 'website-build' }>;
    expect(buildResult.success).toBe(true);
  });

  test('should reject website-build when not initialized', async () => {
    // Make sure website is not initialized
    mockWebsiteContext.setMockInitialized(false);

    // Try to build website without initializing
    const result = await commandHandler.processCommand('website-build', '');

    expect(result.type).toBe('website-build');
    const buildResult = result as Extract<WebsiteCommandResult, { type: 'website-build' }>;
    expect(buildResult.success).toBe(false);
    expect(buildResult.message).toContain('not initialized');
  });
});
