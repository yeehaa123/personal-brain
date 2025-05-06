/**
 * Tests for ServiceRegistry
 * 
 * These tests verify that the ServiceRegistry correctly implements the
 * Registry interface, depends on ResourceRegistry, and provides access to
 * application services.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';

import { ClaudeModel } from '@/resources/ai/claude';
import { EmbeddingService } from '@/resources/ai/embedding';
import { ResourceRegistry } from '@/resources/resourceRegistry';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { NoteRepository } from '@/services/notes/noteRepository';
import { NoteSearchService } from '@/services/notes/noteSearchService';
import { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import { ProfileRepository } from '@/services/profiles/profileRepository';
import { ProfileSearchService } from '@/services/profiles/profileSearchService';
import { ProfileTagService } from '@/services/profiles/profileTagService';
import { ServiceIdentifiers, ServiceRegistry } from '@/services/serviceRegistry';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';
import { MockResourceRegistry } from '@test/__mocks__/resources/resourceRegistry';

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
    spyOn(ResourceRegistry, 'getInstance').mockImplementation(() => {
      const mockRegistry = MockResourceRegistry.createFresh();
      // Add isInitialized method if it doesn't exist
      if (!('isInitialized' in mockRegistry)) {
        Object.defineProperty(mockRegistry, 'isInitialized', {
          value: () => true,
          configurable: true,
          writable: true,
        });
      }
      // Add initialize method if it doesn't exist
      if (!('initialize' in mockRegistry)) {
        Object.defineProperty(mockRegistry, 'initialize', {
          value: () => true,
          configurable: true,
          writable: true,
        });
      }
      return mockRegistry as unknown as ResourceRegistry;
    });
    
    // Mock the EmbeddingService to avoid actual API calls
    spyOn(EmbeddingService, 'getInstance').mockImplementation(() => MockEmbeddingService.createFresh() as unknown as EmbeddingService);
  });
  
  afterEach(() => {
    // Restore the original environment
    process.env = originalEnv;
  });

  test('should correctly register and provide all standard services', () => {
    const registry = ServiceRegistry.createFresh();
    
    // Test registration status of all services
    const expectedServices = [
      [ServiceIdentifiers.NoteRepository, NoteRepository],
      [ServiceIdentifiers.ProfileRepository, ProfileRepository],
      [ServiceIdentifiers.NoteEmbeddingService, NoteEmbeddingService],
      [ServiceIdentifiers.ProfileEmbeddingService, ProfileEmbeddingService],
      [ServiceIdentifiers.NoteSearchService, NoteSearchService],
      [ServiceIdentifiers.ProfileSearchService, ProfileSearchService],
      [ServiceIdentifiers.ProfileTagService, ProfileTagService],
    ];
    
    // Verify all services are registered
    expectedServices.forEach(([serviceId]) => {
      expect(registry.has(serviceId as string)).toBe(true);
    });
    
    // Verify direct accessor methods return correct instance types
    expect(registry.getNoteRepository()).toBeInstanceOf(NoteRepository);
    expect(registry.getProfileRepository()).toBeInstanceOf(ProfileRepository);
    expect(registry.getNoteEmbeddingService()).toBeInstanceOf(NoteEmbeddingService);
    expect(registry.getProfileEmbeddingService()).toBeInstanceOf(ProfileEmbeddingService);
    expect(registry.getNoteSearchService()).toBeInstanceOf(NoteSearchService);
    expect(registry.getProfileSearchService()).toBeInstanceOf(ProfileSearchService);
    expect(registry.getProfileTagService()).toBeInstanceOf(ProfileTagService);
    
    // Verify generic getService method
    const serviceTypes = [
      { id: ServiceIdentifiers.NoteRepository, type: NoteRepository },
      { id: ServiceIdentifiers.ProfileRepository, type: ProfileRepository },
      { id: ServiceIdentifiers.NoteEmbeddingService, type: NoteEmbeddingService },
      { id: ServiceIdentifiers.ProfileEmbeddingService, type: ProfileEmbeddingService },
      { id: ServiceIdentifiers.NoteSearchService, type: NoteSearchService },
      { id: ServiceIdentifiers.ProfileSearchService, type: ProfileSearchService },
      { id: ServiceIdentifiers.ProfileTagService, type: ProfileTagService },
    ];
    
    serviceTypes.forEach(({ id, type }) => {
      expect(registry.getService(id)).toBeInstanceOf(type);
    });
  });

  test('should handle ResourceRegistry integration', () => {
    // Test with provided ResourceRegistry
    const resourceRegistry = ResourceRegistry.createFresh(
      {
        anthropicApiKey: 'test-api-key',
        openAiApiKey: 'test-openai-key',
      },
    );
    // Pass resourceRegistry as a dependency
    const registryWithProvided = ServiceRegistry.createFresh(
      {}, // Config
      { resourceRegistry }, // Dependencies
    );
    
    // @ts-expect-error - Accessing private property for testing
    expect(registryWithProvided.resourceRegistry).toBe(resourceRegistry);
    
    // Test automatic creation when not provided
    const registryWithoutProvided = ServiceRegistry.createFresh();
    
    // @ts-expect-error - Accessing private property for testing
    expect(registryWithoutProvided.resourceRegistry).toBeDefined();
    
    // Test singleton behavior
    ServiceRegistry.getInstance();
    const noteRepo = ServiceRegistry.getInstance().getService(ServiceIdentifiers.NoteRepository);
    expect(noteRepo).toBeDefined();
    expect(noteRepo).toBeInstanceOf(NoteRepository);
  });
});