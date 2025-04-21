/**
 * Unified Registry Pattern
 * 
 * This module provides a standardized registry pattern that implements the 
 * Component Interface Standardization pattern used throughout the codebase.
 * 
 * It serves as a foundation for both resource and service registries,
 * providing a consistent API for registration, dependency resolution,
 * and lifecycle management.
 */

import { Logger } from './logger';

/**
 * Type for a factory function that creates a service instance
 */
export type ServiceFactory<T = unknown> = (container: SimpleContainer) => T;

/**
 * Configuration for a service registration
 */
export interface ServiceConfig<T = unknown> {
  factory: ServiceFactory<T>;
  singleton?: boolean;
}

/**
 * Simple container implementation to replace DependencyContainer
 * Provides the same interface but with a simplified implementation
 */
export class SimpleContainer {
  private services = new Map<string, ServiceConfig<unknown>>();
  private instances = new Map<string, unknown>();
  private logger: Logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Register a service with the container
   * @param name Unique service identifier
   * @param factory Factory function to create the service
   * @param singleton Whether to create only one instance (default: true)
   */
  register<T>(name: string, factory: ServiceFactory<T>, singleton = true): void {
    if (this.services.has(name)) {
      this.logger.warn(`Service '${name}' is already registered. Overwriting previous registration.`);
    }
    this.services.set(name, { factory, singleton });
    // Clear instance if service is re-registered
    this.instances.delete(name);
  }

  /**
   * Get a service instance from the container
   * @param name Service identifier
   * @returns Service instance
   * @throws Error if service is not registered
   */
  resolve<T>(name: string): T {
    const serviceConfig = this.services.get(name);
    
    if (!serviceConfig) {
      throw new Error(`Service '${name}' is not registered in the container`);
    }
    
    // For singletons, return the cached instance if available
    if (serviceConfig.singleton && this.instances.has(name)) {
      return this.instances.get(name) as T;
    }
    
    // Create a new instance
    const instance = serviceConfig.factory(this);
    
    // Cache the instance if it's a singleton
    if (serviceConfig.singleton) {
      this.instances.set(name, instance);
    }
    
    return instance as T;
  }

  /**
   * Check if a service is registered
   * @param name Service identifier
   * @returns True if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Remove a service registration
   * @param name Service identifier
   */
  unregister(name: string): void {
    this.services.delete(name);
    this.instances.delete(name);
  }

  /**
   * Clear all service registrations and instances
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
  }
}

/**
 * Basic options for Registry configuration
 */
export interface RegistryOptions {
  /**
   * Name of the registry for logging purposes
   */
  name?: string;
  
  /**
   * Whether to suppress logs
   */
  silent?: boolean;
  
  /**
   * Optional container to use
   * If not provided, each Registry will create its own container
   */
  container?: SimpleContainer;
  
  /**
   * Additional configuration properties
   */
  [key: string]: unknown;
}

/**
 * Registry factory function type
 * Used to create registry entries with proper dependency injection
 */
export type RegistryFactory<T = unknown> = (container: SimpleContainer) => T;

/**
 * Registry interface to ensure consistent implementation
 */
export interface IRegistry<T extends RegistryOptions = RegistryOptions> {
  // Core methods
  initialize(): boolean;
  isInitialized(): boolean;
  
  // Component management
  register<C>(id: string, factory: RegistryFactory<C>, singleton?: boolean): void;
  resolve<C>(id: string): C;
  has(id: string): boolean;
  unregister(id: string): void;
  clear(): void;
  
  // Configuration
  updateOptions(options: Partial<T>): void;
}

/**
 * Abstract base class for all registries
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export abstract class Registry<TOptions extends RegistryOptions = RegistryOptions> implements IRegistry<TOptions> {
  // No static _instance - each derived class should have its own
  
  /**
   * Get the singleton instance
   * This implementation should be overridden by derived classes but provides a default
   * 
   * @param _options Optional configuration options
   * @returns The singleton instance
   */
  public static getInstance(_options?: RegistryOptions): Registry {
    // This is abstract and should be implemented by subclasses
    // We provide a default implementation that throws an error if not properly implemented
    throw new Error('getInstance must be implemented by derived classes');
  }
  
  /**
   * Reset the singleton instance
   * This is primarily for testing purposes
   */
  public static resetInstance(): void {
    // Each derived class should implement this to reset its own singleton instance
    // We don't reset _instance here as each class maintains its own static instance
  }
  
  /**
   * Create a fresh instance without affecting the singleton
   * This is primarily for testing purposes
   * 
   * @param _options Optional configuration options
   * @returns A new registry instance
   */
  public static createFresh(_options?: RegistryOptions): Registry {
    // This is abstract and should be implemented by subclasses
    throw new Error('createFresh must be implemented by derived classes');
  }
  
  /**
   * Registry name for logging purposes
   */
  protected readonly name: string;
  
  /**
   * Registry type for context-specific operations
   */
  protected abstract readonly registryType: 'resource' | 'service';
  
  /**
   * Logger instance
   */
  protected readonly logger: Logger;
  
  /**
   * Registry configuration options
   */
  protected options: TOptions;
  
  /**
   * Internal container for dependency management
   */
  protected container: SimpleContainer;
  
  /**
   * Initialization state tracking
   */
  private initialized = false;
  
  /**
   * Protected constructor to enforce singleton pattern
   */
  protected constructor(options: TOptions) {
    this.options = options;
    this.name = options.name || this.constructor.name;
    this.logger = Logger.getInstance({ 
      silent: options.silent || process.env.NODE_ENV === 'test',
    });
    this.container = options.container || this.createContainer();
    
    this.logger.debug(`${this.name} constructed`);
  }
  
  /**
   * Create a new SimpleContainer instance
   * Override this method if you need a different container implementation
   */
  protected createContainer(): SimpleContainer {
    return new SimpleContainer();
  }
  
  /**
   * Standard initialization method
   * Calls the abstract registerComponents method implemented by derived classes
   * 
   * @returns Whether initialization was successful
   */
  public initialize(): boolean {
    if (this.initialized) return true;
    
    this.logger.info(`Initializing ${this.name} (${this.registryType})`);
    try {
      this.registerComponents();
      this.initialized = true;
      this.logger.info(`${this.name} initialized successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error initializing ${this.name}`, { error });
      return false;
    }
  }
  
  /**
   * Abstract method for standardized component registration
   * Must be implemented by derived classes
   */
  protected abstract registerComponents(): void;
  
  /**
   * Check if registry is initialized
   * 
   * @returns Whether registry is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Helper method to validate dependencies
   * 
   * @param id Component ID
   * @param dependencyId Dependency ID
   * @returns Whether dependency is valid
   */
  protected validateDependency(id: string, dependencyId: string): boolean {
    if (!this.has(dependencyId)) {
      this.logger.error(`Component "${id}" is missing dependency "${dependencyId}"`);
      return false;
    }
    return true;
  }
  
  /**
   * Registers a component in the registry
   * 
   * @param id Unique identifier for the component
   * @param factory Factory function to create the component
   * @param singleton Whether the component should be a singleton
   */
  public register<T>(id: string, factory: RegistryFactory<T>, singleton = true): void {
    if (!this.container.has(id)) {
      this.container.register(id, factory, singleton);
      this.logger.debug(`Registered ${id} in ${this.name}`);
    } else {
      this.logger.debug(`${id} already registered in ${this.name}`);
    }
  }
  
  /**
   * Resolves a component from the registry
   * 
   * @param id Unique identifier for the component
   * @returns The resolved component
   */
  public resolve<T = unknown>(id: string): T {
    try {
      return this.container.resolve<T>(id);
    } catch (error) {
      this.logger.error(`Failed to resolve ${this.registryType} with ID "${id}"`, { error });
      throw error;
    }
  }
  
  /**
   * Checks if a component is registered in the registry
   * 
   * @param id Unique identifier for the component
   * @returns Whether the component is registered
   */
  public has(id: string): boolean {
    return this.container.has(id);
  }
  
  /**
   * Unregisters a component from the registry
   * 
   * @param id Unique identifier for the component
   */
  public unregister(id: string): void {
    this.container.unregister(id);
    this.logger.debug(`Unregistered ${id} from ${this.name}`);
  }
  
  /**
   * Clears all registered components
   */
  public clear(): void {
    this.container.clear();
    this.initialized = false;
    this.logger.debug(`Cleared all registrations from ${this.name}`);
  }
  
  /**
   * Updates registry options
   * 
   * @param options New options to merge with existing options
   */
  public updateOptions(options: Partial<TOptions>): void {
    this.options = { ...this.options, ...options };
    this.logger.debug(`Updated options for ${this.name}`);
  }
}

/**
 * Utility function to ensure registry singleton is initialized
 * Creates a singleton instance of a registry if it doesn't exist
 * 
 * @param registryClass Registry class to instantiate
 * @param options Options to pass to the constructor
 * @returns Whether the registry was initialized
 */
export function ensureRegistryInitialized<T extends Registry, O extends RegistryOptions>(
  registryClass: { getInstance: (options?: O) => T },
  options?: O,
): boolean {
  const registry = registryClass.getInstance(options);
  return !!registry;
}