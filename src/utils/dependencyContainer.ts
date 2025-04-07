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
 * Main dependency container that registers and resolves services
 */
export class DependencyContainer {
  private services = new Map<string, ServiceConfig<unknown>>();
  private instances = new Map<string, unknown>();
  
  // Singleton instance
  private static instance: DependencyContainer | null = null;
  
  /**
   * Get the singleton instance of DependencyContainer
   * @returns The shared DependencyContainer instance
   */
  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = getContainer();
    }
    return DependencyContainer.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    DependencyContainer.instance = null;
  }
  
  /**
   * Create a fresh container instance (primarily for testing)
   * @returns A new DependencyContainer instance
   */
  public static createFresh(): DependencyContainer {
    return new DependencyContainer();
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
 * Allow container state to be scoped for testing
 */
let testContainer: DependencyContainer | null = null;

/**
 * The default global container instance for application-wide use
 */
export const defaultContainer = new DependencyContainer();

/**
 * Export container for backward compatibility
 */
export const container = defaultContainer;

/**
 * Get the container instance
 * Returns the test container if set, otherwise the default container
 */
export function getContainer(): DependencyContainer {
  return testContainer || defaultContainer;
}

/**
 * Helper for getting services from container with proper typing
 * @param serviceId Service identifier
 * @returns The service instance
 */
export function getService<T>(serviceId: string): T {
  return getContainer().resolve<T>(serviceId);
}

/**
 * Create a new isolated container (useful for testing)
 */
export function createContainer(): DependencyContainer {
  return new DependencyContainer();
}

/**
 * Set a container for testing purposes
 * @param container The container to use for testing
 * @returns A function to restore the original container
 */
export function useTestContainer(container?: DependencyContainer | null): () => void {
  const previousContainer = testContainer;
  
  // If a container is provided but doesn't have a clear method, add one
  if (container && !('clear' in container)) {
    Object.defineProperty(container, 'clear', {
      value: function() {
        // Default implementation of clear for test containers
        if (this.services && this.services.clear) {
          this.services.clear();
        }
        if (this.instances && this.instances.clear) {
          this.instances.clear();
        }
      },
      configurable: true,
      writable: true,
    });
  }
  
  // Explicitly convert undefined to null to match type definition
  testContainer = container === undefined ? null : container;
  
  // Return a cleanup function to restore the previous container
  return () => {
    testContainer = previousContainer;
  };
}