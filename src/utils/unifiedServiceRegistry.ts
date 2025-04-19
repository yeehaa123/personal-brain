/**
 * Unified Service Registry
 * 
 * This registry follows the Component Interface Standardization pattern
 * and provides a central point for registering and resolving services.
 * 
 * It will eventually replace both ResourceRegistry and ServiceRegistry
 * to provide a consistent approach to dependency management.
 */

import { DependencyContainer } from './dependencyContainer';
import type { ServiceFactory } from './dependencyContainer';
import { Logger } from './logger';
import { Registry, type RegistryOptions } from './registry';

/**
 * Extended options for the UnifiedServiceRegistry
 */
export interface UnifiedServiceRegistryOptions extends RegistryOptions {
  /**
   * API key for AI services
   */
  apiKey?: string;
  
  /**
   * News API key for external sources
   */
  newsApiKey?: string;
}

/**
 * Unified Service Registry that implements the Component Interface Standardization pattern
 * 
 * This class follows the standards defined in the CONTEXT_STANDARDIZATION.md document:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class UnifiedServiceRegistry extends Registry<UnifiedServiceRegistryOptions> {
  /**
   * Singleton instance storage
   */
  private static instance: UnifiedServiceRegistry | null = null;
  
  /**
   * Track if services have been registered to avoid duplicate logs
   */
  private servicesRegistered = false;
  
  /**
   * Get the singleton instance
   * 
   * @param options Configuration options
   * @returns Singleton instance
   */
  public static getInstance(options?: UnifiedServiceRegistryOptions): UnifiedServiceRegistry {
    if (!UnifiedServiceRegistry.instance) {
      UnifiedServiceRegistry.instance = new UnifiedServiceRegistry(options || {});
      const logger = Logger.getInstance();
      logger.debug('UnifiedServiceRegistry singleton instance created');
    } else if (options) {
      // Update options if instance exists but options were provided
      UnifiedServiceRegistry.instance.updateOptions(options);
    }
    
    return UnifiedServiceRegistry.instance;
  }
  
  /**
   * Reset the singleton instance
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    if (UnifiedServiceRegistry.instance) {
      // Clear container registration
      UnifiedServiceRegistry.instance.clear();
      UnifiedServiceRegistry.instance = null;
      
      const logger = Logger.getInstance();
      logger.debug('UnifiedServiceRegistry singleton instance reset');
    }
  }
  
  /**
   * Create a fresh instance
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns New instance
   */
  public static createFresh(options?: UnifiedServiceRegistryOptions): UnifiedServiceRegistry {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh UnifiedServiceRegistry instance');
    
    return new UnifiedServiceRegistry(options || {});
  }
  
  /**
   * Protected constructor to enforce singleton pattern
   * 
   * @param options Configuration options
   */
  protected constructor(options: UnifiedServiceRegistryOptions) {
    super({
      name: 'UnifiedServiceRegistry',
      ...options,
    });
  }
  
  /**
   * Create dependency container
   * 
   * @returns Dependency container instance
   */
  protected createContainer(): DependencyContainer {
    return DependencyContainer.createFresh();
  }
  
  /**
   * Initialize essential services
   * Helper method to configure commonly used services
   */
  public initializeEssentialServices(): void {
    // Only log the first time services are registered
    if (!this.servicesRegistered) {
      this.logger.info('Initializing essential services in UnifiedServiceRegistry');
    }
    
    // Initialize both resource and service components here
    // This allows us to maintain a clear separation between resources and services
    // while ensuring they are properly interconnected
    
    // Mark services as registered
    if (!this.servicesRegistered) {
      this.logger.info('Essential services initialized in UnifiedServiceRegistry');
      this.servicesRegistered = true;
    }
  }
  
  /**
   * Helper method for standardized service registration
   * Reduces duplication when registering services
   * 
   * @param serviceId Unique identifier for the service
   * @param factory Factory function to create the service
   * @param singleton Whether the service should be a singleton
   */
  public registerService<T = any>(serviceId: string, factory: ServiceFactory<T>, singleton = true): void {
    this.register(serviceId, factory, singleton);
  }
  
  /**
   * Helper method for getting services with proper typing
   * 
   * @param serviceId Unique identifier for the service
   * @returns The service instance
   */
  public getService<T>(serviceId: string): T {
    return this.resolve<T>(serviceId);
  }
}

/**
 * Service identifier constants for consistent naming
 * 
 * These identifiers are used across the application to refer to specific services
 * centralizing them here ensures consistency and prevents typos
 */
export const ServiceIdentifiers = {
  // Resource identifiers
  ClaudeModel: 'resource.ai.claude',
  EmbeddingService: 'resource.ai.embedding',
  
  // Repository identifiers
  NoteRepository: 'repositories.note',
  ProfileRepository: 'repositories.profile',
  
  // Embedding service identifiers
  NoteEmbeddingService: 'embedding.note',
  ProfileEmbeddingService: 'embedding.profile',
  
  // Search service identifiers
  NoteSearchService: 'search.note',
  ProfileSearchService: 'search.profile',
  
  // Tag service identifiers
  ProfileTagService: 'tag.profile',
  
  // Conversation service identifiers
  ConversationResourceService: 'conversation.resources',
  ConversationToolService: 'conversation.tools',
  ConversationQueryService: 'conversation.query',
  ConversationMemoryService: 'conversation.memory',
  ConversationStorageAdapter: 'conversation.storage',
  ConversationFormatter: 'conversation.formatter',
  ConversationMcpFormatter: 'conversation.mcpFormatter',
};

/**
 * Global accessor for the unified service registry
 * This provides a simpler API for accessing services
 * 
 * @param serviceId Unique identifier for the service
 * @returns The service instance
 */
export function getService<T>(serviceId: string): T {
  return UnifiedServiceRegistry.getInstance().getService<T>(serviceId);
}