/**
 * Tests for WebsiteToolService
 * 
 * Tests the WebsiteToolService implementation using the project's standardized testing patterns
 */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import { WebsiteToolService } from '@/contexts/website/tools';
import type { WebsiteContext } from '@/contexts/website/websiteContext';
import type { 
  LandingPageResult,
  WebsiteBuildResult,
  WebsitePromoteResult,
  WebsiteStatusResult,
} from '@/interfaces/matrix/formatters/types';
import {
  LandingPageGenerationToolSchema,
  WebsiteBuildToolSchema,
  WebsitePromoteToolSchema,
  WebsiteStatusToolSchema,
} from '@website/schemas/websiteToolSchemas';

// Define interface for mock context that correctly specifies the return types
interface MockWebsiteContext {
  generateLandingPage: ReturnType<typeof mock<() => Promise<LandingPageResult>>>;
  editLandingPage: ReturnType<typeof mock<() => Promise<LandingPageResult>>>;
  assessLandingPage: ReturnType<typeof mock<(options?: unknown) => Promise<LandingPageResult>>>;
  handleWebsiteBuild: ReturnType<typeof mock<() => Promise<WebsiteBuildResult>>>;
  handleWebsitePromote: ReturnType<typeof mock<() => Promise<WebsitePromoteResult>>>;
  handleWebsiteStatus: ReturnType<typeof mock<() => Promise<WebsiteStatusResult>>>;
}

describe('WebsiteToolService', () => {
  let toolService: WebsiteToolService;

  // Create mock context with complete return types that match the interfaces
  const mockContext: MockWebsiteContext = {
    generateLandingPage: mock(() => Promise.resolve({ 
      type: 'landing-page',
      success: true, 
      message: '', 
    })),
    editLandingPage: mock(() => Promise.resolve({ 
      type: 'landing-page',
      success: true, 
      message: '', 
    })),
    assessLandingPage: mock(() => Promise.resolve({ 
      type: 'landing-page',
      success: true, 
      message: '', 
    })),
    handleWebsiteBuild: mock(() => Promise.resolve({ 
      type: 'website-build',
      success: true, 
      message: '', 
    })),
    handleWebsitePromote: mock(() => Promise.resolve({ 
      type: 'website-promote',
      success: true, 
      message: '', 
    })),
    handleWebsiteStatus: mock(() => Promise.resolve({ 
      type: 'website-status',
      success: true, 
      message: '', 
    })),
  };

  beforeEach(() => {
    // Reset singleton
    WebsiteToolService.resetInstance();

    // Reset mocks
    mockContext.generateLandingPage.mockReset();
    mockContext.editLandingPage.mockReset();
    mockContext.assessLandingPage.mockReset();
    mockContext.handleWebsiteBuild.mockReset();
    mockContext.handleWebsitePromote.mockReset();
    mockContext.handleWebsiteStatus.mockReset();

    // Create test instance
    toolService = WebsiteToolService.getInstance();
  });

  afterEach(() => {
    WebsiteToolService.resetInstance();
  });

  it('should provide correctly structured tools with required properties', () => {
    // Use type assertion for the mock context
    const tools = toolService.getTools(mockContext as unknown as WebsiteContext);
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    // Check that all items are ResourceDefinition objects with required properties
    tools.forEach(tool => {
      expect(tool).toHaveProperty('protocol');
      expect(tool).toHaveProperty('path');
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('handler');
    });

    // Check for all required tools
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('generate_landing_page');
    expect(toolNames).toContain('edit_landing_page');
    expect(toolNames).toContain('assess_landing_page');
    expect(toolNames).toContain('build_website');
    expect(toolNames).toContain('promote_website');
    expect(toolNames).toContain('get_website_status');
  });

  it('should return correct schemas for all tool types', () => {
    // Define test cases for each schema
    const schemaTests = [
      {
        toolName: 'generate_landing_page',
        schema: LandingPageGenerationToolSchema.shape,
        validate: (schema: Record<string, unknown>) => {
          Object.keys(LandingPageGenerationToolSchema.shape).forEach(key => {
            expect(schema).toHaveProperty(key);
          });
        },
      },
      {
        toolName: 'assess_landing_page',
        validate: (schema: Record<string, unknown>) => {
          expect(schema).toHaveProperty('qualityThresholds');
          expect(schema).toHaveProperty('applyRecommendations');
        },
      },
      {
        toolName: 'build_website',
        schema: WebsiteBuildToolSchema.shape,
        validate: (schema: Record<string, unknown>) => {
          Object.keys(WebsiteBuildToolSchema.shape).forEach(key => {
            expect(schema).toHaveProperty(key);
          });
        },
      },
      {
        toolName: 'promote_website',
        schema: WebsitePromoteToolSchema.shape,
        validate: (schema: Record<string, unknown>) => {
          Object.keys(WebsitePromoteToolSchema.shape).forEach(key => {
            expect(schema).toHaveProperty(key);
          });
        },
      },
      {
        toolName: 'get_website_status',
        schema: WebsiteStatusToolSchema.shape,
        validate: (schema: Record<string, unknown>) => {
          Object.keys(WebsiteStatusToolSchema.shape).forEach(key => {
            expect(schema).toHaveProperty(key);
          });
        },
      },
      {
        toolName: 'unknown_tool',
        validate: (schema: Record<string, unknown>) => {
          expect(Object.keys(schema).length).toBe(0);
        },
      },
    ];

    // Test each schema
    schemaTests.forEach(test => {
      const schema = toolService.getToolSchema({ name: test.toolName });
      test.validate(schema);
    });
  });

});
