/**
 * Tests for Registry
 * 
 * These tests verify that the base Registry class provides the expected
 * functionality for extension by more specific registry implementations.
 */
import { beforeEach, describe, expect, test } from 'bun:test';

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
  // Reset the singleton before each test suite
  beforeEach(() => {
    TestRegistry.resetInstance();
  });

  test('initialization with configuration', () => {
    // Test case table for initialization scenarios
    const initCases = [
      {
        name: 'default config',
        config: {},
        expectedName: 'TestRegistry',
        expectedConfig: { name: 'TestRegistry', silent: true },
      },
      {
        name: 'custom name in config',
        config: { name: 'CustomName' },
        expectedName: 'CustomName',
        expectedConfig: { name: 'CustomName', silent: true },
      },
    ];

    initCases.forEach(({ name, config, expectedName, expectedConfig }) => {
      const registry = TestRegistry.createFresh(config);
      expect(registry.getName(), `should set correct name with ${name}`).toBe(expectedName);
      expect(registry.getConfig(), `should set correct config with ${name}`).toEqual(expectedConfig);
      expect(registry.getLogger(), `should initialize logger with ${name}`).toBeDefined();
    });
  });

  test('registry component operations', () => {
    const registry = TestRegistry.createFresh();
    
    // Test register and resolve
    const mockComponent = { value: 'test' };
    registry.register<typeof mockComponent>('test.component', () => mockComponent);
    
    // Test has component
    expect(registry.has('test.component')).toBe(true);
    expect(registry.has('nonexistent.component')).toBe(false);
    
    // Test resolve component
    const resolved = registry.resolve('test.component');
    expect(resolved).toBe(mockComponent);
    
    // Test unregister component
    registry.unregister('test.component');
    expect(registry.has('test.component')).toBe(false);
    
    // Test clear all components
    registry.register<{ value: string }>('test.component1', () => ({ value: 'test1' }));
    registry.register<{ value: string }>('test.component2', () => ({ value: 'test2' }));
    expect(registry.has('test.component1')).toBe(true);
    expect(registry.has('test.component2')).toBe(true);
    
    registry.clear();
    expect(registry.has('test.component1')).toBe(false);
    expect(registry.has('test.component2')).toBe(false);
  });

  test('config management', () => {
    // Test case table for config updates
    const configCases = [
      {
        name: 'simple update',
        initial: { customOption: 'initial' },
        update: { customOption: 'updated' },
        expected: { name: 'TestRegistry', customOption: 'updated', silent: true },
      },
      {
        name: 'merge with existing',
        initial: { option1: 'value1', option2: 'value2' },
        update: { option2: 'updated' },
        expected: { name: 'TestRegistry', option1: 'value1', option2: 'updated', silent: true },
      },
    ];

    configCases.forEach(({ name, initial, update, expected }) => {
      const registry = TestRegistry.createFresh(initial);
      registry.updateConfig(update);
      expect(registry.getConfig(), `should correctly update config for ${name}`).toEqual(expected);
    });
  });

  test('initialization behavior', () => {
    // Test case table for initialization behavior
    const initBehaviorCases = [
      {
        name: 'getInstance initialization',
        setupFn: () => {
          TestRegistry.resetInstance();
          return TestRegistry.getInstance();
        },
        expectInitialized: true,
        expectComponentsRegistered: true,
      },
      {
        name: 'createFresh initialization',
        setupFn: () => TestRegistry.createFresh(),
        expectInitialized: true,
        expectComponentsRegistered: true,
      },
      {
        name: 'clear affects initialization',
        setupFn: () => {
          const registry = TestRegistry.createFresh();
          registry.clear();
          return registry;
        },
        expectInitialized: false,
        expectComponentsRegistered: true, // clear doesn't reset componentsRegistered flag
      },
    ];

    initBehaviorCases.forEach(({ name, setupFn, expectInitialized, expectComponentsRegistered }) => {
      const registry = setupFn();
      expect(registry.isInitialized(), `isInitialized should be ${expectInitialized} for ${name}`).toBe(expectInitialized);
      expect(registry.areComponentsRegistered(), `componentsRegistered should be ${expectComponentsRegistered} for ${name}`).toBe(expectComponentsRegistered);
    });

    // Specific test for default components
    const registry = TestRegistry.createFresh();
    expect(registry.has('test.default')).toBe(true);
    const component = registry.resolve('test.default');
    expect(component).toEqual({ value: 'default' });
  });
});