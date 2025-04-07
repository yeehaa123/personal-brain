/**
 * Tests for the BaseContext mock implementation
 */

import { beforeEach, describe, expect, test } from 'bun:test';

import { MockBaseContext } from './baseContext';

describe('MockBaseContext', () => {
  // Reset singleton for each test
  beforeEach(() => {
    MockBaseContext.resetInstance();
  });
  
  test('getInstance should return the same instance', () => {
    const instance1 = MockBaseContext.getInstance();
    const instance2 = MockBaseContext.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh should create a new instance', () => {
    const instance1 = MockBaseContext.createFresh();
    const instance2 = MockBaseContext.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const instance1 = MockBaseContext.getInstance();
    MockBaseContext.resetInstance();
    const instance2 = MockBaseContext.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('initialize should set readyState to true', async () => {
    const context = MockBaseContext.createFresh();
    
    expect(context.isReady()).toBe(false);
    
    await context.initialize();
    
    expect(context.isReady()).toBe(true);
  });
  
  test('getContextName should return the configured name', () => {
    const defaultContext = MockBaseContext.createFresh();
    const namedContext = MockBaseContext.createFresh({ name: 'CustomContext' });
    
    expect(defaultContext.getContextName()).toBe('MockContext');
    expect(namedContext.getContextName()).toBe('CustomContext');
  });
  
  test('getContextVersion should return the configured version', () => {
    const defaultContext = MockBaseContext.createFresh();
    const versionedContext = MockBaseContext.createFresh({ version: '2.0.0' });
    
    expect(defaultContext.getContextVersion()).toBe('1.0.0');
    expect(versionedContext.getContextVersion()).toBe('2.0.0');
  });
  
  test('getStatus should return correct status object', () => {
    const context = MockBaseContext.createFresh();
    
    const status = context.getStatus();
    
    expect(status).toEqual({
      name: 'MockContext',
      version: '1.0.0',
      ready: false,
      resourceCount: 1,
      toolCount: 1,
    });
  });
  
  test('getResources should return a copy of resources', () => {
    const context = MockBaseContext.createFresh();
    const resources = context.getResources();
    
    expect(resources).toEqual([
      {
        protocol: 'test',
        path: 'resource',
        handler: expect.any(Function),
        name: 'Test Resource',
      },
    ]);
    
    // Verify it's a copy
    expect(resources).not.toBe(context['resources']);
  });
  
  test('getTools should return a copy of tools', () => {
    const context = MockBaseContext.createFresh();
    const tools = context.getTools();
    
    expect(tools).toEqual([
      {
        protocol: 'test',
        path: 'tool',
        handler: expect.any(Function),
        name: 'Test Tool',
      },
    ]);
    
    // Verify it's a copy
    expect(tools).not.toBe(context['tools']);
  });
  
  test('addResource should add a resource', () => {
    const context = MockBaseContext.createFresh();
    
    context.addResource({
      protocol: 'test',
      path: 'new-resource',
      handler: async () => ({ success: true }),
      name: 'New Resource',
    });
    
    const resources = context.getResources();
    
    expect(resources).toHaveLength(2);
    expect(resources[1]).toEqual({
      protocol: 'test',
      path: 'new-resource',
      handler: expect.any(Function),
      name: 'New Resource',
    });
  });
  
  test('addTool should add a tool', () => {
    const context = MockBaseContext.createFresh();
    
    context.addTool({
      protocol: 'test',
      path: 'new-tool',
      handler: async () => ({ success: true }),
      name: 'New Tool',
    });
    
    const tools = context.getTools();
    
    expect(tools).toHaveLength(2);
    expect(tools[1]).toEqual({
      protocol: 'test',
      path: 'new-tool',
      handler: expect.any(Function),
      name: 'New Tool',
    });
  });
  
  test('clearResources should clear all resources', () => {
    const context = MockBaseContext.createFresh();
    
    context.clearResources();
    
    expect(context.getResources()).toHaveLength(0);
  });
  
  test('clearTools should clear all tools', () => {
    const context = MockBaseContext.createFresh();
    
    context.clearTools();
    
    expect(context.getTools()).toHaveLength(0);
  });
  
  test('setReadyState should update readiness state', () => {
    const context = MockBaseContext.createFresh();
    
    expect(context.isReady()).toBe(false);
    
    context.setReadyState(true);
    
    expect(context.isReady()).toBe(true);
  });
});