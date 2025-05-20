import { beforeEach, describe, expect, test } from 'bun:test';

import type { EmbeddingModelAdapter, LanguageModelAdapter } from '@/resources/ai/interfaces';
import { ResourceIdentifiers, ResourceRegistry } from '@/resources/resourceRegistry';

describe('ResourceRegistry Behavior', () => {
  let registry: ResourceRegistry;
  
  beforeEach(() => {
    // Set up test environment with required API keys
    process.env['ANTHROPIC_API_KEY'] = 'mock-anthropic-key';
    process.env['OPENAI_API_KEY'] = 'mock-openai-key';
    
    registry = ResourceRegistry.createFresh();
  });
  
  describe('Resource Access', () => {
    test('provides access to language model', () => {
      const claude = registry.getClaudeModel();
      
      expect(claude).toBeDefined();
      expect(typeof claude.complete).toBe('function');
    });
    
    test('provides access to embedding service', () => {
      const embeddingService = registry.getEmbeddingService();
      
      expect(embeddingService).toBeDefined();
      expect(typeof embeddingService.getEmbedding).toBe('function');
      expect(typeof embeddingService.getBatchEmbeddings).toBe('function');
      expect(typeof embeddingService.calculateSimilarity).toBe('function');
    });
    
    test('resolves resources by identifier', () => {
      const claude = registry.resolve<LanguageModelAdapter>(ResourceIdentifiers.ClaudeModel);
      const embedding = registry.resolve<EmbeddingModelAdapter>(ResourceIdentifiers.EmbeddingService);
      
      expect(claude).toBeDefined();
      expect(embedding).toBeDefined();
    });
    
    test('verifies resource availability', () => {
      expect(registry.has(ResourceIdentifiers.ClaudeModel)).toBe(true);
      expect(registry.has(ResourceIdentifiers.EmbeddingService)).toBe(true);
      expect(registry.has('non-existent-resource')).toBe(false);
    });
  });
  
  describe('Configuration', () => {
    test('uses custom API keys when provided', () => {
      // Remove environment variables to test configuration
      delete process.env['ANTHROPIC_API_KEY'];
      delete process.env['OPENAI_API_KEY'];
      
      const customRegistry = ResourceRegistry.createFresh({
        anthropicApiKey: 'custom-anthropic-key',
        openAiApiKey: 'custom-openai-key',
      });
      
      // Should not throw with custom keys
      expect(() => customRegistry.getClaudeModel()).not.toThrow();
      expect(() => customRegistry.getEmbeddingService()).not.toThrow();
    });
  });
  
  describe('Error Handling', () => {
    test('handles missing API keys', () => {
      // Remove environment variables
      delete process.env['ANTHROPIC_API_KEY'];
      delete process.env['OPENAI_API_KEY'];
      
      const registryWithoutKeys = ResourceRegistry.createFresh();
      
      // Should throw when trying to access resources without keys
      expect(() => registryWithoutKeys.getClaudeModel()).toThrow();
      expect(() => registryWithoutKeys.getEmbeddingService()).toThrow();
    });
    
    test('handles unknown resource identifiers', () => {
      expect(() => registry.resolve('unknown-resource')).toThrow();
    });
  });
});