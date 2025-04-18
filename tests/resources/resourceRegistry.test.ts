/**
 * Tests for ResourceRegistry
 * 
 * These tests verify that the ResourceRegistry correctly implements the
 * Registry interface and provides access to AI resources.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';

import { ClaudeModel } from '@/resources/ai/claude';
import { EmbeddingService } from '@/resources/ai/embedding';
import type { EmbeddingModelAdapter, LanguageModelAdapter } from '@/resources/ai/interfaces';
import { ResourceIdentifiers, ResourceRegistry } from '@/resources/resourceRegistry';
import { ClaudeModel as MockClaudeModel } from '@test/__mocks__/resources/ai/claude/claude';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('ResourceRegistry', () => {
  // Preserve original environment
  const originalEnv = { ...process.env };
  
  beforeEach(() => {
    // Reset singletons
    ResourceRegistry.resetInstance();
    ClaudeModel.resetInstance();
    EmbeddingService.resetInstance();
    
    // Mock environment variables
    process.env = {
      ...originalEnv,
      ANTHROPIC_API_KEY: 'mock-anthropic-key',
      OPENAI_API_KEY: 'mock-openai-key',
    };
    
    // Mock the AI classes
    spyOn(ClaudeModel, 'getInstance').mockImplementation(() => new MockClaudeModel() as unknown as ClaudeModel);
    spyOn(EmbeddingService, 'getInstance').mockImplementation(() => new MockEmbeddingService() as unknown as EmbeddingService);
  });
  
  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });
  
  describe('Component Interface Standardization pattern', () => {
    test('getInstance should return the same instance', () => {
      const instance1 = ResourceRegistry.getInstance();
      const instance2 = ResourceRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = ResourceRegistry.getInstance();
      ResourceRegistry.resetInstance();
      const instance2 = ResourceRegistry.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('createFresh should create a new instance', () => {
      const singleton = ResourceRegistry.getInstance();
      const fresh = ResourceRegistry.createFresh();
      
      expect(singleton).not.toBe(fresh);
      expect(fresh).toBeInstanceOf(ResourceRegistry);
    });
    
    test('should initialize with options', () => {
      const registry = ResourceRegistry.createFresh({
        anthropicApiKey: 'custom-key',
        openAiApiKey: 'custom-openai-key',
      });
      
      // @ts-expect-error - Accessing private property for testing
      expect(registry.options.anthropicApiKey).toBe('custom-key');
      // @ts-expect-error - Accessing private property for testing
      expect(registry.options.openAiApiKey).toBe('custom-openai-key');
    });
  });
  
  describe('Resource registration', () => {
    test('should automatically register standard resources', () => {
      const registry = ResourceRegistry.createFresh();
      
      expect(registry.has(ResourceIdentifiers.ClaudeModel)).toBe(true);
      expect(registry.has(ResourceIdentifiers.EmbeddingService)).toBe(true);
    });
    
    test('should provide access to Claude model', () => {
      const registry = ResourceRegistry.createFresh();
      const claude = registry.getClaudeModel();
      
      expect(claude).toBeDefined();
      expect(typeof claude.complete).toBe('function');
    });
    
    test('should provide access to embedding service', () => {
      const registry = ResourceRegistry.createFresh();
      const embeddingService = registry.getEmbeddingService();
      
      expect(embeddingService).toBeDefined();
      expect(typeof embeddingService.getEmbedding).toBe('function');
      expect(typeof embeddingService.getBatchEmbeddings).toBe('function');
      expect(typeof embeddingService.calculateSimilarity).toBe('function');
    });
    
    test('should resolve resources by identifier', () => {
      const registry = ResourceRegistry.createFresh();
      const claude = registry.resolve<LanguageModelAdapter>(ResourceIdentifiers.ClaudeModel);
      const embedding = registry.resolve<EmbeddingModelAdapter>(ResourceIdentifiers.EmbeddingService);
      
      expect(claude).toBeDefined();
      expect(embedding).toBeDefined();
    });
  });
  
  describe('Error handling', () => {
    test('should throw error for missing API key', () => {
      // Remove environment variables
      process.env = { ...originalEnv };
      delete process.env['ANTHROPIC_API_KEY'];
      delete process.env['OPENAI_API_KEY'];
      
      // Create registry with no API keys
      const registry = ResourceRegistry.createFresh();
      
      // Claude should throw without API key
      expect(() => registry.getClaudeModel()).toThrow();
      
      // Embedding service should throw without API key
      expect(() => registry.getEmbeddingService()).toThrow();
    });
  });
});