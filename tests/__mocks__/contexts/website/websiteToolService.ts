/**
 * MockWebsiteToolService
 * 
 * Standard mock for WebsiteToolService that follows the Component Interface Standardization pattern
 */

import { mock } from 'bun:test';
import { z } from 'zod';

import type { ResourceDefinition } from '@/contexts/core/contextInterface';

/**
 * Mock implementation of WebsiteToolService
 */
export class MockWebsiteToolService {
  private static instance: MockWebsiteToolService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockWebsiteToolService {
    if (!MockWebsiteToolService.instance) {
      MockWebsiteToolService.instance = new MockWebsiteToolService();
    }
    return MockWebsiteToolService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockWebsiteToolService.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockWebsiteToolService {
    return new MockWebsiteToolService();
  }
  
  // Mock methods with default implementations
  public getTools = mock((_context: unknown) => {
    return [
      {
        protocol: 'website',
        path: 'generate_landing_page',
        name: 'generate_landing_page',
        description: 'Generates a landing page from profile data',
        handler: mock(() => Promise.resolve({ 
          success: true, 
          message: 'Landing page generated',
          data: { includedSections: { skills: true, projects: true, contact: true } },
        })),
      },
      {
        protocol: 'website',
        path: 'build_website',
        name: 'build_website',
        description: 'Builds the website using Astro and deploys to preview',
        handler: mock(() => Promise.resolve({ 
          success: true, 
          message: 'Website built',
          environment: 'preview',
          url: 'https://preview.example.com',
          path: '/path/to/build',
        })),
      },
      {
        protocol: 'website',
        path: 'promote_website',
        name: 'promote_website',
        description: 'Promotes the preview website to production',
        handler: mock(() => Promise.resolve({ 
          success: true, 
          message: 'Website promoted to production',
          url: 'https://example.com',
        })),
      },
      {
        protocol: 'website',
        path: 'get_website_status',
        name: 'get_website_status',
        description: 'Gets the status of the website environments',
        handler: mock(() => Promise.resolve({ 
          success: true, 
          message: 'Status retrieved',
          data: {
            environment: 'preview',
            buildStatus: 'built',
            fileCount: 10,
            serverStatus: 'running',
            domain: 'preview.example.com',
            accessStatus: 'accessible',
            url: 'https://preview.example.com',
          },
        })),
      },
    ] as ResourceDefinition[];
  });
  
  public getToolSchema = mock((tool: { name?: string }) => {
    switch (tool.name) {
    case 'generate_landing_page':
      return {
        includeSkills: z.boolean().optional().describe('Whether to include skills section'),
        includeProjects: z.boolean().optional().describe('Whether to include projects section'),
        includeContact: z.boolean().optional().describe('Whether to include contact section'),
      };
      
    case 'build_website':
      return {
        environment: z.enum(['preview', 'production']).optional()
          .describe('Environment to build for (default: preview)'),
        generateBeforeBuild: z.boolean().optional()
          .describe('Whether to generate landing page before building (default: true)'),
      };
      
    case 'promote_website':
      return {
        skipConfirmation: z.boolean().optional()
          .describe('Whether to skip confirmation prompt'),
      };
      
    case 'get_website_status':
      return {
        environment: z.enum(['preview', 'production']).optional()
          .describe('Environment to check status for (default: preview)'),
      };
      
    default:
      return {};
    }
  });
}