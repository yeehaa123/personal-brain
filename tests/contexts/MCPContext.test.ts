/**
 * Tests for MCPContext
 * 
 * These tests focus on the behavior of the context system,
 * not implementation details. We test WHAT it does, not HOW it does it.
 */
import { describe, expect, test } from 'bun:test';

import { createContextFunctionality } from '@/contexts/MCPContext';
import type { McpServer } from '@/mcpServer';

describe('MCPContext', () => {
  describe('Identity and Information', () => {
    test('provides correct identity information', () => {
      const contextObj = createContextFunctionality({
        name: 'TestContext',
        version: '1.0.0',
      });
      
      // A context should report its identity
      expect(contextObj.getContextName()).toBe('TestContext');
      expect(contextObj.getContextVersion()).toBe('1.0.0');
    });
    
    test('reports health and status information', () => {
      const contextObj = createContextFunctionality({
        name: 'HealthContext',
        version: '2.0.0',
      });
      
      // A context should provide status information
      const status = contextObj.getStatus();
      expect(status.name).toBe('HealthContext');
      expect(status.version).toBe('2.0.0');
      expect(typeof status.ready).toBe('boolean');
    });
  });
  
  describe('Lifecycle Management', () => {
    test('starts in not-ready state', () => {
      const contextObj = createContextFunctionality({
        name: 'LifecycleContext',
        version: '1.0.0',
      });
      
      // A context should start in not-ready state
      expect(contextObj.isReady()).toBe(false);
    });
    
    test('becomes ready after initialization', async () => {
      const contextObj = createContextFunctionality({
        name: 'LifecycleContext',
        version: '1.0.0',
      });
      
      // Should start not ready
      expect(contextObj.isReady()).toBe(false);
      
      // Should become ready after initialization
      const success = await contextObj.initialize();
      expect(success).toBe(true);
      expect(contextObj.isReady()).toBe(true);
    });
    
    test('can clean up resources', async () => {
      const contextObj = createContextFunctionality({
        name: 'CleanupContext',
        version: '1.0.0',
      });
      
      // Should be able to clean up without errors
      await contextObj.cleanup();
      // If we get here without error, the test passes
      expect(true).toBe(true);
    });
  });
  
  describe('MCP Server Integration', () => {
    test('can register with an MCP server', () => {
      const contextObj = createContextFunctionality({
        name: 'ServerContext',
        version: '1.0.0',
      });
      
      // Create mock server
      const mockServer = {
        resource: () => true,
        tool: () => true,
      } as unknown as McpServer;
      
      // Should successfully register with the server
      const registered = contextObj.registerOnServer(mockServer);
      expect(registered).toBe(true);
      
      // Should store server reference for later use
      const storedServer = contextObj.getMcpServer();
      expect(storedServer).toBeDefined();
      // Just check the functionality exists without testing implementation details
    });
    
    test('provides capabilities information', () => {
      const contextObj = createContextFunctionality({
        name: 'CapabilitiesContext',
        version: '1.0.0',
      });
      
      // Should provide capabilities
      const capabilities = contextObj.getCapabilities();
      expect(capabilities).toBeDefined();
      expect(Array.isArray(capabilities.resources)).toBe(true);
      expect(Array.isArray(capabilities.tools)).toBe(true);
      expect(Array.isArray(capabilities.features)).toBe(true);
    });
  });
  
  describe('Resource Management', () => {
    test('can add and track resources', () => {
      const contextObj = createContextFunctionality({
        name: 'ResourceContext',
        version: '1.0.0',
      });
      
      // Add a test resource
      const testResource = {
        protocol: 'test',
        path: 'resources/test',
        handler: async () => ({ result: 'success' }),
        name: 'Test Resource',
        description: 'A test resource',
      };
      
      contextObj.resources.push(testResource);
      
      // Should show resource in capabilities
      const capabilities = contextObj.getCapabilities();
      expect(capabilities.resources.length).toBe(1);
      expect(capabilities.resources[0].name).toBe('Test Resource');
      
      // Should count resource in status
      const status = contextObj.getStatus();
      expect(status['resourceCount']).toBe(1);
    });
    
    test('can add and track tools', () => {
      const contextObj = createContextFunctionality({
        name: 'ToolsContext',
        version: '1.0.0',
      });
      
      // Add a test tool
      const testTool = {
        protocol: 'test',
        path: 'tools/test',
        handler: async () => ({ result: 'executed' }),
        name: 'Test Tool',
        description: 'A test tool',
      };
      
      contextObj.tools.push(testTool);
      
      // Should show tool in capabilities
      const capabilities = contextObj.getCapabilities();
      expect(capabilities.tools.length).toBe(1);
      expect(capabilities.tools[0].name).toBe('Test Tool');
      
      // Should count tool in status
      const status = contextObj.getStatus();
      expect(status['toolCount']).toBe(1);
    });
  });
});