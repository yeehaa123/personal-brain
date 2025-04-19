/**
 * Integration tests for the UnifiedServiceRegistry
 */
import { describe, test, expect, beforeEach } from 'bun:test';

import { UnifiedServiceRegistry, ServiceIdentifiers } from '@/utils/unifiedServiceRegistry';

// Mock service classes for testing that follow the Component Interface Standardization pattern
class MockClaudeModel {
  private static instance: MockClaudeModel | null = null;
  
  public static getInstance(): MockClaudeModel {
    if (!MockClaudeModel.instance) {
      MockClaudeModel.instance = new MockClaudeModel();
    }
    return MockClaudeModel.instance;
  }
  
  public static resetInstance(): void {
    MockClaudeModel.instance = null;
  }
  
  public static createFresh(): MockClaudeModel {
    return new MockClaudeModel();
  }
  
  public generateResponse(prompt: string): string {
    return `Response to: ${prompt}`;
  }
}

class MockEmbeddingService {
  private static instance: MockEmbeddingService | null = null;
  
  public static getInstance(): MockEmbeddingService {
    if (!MockEmbeddingService.instance) {
      MockEmbeddingService.instance = new MockEmbeddingService();
    }
    return MockEmbeddingService.instance;
  }
  
  public static resetInstance(): void {
    MockEmbeddingService.instance = null;
  }
  
  public static createFresh(): MockEmbeddingService {
    return new MockEmbeddingService();
  }
  
  public generateEmbedding(text: string): number[] {
    return [1, 2, 3]; // Mock embedding
  }
}

describe('UnifiedServiceRegistry Integration Tests', () => {
  beforeEach(() => {
    // Reset all singletons
    UnifiedServiceRegistry.resetInstance();
    MockClaudeModel.resetInstance();
    MockEmbeddingService.resetInstance();
  });
  
  test('should register and resolve actual service classes', () => {
    const registry = UnifiedServiceRegistry.getInstance();
    
    // Register mock classes
    registry.register(ServiceIdentifiers.ClaudeModel, () => MockClaudeModel.getInstance());
    registry.register(ServiceIdentifiers.EmbeddingService, () => MockEmbeddingService.getInstance());
    
    // Resolve services
    const claudeModel = registry.getService<MockClaudeModel>(ServiceIdentifiers.ClaudeModel);
    const embeddingService = registry.getService<MockEmbeddingService>(ServiceIdentifiers.EmbeddingService);
    
    // Test the resolved services
    expect(claudeModel.generateResponse('Hello')).toBe('Response to: Hello');
    expect(embeddingService.generateEmbedding('text')).toEqual([1, 2, 3]);
  });
  
  test('should correctly initialize essential services', () => {
    const registry = UnifiedServiceRegistry.getInstance();
    
    // Register mock services to the registry
    registry.register(ServiceIdentifiers.ClaudeModel, () => MockClaudeModel.getInstance());
    registry.register(ServiceIdentifiers.EmbeddingService, () => MockEmbeddingService.getInstance());
    
    // Initialize services
    registry.initializeEssentialServices();
    
    // Verify the services are still available
    expect(registry.has(ServiceIdentifiers.ClaudeModel)).toBe(true);
    expect(registry.has(ServiceIdentifiers.EmbeddingService)).toBe(true);
  });
});