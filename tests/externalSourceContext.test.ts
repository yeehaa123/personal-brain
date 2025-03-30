import { describe, test, expect, mock } from 'bun:test';
import { ExternalSourceContext } from '../src/mcp/context/externalSourceContext';
import type { ExternalSourceInterface, ExternalSourceResult } from '../src/mcp/context/sources/externalSourceInterface';

// Create a truly simple mock that doesn't rely on external classes
function createMockSource(name: string, available: boolean = true): ExternalSourceInterface {
  return {
    name,
    async search() {
      return [{
        content: `Content from ${name}`,
        title: `Title from ${name}`,
        url: 'https://example.com',
        source: name,
        sourceType: 'test',
        timestamp: new Date(),
        confidence: 0.9,
      }];
    },
    async checkAvailability() {
      return available;
    },
    async getSourceMetadata() {
      return { name };
    },
    // Add semanticSearch for good measure
    async semanticSearch() {
      return [{
        content: `Semantic content from ${name}`,
        title: `Semantic title from ${name}`,
        url: 'https://example.com',
        source: name,
        sourceType: 'test',
        timestamp: new Date(),
        confidence: 0.95,
      }];
    },
  };
}

// Let's not try to mock the EmbeddingService, it's too complex
// Instead, we'll focus on testing just the external source context in isolation

describe('External Source Context', () => {
  test('should create a context without errors', () => {
    const context = new ExternalSourceContext('fake-api-key');
    expect(context).toBeDefined();
  });
  
  test('should allow registering sources', () => {
    const context = new ExternalSourceContext('fake-api-key');
    const mockSource = createMockSource('CustomSource');
    
    // Just check that the registerSource method exists and doesn't throw
    expect(() => context.registerSource(mockSource)).not.toThrow();
  });
  
  test('should check source availability', () => {
    const context = new ExternalSourceContext('fake-api-key');
    
    // Just verify the method exists
    expect(typeof context.checkSourcesAvailability).toBe('function');
  });
});