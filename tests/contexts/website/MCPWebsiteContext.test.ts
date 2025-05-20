/**
 * Behavioral tests for MCPWebsiteContext
 * 
 * These tests focus purely on observable behavior without
 * getting into implementation details or mock internals.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, mock, test } from 'bun:test';


import type { FormatterInterface } from '@/contexts/formatterInterface';
import type { WebsiteData } from '@/contexts/website/formatters';
import { MCPWebsiteContext } from '@/contexts/website/MCPWebsiteContext';
import type { MCPWebsiteContextDependencies } from '@/contexts/website/MCPWebsiteContext';
// Use standardized mocks from the __mocks__ directory
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/website/adapters/websiteStorageAdapter';
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockWebsiteDeploymentManager } from '@test/__mocks__/contexts/website/services/deployment/deploymentManager';
import { MockLandingPageGenerationService } from '@test/__mocks__/contexts/website/services/landingPageGenerationService';
import { MockWebsiteIdentityService } from '@test/__mocks__/contexts/website/services/websiteIdentityService';
import { MockLogger } from '@test/__mocks__/core/logger';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';
import { createTestLandingPageData } from '@test/helpers/websiteTestHelpers';

describe('Website Context Behavior', () => {
  let context: MCPWebsiteContext;
  let mockDependencies: MCPWebsiteContextDependencies;

  beforeEach(() => {
    // Reset all singletons to ensure clean test state
    MCPWebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
    MockAstroContentService.resetInstance();
    MockLandingPageGenerationService.resetInstance();
    MockWebsiteDeploymentManager.resetInstance();
    MockWebsiteIdentityService.resetInstance();
    MockContextMediator.resetInstance();
    
    // Create mocked dependencies to prevent real API calls
    // Since we don't have a formatter mock, create a simple one
    const mockFormatter = {
      format: mock((data: WebsiteData) => `Formatted: ${JSON.stringify(data)}`),
    };
    
    // Use our standardized mocks
    mockDependencies = {
      logger: MockLogger.createFresh(),
      storage: MockWebsiteStorageAdapter.createFresh(),
      formatter: mockFormatter as FormatterInterface<WebsiteData, string>,
      astroContentService: MockAstroContentService.createFresh(),
      landingPageGenerationService: MockLandingPageGenerationService.createFresh(),
      mediator: MockContextMediator.createFresh(),
      deploymentManager: MockWebsiteDeploymentManager.createFresh(),
      identityService: MockWebsiteIdentityService.createFresh(),
    };
    
    context = MCPWebsiteContext.createFresh({}, mockDependencies);
  });

  describe('Context Management', () => {
    test('initializes successfully', async () => {
      expect(context.isReady()).toBe(false);
      
      const initialized = await context.initialize();
      
      expect(initialized).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('provides correct identity', () => {
      expect(context.getContextName()).toBe('WebsiteBrain');
      expect(context.getContextVersion()).toBe('1.0.0');
    });

    test('provides status information', async () => {
      await context.initialize();
      
      const status = context.getStatus();
      
      expect(status.name).toBe('WebsiteBrain');
      expect(status.version).toBe('1.0.0');
      expect(status.ready).toBe(true);
    });
  });

  describe('Landing Page Operations', () => {
    test('handles landing page generation request', async () => {
      await context.initialize();
      
      const result = await context.generateLandingPage();
      
      // We just care that it returns a result with expected shape
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      
      if (result.success) {
        expect(result).toHaveProperty('data');
      }
    });

    test('handles landing page editing request', async () => {
      await context.initialize();
      
      // Set up the mock storage to return existing data for editing
      const mockStorage = mockDependencies.storage as MockWebsiteStorageAdapter;
      const testData = createTestLandingPageData({
        title: 'Existing Page',
        name: 'Test',
        description: 'Existing Description',
        tagline: 'Existing Tagline',
        sectionOrder: ['hero'],
        hero: { 
          headline: 'Existing Headline', 
          subheading: 'Existing Sub',
          ctaText: 'Learn More',
          ctaLink: '/about',
        },
      });
      mockStorage.setLandingPageData(testData);
      
      const result = await context.editLandingPage();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    test('retrieves landing page data', async () => {
      await context.initialize();
      
      const data = await context.getLandingPageData();
      
      // Either null or a landing page data object
      expect([null, expect.objectContaining({
        title: expect.any(String),
        name: expect.any(String),
      })]).toContainEqual(data);
    });
  });

  describe('Website Deployment', () => {
    test('handles build request', async () => {
      await context.initialize();
      
      const result = await context.handleWebsiteBuild();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      
      if (result.success) {
        expect(result).toHaveProperty('path');
      }
    });

    test('handles promotion request', async () => {
      await context.initialize();
      
      const result = await context.handleWebsitePromote();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      
      if (result.success) {
        expect(result).toHaveProperty('url');
      }
    });

    test('provides website status', async () => {
      await context.initialize();
      
      const status = await context.getWebsiteStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('message');
    });
  });

  describe('MCP Integration', () => {
    test('registers with MCP server', async () => {
      await context.initialize();
      
      const mockServer = {
        tool: () => {},
        resource: () => {},
      };
      
      const registered = context.registerOnServer(mockServer as unknown as McpServer);
      
      expect(registered).toBe(true);
    });

    test('provides capabilities', async () => {
      await context.initialize();
      
      const capabilities = context.getCapabilities();
      
      expect(capabilities).toHaveProperty('resources');
      expect(capabilities).toHaveProperty('tools');
      expect(capabilities).toHaveProperty('features');
      
      expect(Array.isArray(capabilities.resources)).toBe(true);
      expect(Array.isArray(capabilities.tools)).toBe(true);
      expect(Array.isArray(capabilities.features)).toBe(true);
    });
  });

  describe('Storage Interface', () => {
    test('provides storage operations', async () => {
      await context.initialize();
      
      const storage = context.getStorage();
      
      expect(storage).toHaveProperty('create');
      expect(storage).toHaveProperty('read');
      expect(storage).toHaveProperty('update');
      expect(storage).toHaveProperty('delete');
      expect(storage).toHaveProperty('list');
      expect(storage).toHaveProperty('search');
    });
  });

  describe('Formatter Interface', () => {
    test('provides formatting capability', async () => {
      await context.initialize();
      
      const formatter = context.getFormatter();
      
      expect(formatter).toHaveProperty('format');
      expect(typeof formatter.format).toBe('function');
    });
  });
});