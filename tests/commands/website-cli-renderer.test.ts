import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { CLIRenderer } from '@commands/cli-renderer';
import type { CommandResult, WebsiteCommandResult } from '@commands/core/commandTypes';
import type { WebsiteConfig } from '@mcp/contexts/website/storage/websiteStorage';
import { createMockLogger, MockLogger } from '@test/__mocks__/core/logger';
import { createTrackers, mockCLIInterface, restoreCLIInterface } from '@test/__mocks__/utils/cliUtils';
import type { LandingPageData } from '@website/schemas';

describe('CLIRenderer - Website Commands', () => {
  let renderer: CLIRenderer;
  let trackers: ReturnType<typeof createTrackers>;
  let originalCLI: Record<string, unknown>;

  beforeEach(() => {
    // Mock the Logger class to prevent logging
    const mockLogger = createMockLogger();
    mock.module('@/utils/logger', () => ({
      Logger: {
        getInstance: () => mockLogger,
        resetInstance: () => MockLogger.resetInstance(),
        createFresh: () => createMockLogger(),
      },
      default: mockLogger,
    }));
    
    renderer = new CLIRenderer();

    // Set up trackers and mocks
    trackers = createTrackers();
    originalCLI = mockCLIInterface(trackers);
  });

  afterEach(() => {
    // Restore original functionality
    restoreCLIInterface(originalCLI);
  });

  describe('website command rendering', () => {
    test('should render website-help result', () => {
      const commands = [
        { command: 'website-init', description: 'Initialize website', usage: 'website-init' },
        { command: 'website-config', description: 'Configure website settings', usage: 'website-config [key=value]' },
        { command: 'landing-page', description: 'Manage landing page content', usage: 'landing-page [generate|view]' },
        { command: 'website-preview', description: 'Preview website locally', usage: 'website-preview' },
        { command: 'website-preview-stop', description: 'Stop the preview server', usage: 'website-preview-stop' },
      ];
      
      const result: WebsiteCommandResult = {
        type: 'website-help',
        commands,
      };

      renderer.render(result as CommandResult);

      expect(trackers.displayTitleCalls).toContain('Website Commands');
      expect(trackers.displayListCalls.length).toBe(1);
      expect(trackers.displayListCalls[0].items.length).toBe(commands.length);
    });

    // No longer need website-init tests as it's been removed

    test('should render website-config display result', () => {
      const config: WebsiteConfig = {
        title: 'Personal Website',
        description: 'My personal website',
        baseUrl: 'https://example.com',
        author: 'username',
        astroProjectPath: 'src/website',
      };
      
      const result: WebsiteCommandResult = {
        type: 'website-config',
        config,
        message: 'Current website configuration',
      };

      renderer.render(result as CommandResult);

      expect(trackers.displayTitleCalls).toContain('Website Configuration');
      expect(trackers.displayListCalls.length).toBe(1);
      expect(trackers.displayListCalls[0].items.length).toBe(Object.keys(config).length);
    });

    test('should render website-config update result', () => {
      const config: Partial<WebsiteConfig> = {
        title: 'Updated Website Title',
      };
      
      const result: WebsiteCommandResult = {
        type: 'website-config',
        success: true,
        config: config as WebsiteConfig,
        message: 'Configuration updated successfully',
      };

      renderer.render(result as CommandResult);

      expect(trackers.successCalls).toContain('Configuration updated successfully');
      expect(trackers.displayTitleCalls).toContain('Updated Configuration');
      expect(trackers.displayListCalls.length).toBe(1);
    });

    test('should render landing-page generate result', () => {
      const result: WebsiteCommandResult = {
        type: 'landing-page',
        success: true,
        message: 'Landing page generated successfully',
      };

      renderer.render(result as CommandResult);

      expect(trackers.successCalls).toContain('Landing page generated successfully');
    });

    test('should render landing-page view result', () => {
      const landingPageData: LandingPageData = {
        name: 'John Doe',
        title: 'Software Developer',
        tagline: 'Building great software',
      };
      
      const result: WebsiteCommandResult = {
        type: 'landing-page',
        data: landingPageData,
      };

      renderer.render(result as CommandResult);

      expect(trackers.displayTitleCalls).toContain('Landing Page Content');
      expect(trackers.displaySubtitleCalls).toContain('Name');
      expect(trackers.printCalls).toContain('John Doe');
      expect(trackers.displaySubtitleCalls).toContain('Tagline');
      expect(trackers.printCalls).toContain('Building great software');
    });

    test('should render website-promote result', () => {
      const result: WebsiteCommandResult = {
        type: 'website-promote',
        success: true,
        url: 'https://example.com',
        message: 'Preview successfully promoted to production',
      };

      renderer.render(result as CommandResult);

      expect(trackers.successCalls).toContain('Preview successfully promoted to production');
      // Should show the production URL
      expect(trackers.infoCalls).toContain('Production site available at:');
      expect(trackers.printCalls).toContain('https://example.com');
    });

    test('should render website-status result', () => {
      const result: WebsiteCommandResult = {
        type: 'website-status',
        success: true,
        message: 'preview website status: Built, Caddy: Running, Files: 42, Access: Accessible',
        data: {
          environment: 'preview',
          buildStatus: 'Built',
          fileCount: 42,
          caddyStatus: 'Running',
          domain: 'preview.example.com',
          accessStatus: 'Accessible',
          url: 'https://preview.example.com',
        },
      };

      renderer.render(result as CommandResult);

      expect(trackers.displayTitleCalls).toContain('Website Status');
      expect(trackers.successCalls).toContain('preview website status: Built, Caddy: Running, Files: 42, Access: Accessible');
    });

    test('should render website-build result', () => {
      const result: WebsiteCommandResult = {
        type: 'website-build',
        success: true,
        message: 'Website built successfully for preview',
        url: 'https://preview.example.com',
        output: 'Build logs here...',
      };

      renderer.render(result as CommandResult);

      expect(trackers.successCalls).toContain('Website built successfully for preview');
      expect(trackers.infoCalls).toContain('Website preview available at:');
      expect(trackers.printCalls).toContain('https://preview.example.com');
      expect(trackers.infoCalls).toContain('To promote to production:');
      expect(trackers.printCalls).toContain('website-promote');
    });
  });
});