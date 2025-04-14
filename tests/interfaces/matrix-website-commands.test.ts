import { describe, expect, test } from 'bun:test';

import { getMarkdownFormatter, getResponseFormatter, MatrixBlockBuilder } from '@/interfaces/matrix/formatters';
import type { 
  WebsiteBuildResult, 
  WebsitePromoteResult, 
  WebsiteStatusResult, 
} from '@/interfaces/matrix/formatters/types';
import type { WebsiteCommandResult } from '@commands/core/commandTypes';
import type { WebsiteConfig } from '@mcp/contexts/website/storage/websiteStorage';
import type { LandingPageData } from '@website/schemas';

describe('Matrix Website Command Formatters', () => {
  describe('Website Command Formatting', () => {
    test('should format website-help output', () => {
      const formatter = getResponseFormatter();
      const commands = [
        { command: 'website-build', description: 'Build website to preview', usage: 'website-build' },
        { command: 'website-promote', description: 'Promote preview to production', usage: 'website-promote' },
        { command: 'website-status', description: 'Check website status', usage: 'website-status [preview|production]' },
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
      expect(formatted).toContain('website-build');
      expect(formatted).toContain('website-promote');
      expect(formatted).toContain('website-status');
      expect(formatted).toContain('website-config');
      expect(formatted).toContain('landing-page');
      expect(formatted).toContain('Build website to preview');
      expect(formatted).toContain('Configure website settings');
    });

    test('should format website-promote success output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-promote',
        success: true,
        message: 'Preview successfully promoted to production',
        url: 'https://example.com',
      };

      const formatted = formatter.formatWebsitePromote(result as WebsitePromoteResult);
      
      expect(formatted).toContain('Website Promotion');
      expect(formatted).toContain('Preview successfully promoted to production');
      expect(formatted).toContain('https://example.com');
      expect(formatted).toContain('✅');
    });

    test('should format website-status output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-status',
        success: true,
        message: 'Website status check completed',
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

      const formatted = formatter.formatWebsiteStatus(result as WebsiteStatusResult);
      
      expect(formatted).toContain('Website Status');
      expect(formatted).toContain('Website status check completed');
      expect(formatted).toContain('preview');
      expect(formatted).toContain('Built');
      expect(formatted).toContain('Running');
      expect(formatted).toContain('preview.example.com');
      expect(formatted).toContain('✅');
    });

    test('should format website-config display output', () => {
      const formatter = getResponseFormatter();
      const config: WebsiteConfig = {
        title: 'Personal Website',
        description: 'My personal website',
        author: 'Test Author',
        baseUrl: 'https://example.com',
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


    test('should format website-build output', () => {
      const formatter = getResponseFormatter();
      const result: WebsiteCommandResult = {
        type: 'website-build',
        success: true,
        message: 'Website built successfully for preview',
        url: 'https://preview.example.com',
        output: 'Build output details...',
      };

      const formatted = formatter.formatWebsiteBuild(result as WebsiteBuildResult);
      
      expect(formatted).toContain('Website Build');
      expect(formatted).toContain('Website built successfully for preview');
      expect(formatted).toContain('https://preview.example.com');
      expect(formatted).toContain('✅');
      // Should include promotion instructions
      expect(formatted).toContain('website-promote');
    });
  });

  // Test formatting in the BlockBuilder for structure validation
  describe('Website BlockBuilder Integration', () => {
    test('should build website build blocks correctly', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: false });
      const markdownFormatter = getMarkdownFormatter();
      
      builder.addHeader('Website Build');
      
      // Use available methods instead of addSuccess
      builder.addSection('✅ Website built successfully for preview');
      builder.addSection('Preview available at:');
      
      // Format a URL as code for clear visibility
      const url = markdownFormatter.formatCodeBlock('https://preview.example.com', 'text');
      
      // Use addSection instead of addRaw
      builder.addSection(url);
      
      builder.addSection('To promote to production, use:');
      const command = markdownFormatter.formatCodeBlock('website-promote', 'shell');
      builder.addSection(command);
      
      const result = builder.build() as string;
      
      expect(result).toContain('<h3>Website Build</h3>');
      expect(result).toContain('Website built successfully for preview');
      expect(result).toContain('https://preview.example.com');
      expect(result).toContain('website-promote');
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