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

import type { DependencyContainer } from './dependencyContainer';
import { Logger } from './logger';

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
   * Optional dependency container to use
   * If not provided, each Registry will create its own container
   */
  container?: DependencyContainer;
  
  /**
   * Additional configuration properties
   */
  [key: string]: unknown;
}

/**
 * Registry factory function type
 * Used to create registry entries with proper dependency injection
 */
export type RegistryFactory<T = any> = (container: DependencyContainer) => T;

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
  protected container: DependencyContainer;
  
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
   * Abstract method to create internal container
   * Allows derived classes to use different container implementations
   */
  protected abstract createContainer(): DependencyContainer;
  
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
  public resolve<T = any>(id: string): T {
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