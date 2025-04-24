/**
 * WebsiteContext MCP Tools Integration Test
 * 
 * This test verifies that WebsiteContext properly initializes and registers MCP tools
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';


import type { ResourceDefinition } from '@/contexts/contextInterface';
import { WebsiteToolService } from '@/contexts/website/tools';
import { WebsiteContext } from '@/contexts/website/websiteContext';

// Mock MCP Server for tool registration testing
class MockMcpServer {
  public registeredTools: Array<{name: string, description: string}> = [];
  public registeredResources: Array<{name: string, path: string}> = [];
  
  // MCP Server tool method
  tool(name: string, description: string, _params: unknown, _handler: unknown): void {
    this.registeredTools.push({ name, description });
  }
  
  // MCP Server resource method
  resource(name: string, path: string, _metadata: unknown, _handler: unknown): void {
    this.registeredResources.push({ name, path });
  }
}

describe('WebsiteContext MCP Tools Integration', () => {
  let context: WebsiteContext;
  let mockServer: MockMcpServer;
  
  beforeEach(() => {
    // Reset singletons
    WebsiteContext.resetInstance();
    WebsiteToolService.resetInstance();
    
    // Create fresh instances
    context = WebsiteContext.createFresh();
    mockServer = new MockMcpServer();
  });
  
  afterEach(() => {
    WebsiteContext.resetInstance();
    WebsiteToolService.resetInstance();
  });
  
  it('should initialize MCP components with tools', () => {
    // Create a type for accessing the protected tools property
    interface ContextWithTools {
      tools: ResourceDefinition[];
    }
    
    // Get the tools array directly from the context 
    const tools = (context as unknown as ContextWithTools).tools;
    
    // Verify tools were initialized
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // Check for specific tool names
    const toolNames = tools.map(tool => tool.name as string);
    expect(toolNames).toContain('generate_landing_page');
    expect(toolNames).toContain('build_website');
    expect(toolNames).toContain('promote_website');
    expect(toolNames).toContain('get_website_status');
  });
  
  it('should register tools with MCP server', () => {
    // We don't need to define a custom type, just use the type assertion
    
    // Register context on mock server
    context.registerOnServer(mockServer as unknown as McpServer);
    
    // Verify tools were registered
    expect(mockServer.registeredTools.length).toBeGreaterThan(0);
    
    // Check for specific tool names
    const toolNames = mockServer.registeredTools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain('generate_landing_page');
    expect(toolNames).toContain('build_website');
    expect(toolNames).toContain('promote_website');
    expect(toolNames).toContain('get_website_status');
  });
  
  it('should resolve WebsiteToolService through getService', () => {
    // Get the service through the context's getService method
    const toolService = context.getService(WebsiteToolService as unknown as new () => WebsiteToolService);
    
    // Verify it returns a valid instance
    expect(toolService).toBeDefined();
    expect(toolService).toBeInstanceOf(WebsiteToolService);
    
    // Verify it's the singleton instance
    expect(toolService).toBe(WebsiteToolService.getInstance());
  });
});