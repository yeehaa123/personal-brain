/**
 * Tests for WebsiteToolService
 * 
 * Tests the WebsiteToolService implementation using the project's standardized testing patterns
 */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import type { ResourceDefinition } from '@/contexts/contextInterface';
import { WebsiteToolService } from '@/contexts/website/tools';
import type { WebsiteContext } from '@/contexts/website/websiteContext';

describe('WebsiteToolService', () => {
  let toolService: WebsiteToolService;
  
  // Create mock context with all required methods
  // Create mocks that will actually be called by the tool handlers
  // Must be manually reset before each test
  const mockContext = {
    generateLandingPage: mock(() => {}),
    handleWebsiteBuild: mock(() => {}),
    handleWebsitePromote: mock(() => {}),
    handleWebsiteStatus: mock(() => {}),
  };

  beforeEach(() => {
    // Reset singleton
    WebsiteToolService.resetInstance();
    
    // Reset mocks
    mockContext.generateLandingPage.mockReset();
    mockContext.handleWebsiteBuild.mockReset();
    mockContext.handleWebsitePromote.mockReset();
    mockContext.handleWebsiteStatus.mockReset();
    
    // Create test instance
    toolService = WebsiteToolService.getInstance();
  });

  afterEach(() => {
    WebsiteToolService.resetInstance();
  });

  // REMOVED BLOCK: describe('Component Interface Standardiz...


  describe('getTools', () => {
    it('should return an array of website tools', () => {
      // Use type assertion for the mock context
      const tools = toolService.getTools(mockContext as unknown as WebsiteContext);
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check that all items are ResourceDefinition objects
      tools.forEach(tool => {
        expect(tool).toHaveProperty('protocol');
        expect(tool).toHaveProperty('path');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('handler');
      });
    });

    it('should include all required website tools', () => {
      // Use type assertion for the mock context
      const tools = toolService.getTools(mockContext as unknown as WebsiteContext);
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('generate_landing_page');
      expect(toolNames).toContain('build_website');
      expect(toolNames).toContain('promote_website');
      expect(toolNames).toContain('get_website_status');
    });
  });

  describe('getToolSchema', () => {
    it('should return schema for generate_landing_page tool', () => {
      const schema = toolService.getToolSchema({ name: 'generate_landing_page' });
      expect(schema).toHaveProperty('includeSkills');
      expect(schema).toHaveProperty('includeProjects');
      expect(schema).toHaveProperty('includeContact');
    });

    it('should return schema for build_website tool', () => {
      const schema = toolService.getToolSchema({ name: 'build_website' });
      expect(schema).toHaveProperty('environment');
      expect(schema).toHaveProperty('generateBeforeBuild');
    });

    it('should return schema for promote_website tool', () => {
      const schema = toolService.getToolSchema({ name: 'promote_website' });
      expect(schema).toHaveProperty('skipConfirmation');
    });

    it('should return schema for get_website_status tool', () => {
      const schema = toolService.getToolSchema({ name: 'get_website_status' });
      expect(schema).toHaveProperty('environment');
    });

    it('should return empty schema for unknown tool', () => {
      const schema = toolService.getToolSchema({ name: 'unknown_tool' });
      expect(Object.keys(schema).length).toBe(0);
    });
  });

  describe('Tool handlers', () => {
    let tools: ResourceDefinition[];

    beforeEach(() => {
      // Use type assertion for the mock context
      tools = toolService.getTools(mockContext as unknown as WebsiteContext);
    });

    it('generate_landing_page should call context.generateLandingPage', async () => {
      // Find the tool
      const tool = tools.find(t => t.name === 'generate_landing_page');
      expect(tool).toBeDefined();

      // Set up mock implementation for this test
      mockContext.generateLandingPage.mockImplementation(() => Promise.resolve({
        success: true,
        message: 'Landing page generated',
        data: { name: 'Test', title: 'Test Landing Page', tagline: 'Test Tagline' },
      }));

      // Call the handler
      if (tool) {
        const result = await tool.handler({});
        
        // Verify context method was called
        expect(mockContext.generateLandingPage).toHaveBeenCalled();
        
        // Verify result structure
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('data.includedSections');
      }
    });

    it('build_website should call context.handleWebsiteBuild', async () => {
      // Find the tool
      const tool = tools.find(t => t.name === 'build_website');
      expect(tool).toBeDefined();

      // Set up mock implementations for this test
      mockContext.generateLandingPage.mockImplementation(() => Promise.resolve({
        success: true,
        message: 'Landing page generated',
      }));
      mockContext.handleWebsiteBuild.mockImplementation(() => Promise.resolve({
        success: true,
        message: 'Website built',
        url: 'https://preview.example.com',
        path: '/path/to/build',
      }));

      // Call the handler
      if (tool) {
        const result = await tool.handler({});
        
        // Verify context methods were called
        expect(mockContext.generateLandingPage).toHaveBeenCalled();
        expect(mockContext.handleWebsiteBuild).toHaveBeenCalled();
        
        // Verify result structure
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('path');
      }
    });

    it('promote_website should call context.handleWebsitePromote', async () => {
      // Find the tool
      const tool = tools.find(t => t.name === 'promote_website');
      expect(tool).toBeDefined();

      // Set up mock implementation for this test
      mockContext.handleWebsitePromote.mockImplementation(() => Promise.resolve({
        success: true,
        message: 'Website promoted to production',
        url: 'https://example.com',
      }));

      // Call the handler
      if (tool) {
        const result = await tool.handler({});
        
        // Verify context method was called
        expect(mockContext.handleWebsitePromote).toHaveBeenCalled();
        
        // Verify result structure
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('url');
      }
    });

    it('get_website_status should call context.handleWebsiteStatus', async () => {
      // Find the tool
      const tool = tools.find(t => t.name === 'get_website_status');
      expect(tool).toBeDefined();

      // Set up mock implementation for this test
      mockContext.handleWebsiteStatus.mockImplementation(() => Promise.resolve({
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

      // Call the handler
      if (tool) {
        const result = await tool.handler({});
        
        // Verify context method was called
        expect(mockContext.handleWebsiteStatus).toHaveBeenCalled();
        
        // Verify result structure
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('data.environment');
        expect(result).toHaveProperty('data.buildStatus');
        expect(result).toHaveProperty('data.serverStatus');
      }
    });
  });
});