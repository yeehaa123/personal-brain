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
import { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
import { ContextMediator } from '@/protocol/messaging/contextMediator';
import { ResourceRegistry } from '@/resources/resourceRegistry';
import { SimpleContainer } from '@/utils/container';
import { Logger } from '@/utils/logger';
import { Registry, type RegistryConfig, type RegistryDependencies } from '@/utils/registry';
import { TextUtils } from '@/utils/textUtils';

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
export interface ServiceRegistryConfig extends RegistryConfig {
  /** API key for services that require it */
  apiKey?: string;
}

/**
 * ServiceRegistry dependencies
 */
export interface ServiceRegistryDependencies extends RegistryDependencies {
  /** Optional ResourceRegistry instance to use */
  resourceRegistry?: ResourceRegistry;
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

  // Note service identifiers
  NoteStorageAdapter: 'noteStorageAdapter', // Must match string used in LandingPageNoteAdapter

  // Conversation service identifiers
  ConversationResourceService: 'service.conversation.resources',
  ConversationToolService: 'service.conversation.tools',
  ConversationQueryService: 'service.conversation.query',
  ConversationMemoryService: 'service.conversation.memory',
  ConversationStorageAdapter: 'service.conversation.storage',
  ConversationFormatter: 'service.conversation.formatter',
  ConversationMcpFormatter: 'service.conversation.mcpFormatter',
  
  // Utility service identifiers
  TextUtils: 'service.utils.text',
  ContextMediator: 'service.messaging.mediator',
  Logger: 'service.utils.logger',
};

/**
 * Central registry for accessing internal services
 * 
 * This registry provides a single point of access for all application services,
 * ensuring consistent initialization and configuration.
 */
export class ServiceRegistry extends Registry {
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
   * @param config Configuration options
   * @param dependencies Dependencies such as logger
   * @returns The shared instance
   */
  public static override getInstance(
    config: Partial<ServiceRegistryConfig> = {}, 
    dependencies: Partial<ServiceRegistryDependencies> = {},
  ): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(config, dependencies);
      ServiceRegistry.instance.logger.debug('ServiceRegistry singleton instance created');
      // Auto-initialize on getInstance
      ServiceRegistry.instance.initialize();
    } else if (config && Object.keys(config).length > 0) {
      // Update config if provided
      ServiceRegistry.instance.updateConfig(config);
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
   * @param config Configuration options
   * @param dependencies Dependencies such as logger
   * @returns A new instance
   */
  public static override createFresh(
    config: Partial<ServiceRegistryConfig> = {}, 
    dependencies: Partial<ServiceRegistryDependencies> = {},
  ): ServiceRegistry {
    const registry = new ServiceRegistry(config, dependencies);
    registry.initialize();
    return registry;
  }

  /**
   * Protected constructor to enforce the use of getInstance() or createFresh()
   * 
   * @param config Configuration options
   * @param dependencies Dependencies such as logger
   */
  protected constructor(
    config: Partial<ServiceRegistryConfig> = {}, 
    dependencies: Partial<ServiceRegistryDependencies> = {},
  ) {
    super({
      name: 'ServiceRegistry',
      ...config,
    }, dependencies);

    // Initialize or reference the resource registry
    this.resourceRegistry = dependencies.resourceRegistry || ResourceRegistry.getInstance({
      anthropicApiKey: config.apiKey,
      openAiApiKey: config.apiKey,
    });

    // Ensure ResourceRegistry is initialized
    if (!this.resourceRegistry.isInitialized()) {
      this.logger.debug('Initializing ResourceRegistry dependency');
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
    return SimpleContainer.createFresh();
  }

  /**
   * Register standard services with the registry
   * This is called automatically by initialize()
   */
  protected registerComponents(): void {
    if (this.servicesRegistered) {
      return;
    }

    this.logger.debug('Registering standard services');

    // Register repositories
    this.register<NoteRepository>(
      ServiceIdentifiers.NoteRepository,
      () => NoteRepository.getInstance(),
    );

    this.register<ProfileRepository>(
      ServiceIdentifiers.ProfileRepository,
      () => ProfileRepository.getInstance(),
    );

    // Register embedding services
    this.register<NoteEmbeddingService>(
      ServiceIdentifiers.NoteEmbeddingService,
      () => {
        // Get embedding service from resource registry (used internally by NoteEmbeddingService)
        this.resourceRegistry.getEmbeddingService(); // Ensure it's initialized
        return NoteEmbeddingService.getInstance();
      },
    );

    this.register<ProfileEmbeddingService>(
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
    
    // Register utility services
    this.register(
      ServiceIdentifiers.TextUtils,
      () => TextUtils.getInstance(),
    );
    
    this.register(
      ServiceIdentifiers.ContextMediator,
      () => ContextMediator.getInstance(),
    );
    
    this.register(
      ServiceIdentifiers.Logger,
      () => Logger.getInstance(),
    );

    // Register search services with dependencies
    this.registerService<NoteSearchService>(
      ServiceIdentifiers.NoteSearchService,
      (container) => {
        // Get dependencies from container
        const repository = container.resolve<NoteRepository>(ServiceIdentifiers.NoteRepository);
        const embeddingService = container.resolve<NoteEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
        const textUtils = container.resolve<TextUtils>(ServiceIdentifiers.TextUtils);
        const logger = container.resolve<Logger>(ServiceIdentifiers.Logger);

        // Create service with injected dependencies using the updated interface
        return NoteSearchService.createFresh(
          { entityName: 'note' },
          {
            repository,
            embeddingService,
            logger,
            textUtils,
          },
        );
      },
      [
        ServiceIdentifiers.NoteRepository, 
        ServiceIdentifiers.NoteEmbeddingService,
        ServiceIdentifiers.TextUtils,
        ServiceIdentifiers.Logger,
      ],
    );

    this.registerService<ProfileSearchService>(
      ServiceIdentifiers.ProfileSearchService,
      (container) => {
        // Get dependencies from container
        const repository = container.resolve<ProfileRepository>(ServiceIdentifiers.ProfileRepository);
        const embeddingService = container.resolve<ProfileEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
        const tagService = container.resolve<ProfileTagService>(ServiceIdentifiers.ProfileTagService);
        const textUtils = container.resolve<TextUtils>(ServiceIdentifiers.TextUtils);
        const mediator = container.resolve<ContextMediator>(ServiceIdentifiers.ContextMediator);
        const logger = container.resolve<Logger>(ServiceIdentifiers.Logger);

        // Create service with injected dependencies using the updated interface
        return ProfileSearchService.createFresh(
          { entityName: 'profile' },
          {
            repository,
            embeddingService,
            tagService,
            logger,
            textUtils,
            mediator,
          },
        );
      },
      [
        ServiceIdentifiers.ProfileRepository,
        ServiceIdentifiers.ProfileEmbeddingService,
        ServiceIdentifiers.ProfileTagService,
        ServiceIdentifiers.TextUtils,
        ServiceIdentifiers.ContextMediator,
        ServiceIdentifiers.Logger,
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

    // Register NoteStorageAdapter
    this.register(
      ServiceIdentifiers.NoteStorageAdapter,
      () => NoteStorageAdapter.getInstance(),
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
    this.logger.debug('Standard services registered');
  }

  /**
   * Get the note repository
   * 
   * @returns Note repository
   */
  public getNoteRepository(): NoteRepository {
    return this.resolve<NoteRepository>(ServiceIdentifiers.NoteRepository);
  }

  /**
   * Get the profile repository
   * 
   * @returns Profile repository
   */
  public getProfileRepository(): ProfileRepository {
    return this.resolve<ProfileRepository>(ServiceIdentifiers.ProfileRepository);
  }

  /**
   * Get the note embedding service
   * 
   * @returns Note embedding service
   */
  public getNoteEmbeddingService(): NoteEmbeddingService {
    return this.resolve<NoteEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
  }

  /**
   * Get the profile embedding service
   * 
   * @returns Profile embedding service
   */
  public getProfileEmbeddingService(): ProfileEmbeddingService {
    return this.resolve<ProfileEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
  }

  /**
   * Get the note search service
   * 
   * @returns Note search service
   */
  public getNoteSearchService(): NoteSearchService {
    return this.resolve<NoteSearchService>(ServiceIdentifiers.NoteSearchService);
  }

  /**
   * Get the profile search service
   * 
   * @returns Profile search service
   */
  public getProfileSearchService(): ProfileSearchService {
    return this.resolve<ProfileSearchService>(ServiceIdentifiers.ProfileSearchService);
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
   * Get the note storage adapter
   * 
   * @returns Note storage adapter
   */
  public getNoteStorageAdapter(): NoteStorageAdapter {
    return this.resolve<NoteStorageAdapter>(ServiceIdentifiers.NoteStorageAdapter);
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
