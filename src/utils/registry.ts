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
 * Abstract base class for all registries
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export abstract class Registry<TOptions extends RegistryOptions = RegistryOptions> {
  /**
   * Internal singleton instance storage
   * Implemented by derived classes
   */
  protected static _instance: Registry | null = null;
  
  /**
   * Registry name for logging purposes
   */
  protected readonly name: string;
  
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
    return this.container.resolve<T>(id);
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