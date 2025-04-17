/**
 * Unit tests for NoteContext that extends BaseContext
 * 
 * These tests only validate the interface and API of the NoteContext,
 * not the actual storage functionality.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { BaseContext } from '@/contexts/core/baseContext';
import { NoteContext } from '@/contexts/notes/core/noteContext';
import { setupMcpServerMocks } from '@test/__mocks__/utils/mcpUtils';

describe('NoteContext', () => {
  // We'll create mock servers as needed in the tests
  
  let noteContext: NoteContext;
  
  beforeEach(() => {
    // Reset singleton
    NoteContext.resetInstance();
    
    // Create a new context with test config
    noteContext = new NoteContext({ 
      apiKey: 'mock-api-key',
      name: 'TestNoteBrain',
      version: '1.0.0-test', 
    });
  });
  
  afterEach(() => {
    NoteContext.resetInstance();
  });
  
  test('should extend BaseContext', () => {
    expect(noteContext).toBeInstanceOf(BaseContext);
  });
  
  test('getInstance should return a singleton instance', () => {
    const instance1 = NoteContext.getInstance();
    const instance2 = NoteContext.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh should return a new instance', () => {
    const instance1 = NoteContext.getInstance();
    const instance2 = NoteContext.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const instance1 = NoteContext.getInstance();
    NoteContext.resetInstance();
    const instance2 = NoteContext.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('getContextName should return the configured name or default', () => {
    expect(noteContext.getContextName()).toBe('TestNoteBrain');
    
    const defaultContext = new NoteContext();
    expect(defaultContext.getContextName()).toBe('NoteBrain');
  });
  
  test('getContextVersion should return the configured version or default', () => {
    expect(noteContext.getContextVersion()).toBe('1.0.0-test');
    
    const defaultContext = new NoteContext();
    expect(defaultContext.getContextVersion()).toBe('1.0.0');
  });
  
  test('initialize should set readyState to true', async () => {
    const result = await noteContext.initialize();
    
    expect(result).toBe(true);
    expect(noteContext.isReady()).toBe(true);
  });
  
  test('getStatus should return correct status object', () => {
    const status = noteContext.getStatus();
    
    expect(status.name).toBe('TestNoteBrain');
    expect(status.version).toBe('1.0.0-test');
    expect(status.ready).toBeDefined();
    expect(status.resourceCount).toBeGreaterThan(0);
    expect(status.toolCount).toBeGreaterThan(0);
  });
  
  test('registerOnServer registers resources and tools', () => {
    const testServer = setupMcpServerMocks();
    const result = noteContext.registerOnServer(testServer);
    
    expect(result).toBe(true);
  });
  
  test('getStorage should return storage adapter', () => {
    const storage = noteContext.getStorage();
    
    expect(storage).toBeDefined();
  });
});