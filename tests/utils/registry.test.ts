/**
 * Tests for Registry
 * 
 * These tests verify that the base Registry class provides the expected
 * functionality for extension by more specific registry implementations.
 */
import { describe, expect, test } from 'bun:test';

import { SimpleContainer } from '@/utils/container';
import { Registry, type RegistryConfig, type RegistryDependencies } from '@/utils/registry';

// Concrete implementation for testing the abstract Registry class
class TestRegistry extends Registry {
  // Singleton implementation following Component Interface Standardization pattern
  private static instance: TestRegistry | null = null;

  // Required implementation of abstract registryType property
  protected readonly registryType = 'resource' as 'resource' | 'service';

  // Track components registration
  private componentsRegistered = false;

  public static override getInstance(
    config: Partial<RegistryConfig> = {}, 
    dependencies: Partial<RegistryDependencies> = {},
  ): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry(config, dependencies);
      // Auto-initialize on getInstance
      TestRegistry.instance.initialize();
    }
    return TestRegistry.instance;
  }

  public static override resetInstance(): void {
    TestRegistry.instance = null;
  }

  public static override createFresh(
    config: Partial<RegistryConfig> = {}, 
    dependencies: Partial<RegistryDependencies> = {},
  ): TestRegistry {
    const registry = new TestRegistry(config, dependencies);
    registry.initialize();
    return registry;
  }

  protected constructor(
    config: Partial<RegistryConfig> = {}, 
    dependencies: Partial<RegistryDependencies> = {},
  ) {
    super({
      name: 'TestRegistry',
      ...config,
    }, dependencies);
  }

  // Required implementation of abstract registerComponents method
  protected registerComponents(): void {
    if (this.componentsRegistered) return;

    // Register a test component
    this.register('test.default', () => ({ value: 'default' }));

    this.componentsRegistered = true;
  }

  protected override createContainer(): SimpleContainer {
    return SimpleContainer.createFresh();
  }

  // Add a public method to access the protected logger
  public getLogger() {
    return this.logger;
  }

  // Add a public method to access the protected name
  public getName() {
    return this.name;
  }

  // Add a public method to access the protected config
  public getConfig() {
    return this.config;
  }

  // Add method to check if components are registered
  public areComponentsRegistered(): boolean {
    return this.componentsRegistered;
  }
}

describe('Registry', () => {
  describe('Base class functionality', () => {
    test('should initialize with default config', () => {
      const registry = TestRegistry.createFresh();

      expect(registry.getName()).toBe('TestRegistry');
      expect(registry.getConfig()).toEqual({ name: 'TestRegistry', silent: true });
    });

    test('should allow custom name in config', () => {
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

    test('should support updating config', () => {
      const registry = TestRegistry.createFresh({ customOption: 'initial' });

      expect(registry.getConfig()['customOption']).toBe('initial');

      registry.updateConfig({ customOption: 'updated' });

      expect(registry.getConfig()['customOption']).toBe('updated');
    });

    test('should merge new config with existing config', () => {
      const registry = TestRegistry.createFresh({
        option1: 'value1',
        option2: 'value2',
      });

      registry.updateConfig({ option2: 'updated' });

      expect(registry.getConfig()).toEqual({
        name: 'TestRegistry',
        option1: 'value1',
        option2: 'updated',
        silent: true,
      });
    });
  });

  // REMOVED BLOCK: describe('Component Interface Standardiz...


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
