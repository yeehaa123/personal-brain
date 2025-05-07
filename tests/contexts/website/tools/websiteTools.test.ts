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
import { createTestLandingPageData } from '@test/helpers';
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

  it('should correctly implement tool handlers for all defined tools', async () => {
    // Get all tools
    const tools = toolService.getTools(mockContext as unknown as WebsiteContext);

    // Setup mock implementations for all context methods
    mockContext.generateLandingPage.mockImplementation(() => Promise.resolve({
      type: 'landing-page',
      success: true,
      message: 'Landing page generated',
      data: createTestLandingPageData({ name: 'Test', title: 'Test Landing Page', tagline: 'Test Tagline' }),
    }));

    mockContext.editLandingPage.mockImplementation(() => Promise.resolve({
      type: 'landing-page',
      success: true,
      message: 'Landing page edited',
      data: createTestLandingPageData({
        name: 'Test',
        title: 'Test Landing Page',
        tagline: 'Test Tagline',
        hero: { 
          headline: 'Edited: Test Headline',
          subheading: 'Edited subheading',
          ctaText: 'Get Started',
          ctaLink: '/contact',
        },
      }),
    }));

    mockContext.assessLandingPage.mockImplementation(() => Promise.resolve({
      type: 'landing-page',
      success: true,
      message: 'Landing page quality assessed',
      data: createTestLandingPageData({ title: 'Test Landing Page' }),
      assessments: { 
        hero: { 
          content: { title: 'Hero Title' },
          assessment: { 
            qualityScore: 8,
            qualityJustification: 'Good quality',
            confidenceScore: 7,
            confidenceJustification: 'Reasonably confident',
            combinedScore: 7.5,
            enabled: true,
            suggestedImprovements: 'None',
            improvementsApplied: false,
          },
          isRequired: true,
        },
      },
    }));

    mockContext.handleWebsiteBuild.mockImplementation(() => Promise.resolve({
      type: 'website-build',
      success: true,
      message: 'Website built',
      url: 'https://preview.example.com',
      path: '/path/to/build',
    }));

    mockContext.handleWebsitePromote.mockImplementation(() => Promise.resolve({
      type: 'website-promote',
      success: true,
      message: 'Website promoted to production',
      url: 'https://example.com',
    }));

    mockContext.handleWebsiteStatus.mockImplementation(() => Promise.resolve({
      type: 'website-status',
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
    }));

    // Use a consolidated approach with a common validation method
    // Run all tool handlers and collect results
    const handlerResults = {
      generateLandingPage: {
        tool: tools.find(t => t.name === 'generate_landing_page'),
        params: {},
        isCalled: false,
      },
      editLandingPage: {
        tool: tools.find(t => t.name === 'edit_landing_page'),
        params: {},
        isCalled: false,
      },
      assessLandingPage: {
        tool: tools.find(t => t.name === 'assess_landing_page'),
        params: {
          qualityThresholds: {
            minCombinedScore: 7,
            minQualityScore: 6,
            minConfidenceScore: 6,
          },
          applyRecommendations: true,
        },
        isCalled: false,
      },
      buildWebsite: {
        tool: tools.find(t => t.name === 'build_website'),
        params: {},
        isCalled: false,
      },
      promoteWebsite: {
        tool: tools.find(t => t.name === 'promote_website'),
        params: {},
        isCalled: false,
      },
      websiteStatus: {
        tool: tools.find(t => t.name === 'get_website_status'),
        params: {},
        isCalled: false,
      },
    };
    
    // Verify all tools exist
    Object.values(handlerResults).forEach(handler => {
      expect(handler.tool).toBeDefined();
    });
    
    // Define a common interface for all tool results based on the actual implementations
    interface ToolResult {
      success: boolean;
      message: string;
      data?: {
        hero?: {
          headline?: string;
          [key: string]: unknown;
        };
        environment?: string;
        buildStatus?: string;
        serverStatus?: string;
        [key: string]: unknown;
      };
      url?: string;
      path?: string;
      environment?: string;
      assessments?: unknown[];
      [key: string]: unknown;
    }
    
    // Run all tool handlers and store outputs by running the handlers
    const results: Record<string, ToolResult> = {};
    
    // Handle landing page generation
    if (handlerResults.generateLandingPage.tool) {
      results['generateLandingPage'] = await handlerResults.generateLandingPage.tool.handler(
        handlerResults.generateLandingPage.params,
      ) as ToolResult;
      handlerResults.generateLandingPage.isCalled = true;
    }
    
    // Handle landing page editing
    if (handlerResults.editLandingPage.tool) {
      results['editLandingPage'] = await handlerResults.editLandingPage.tool.handler(
        handlerResults.editLandingPage.params,
      ) as ToolResult;
      handlerResults.editLandingPage.isCalled = true;
    }
    
    // Handle landing page assessment
    if (handlerResults.assessLandingPage.tool) {
      results['assessLandingPage'] = await handlerResults.assessLandingPage.tool.handler(
        handlerResults.assessLandingPage.params,
      ) as ToolResult;
      handlerResults.assessLandingPage.isCalled = true;
    }
    
    // Handle website build
    if (handlerResults.buildWebsite.tool) {
      results['buildWebsite'] = await handlerResults.buildWebsite.tool.handler(
        handlerResults.buildWebsite.params,
      ) as ToolResult;
      handlerResults.buildWebsite.isCalled = true;
    }
    
    // Handle website promotion
    if (handlerResults.promoteWebsite.tool) {
      results['promoteWebsite'] = await handlerResults.promoteWebsite.tool.handler(
        handlerResults.promoteWebsite.params,
      ) as ToolResult;
      handlerResults.promoteWebsite.isCalled = true;
    }
    
    // Handle website status
    if (handlerResults.websiteStatus.tool) {
      results['websiteStatus'] = await handlerResults.websiteStatus.tool.handler(
        handlerResults.websiteStatus.params,
      ) as ToolResult;
      handlerResults.websiteStatus.isCalled = true;
    }
    
    // Create validation object with all the checks we want to perform
    const validationResults = {
      mockCalls: {
        generateLandingPageCalled: mockContext.generateLandingPage.mock.calls.length > 0,
        editLandingPageCalled: mockContext.editLandingPage.mock.calls.length > 0,
        assessLandingPageCalled: mockContext.assessLandingPage.mock.calls.length > 0,
        buildWebsiteCalled: mockContext.handleWebsiteBuild.mock.calls.length > 0,
        promoteWebsiteCalled: mockContext.handleWebsitePromote.mock.calls.length > 0,
        statusWebsiteCalled: mockContext.handleWebsiteStatus.mock.calls.length > 0,
      },
      landingPageResults: {
        generateSuccess: typeof results['generateLandingPage'] === 'object' && 
                        results['generateLandingPage']?.success === true,
        generateHasData: typeof results['generateLandingPage'] === 'object' && 
                        !!results['generateLandingPage']?.data,
        editSuccess: typeof results['editLandingPage'] === 'object' && 
                    results['editLandingPage']?.success === true,
        editHasData: typeof results['editLandingPage'] === 'object' && 
                    !!results['editLandingPage']?.data,
        editHeadlineHasEdited: typeof results['editLandingPage'] === 'object' && 
                              typeof results['editLandingPage']?.data?.['hero']?.['headline'] === 'string' && 
                              String(results['editLandingPage']?.data?.['hero']?.['headline']).includes('Edited:'),
        assessSuccess: typeof results['assessLandingPage'] === 'object' && 
                      results['assessLandingPage']?.success === true,
        assessHasAssessments: typeof results['assessLandingPage'] === 'object' && 
                             !!results['assessLandingPage']?.assessments,
      },
      websiteResults: {
        buildSuccess: typeof results['buildWebsite'] === 'object' && 
                     results['buildWebsite']?.success === true,
        buildHasUrl: typeof results['buildWebsite'] === 'object' && 
                    typeof results['buildWebsite']?.url === 'string',
        buildHasPath: typeof results['buildWebsite'] === 'object' && 
                     typeof results['buildWebsite']?.path === 'string',
        promoteSuccess: typeof results['promoteWebsite'] === 'object' && 
                       results['promoteWebsite']?.success === true,
        promoteHasUrl: typeof results['promoteWebsite'] === 'object' && 
                      typeof results['promoteWebsite']?.url === 'string',
        statusSuccess: typeof results['websiteStatus'] === 'object' && 
                      results['websiteStatus']?.success === true,
        statusHasEnvironment: typeof results['websiteStatus'] === 'object' && 
                             typeof results['websiteStatus']?.data?.['environment'] === 'string',
        statusHasBuildStatus: typeof results['websiteStatus'] === 'object' && 
                             typeof results['websiteStatus']?.data?.['buildStatus'] === 'string',
        statusHasServerStatus: typeof results['websiteStatus'] === 'object' && 
                              typeof results['websiteStatus']?.data?.['serverStatus'] === 'string',
      },
    };
    
    // Single consolidated assertion
    expect(validationResults).toMatchObject({
      mockCalls: {
        generateLandingPageCalled: true,
        editLandingPageCalled: true,
        assessLandingPageCalled: true,
        buildWebsiteCalled: true,
        promoteWebsiteCalled: true,
        statusWebsiteCalled: true,
      },
      landingPageResults: {
        generateSuccess: true,
        generateHasData: true,
        editSuccess: true,
        editHasData: true,
        editHeadlineHasEdited: true,
        assessSuccess: true,
        assessHasAssessments: true,
      },
      websiteResults: {
        buildSuccess: true,
        buildHasUrl: true,
        buildHasPath: true,
        promoteSuccess: true,
        promoteHasUrl: true,
        statusSuccess: true,
        statusHasEnvironment: true,
        statusHasBuildStatus: true,
        statusHasServerStatus: true,
      },
    });
  });
});
