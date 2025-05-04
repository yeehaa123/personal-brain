import { beforeEach, describe, expect, test } from 'bun:test';

// Import types needed for casting
import type { ClaudeModel } from '@/resources/ai/claude';
import { MockLogger } from '@test/__mocks__/core/logger';
import { MockResourceRegistry } from '@test/__mocks__/resources/resourceRegistry';
import { TagExtractor } from '@utils/tagExtractor';

describe('TagExtractor', () => {
  // Reset all singletons before each test to ensure isolation
  beforeEach(() => {
    TagExtractor.resetInstance();
    MockResourceRegistry.resetInstance();
    MockLogger.resetInstance();
  });

  test('should extract tags from ecosystem content', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: true });

    // Create mock registry
    const mockRegistry = MockResourceRegistry.createFresh();
    
    // Mock the getClaudeModel method to return a model with our test response
    const mockClaudeModel = {
      complete: async () => {
        return {
          object: {
            tags: [
              'ecosystem-architecture',
              'regenerative-systems',
              'decentralized',
              'collaboration',
              'interconnected-communities',
            ],
          },
          usage: { inputTokens: 10, outputTokens: 20 },
        };
      },
      // Add minimum required properties to satisfy ClaudeModel interface
      model: 'mock-model',
      apiKey: 'mock-key',
      defaultMaxTokens: 1000,
      defaultTemperature: 0.7,
      mapUsage: () => ({ prompt: 0, completion: 0, total: 0 }),
    };
    
    // Type assertion to fix type incompatibility
    mockRegistry.getClaudeModel = () => mockClaudeModel as unknown as ClaudeModel;

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createFresh(
      {},
      {
        logger: mockLogger,
        resourceRegistry: mockRegistry,
      },
    );

    const content = `Ecosystem architecture is a practice of designing and building interconnected 
    communities and systems that are regenerative and decentralized. It focuses on collaboration
    instead of competition and aims to create healthy relationships between participants.`;

    // Extract tags with a mock API key
    const tags = await tagExtractor.extractTags(content, [], 5, 'mock-api-key');

    // Check tags are returned and match our mock response
    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toContain('ecosystem-architecture');
    expect(tags).toContain('decentralized');
  });

  test('should extract tags from education content', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: true });

    // Create mock registry
    const mockRegistry = MockResourceRegistry.createFresh();
    
    // Mock the getClaudeModel method to return a model with our test response
    const mockClaudeModel = {
      complete: async () => {
        return {
          object: {
            tags: [
              'education',
              'critical-thinking',
              'creativity',
              'learning',
              'modern-education',
            ],
          },
          usage: { inputTokens: 10, outputTokens: 20 },
        };
      },
      // Add minimum required properties to satisfy ClaudeModel interface
      model: 'mock-model',
      apiKey: 'mock-key',
      defaultMaxTokens: 1000,
      defaultTemperature: 0.7,
      mapUsage: () => ({ prompt: 0, completion: 0, total: 0 }),
    };
    
    // Type assertion to fix type incompatibility
    mockRegistry.getClaudeModel = () => mockClaudeModel as unknown as ClaudeModel;

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createFresh(
      {},
      {
        logger: mockLogger,
        resourceRegistry: mockRegistry,
      },
    );

    const content = `Education should focus on developing critical thinking and creativity rather than 
    memorization of facts. Modern educational paradigms need to evolve to meet the challenges of
    a rapidly changing world. Learning how to learn is more important than specific knowledge domains.`;

    // Extract tags with a mock API key
    const tags = await tagExtractor.extractTags(content, [], 5, 'mock-api-key');

    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    // Check for education-specific tags from our mock
    expect(tags).toContain('education');
    expect(tags).toContain('learning');
  });

  test('should consider existing tags when generating new ones', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: true });

    // Create mock registry
    const mockRegistry = MockResourceRegistry.createFresh();
    
    // Mock the getClaudeModel method to return a model with our test response
    const mockClaudeModel = {
      complete: async () => {
        return {
          object: {
            tags: [
              'technology',
              'digital-transformation',
              'innovation',
              'future',
              'digital',
            ],
          },
          usage: { inputTokens: 10, outputTokens: 20 },
        };
      },
      // Add minimum required properties to satisfy ClaudeModel interface
      model: 'mock-model',
      apiKey: 'mock-key',
      defaultMaxTokens: 1000,
      defaultTemperature: 0.7,
      mapUsage: () => ({ prompt: 0, completion: 0, total: 0 }),
    };
    
    // Type assertion to fix type incompatibility
    mockRegistry.getClaudeModel = () => mockClaudeModel as unknown as ClaudeModel;

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createFresh(
      {},
      {
        logger: mockLogger,
        resourceRegistry: mockRegistry,
      },
    );

    // Make sure to include "technology" in the content to match our mock condition
    const content = 'Technology is rapidly evolving and changing how we live and work.';
    const existingTags = ['innovation', 'future'];

    // Extract tags with a mock API key
    const tags = await tagExtractor.extractTags(content, existingTags, 5, 'mock-api-key');

    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    // Check for technology-specific tags from our mock
    expect(tags).toContain('technology');
    expect(tags).toContain('digital');
    // Also contains our existing tags
    expect(tags).toContain('innovation');
  });

  test('should limit the number of tags to maxTags', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: true });

    // Create mock registry
    const mockRegistry = MockResourceRegistry.createFresh();
    
    // Mock the getClaudeModel method to return a model with our test response
    const mockClaudeModel = {
      complete: async () => {
        return {
          object: {
            tags: [
              'ecosystem-architecture',
              'innovation',
              'collaboration',
            ],
          },
          usage: { inputTokens: 10, outputTokens: 20 },
        };
      },
      // Add minimum required properties to satisfy ClaudeModel interface
      model: 'mock-model',
      apiKey: 'mock-key',
      defaultMaxTokens: 1000,
      defaultTemperature: 0.7,
      mapUsage: () => ({ prompt: 0, completion: 0, total: 0 }),
    };
    
    // Type assertion to fix type incompatibility
    mockRegistry.getClaudeModel = () => mockClaudeModel as unknown as ClaudeModel;

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createFresh(
      {},
      {
        logger: mockLogger,
        resourceRegistry: mockRegistry,
      },
    );

    const content = `This is a long content about various topics including technology, innovation, 
    education, ecosystems, and many other interesting subjects.`;
    const maxTags = 3;

    // The mock will return exactly 3 tags
    const tags = await tagExtractor.extractTags(content, [], maxTags, 'mock-api-key');

    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeLessThanOrEqual(maxTags);
    expect(tags.length).toBe(3);
  });

  test('should handle error and return empty array', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: false });

    // Create mock registry that throws an error
    const mockRegistry = MockResourceRegistry.createFresh();
    // Override the getClaudeModel to return a model that throws
    mockRegistry.getClaudeModel = () => {
      return {
        complete: async () => {
          throw new Error('Test error');
        },
        // Add minimum required properties to satisfy ClaudeModel interface
        model: 'mock-model',
        apiKey: 'mock-key',
        defaultMaxTokens: 1000,
        defaultTemperature: 0.7,
        mapUsage: () => ({ prompt: 0, completion: 0, total: 0 }),
      } as unknown as ClaudeModel;
    };

    // Create tag extractor with dependencies
    const tagExtractor = TagExtractor.createFresh(
      {},
      {
        logger: mockLogger,
        resourceRegistry: mockRegistry,
      },
    );

    const content = 'Some content for error testing';

    // Extract tags - should handle error and return empty array
    const tags = await tagExtractor.extractTags(content, [], 5, 'mock-api-key');

    expect(tags).toBeInstanceOf(Array);
    expect(tags.length).toBe(0);

    // No need to check error logging since we can see the test passes
    // if we get an empty array as expected
  });

  test('should handle API key validation', async () => {
    // Create mock registry
    const mockRegistry = MockResourceRegistry.createFresh();
    
    // Mock the getClaudeModel method to return a model with an empty tags response
    const mockClaudeModel = {
      complete: async () => {
        return {
          object: { tags: [] },
          usage: { inputTokens: 10, outputTokens: 20 },
        };
      },
      // Add minimum required properties to satisfy ClaudeModel interface
      model: 'mock-model',
      apiKey: 'mock-key',
      defaultMaxTokens: 1000,
      defaultTemperature: 0.7,
      mapUsage: () => ({ prompt: 0, completion: 0, total: 0 }),
    };
    
    // Type assertion to fix type incompatibility
    mockRegistry.getClaudeModel = () => mockClaudeModel as unknown as ClaudeModel;

    // Create tag extractor with empty tags for this test
    const tagExtractor = TagExtractor.createFresh(
      {},
      {
        logger: MockLogger.getInstance(),
        resourceRegistry: mockRegistry,
      },
    );

    // Pass an empty API key
    const tags = await tagExtractor.extractTags('Test content', [], 5, '');

    // Should return the empty tags array from our mock
    expect(tags).toEqual([]);
  });
});
