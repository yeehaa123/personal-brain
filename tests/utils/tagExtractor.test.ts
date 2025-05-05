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

  test('tag extraction with various content types and configurations', async () => {
    // Create mocks for normal operation tests
    const mockLogger = MockLogger.createFresh({ silent: true });
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Create standard tag extractor
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

    // Test 1: Ecosystem content
    const ecosystemContent = `Ecosystem architecture is a practice of designing and building interconnected 
    communities and systems that are regenerative and decentralized.`;
    const ecosystemTags = await tagExtractor.extractTags(ecosystemContent, [], 5);
    
    // Check at least one expected tag is present (reduces multiple expect calls)
    const hasEcosystemTag = ecosystemTags.includes('ecosystem-architecture');
    expect(hasEcosystemTag).toBe(true);

    // Test 2: Existing tags preservation
    const techContent = 'Technology is rapidly evolving and changing how we live and work.';
    const existingTags = ['innovation', 'future'];
    const techTags = await tagExtractor.extractTags(techContent, existingTags, 5);
    
    // Verify both existing and new tags are present
    const hasExistingAndNewTags = 
      techTags.includes('innovation') && 
      techTags.some(tag => tag !== 'innovation' && tag !== 'future');
    expect(hasExistingAndNewTags).toBe(true);

    // Test 3: Tag limit enforcement
    // Create specific mock for the limit test
    const limitedMockClaudeModel = MockClaudeModel.createFresh();
    limitedMockClaudeModel.complete = async <T>() => {
      return {
        object: {
          tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
        } as unknown as T,
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    };
    
    const limitTagExtractor = TagExtractor.createFresh(
      { defaultMaxTags: 5 },
      {
        logger: mockLogger,
        claudeModel: limitedMockClaudeModel as unknown as ClaudeModel,
      },
    );
    
    const limitTags = await limitTagExtractor.extractTags('Test content', [], 3);
    expect(limitTags.length).toBeLessThanOrEqual(3);

    // Test 4: Error handling
    const errorMockClaudeModel = MockClaudeModel.createFresh();
    errorMockClaudeModel.complete = async () => {
      throw new Error('Test error');
    };
    
    const errorTagExtractor = TagExtractor.createFresh(
      { defaultMaxTags: 5 },
      {
        logger: mockLogger,
        claudeModel: errorMockClaudeModel as unknown as ClaudeModel,
      },
    );
    
    const errorTags = await errorTagExtractor.extractTags('Error content', [], 5);
    expect(errorTags.length).toBe(0);
  });
});
