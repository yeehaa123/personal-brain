/**
 * Simple dependency injection container
 * Helps manage service dependencies throughout the application
 */
import logger from './logger';

/**
 * Type for a factory function that creates a service instance
 */
export type ServiceFactory<T = unknown> = (container: DependencyContainer) => T;

/**
 * Configuration for a service registration
 */
export interface ServiceConfig<T = unknown> {
  factory: ServiceFactory<T>;
  singleton?: boolean;
}

/**
 * Configuration for the dependency container
 */
export interface DependencyContainerConfig {
  /** Initial services to register */
  initialServices?: Record<string, ServiceConfig<unknown>>;
}

/**
 * Main dependency container that registers and resolves services
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class DependencyContainer {
  private services = new Map<string, ServiceConfig<unknown>>();
  private instances = new Map<string, unknown>();
  
  /** Singleton instance */
  private static instance: DependencyContainer | null = null;
  
  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   * @param config Optional configuration
   */
  private constructor(config?: DependencyContainerConfig) {
    // Register initial services if provided
    if (config?.initialServices) {
      Object.entries(config.initialServices).forEach(([name, serviceConfig]) => {
        this.services.set(name, serviceConfig);
      });
    }
  }
  
  /**
   * Get the singleton instance of DependencyContainer
   * @param config Optional configuration (only used when creating a new instance)
   * @returns The shared DependencyContainer instance
   */
  public static getInstance(config?: DependencyContainerConfig): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer(config);
    } else if (config) {
      // Log a warning if trying to get instance with different config
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }
    return DependencyContainer.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    if (DependencyContainer.instance) {
      DependencyContainer.instance.clear();
      DependencyContainer.instance = null;
    }
  }
  
  /**
   * Create a fresh container instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * @param config Optional configuration
   * @returns A new DependencyContainer instance
   */
  public static createFresh(config?: DependencyContainerConfig): DependencyContainer {
    return new DependencyContainer(config);
  }

  /**
   * Register a service with the container
   * @param name Unique service identifier
   * @param factory Factory function to create the service
   * @param singleton Whether to create only one instance (default: true)
   */
  register<T>(name: string, factory: ServiceFactory<T>, singleton = true): void {
    if (this.services.has(name)) {
      logger.warn(`Service '${name}' is already registered. Overwriting previous registration.`);
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
   * Check if a service is registered (alias for has)
   * @param name Service identifier
   * @returns True if service is registered
   */
  isRegistered(name: string): boolean {
    return this.has(name);
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
 * Helper for getting services from container with proper typing
 * @param serviceId Service identifier
 * @returns The service instance
 */
export function getService<T>(serviceId: string): T {
  return DependencyContainer.getInstance().resolve<T>(serviceId);
}