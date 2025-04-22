/**
 * Tests for ServiceRegistry
 * 
 * These tests verify that the ServiceRegistry correctly implements the
 * Registry interface, depends on ResourceRegistry, and provides access to
 * application services.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { ClaudeModel } from '@/resources/ai/claude';
import { EmbeddingService } from '@/resources/ai/embedding';
import { ResourceRegistry } from '@/resources/resourceRegistry';
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
import { ServiceIdentifiers, ServiceRegistry } from '@/services/serviceRegistry';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('ServiceRegistry Class', () => {
  // Store the original environment
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset singletons between tests
    ServiceRegistry.resetInstance();
    ResourceRegistry.resetInstance();
    NoteRepository.resetInstance();
    ProfileRepository.resetInstance();
    NoteEmbeddingService.resetInstance();
    ProfileEmbeddingService.resetInstance();
    NoteSearchService.resetInstance();
    ProfileSearchService.resetInstance();
    ProfileTagService.resetInstance();
    ClaudeModel.resetInstance();
    EmbeddingService.resetInstance();
    
    // Set up environment variables for testing
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'test-api-key',
      OPENAI_API_KEY: 'test-openai-key',
    };
    
    // Mock the ResourceRegistry to avoid actual API calls
    // Always use the proper factory method pattern
    spyOn(EmbeddingService, 'getInstance').mockImplementation(() => MockEmbeddingService.createFresh() as unknown as EmbeddingService);
  });
  
  afterEach(() => {
    // Restore the original environment
    process.env = originalEnv;
  });

  describe('Component Interface Standardization pattern', () => {
    test('getInstance should return the same instance', () => {
      const instance1 = ServiceRegistry.getInstance();
      const instance2 = ServiceRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = ServiceRegistry.getInstance();
      ServiceRegistry.resetInstance();
      const instance2 = ServiceRegistry.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('createFresh should create a new instance', () => {
      const singleton = ServiceRegistry.getInstance();
      const fresh = ServiceRegistry.createFresh();
      
      expect(singleton).not.toBe(fresh);
      expect(fresh).toBeInstanceOf(ServiceRegistry);
    });
  });

  describe('Service registration', () => {
    test('should automatically register standard services', () => {
      const registry = ServiceRegistry.createFresh();
      
      // Check for key repositories
      expect(registry.has(ServiceIdentifiers.NoteRepository)).toBe(true);
      expect(registry.has(ServiceIdentifiers.ProfileRepository)).toBe(true);
      
      // Check for embedding services
      expect(registry.has(ServiceIdentifiers.NoteEmbeddingService)).toBe(true);
      expect(registry.has(ServiceIdentifiers.ProfileEmbeddingService)).toBe(true);
      
      // Check for search services
      expect(registry.has(ServiceIdentifiers.NoteSearchService)).toBe(true);
      expect(registry.has(ServiceIdentifiers.ProfileSearchService)).toBe(true);
      
      // Check for tag service
      expect(registry.has(ServiceIdentifiers.ProfileTagService)).toBe(true);
    });
  });

  describe('Service resolution', () => {
    test('should resolve note repository', () => {
      const registry = ServiceRegistry.createFresh();
      const repository = registry.getNoteRepository();
      
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(NoteRepository);
    });
    
    test('should resolve profile repository', () => {
      const registry = ServiceRegistry.createFresh();
      const repository = registry.getProfileRepository();
      
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(ProfileRepository);
    });
    
    test('should resolve note embedding service', () => {
      const registry = ServiceRegistry.createFresh();
      const service = registry.getNoteEmbeddingService();
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(NoteEmbeddingService);
    });
    
    test('should resolve profile embedding service', () => {
      const registry = ServiceRegistry.createFresh();
      const service = registry.getProfileEmbeddingService();
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ProfileEmbeddingService);
    });
    
    test('should resolve note search service', () => {
      const registry = ServiceRegistry.createFresh();
      const service = registry.getNoteSearchService();
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(NoteSearchService);
    });
    
    test('should resolve profile search service', () => {
      const registry = ServiceRegistry.createFresh();
      const service = registry.getProfileSearchService();
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ProfileSearchService);
    });
    
    test('should resolve profile tag service', () => {
      const registry = ServiceRegistry.createFresh();
      const service = registry.getProfileTagService();
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ProfileTagService);
    });
    
    test('should resolve services with generic getService method', () => {
      const registry = ServiceRegistry.createFresh();
      
      const noteRepo = registry.getService<IRepository<Note>>(ServiceIdentifiers.NoteRepository);
      const profileRepo = registry.getService<IRepository<Profile>>(ServiceIdentifiers.ProfileRepository);
      const noteEmbedding = registry.getService<IEmbeddingService>(ServiceIdentifiers.NoteEmbeddingService);
      const profileEmbedding = registry.getService<IEmbeddingService>(ServiceIdentifiers.ProfileEmbeddingService);
      const noteSearch = registry.getService<ISearchService<Note>>(ServiceIdentifiers.NoteSearchService);
      const profileSearch = registry.getService<ISearchService<Profile>>(ServiceIdentifiers.ProfileSearchService);
      const tagService = registry.getService<ProfileTagService>(ServiceIdentifiers.ProfileTagService);
      
      expect(noteRepo).toBeInstanceOf(NoteRepository);
      expect(profileRepo).toBeInstanceOf(ProfileRepository);
      expect(noteEmbedding).toBeInstanceOf(NoteEmbeddingService);
      expect(profileEmbedding).toBeInstanceOf(ProfileEmbeddingService);
      expect(noteSearch).toBeInstanceOf(NoteSearchService);
      expect(profileSearch).toBeInstanceOf(ProfileSearchService);
      expect(tagService).toBeInstanceOf(ProfileTagService);
    });
  });

  describe('ResourceRegistry integration', () => {
    test('should use provided ResourceRegistry', () => {
      const resourceRegistry = ResourceRegistry.createFresh({
        anthropicApiKey: 'test-api-key',
        openAiApiKey: 'test-openai-key',
      });
      const serviceRegistry = ServiceRegistry.createFresh({ resourceRegistry });
      
      // @ts-expect-error - Accessing private property for testing
      expect(serviceRegistry.resourceRegistry).toBe(resourceRegistry);
    });
    
    test('should create ResourceRegistry if not provided', () => {
      const serviceRegistry = ServiceRegistry.createFresh();
      
      // @ts-expect-error - Accessing private property for testing
      expect(serviceRegistry.resourceRegistry).toBeInstanceOf(ResourceRegistry);
    });
  });

  describe('Global getService function', () => {
    test('should resolve services from singleton instance', () => {
      // First initialize the singleton
      ServiceRegistry.getInstance();
      
      // Then use the getService method from the registry
      const noteRepo = ServiceRegistry.getInstance().getService(ServiceIdentifiers.NoteRepository) as IRepository<Note>;
      
      expect(noteRepo).toBeDefined();
      expect(noteRepo).toBeInstanceOf(NoteRepository);
    });
  });
});