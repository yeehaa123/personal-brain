/**
 * Tests for MCPContext
 * 
 * These tests verify the functionality of the simplified context system.
 */
import { describe, expect, test } from 'bun:test';

import { createContextFunctionality } from '@/contexts/MCPContext';
import type { Logger } from '@/utils/logger';

describe('MCPContext', () => {
  test('createContextFunctionality creates a valid context object', () => {
    // Create a mock logger for testing
    const mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as unknown as Logger;
    
    // Create context functionality
    const contextFunctionality = createContextFunctionality({
      name: 'TestContext',
      version: '1.0.0',
      logger: mockLogger,
    });
    
    // Verify the created object has all required properties of MCPContext
    expect(contextFunctionality).toBeDefined();
    expect(typeof contextFunctionality.getContextName).toBe('function');
    expect(typeof contextFunctionality.getContextVersion).toBe('function');
    expect(typeof contextFunctionality.initialize).toBe('function');
    expect(typeof contextFunctionality.isReady).toBe('function');
    expect(typeof contextFunctionality.getStatus).toBe('function');
    expect(typeof contextFunctionality.registerOnServer).toBe('function');
    expect(typeof contextFunctionality.getMcpServer).toBe('function');
    expect(typeof contextFunctionality.getCapabilities).toBe('function');
    expect(typeof contextFunctionality.cleanup).toBe('function');
    
    // Verify resources and tools arrays exist
    expect(Array.isArray(contextFunctionality.resources)).toBe(true);
    expect(Array.isArray(contextFunctionality.tools)).toBe(true);
    
    // Verify basic functionality
    expect(contextFunctionality.getContextName()).toBe('TestContext');
    expect(contextFunctionality.getContextVersion()).toBe('1.0.0');
    expect(contextFunctionality.isReady()).toBe(false); // Should be false before initialization
    
    // Verify status
    const status = contextFunctionality.getStatus();
    expect(status.name).toBe('TestContext');
    expect(status.version).toBe('1.0.0');
    expect(status.ready).toBe(false);
    expect(status.resourceCount).toBe(0);
    expect(status.toolCount).toBe(0);
    
    // Verify capabilities
    const capabilities = contextFunctionality.getCapabilities();
    expect(Array.isArray(capabilities.resources)).toBe(true);
    expect(Array.isArray(capabilities.tools)).toBe(true);
    expect(Array.isArray(capabilities.features)).toBe(true);
  });
  
  test('initialize sets ready state to true', async () => {
    // Create context functionality
    const contextFunctionality = createContextFunctionality({
      name: 'TestContext',
      version: '1.0.0',
    });
    
    // Initialize the context
    const result = await contextFunctionality.initialize();
    
    // Verify initialization result
    expect(result).toBe(true);
    expect(contextFunctionality.isReady()).toBe(true);
    
    // Verify status after initialization
    const status = contextFunctionality.getStatus();
    expect(status.ready).toBe(true);
  });
  
  test('context can add resources and tools', () => {
    // Create context functionality
    const contextFunctionality = createContextFunctionality({
      name: 'TestContext',
      version: '1.0.0',
    });
    
    // Add a resource
    contextFunctionality.resources.push({
      protocol: 'test',
      path: 'resource-path',
      handler: async () => ({ success: true }),
      name: 'Test Resource',
      description: 'A test resource',
    });
    
    // Add a tool
    contextFunctionality.tools.push({
      protocol: 'test',
      path: 'tool-path',
      handler: async () => ({ success: true }),
      name: 'Test Tool',
      description: 'A test tool',
    });
    
    // Verify the resource and tool were added
    expect(contextFunctionality.resources.length).toBe(1);
    expect(contextFunctionality.tools.length).toBe(1);
    
    // Verify capabilities returns the added resource and tool
    const capabilities = contextFunctionality.getCapabilities();
    expect(capabilities.resources.length).toBe(1);
    expect(capabilities.tools.length).toBe(1);
    expect(capabilities.resources[0].name).toBe('Test Resource');
    expect(capabilities.tools[0].name).toBe('Test Tool');
    
    // Verify status shows the added resource and tool
    const status = contextFunctionality.getStatus();
    expect(status.resourceCount).toBe(1);
    expect(status.toolCount).toBe(1);
  });
});