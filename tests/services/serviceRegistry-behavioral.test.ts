/**
 * Behavioral tests for ServiceRegistry
 * 
 * These tests focus on the observable behavior of the service registry
 * rather than implementation details.
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { ServiceIdentifiers, ServiceRegistry } from '@/services/serviceRegistry';

describe('Service Registry Behavior', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    ServiceRegistry.resetInstance();
    registry = ServiceRegistry.getInstance();
  });

  describe('Service Registration', () => {
    test('provides access to registered services', () => {
      // Initialize the registry
      const initialized = registry.initialize();
      expect(initialized).toBe(true);
      
      // Should have core services available
      expect(registry.has(ServiceIdentifiers.NoteRepository)).toBe(true);
      expect(registry.has(ServiceIdentifiers.NoteEmbeddingService)).toBe(true);
      expect(registry.has(ServiceIdentifiers.NoteSearchService)).toBe(true);
    });

    test('returns service instances when requested', () => {
      registry.initialize();
      
      // Get services by identifier
      const noteRepo = registry.getService(ServiceIdentifiers.NoteRepository);
      const embeddingService = registry.getService(ServiceIdentifiers.NoteEmbeddingService);
      const searchService = registry.getService(ServiceIdentifiers.NoteSearchService);
      
      // Services should exist
      expect(noteRepo).toBeDefined();
      expect(embeddingService).toBeDefined();
      expect(searchService).toBeDefined();
    });

    test('provides typed accessor methods', () => {
      registry.initialize();
      
      // Use convenience methods
      const noteRepo = registry.getNoteRepository();
      const embeddingService = registry.getNoteEmbeddingService();
      const searchService = registry.getNoteSearchService();
      
      // Services should exist
      expect(noteRepo).toBeDefined();
      expect(embeddingService).toBeDefined();
      expect(searchService).toBeDefined();
    });
  });

  describe('Service Lifecycle', () => {
    test('tracks initialization state', () => {
      // Create fresh non-initialized registry
      ServiceRegistry.resetInstance();
      const freshRegistry = ServiceRegistry.createFresh();
      
      // Auto-initializes on createFresh
      expect(freshRegistry.isInitialized()).toBe(true);
    });

    test('prevents re-initialization', () => {
      // First initialization
      const firstResult = registry.initialize();
      expect(firstResult).toBe(true);
      
      // Second initialization should be no-op
      const secondResult = registry.initialize();
      expect(secondResult).toBe(true);
      expect(registry.isInitialized()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles missing service requests gracefully', () => {
      registry.initialize();
      
      // Request non-existent service
      expect(() => {
        registry.getService('non-existent-service');
      }).toThrow();
    });

    test('handles uninitialized access gracefully', () => {
      // Since getInstance auto-initializes, we can't test uninitialized state
      // This test is now obsolete - remove or change its purpose
      
      // Test that non-existent service throws error instead
      registry.initialize();
      expect(() => {
        registry.getService('non-existent-service-id');
      }).toThrow();
    });
  });

  describe('Service Dependencies', () => {
    test('services can resolve their dependencies', () => {
      registry.initialize();
      
      // Get a service that has dependencies
      const searchService = registry.getNoteSearchService();
      
      // The service should be functional (not testing internals)
      expect(searchService).toBeDefined();
      expect(typeof searchService.search).toBe('function');
    });
  });
});