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

  // Required implementation of abstract registryType property
  protected readonly registryType = 'resource' as 'resource' | 'service';

  // Track components registration
  private componentsRegistered = false;

  public static override getInstance(options?: RegistryOptions): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry(options || {});
      // Auto-initialize on getInstance
      TestRegistry.instance.initialize();
    }
    return TestRegistry.instance;
  }

  public static override resetInstance(): void {
    TestRegistry.instance = null;
  }

  public static override createFresh(options?: RegistryOptions): TestRegistry {
    const registry = new TestRegistry(options || {});
    registry.initialize();
    return registry;
  }

  protected constructor(options: RegistryOptions) {
    super({
      name: 'TestRegistry',
      ...options,
    });
  }

  // Required implementation of abstract registerComponents method
  protected registerComponents(): void {
    if (this.componentsRegistered) return;

    // Register a test component
    this.register('test.default', () => ({ value: 'default' }));

    this.componentsRegistered = true;
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

  // Add method to check if components are registered
  public areComponentsRegistered(): boolean {
    return this.componentsRegistered;
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

  describe('Initialization pattern', () => {
    test('should initialize components on getInstance', () => {
      TestRegistry.resetInstance();
      const registry = TestRegistry.getInstance();

      expect(registry.isInitialized()).toBe(true);
      expect(registry.areComponentsRegistered()).toBe(true);
    });

    test('should initialize components on createFresh', () => {
      const registry = TestRegistry.createFresh();

      expect(registry.isInitialized()).toBe(true);
      expect(registry.areComponentsRegistered()).toBe(true);
    });

    test('should reset initialization state on clear', () => {
      const registry = TestRegistry.createFresh();
      expect(registry.isInitialized()).toBe(true);

      registry.clear();
      expect(registry.isInitialized()).toBe(false);
    });

    test('should register default components on initialization', () => {
      const registry = TestRegistry.createFresh();

      // Default component should exist after initialization
      expect(registry.has('test.default')).toBe(true);

      // Component should be resolvable
      const component = registry.resolve('test.default');
      expect(component).toEqual({ value: 'default' });
    });
  });
});
