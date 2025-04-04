/**
 * Service registry for dependency injection
 * Centralized registration of all application services
 */
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { container } from '@/utils/dependencyContainer';
import type { DependencyContainer , ServiceFactory } from '@/utils/dependencyContainer';
import logger from '@/utils/logger';

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
 * Service identifier constants for consistent naming
 */
export const ServiceIdentifiers = {
  // Repositories
  NoteRepository: 'repositories.note',
  ProfileRepository: 'repositories.profile',

  // Embedding Services
  NoteEmbeddingService: 'embedding.note',
  ProfileEmbeddingService: 'embedding.profile',

  // Search Services
  NoteSearchService: 'search.note',
  ProfileSearchService: 'search.profile',

  // Tag Services
  ProfileTagService: 'tag.profile',
};

// Track if services have been registered to avoid duplicate logs
let servicesRegistered = false;

/**
 * Reset service registration state (for testing)
 */
export function resetServiceRegistration(): void {
  servicesRegistered = false;
}

/**
 * Register all services with the DI container
 * @param container The dependency container to register services with
 * @param config Optional configuration for services
 */
export function registerServices(
  diContainer: DependencyContainer = container,
  config: { apiKey?: string } = {},
): void {
  // Only log the first time services are registered
  if (!servicesRegistered) {
    logger.info('Registering services with dependency container');
  }

  // Helper function to avoid duplicate registrations
  const registerIfNeeded = <T>(serviceId: string, factory: ServiceFactory<T>, singleton = true) => {
    // Only register if not already registered
    if (!diContainer.has(serviceId)) {
      diContainer.register<T>(serviceId, factory, singleton);
    }
  };

  // Register repositories
  registerIfNeeded<IRepository<Note>>(
    ServiceIdentifiers.NoteRepository,
    () => new NoteRepository(),
  );

  registerIfNeeded<IRepository<Profile>>(
    ServiceIdentifiers.ProfileRepository,
    () => new ProfileRepository(),
  );

  // Register embedding services
  registerIfNeeded<IEmbeddingService>(
    ServiceIdentifiers.NoteEmbeddingService,
    () => new NoteEmbeddingService(config.apiKey),
  );

  registerIfNeeded<IEmbeddingService>(
    ServiceIdentifiers.ProfileEmbeddingService,
    () => new ProfileEmbeddingService(config.apiKey),
  );

  // Register tag services
  registerIfNeeded(
    ServiceIdentifiers.ProfileTagService,
    () => new ProfileTagService(),
  );

  // Register search services with dependencies
  registerIfNeeded<ISearchService<Note>>(
    ServiceIdentifiers.NoteSearchService,
    (container) => {
      // Get dependencies from container
      const repository = container.resolve<NoteRepository>(ServiceIdentifiers.NoteRepository);
      const embeddingService = container.resolve<NoteEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);

      // Create service with injected dependencies
      return new NoteSearchService(repository, embeddingService);
    },
  );

  registerIfNeeded<ISearchService<Profile>>(
    ServiceIdentifiers.ProfileSearchService,
    (container) => {
      // Get dependencies from container
      const repository = container.resolve<ProfileRepository>(ServiceIdentifiers.ProfileRepository);
      const embeddingService = container.resolve<ProfileEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
      const tagService = container.resolve<ProfileTagService>(ServiceIdentifiers.ProfileTagService);

      // Create service with injected dependencies
      return new ProfileSearchService(repository, embeddingService, tagService);
    },
  );

  // Only log the first time services are registered
  if (!servicesRegistered) {
    logger.info('Service registration complete');
    servicesRegistered = true;
  }
}

/**
 * Helper for getting services from container with proper typing
 * @param serviceId Service identifier
 * @returns The service instance
 */
export function getService<T>(serviceId: string): T {
  return container.resolve<T>(serviceId);
}
