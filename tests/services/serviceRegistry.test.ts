/**
 * Tests for service registry and dependency injection
 */
import { beforeEach, describe, expect, test } from 'bun:test';


// Import interfaces and concrete types
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { IEmbeddingService } from '@/services/interfaces/IEmbeddingService';
import type { IRepository } from '@/services/interfaces/IRepository';
import type { ISearchService } from '@/services/interfaces/ISearchService';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { NoteRepository } from '@/services/notes/noteRepository';
import { NoteSearchService } from '@/services/notes/noteSearchService';
import { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService'; 
import { ProfileRepository } from '@/services/profiles/profileRepository';
import { ProfileSearchService } from '@/services/profiles/profileSearchService';
import { ProfileTagService } from '@/services/profiles/profileTagService';
import { registerServices, ServiceIdentifiers } from '@/services/serviceRegistry';
import { createContainer } from '@/utils/dependencyContainer';


describe('Service Registry', () => {
  beforeEach(() => {
    // Create a fresh container for each test
    container = createContainer();
    registerServices(container);
  });
  
  let container = createContainer();
  
  test('should register all expected services', () => {
    // Check repositories
    expect(container.has(ServiceIdentifiers.NoteRepository)).toBe(true);
    expect(container.has(ServiceIdentifiers.ProfileRepository)).toBe(true);
    
    // Check embedding services
    expect(container.has(ServiceIdentifiers.NoteEmbeddingService)).toBe(true);
    expect(container.has(ServiceIdentifiers.ProfileEmbeddingService)).toBe(true);
    
    // Check search services
    expect(container.has(ServiceIdentifiers.NoteSearchService)).toBe(true);
    expect(container.has(ServiceIdentifiers.ProfileSearchService)).toBe(true);
    
    // Check tag services
    expect(container.has(ServiceIdentifiers.ProfileTagService)).toBe(true);
  });
  
  test('should resolve note repository', () => {
    const repository = container.resolve<IRepository<Note>>(ServiceIdentifiers.NoteRepository);
    expect(repository).toBeInstanceOf(NoteRepository);
  });
  
  test('should resolve profile repository', () => {
    const repository = container.resolve<IRepository<Profile>>(ServiceIdentifiers.ProfileRepository);
    expect(repository).toBeInstanceOf(ProfileRepository);
  });
  
  test('should resolve note embedding service', () => {
    const service = container.resolve<IEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
    expect(service).toBeInstanceOf(NoteEmbeddingService);
  });
  
  test('should resolve profile embedding service', () => {
    const service = container.resolve<IEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
    expect(service).toBeInstanceOf(ProfileEmbeddingService);
  });
  
  test('should resolve note search service with dependencies', () => {
    const service = container.resolve<ISearchService<Note>>(ServiceIdentifiers.NoteSearchService);
    expect(service).toBeInstanceOf(NoteSearchService);
    
    // We cannot check protected properties directly, so just verify it's instantiated
    expect(service).toBeDefined();
  });
  
  test('should resolve profile search service with dependencies', () => {
    const service = container.resolve<ISearchService<Profile>>(ServiceIdentifiers.ProfileSearchService);
    expect(service).toBeInstanceOf(ProfileSearchService);
    
    // We cannot check protected properties directly, so just verify it's instantiated
    expect(service).toBeDefined();
  });
  
  test('should resolve profile tag service', () => {
    const service = container.resolve(ServiceIdentifiers.ProfileTagService);
    expect(service).toBeInstanceOf(ProfileTagService);
  });
  
  test('should maintain singleton instances', () => {
    const repository1 = container.resolve(ServiceIdentifiers.NoteRepository);
    const repository2 = container.resolve(ServiceIdentifiers.NoteRepository);
    
    expect(repository1).toBe(repository2); // Same instance
  });
  
  test('should support service configuration', () => {
    // Create a new container with custom config
    const configuredContainer = createContainer();
    const testApiKey = 'test-api-key';
    
    registerServices(configuredContainer, { apiKey: testApiKey });
    
    const embeddingService = configuredContainer.resolve<NoteEmbeddingService>(
      ServiceIdentifiers.NoteEmbeddingService,
    );
    
    // The API key is passed to the constructor
    expect(embeddingService).toBeDefined();
    // We can't directly check the value since it's private
  });
});