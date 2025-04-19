/**
 * Tests for UnifiedServiceRegistry
 * 
 * These tests verify that the UnifiedServiceRegistry correctly follows
 * the Component Interface Standardization pattern and provides the expected
 * functionality for service registration and resolution.
 */
import { describe, test, expect, beforeEach } from 'bun:test';

import { DependencyContainer } from '@/utils/dependencyContainer';
import { Registry } from '@/utils/registry';
import { UnifiedServiceRegistry, ServiceIdentifiers } from '@/utils/unifiedServiceRegistry';

describe('UnifiedServiceRegistry', () => {
  // Reset the registry before each test
  beforeEach(() => {
    UnifiedServiceRegistry.resetInstance();
  });
  
  describe('Component Interface Standardization pattern', () => {
    test('should extend Registry base class', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      expect(registry).toBeInstanceOf(Registry);
    });
    
    test('getInstance should return the same instance', () => {
      const instance1 = UnifiedServiceRegistry.getInstance();
      const instance2 = UnifiedServiceRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = UnifiedServiceRegistry.getInstance();
      UnifiedServiceRegistry.resetInstance();
      const instance2 = UnifiedServiceRegistry.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('createFresh should create a new instance', () => {
      const singleton = UnifiedServiceRegistry.getInstance();
      const fresh = UnifiedServiceRegistry.createFresh();
      
      expect(singleton).not.toBe(fresh);
      expect(fresh).toBeInstanceOf(UnifiedServiceRegistry);
    });
    
    test('can update options after initialization', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      registry.updateOptions({ apiKey: 'test-key' });
      
      // We can't directly test the internal options, but we can test that
      // the update doesn't throw an error
      expect(() => registry.updateOptions({ apiKey: 'updated-key' })).not.toThrow();
    });
  });
  
  describe('Service registration and resolution', () => {
    test('can register and resolve a service', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      const mockService = { value: 'test' };
      
      registry.register<typeof mockService>('test.service', () => mockService);
      const resolved = registry.resolve('test.service');
      
      expect(resolved).toBe(mockService);
    });
    
    test('can check if a service is registered', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      registry.register<{ value: string }>('test.service', () => ({ value: 'test' }));
      
      expect(registry.has('test.service')).toBe(true);
      expect(registry.has('nonexistent.service')).toBe(false);
    });
    
    test('can unregister a service', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      registry.register<{ value: string }>('test.service', () => ({ value: 'test' }));
      
      expect(registry.has('test.service')).toBe(true);
      
      registry.unregister('test.service');
      
      expect(registry.has('test.service')).toBe(false);
    });
    
    test('can clear all services', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      registry.register<{ value: string }>('test.service1', () => ({ value: 'test1' }));
      registry.register<{ value: string }>('test.service2', () => ({ value: 'test2' }));
      
      expect(registry.has('test.service1')).toBe(true);
      expect(registry.has('test.service2')).toBe(true);
      
      registry.clear();
      
      expect(registry.has('test.service1')).toBe(false);
      expect(registry.has('test.service2')).toBe(false);
    });
    
    test('getService is an alias for resolve', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      const mockService = { value: 'test' };
      
      registry.register<typeof mockService>('test.service', () => mockService);
      
      expect(registry.getService('test.service')).toBe(mockService);
    });
    
    test('registerService is an alias for register', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      const mockService = { value: 'test' };
      
      registry.registerService<typeof mockService>('test.service', () => mockService);
      
      expect(registry.resolve('test.service')).toBe(mockService);
    });
  });
  
  describe('ServiceIdentifiers', () => {
    test('should provide constants for all service types', () => {
      expect(ServiceIdentifiers.ClaudeModel).toBeDefined();
      expect(ServiceIdentifiers.EmbeddingService).toBeDefined();
      expect(ServiceIdentifiers.NoteRepository).toBeDefined();
      expect(ServiceIdentifiers.ProfileRepository).toBeDefined();
      expect(ServiceIdentifiers.NoteEmbeddingService).toBeDefined();
      expect(ServiceIdentifiers.ProfileEmbeddingService).toBeDefined();
      expect(ServiceIdentifiers.NoteSearchService).toBeDefined();
      expect(ServiceIdentifiers.ProfileSearchService).toBeDefined();
      expect(ServiceIdentifiers.ProfileTagService).toBeDefined();
      expect(ServiceIdentifiers.ConversationResourceService).toBeDefined();
      expect(ServiceIdentifiers.ConversationToolService).toBeDefined();
      expect(ServiceIdentifiers.ConversationQueryService).toBeDefined();
      expect(ServiceIdentifiers.ConversationMemoryService).toBeDefined();
      expect(ServiceIdentifiers.ConversationStorageAdapter).toBeDefined();
      expect(ServiceIdentifiers.ConversationFormatter).toBeDefined();
      expect(ServiceIdentifiers.ConversationMcpFormatter).toBeDefined();
    });
  });
  
  describe('Integration with DependencyContainer', () => {
    test('should create its own container if none provided', () => {
      const registry = UnifiedServiceRegistry.getInstance();
      
      // Register a service
      registry.register<{ value: string }>('test.service', () => ({ value: 'test' }));
      
      // Verify it can be resolved
      expect(registry.resolve('test.service')).toEqual({ value: 'test' });
    });
    
    test('should use provided container if specified', () => {
      const container = DependencyContainer.createFresh();
      
      // Pre-register a service in the container
      container.register('pre.existing', () => ({ value: 'pre-existing' }));
      
      // Create registry with the container
      const registry = UnifiedServiceRegistry.createFresh({ container });
      
      // Register a new service
      registry.register<{ value: string }>('new.service', () => ({ value: 'new' }));
      
      // Both services should be available
      expect(registry.resolve('pre.existing')).toEqual({ value: 'pre-existing' });
      expect(registry.resolve('new.service')).toEqual({ value: 'new' });
    });
  });
});