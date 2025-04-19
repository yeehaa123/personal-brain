/**
 * Tests for Registry
 * 
 * These tests verify that the base Registry class provides the expected
 * functionality for extension by more specific registry implementations.
 */
import { describe, expect, test } from 'bun:test';

import { Registry, type RegistryOptions, SimpleContainer } from '@/utils/registry';

// Concrete implementation for testing the abstract Registry class
class TestRegistry extends Registry {
  // Singleton implementation following Component Interface Standardization pattern
  private static instance: TestRegistry | null = null;
  
  public static getInstance(options?: RegistryOptions): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry(options || {});
    }
    return TestRegistry.instance;
  }
  
  public static resetInstance(): void {
    TestRegistry.instance = null;
  }
  
  public static createFresh(options?: RegistryOptions): TestRegistry {
    return new TestRegistry(options || {});
  }
  
  protected constructor(options: RegistryOptions) {
    super({
      name: 'TestRegistry',
      ...options,
    });
  }
  
  protected override createContainer(): SimpleContainer {
    return new SimpleContainer();
  }
  
  // Add a public method to access the protected logger
  public getLogger() {
    return this.logger;
  }
  
  // Add a public method to access the protected name
  public getName() {
    return this.name;
  }
  
  // Add a public method to access the protected options
  public getOptions() {
    return this.options;
  }
}

describe('Registry', () => {
  describe('Base class functionality', () => {
    test('should initialize with default options', () => {
      const registry = TestRegistry.createFresh();
      
      expect(registry.getName()).toBe('TestRegistry');
      expect(registry.getOptions()).toEqual({ name: 'TestRegistry' });
    });
    
    test('should allow custom name in options', () => {
      const registry = TestRegistry.createFresh({ name: 'CustomName' });
      
      expect(registry.getName()).toBe('CustomName');
    });
    
    test('should initialize logger', () => {
      const registry = TestRegistry.createFresh();
      
      expect(registry.getLogger()).toBeDefined();
    });
  });
  
  describe('Registry operations', () => {
    test('should register and resolve a component', () => {
      const registry = TestRegistry.createFresh();
      const mockComponent = { value: 'test' };
      
      registry.register<typeof mockComponent>('test.component', () => mockComponent);
      const resolved = registry.resolve('test.component');
      
      expect(resolved).toBe(mockComponent);
    });
    
    test('should check if a component is registered', () => {
      const registry = TestRegistry.createFresh();
      registry.register<{ value: string }>('test.component', () => ({ value: 'test' }));
      
      expect(registry.has('test.component')).toBe(true);
      expect(registry.has('nonexistent.component')).toBe(false);
    });
    
    test('should unregister a component', () => {
      const registry = TestRegistry.createFresh();
      registry.register<{ value: string }>('test.component', () => ({ value: 'test' }));
      
      expect(registry.has('test.component')).toBe(true);
      
      registry.unregister('test.component');
      
      expect(registry.has('test.component')).toBe(false);
    });
    
    test('should clear all components', () => {
      const registry = TestRegistry.createFresh();
      registry.register<{ value: string }>('test.component1', () => ({ value: 'test1' }));
      registry.register<{ value: string }>('test.component2', () => ({ value: 'test2' }));
      
      expect(registry.has('test.component1')).toBe(true);
      expect(registry.has('test.component2')).toBe(true);
      
      registry.clear();
      
      expect(registry.has('test.component1')).toBe(false);
      expect(registry.has('test.component2')).toBe(false);
    });
    
    test('should support updating options', () => {
      const registry = TestRegistry.createFresh({ customOption: 'initial' });
      
      expect(registry.getOptions()['customOption']).toBe('initial');
      
      registry.updateOptions({ customOption: 'updated' });
      
      expect(registry.getOptions()['customOption']).toBe('updated');
    });
    
    test('should merge new options with existing options', () => {
      const registry = TestRegistry.createFresh({ 
        option1: 'value1',
        option2: 'value2',
      });
      
      registry.updateOptions({ option2: 'updated' });
      
      expect(registry.getOptions()).toEqual({
        name: 'TestRegistry',
        option1: 'value1',
        option2: 'updated',
      });
    });
  });
  
  describe('Component Interface Standardization pattern', () => {
    test('getInstance should return the same instance', () => {
      // Reset instance first
      TestRegistry.resetInstance();
      
      const instance1 = TestRegistry.getInstance();
      const instance2 = TestRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = TestRegistry.getInstance();
      TestRegistry.resetInstance();
      const instance2 = TestRegistry.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('createFresh should create a new instance', () => {
      const singleton = TestRegistry.getInstance();
      const fresh = TestRegistry.createFresh();
      
      expect(singleton).not.toBe(fresh);
      expect(fresh).toBeInstanceOf(TestRegistry);
    });
  });
});