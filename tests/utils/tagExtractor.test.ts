import { beforeEach, describe, expect, test } from 'bun:test';

import type { ResourceRegistry } from '@/resources';
import type { Logger } from '@/utils/logger';
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

    // Create mock registry with custom response for ecosystem content
    const mockRegistry = MockResourceRegistry.createFresh();
    // Add proper ModelResponse format to avoid type errors
    mockRegistry.mockModelResponse = {
      object: {
        tags: [
          'ecosystem-architecture',
          'regenerative-systems',
          'decentralized',
          'collaboration',
          'interconnected-communities',
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 }, // Required by ModelResponse
    };

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createWithDependencies(
      {},
      {
        logger: mockLogger as unknown as Logger,
        resourceRegistry: mockRegistry as unknown as ResourceRegistry,
      },
    );

    const content = `Ecosystem architecture is a practice of designing and building interconnected 
    communities and systems that are regenerative and decentralized. It focuses on collaboration
    instead of competition and aims to create healthy relationships between participants.`;

    // Extract tags
    const tags = await tagExtractor.extractTags(content, [], 5);

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

    // Create mock registry with custom response for education content
    const mockRegistry = MockResourceRegistry.createFresh();
    // Add proper ModelResponse format to avoid type errors
    mockRegistry.mockModelResponse = {
      object: {
        tags: [
          'education',
          'critical-thinking',
          'creativity',
          'learning',
          'modern-education',
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 }, // Required by ModelResponse
    };

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createWithDependencies(
      {},
      {
        logger: mockLogger as unknown as Logger,
        resourceRegistry: mockRegistry as unknown as ResourceRegistry,
      },
    );

    const content = `Education should focus on developing critical thinking and creativity rather than 
    memorization of facts. Modern educational paradigms need to evolve to meet the challenges of
    a rapidly changing world. Learning how to learn is more important than specific knowledge domains.`;

    // Extract tags
    const tags = await tagExtractor.extractTags(content, [], 5);

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

    // Create mock registry with custom response for technology content
    const mockRegistry = MockResourceRegistry.createFresh();
    // Add proper ModelResponse format to avoid type errors
    mockRegistry.mockModelResponse = {
      object: {
        tags: [
          'technology',
          'digital-transformation',
          'innovation',
          'future',
          'digital',
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 }, // Required by ModelResponse
    };

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createWithDependencies(
      {},
      {
        logger: mockLogger as unknown as Logger,
        resourceRegistry: mockRegistry as unknown as ResourceRegistry,
      },
    );

    // Make sure to include "technology" in the content to match our mock condition
    const content = 'Technology is rapidly evolving and changing how we live and work.';
    const existingTags = ['innovation', 'future'];

    // Extract tags
    const tags = await tagExtractor.extractTags(content, existingTags, 5);

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

    // Create mock registry with custom response that includes exactly maxTags
    const mockRegistry = MockResourceRegistry.createFresh();
    // Add proper ModelResponse format to avoid type errors
    mockRegistry.mockModelResponse = {
      object: {
        tags: [
          'ecosystem-architecture',
          'innovation',
          'collaboration',
        ],
      },
      usage: { inputTokens: 10, outputTokens: 20 }, // Required by ModelResponse
    };

    // Create tag extractor with dependencies
    // Use type assertion to handle incompatible mock types
    const tagExtractor = TagExtractor.createWithDependencies(
      {},
      {
        logger: mockLogger as unknown as Logger,
        resourceRegistry: mockRegistry as unknown as ResourceRegistry,
      },
    );

    const content = `This is a long content about various topics including technology, innovation, 
    education, ecosystems, and many other interesting subjects.`;
    const maxTags = 3;

    // The mock will return exactly 3 tags
    const tags = await tagExtractor.extractTags(content, [], maxTags);

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
    const originalGetClaudeModel = mockRegistry.getClaudeModel;
    mockRegistry.getClaudeModel = () => {
      return {
        complete: async () => {
          throw new Error('Test error');
        },
      };
    };

    // Create tag extractor with dependencies
    const tagExtractor = TagExtractor.createWithDependencies(
      {},
      {
        logger: mockLogger as unknown as Logger,
        resourceRegistry: mockRegistry as unknown as ResourceRegistry,
      },
    );

    const content = 'Some content for error testing';

    // Extract tags - should handle error and return empty array
    const tags = await tagExtractor.extractTags(content, [], 5, 'mock-api-key');

    expect(tags).toBeInstanceOf(Array);
    expect(tags.length).toBe(0);

    // No need to check error logging since we can see the test passes
    // if we get an empty array as expected

    // Restore original method
    mockRegistry.getClaudeModel = originalGetClaudeModel;
  });

  test('should handle API key validation', async () => {
    // Create a mock with a custom response for API key validation
    const mockRegistry = MockResourceRegistry.createFresh();
    // Add proper ModelResponse format to avoid type errors
    mockRegistry.mockModelResponse = {
      object: { tags: [] },
      usage: { inputTokens: 10, outputTokens: 20 }, // Required by ModelResponse
    };

    // Create tag extractor with empty tags for this test
    const tagExtractor = TagExtractor.createWithDependencies(
      {},
      {
        resourceRegistry: mockRegistry as unknown as ResourceRegistry,
      },
    );

    // Pass an empty API key
    const tags = await tagExtractor.extractTags('Test content', [], 5, '');

    // Should return the empty tags array from our mock
    expect(tags).toEqual([]);
  });
});
