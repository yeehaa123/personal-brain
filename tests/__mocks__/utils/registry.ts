/**
 * Mock Registry implementation for testing
 */
import { SimpleContainer } from '@/utils/container';
import type { Logger } from '@/utils/logger';
import { Registry, type RegistryConfig, type RegistryDependencies, type RegistryFactory } from '@/utils/registry';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Mock Registry class that follows the Component Interface Standardization pattern
 * Extends abstract Registry class instead of implementing IRegistry directly
 */
export class MockRegistry extends Registry {
  private static instance: MockRegistry | null = null;

  // Mock implementation tracking
  private registrations = new Map<string, { factory: RegistryFactory; singleton: boolean }>();
  private instances = new Map<string, unknown>();
  
  // No need for a separate mock logger property

  /** Registry type */
  protected override readonly registryType: 'resource' | 'service' = 'service';

  /**
   * Get the singleton instance
   * 
   * @param config Configuration options
   * @param dependencies Dependencies such as logger
   */
  public static override getInstance(
    config: Partial<RegistryConfig> = {}, 
    dependencies: Partial<RegistryDependencies> = {},
  ): MockRegistry {
    if (!MockRegistry.instance) {
      MockRegistry.instance = new MockRegistry(config, dependencies);
    }
    return MockRegistry.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    if (MockRegistry.instance) {
      MockRegistry.instance.clear();
    }
    MockRegistry.instance = null;
  }

  /**
   * Create a fresh instance
   * 
   * @param config Configuration options
   * @param dependencies Dependencies such as logger
   */
  public static override createFresh(
    config: Partial<RegistryConfig> = {}, 
    dependencies: Partial<RegistryDependencies> = {},
  ): MockRegistry {
    return new MockRegistry(config, dependencies);
  }

  /**
   * Protected constructor to enforce singleton pattern
   * 
   * @param config Configuration options
   * @param dependencies Dependencies such as logger
   */
  protected constructor(
    config: Partial<RegistryConfig> = {}, 
    dependencies: Partial<RegistryDependencies> = {},
  ) {
    // Call parent constructor
    super(config, dependencies);

    // Create silent mock logger for testing if not provided
    if (!dependencies.logger) {
      // Replace logger with mock implementation
      (this.logger as Logger) = MockLogger.createFresh({ silent: true }) as unknown as Logger;
    }
  }

  /**
   * Initialize the registry
   */
  public override initialize(): boolean {
    // Register our mock components
    this.registerComponents();
    return true;
  }

  /**
   * Check if registry is initialized
   */
  public override isInitialized(): boolean {
    return true; // Always initialized for mocks
  }

  /**
   * Register a component
   */
  public override register<T>(id: string, factory: RegistryFactory<T>, singleton = true): void {
    this.registrations.set(id, { factory, singleton });
    this.instances.delete(id);
  }

  /**
   * Resolve a component
   */
  public override resolve<T = unknown>(id: string): T {
    const registration = this.registrations.get(id);

    if (!registration) {
      throw new Error(`Component '${id}' is not registered`);
    }

    if (registration.singleton && this.instances.has(id)) {
      return this.instances.get(id) as T;
    }

    const instance = registration.factory(this.container);

    if (registration.singleton) {
      this.instances.set(id, instance);
    }

    return instance as T;
  }

  /**
   * Check if a component is registered
   */
  public override has(id: string): boolean {
    return this.registrations.has(id);
  }

  /**
   * Unregister a component
   */
  public override unregister(id: string): void {
    this.registrations.delete(id);
    this.instances.delete(id);
  }

  /**
   * Clear all registrations
   */
  public override clear(): void {
    this.registrations.clear();
    this.instances.clear();
  }

  /**
   * Update registry config
   */
  public override updateConfig(newConfig: Partial<RegistryConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Implementation of abstract method required by Registry
   */
  protected override registerComponents(): void {
    // No-op in mock implementation
  }

  /**
   * Create container - override from Registry
   */
  protected override createContainer(): SimpleContainer {
    return SimpleContainer.createFresh();
  }

  /**
   * Validate dependency - override from Registry
   */
  protected override validateDependency(_id: string, dependencyId: string): boolean {
    return this.has(dependencyId);
  }
}
