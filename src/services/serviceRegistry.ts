/**
 * Service Registry - Central access point for internal services
 * 
 * This module provides a centralized registry for accessing internal services
 * such as repositories, embedding services, search services, and more.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import { ConversationFormatter } from '@/contexts/conversations/formatters/conversationFormatter';
import { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import { ConversationResourceService } from '@/contexts/conversations/resources';
import { ConversationMemoryService, ConversationQueryService } from '@/contexts/conversations/services';
import { InMemoryStorage } from '@/contexts/conversations/storage/inMemoryStorage';
import { ConversationToolService } from '@/contexts/conversations/tools';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { ResourceRegistry } from '@/resources/resourceRegistry';
import { Registry, type RegistryOptions, SimpleContainer } from '@/utils/registry';

import type { IEmbeddingService } from './interfaces/IEmbeddingService';
import type { IRepository } from './interfaces/IRepository';
import type { ISearchService } from './interfaces/ISearchService';
import { NoteEmbeddingService } from './notes/noteEmbeddingService';
import { NoteRepository } from './notes/noteRepository';
import { NoteSearchService } from './notes/noteSearchService';
import { ProfileEmbeddingService } from './profiles/profileEmbeddingService';
import { ProfileRepository } from './profiles/profileRepository';
import { ProfileSearchService } from './profiles/profileSearchService';
import { ProfileTagService } from './profiles/profileTagService';

/**
 * ServiceRegistry configuration options
 */
export interface ServiceRegistryOptions extends RegistryOptions {
  /** Optional ResourceRegistry instance to use */
  resourceRegistry?: ResourceRegistry;
  /** API key for services that require it */
  apiKey?: string;
}

/**
 * Service identifier constants for consistent naming
 */
export const ServiceIdentifiers = {
  // Repository identifiers
  NoteRepository: 'service.repositories.note',
  ProfileRepository: 'service.repositories.profile',
  
  // Embedding service identifiers
  NoteEmbeddingService: 'service.embedding.note',
  ProfileEmbeddingService: 'service.embedding.profile',
  
  // Search service identifiers
  NoteSearchService: 'service.search.note',
  ProfileSearchService: 'service.search.profile',
  
  // Tag service identifiers
  ProfileTagService: 'service.tag.profile',
  
  // Conversation service identifiers
  ConversationResourceService: 'service.conversation.resources',
  ConversationToolService: 'service.conversation.tools',
  ConversationQueryService: 'service.conversation.query',
  ConversationMemoryService: 'service.conversation.memory',
  ConversationStorageAdapter: 'service.conversation.storage',
  ConversationFormatter: 'service.conversation.formatter',
  ConversationMcpFormatter: 'service.conversation.mcpFormatter',
};

/**
 * Central registry for accessing internal services
 * 
 * This registry provides a single point of access for all application services,
 * ensuring consistent initialization and configuration.
 */
export class ServiceRegistry extends Registry<ServiceRegistryOptions> {
  /** Singleton instance storage */
  private static instance: ServiceRegistry | null = null;
  
  /** Reference to the resource registry */
  private resourceRegistry: ResourceRegistry;
  
  /** Track if services have been registered */
  private servicesRegistered = false;
  
  /** Registry type for context-specific operations */
  protected readonly registryType = 'service';
  
  /**
   * Get the singleton instance of the ServiceRegistry
   * 
   * @param options Configuration options
   * @returns The shared instance
   */
  public static override getInstance(options?: ServiceRegistryOptions): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(options || {});
      ServiceRegistry.instance.logger.debug('ServiceRegistry singleton instance created');
      // Auto-initialize on getInstance
      ServiceRegistry.instance.initialize();
    } else if (options) {
      // Update options if instance exists but options were provided
      ServiceRegistry.instance.updateOptions(options);
    }
    
    return ServiceRegistry.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static override resetInstance(): void {
    if (ServiceRegistry.instance) {
      ServiceRegistry.instance.clear();
      ServiceRegistry.instance = null;
    }
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static override createFresh(options?: ServiceRegistryOptions): ServiceRegistry {
    const registry = new ServiceRegistry(options || {});
    registry.initialize();
    return registry;
  }
  
  /**
   * Protected constructor to enforce the use of getInstance() or createFresh()
   * 
   * @param options Configuration options
   */
  protected constructor(options: ServiceRegistryOptions) {
    super({
      name: 'ServiceRegistry',
      ...options,
    });
    
    // Initialize or reference the resource registry
    this.resourceRegistry = options.resourceRegistry || ResourceRegistry.getInstance({
      anthropicApiKey: options.apiKey,
      openAiApiKey: options.apiKey,
    });
    
    // Ensure ResourceRegistry is initialized
    if (!this.resourceRegistry.isInitialized()) {
      this.logger.info('Initializing ResourceRegistry dependency');
      const success = this.resourceRegistry.initialize();
      if (!success) {
        this.logger.warn('ResourceRegistry initialization failed, some services may not work');
      }
    }
  }
  
  /**
   * Create the dependency container
   * 
   * @returns A new SimpleContainer
   */
  protected override createContainer(): SimpleContainer {
    return new SimpleContainer();
  }
  
  /**
   * Register standard services with the registry
   * This is called automatically by initialize()
   */
  protected registerComponents(): void {
    if (this.servicesRegistered) {
      return;
    }
    
    this.logger.info('Registering standard services');
    
    // Register repositories
    this.register<IRepository<Note>>(
      ServiceIdentifiers.NoteRepository,
      () => NoteRepository.getInstance(),
    );
    
    this.register<IRepository<Profile>>(
      ServiceIdentifiers.ProfileRepository,
      () => ProfileRepository.getInstance(),
    );
    
    // Register embedding services
    this.register<IEmbeddingService>(
      ServiceIdentifiers.NoteEmbeddingService,
      () => {
        // Get embedding service from resource registry (used internally by NoteEmbeddingService)
        this.resourceRegistry.getEmbeddingService(); // Ensure it's initialized
        return NoteEmbeddingService.getInstance();
      },
    );
    
    this.register<IEmbeddingService>(
      ServiceIdentifiers.ProfileEmbeddingService,
      () => {
        // Get embedding service from resource registry (used internally by ProfileEmbeddingService)
        this.resourceRegistry.getEmbeddingService(); // Ensure it's initialized
        return ProfileEmbeddingService.getInstance();
      },
    );
    
    // Register tag services
    this.register(
      ServiceIdentifiers.ProfileTagService,
      () => ProfileTagService.getInstance(),
    );
    
    // Register search services with dependencies
    this.registerService<ISearchService<Note>>(
      ServiceIdentifiers.NoteSearchService,
      (container) => {
        // Get dependencies from container
        const repository = container.resolve<NoteRepository>(ServiceIdentifiers.NoteRepository);
        const embeddingService = container.resolve<NoteEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
        
        // Create service with injected dependencies using the updated interface
        return NoteSearchService.createWithDependencies(
          { entityName: 'note' },
          {
            repository,
            embeddingService
          }
        );
      },
      [ServiceIdentifiers.NoteRepository, ServiceIdentifiers.NoteEmbeddingService],
    );
    
    this.registerService<ISearchService<Profile>>(
      ServiceIdentifiers.ProfileSearchService,
      (container) => {
        // Get dependencies from container
        const repository = container.resolve<ProfileRepository>(ServiceIdentifiers.ProfileRepository);
        const embeddingService = container.resolve<ProfileEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
        const tagService = container.resolve<ProfileTagService>(ServiceIdentifiers.ProfileTagService);
        
        // Create service with injected dependencies using the updated interface
        return ProfileSearchService.createWithDependencies(
          { entityName: 'profile' },
          {
            repository,
            embeddingService,
            tagService
          }
        );
      },
      [
        ServiceIdentifiers.ProfileRepository, 
        ServiceIdentifiers.ProfileEmbeddingService,
        ServiceIdentifiers.ProfileTagService,
      ],
    );
    
    // Register conversation services
    
    // Register storage adapter and formatters first since other services depend on them
    this.register(
      ServiceIdentifiers.ConversationStorageAdapter,
      () => {
        const storage = InMemoryStorage.getInstance();
        return ConversationStorageAdapter.getInstance(storage);
      },
    );
    
    this.register(
      ServiceIdentifiers.ConversationFormatter,
      () => ConversationFormatter.getInstance(),
    );
    
    this.register(
      ServiceIdentifiers.ConversationMcpFormatter,
      () => ConversationMcpFormatter.getInstance(),
    );
    
    // Register resource and tool services
    this.register(
      ServiceIdentifiers.ConversationResourceService,
      () => ConversationResourceService.getInstance(),
    );
    
    this.register(
      ServiceIdentifiers.ConversationToolService,
      () => ConversationToolService.getInstance(),
    );
    
    // Register query service with its dependencies
    this.register(
      ServiceIdentifiers.ConversationQueryService,
      (container) => {
        const storageAdapter = container.resolve<ConversationStorageAdapter>(
          ServiceIdentifiers.ConversationStorageAdapter,
        );
        return ConversationQueryService.getInstance(storageAdapter);
      },
    );
    
    // Register memory service with its dependencies
    this.register(
      ServiceIdentifiers.ConversationMemoryService,
      (container) => {
        const storageAdapter = container.resolve<ConversationStorageAdapter>(
          ServiceIdentifiers.ConversationStorageAdapter,
        );
        return ConversationMemoryService.getInstance(storageAdapter);
      },
    );
    
    this.servicesRegistered = true;
    this.logger.info('Standard services registered');
  }
  
  /**
   * Get the note repository
   * 
   * @returns Note repository
   */
  public getNoteRepository(): IRepository<Note> {
    return this.resolve<IRepository<Note>>(ServiceIdentifiers.NoteRepository);
  }
  
  /**
   * Get the profile repository
   * 
   * @returns Profile repository
   */
  public getProfileRepository(): IRepository<Profile> {
    return this.resolve<IRepository<Profile>>(ServiceIdentifiers.ProfileRepository);
  }
  
  /**
   * Get the note embedding service
   * 
   * @returns Note embedding service
   */
  public getNoteEmbeddingService(): IEmbeddingService {
    return this.resolve<IEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
  }
  
  /**
   * Get the profile embedding service
   * 
   * @returns Profile embedding service
   */
  public getProfileEmbeddingService(): IEmbeddingService {
    return this.resolve<IEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
  }
  
  /**
   * Get the note search service
   * 
   * @returns Note search service
   */
  public getNoteSearchService(): ISearchService<Note> {
    return this.resolve<ISearchService<Note>>(ServiceIdentifiers.NoteSearchService);
  }
  
  /**
   * Get the profile search service
   * 
   * @returns Profile search service
   */
  public getProfileSearchService(): ISearchService<Profile> {
    return this.resolve<ISearchService<Profile>>(ServiceIdentifiers.ProfileSearchService);
  }
  
  /**
   * Get the profile tag service
   * 
   * @returns Profile tag service
   */
  public getProfileTagService(): ProfileTagService {
    return this.resolve<ProfileTagService>(ServiceIdentifiers.ProfileTagService);
  }
  
  /**
   * Get the conversation query service
   * 
   * @returns Conversation query service
   */
  public getConversationQueryService(): ConversationQueryService {
    return this.resolve<ConversationQueryService>(ServiceIdentifiers.ConversationQueryService);
  }
  
  /**
   * Get the conversation memory service
   * 
   * @returns Conversation memory service
   */
  public getConversationMemoryService(): ConversationMemoryService {
    return this.resolve<ConversationMemoryService>(ServiceIdentifiers.ConversationMemoryService);
  }
  
  /**
   * Helper method for getting any service with proper typing
   * 
   * @param serviceId Service identifier
   * @returns The service instance
   */
  public getService<T>(serviceId: string): T {
    return this.resolve<T>(serviceId);
  }
  
  /**
   * Helper method to get the ResourceRegistry
   * 
   * @returns The ResourceRegistry instance
   */
  public getResourceRegistry(): ResourceRegistry {
    return this.resourceRegistry;
  }
  
  /**
   * Standardized service registration helper
   * Validates dependencies before registering a service
   * 
   * @param id Service identifier
   * @param factory Factory function to create the service
   * @param dependencies Optional array of dependency identifiers
   */
  private registerService<T>(
    id: string,
    factory: (container: SimpleContainer) => T,
    dependencies: string[] = [],
  ): void {
    // Validate dependencies before registration
    let dependenciesValid = true;
    
    for (const dependencyId of dependencies) {
      if (this.has(dependencyId)) continue;
      
      // For cross-registry dependencies, check the resource registry
      if (dependencyId.startsWith('resource.') && this.resourceRegistry) {
        if (!this.resourceRegistry.has(dependencyId)) {
          this.logger.warn(`Service "${id}" depends on resource "${dependencyId}" which is not registered`);
          dependenciesValid = false;
        }
      } else {
        this.logger.warn(`Service "${id}" depends on "${dependencyId}" which is not registered`);
        dependenciesValid = false;
      }
    }
    
    if (!dependenciesValid) {
      this.logger.warn(`Registering service "${id}" with missing dependencies. It may not work correctly.`);
    }
    
    this.register<T>(id, factory);
  }
}

/**
 * Global accessor for the service registry
 * This provides a simpler API for accessing services
 * 
 * @param serviceId Service identifier
 * @returns The service instance
 */
export function getService<T>(serviceId: string): T {
  return ServiceRegistry.getInstance().getService<T>(serviceId);
}