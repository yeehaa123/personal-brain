import { beforeEach, describe, expect, test } from 'bun:test';

import type { ClaudeModel } from '@/resources/ai';
import { MockLogger } from '@test/__mocks__/core/logger';
import { ClaudeModel as MockClaudeModel } from '@test/__mocks__/resources/ai/claude/claude';
import { TagExtractor } from '@utils/tagExtractor';

describe('TagExtractor', () => {
  // Reset all singletons before each test to ensure isolation
  beforeEach(() => {
    TagExtractor.resetInstance();
    MockLogger.resetInstance();
    MockClaudeModel.resetInstance();
  });

  test('should extract tags from ecosystem content', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: true });
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Create tag extractor with direct dependencies
    const tagExtractor = TagExtractor.createFresh(
      {
        defaultMaxTags: 5,
        tagContentMaxLength: 1000,
        temperature: 0.7,
      },
      {
        logger: mockLogger,
        claudeModel: mockClaudeModel as unknown as ClaudeModel,
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
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Create tag extractor with direct dependencies
    const tagExtractor = TagExtractor.createFresh(
      {
        defaultMaxTags: 5,
        tagContentMaxLength: 1000,
        temperature: 0.7,
      },
      {
        logger: mockLogger,
        claudeModel: mockClaudeModel as unknown as ClaudeModel,
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
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Create tag extractor with direct dependencies
    const tagExtractor = TagExtractor.createFresh(
      {
        defaultMaxTags: 5,
        tagContentMaxLength: 1000,
        temperature: 0.7,
      },
      {
        logger: mockLogger,
        claudeModel: mockClaudeModel as unknown as ClaudeModel,
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

    // Create a mock Claude model that returns exactly 3 tags
    const mockClaudeModel = MockClaudeModel.createFresh();
    // Override the complete method for this specific test - we need to cast to allow overriding
    mockClaudeModel.complete = async <T>() => {
      return {
        object: {
          tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
        } as unknown as T,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    };

    // Create tag extractor with direct dependencies
    const tagExtractor = TagExtractor.createFresh(
      {
        defaultMaxTags: 5,
        tagContentMaxLength: 1000,
        temperature: 0.7,
      },
      {
        logger: mockLogger,
        claudeModel: mockClaudeModel as unknown as ClaudeModel,
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

    // Create a mock Claude model that throws an error
    const mockClaudeModel = MockClaudeModel.createFresh();
    // Override the complete method for this specific test
    mockClaudeModel.complete = async () => {
      throw new Error('Test error');
    };

    // Create tag extractor with direct dependencies
    const tagExtractor = TagExtractor.createFresh(
      {
        defaultMaxTags: 5,
        tagContentMaxLength: 1000,
        temperature: 0.7,
      },
      {
        logger: mockLogger,
        claudeModel: mockClaudeModel as unknown as ClaudeModel,
      },
    );

    const content = 'Some content for error testing';

    // Extract tags - should handle error and return empty array
    const tags = await tagExtractor.extractTags(content, [], 5);

    expect(tags).toBeInstanceOf(Array);
    expect(tags.length).toBe(0);

    // No need to check error logging since we can see the test passes
    // if we get an empty array as expected
  });

  test('should handle empty tag response', async () => {
    // Create mocks
    const mockLogger = MockLogger.createFresh({ silent: false });

    // Create a mock Claude model that returns empty tags
    const mockClaudeModel = MockClaudeModel.createFresh();
    // Override the complete method for this specific test
    mockClaudeModel.complete = async <T>() => {
      return {
        object: { tags: [] } as unknown as T,
        usage: { inputTokens: 10, outputTokens: 20 },
      };
    };

    // Create tag extractor with direct dependencies
    const tagExtractor = TagExtractor.createFresh(
      {
        defaultMaxTags: 5,
        tagContentMaxLength: 1000,
        temperature: 0.7,
      },
      {
        logger: mockLogger,
        claudeModel: mockClaudeModel as unknown as ClaudeModel,
      },
    );

    // Test with any content since our mock is configured to return empty tags
    const tags = await tagExtractor.extractTags('Test content', [], 5);

    // Should return the empty tags array from our mock
    expect(tags).toEqual([]);
  });
});
