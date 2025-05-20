/**
 * Tests for MCPContext behavior
 * 
 * These tests focus on the actual behavior of contexts,
 * not implementation details.
 */
import { describe, expect, test } from 'bun:test';

import { createContextFunctionality } from '@/contexts/MCPContext';

describe('MCPContext behavior', () => {
  test('context can be initialized and provides correct information', async () => {
    const contextObj = createContextFunctionality({
      name: 'TestContext',
      version: '1.0.0',
    });
    
    // Context starts not ready
    expect(contextObj.isReady()).toBe(false);
    
    // After initialization, context is ready
    await contextObj.initialize();
    expect(contextObj.isReady()).toBe(true);
    
    // Context provides its identity
    expect(contextObj.getContextName()).toBe('TestContext');
    expect(contextObj.getContextVersion()).toBe('1.0.0');
    
    // Context can provide status
    const status = contextObj.getStatus();
    expect(status.name).toBe('TestContext');
    expect(status.version).toBe('1.0.0');
    expect(status.ready).toBe(true);
  });
  
  test('context can manage resources and tools', () => {
    const contextObj = createContextFunctionality({
      name: 'ResourceContext',
      version: '1.0.0',
    });
    
    // Add a resource
    contextObj.resources.push({
      protocol: 'test',
      path: '/test',
      name: 'test-resource',
      handler: async () => ({ data: 'test' }),
    });
    
    // Add a tool  
    contextObj.tools.push({
      protocol: 'test',
      path: '/test-tool',
      name: 'test-tool',
      handler: async () => ({ result: 'success' }),
    });
    
    // Resources and tools are accessible
    expect(contextObj.resources.length).toBe(1);
    expect(contextObj.tools.length).toBe(1);
    expect(contextObj.resources[0].name).toBe('test-resource');
    expect(contextObj.tools[0].name).toBe('test-tool');
  });
  
  test('context can clean up resources', async () => {
    const contextObj = createContextFunctionality({
      name: 'CleanupContext',
      version: '1.0.0',
    });
    
    await contextObj.initialize();
    expect(contextObj.isReady()).toBe(true);
    
    // Cleanup method exists and is callable
    const cleanupResult = await contextObj.cleanup();
    expect(cleanupResult).toBeUndefined();
  });
});