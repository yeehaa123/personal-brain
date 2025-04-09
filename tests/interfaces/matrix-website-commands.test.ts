import { describe, expect, test } from 'bun:test';

import { getMarkdownFormatter, getResponseFormatter, MatrixBlockBuilder } from '@/interfaces/matrix/formatters';
import type { WebsiteCommandResult } from '@commands/core/commandTypes';
import type { WebsiteConfig } from '@mcp/contexts/website/storage/websiteStorage';
import type { LandingPageData } from '@website/schemas';

describe('Matrix Website Command Formatters', () => {
  describe('Website Command Formatting', () => {
    test('should format website-help output', () => {
      const formatter = getResponseFormatter();
      const commands = [
        { command: 'website-init', description: 'Initialize website', usage: 'website-init' },
        { command: 'website-config', description: 'Configure website settings', usage: 'website-config [key=value]' },
        { command: 'landing-page', description: 'Manage landing page content', usage: 'landing-page [generate|view]' },
      ];
      
      const result: WebsiteCommandResult = {
        type: 'website-help',
        commands,
      };

      const formatted = formatter.formatWebsiteHelp(result);
      
      // Check for expected elements
      expect(formatted).toContain('Website Commands');
      expect(formatted).toContain('website-init');
      expect(formatted).toContain('website-config');
      expect(formatted).toContain('landing-page');
      expect(formatted).toContain('Initialize website');
      expect(formatted).toContain('Configure website settings');
    });

    test('should format website-init success output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-init',
        success: true,
        message: 'Website initialized successfully',
      };

      const formatted = formatter.formatWebsiteInit(result);
      
      expect(formatted).toContain('Website Initialization');
      expect(formatted).toContain('Website initialized successfully');
      expect(formatted).toContain('✅');
    });

    test('should format website-init failure output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-init',
        success: false,
        message: 'Failed to initialize website',
      };

      const formatted = formatter.formatWebsiteInit(result);
      
      expect(formatted).toContain('Website Initialization');
      expect(formatted).toContain('Failed to initialize website');
      expect(formatted).toContain('❌');
    });

    test('should format website-config display output', () => {
      const formatter = getResponseFormatter();
      const config: WebsiteConfig = {
        title: 'Personal Website',
        description: 'My personal website',
        author: 'Test Author',
        baseUrl: 'https://example.com',
        deploymentType: 'local',
        astroProjectPath: 'src/website',
      };
      
      const result: WebsiteCommandResult = {
        type: 'website-config',
        config,
        message: 'Current website configuration',
      };

      const formatted = formatter.formatWebsiteConfig(result);
      
      expect(formatted).toContain('Website Configuration');
      expect(formatted).toContain('title');
      expect(formatted).toContain('Personal Website');
      expect(formatted).toContain('description');
      expect(formatted).toContain('My personal website');
    });

    test('should format website-config update output', () => {
      const formatter = getResponseFormatter();
      const config: Partial<WebsiteConfig> = {
        title: 'Updated Website Title',
      };
      
      const result: WebsiteCommandResult = {
        type: 'website-config',
        success: true,
        config: config as unknown as WebsiteConfig,
        message: 'Configuration updated successfully',
      };

      const formatted = formatter.formatWebsiteConfig(result);
      
      expect(formatted).toContain('Website Configuration');
      expect(formatted).toContain('Configuration updated successfully');
      expect(formatted).toContain('title');
      expect(formatted).toContain('Updated Website Title');
      expect(formatted).toContain('✅');
    });

    test('should format landing-page generate output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'landing-page',
        success: true,
        message: 'Landing page generated successfully',
      };

      const formatted = formatter.formatLandingPage(result);
      
      expect(formatted).toContain('Landing Page');
      expect(formatted).toContain('Landing page generated successfully');
      expect(formatted).toContain('✅');
    });

    test('should format landing-page view output', () => {
      const formatter = getResponseFormatter();
      const landingPageData: LandingPageData = {
        name: 'John Doe',
        title: 'Software Developer',
        tagline: 'Building great software',
      };
      
      const result: WebsiteCommandResult = {
        type: 'landing-page',
        data: landingPageData,
      };

      const formatted = formatter.formatLandingPage(result);
      
      expect(formatted).toContain('Landing Page Content');
      expect(formatted).toContain('John Doe');
      expect(formatted).toContain('Software Developer');
      expect(formatted).toContain('Building great software');
    });

    test('should format website-preview output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-preview',
        success: true,
        url: 'http://localhost:4321',
        message: 'Preview server started',
      };

      const formatted = formatter.formatWebsitePreview(result);
      
      expect(formatted).toContain('Website Preview');
      expect(formatted).toContain('Preview server started');
      expect(formatted).toContain('http://localhost:4321');
      expect(formatted).toContain('✅');
      // It should include instructions to stop the preview
      expect(formatted).toContain('website-preview-stop');
    });

    test('should format website-preview-stop output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-preview-stop',
        success: true,
        message: 'Preview server stopped',
      };

      const formatted = formatter.formatWebsitePreviewStop(result);
      
      expect(formatted).toContain('Website Preview');
      expect(formatted).toContain('Preview server stopped');
      expect(formatted).toContain('✅');
    });

    test('should format website-build output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-build',
        success: true,
        message: 'Website built successfully',
      };

      const formatted = formatter.formatWebsiteBuild(result);
      
      expect(formatted).toContain('Website Build');
      expect(formatted).toContain('Website built successfully');
      expect(formatted).toContain('✅');
    });
  });

  // Test formatting in the BlockBuilder for structure validation
  describe('Website BlockBuilder Integration', () => {
    test('should build website preview blocks correctly', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: false });
      const markdownFormatter = getMarkdownFormatter();
      
      builder.addHeader('Website Preview');
      
      // Use available methods instead of addSuccess
      builder.addSection('✅ Preview server started successfully');
      builder.addSection('Website preview available at:');
      
      // Format a URL as code for clear visibility
      const url = markdownFormatter.formatCodeBlock('http://localhost:4321', 'text');
      
      // Use addSection instead of addRaw
      builder.addSection(url);
      
      builder.addSection('To stop the preview server, use:');
      const command = markdownFormatter.formatCodeBlock('website-preview-stop', 'shell');
      builder.addSection(command);
      
      const result = builder.build() as string;
      
      expect(result).toContain('<h3>Website Preview</h3>');
      expect(result).toContain('Preview server started successfully');
      expect(result).toContain('http://localhost:4321');
      expect(result).toContain('website-preview-stop');
    });
    
    test('should build website config blocks correctly', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: false });
      const config = {
        title: 'Personal Website',
        description: 'My personal website',
        baseUrl: 'https://example.com',
      };
      
      builder.addHeader('Website Configuration');
      
      // Add each config item as a section with proper formatting
      Object.entries(config).forEach(([key, value]) => {
        // Use strong text instead of subheader
        builder.addSection(`**${key}**:\n${value}`);
      });
      
      const result = builder.build() as string;
      
      expect(result).toContain('<h3>Website Configuration</h3>');
      expect(result).toContain('<strong>title</strong>');
      expect(result).toContain('Personal Website');
      expect(result).toContain('<strong>description</strong>');
      expect(result).toContain('My personal website');
    });
  });
});