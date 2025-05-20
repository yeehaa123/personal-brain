import { beforeEach, describe, expect, test } from 'bun:test';

import type { ClaudeModel } from '@/resources/ai';
import { MockLogger } from '@test/__mocks__/core/logger';
import { ClaudeModel as MockClaudeModel } from '@test/__mocks__/resources/ai/claude/claude';
import { TagExtractor } from '@utils/tagExtractor';

describe('TagExtractor', () => {
  beforeEach(() => {
    TagExtractor.resetInstance();
    MockLogger.resetInstance();
    MockClaudeModel.resetInstance();
  });

  test('extracts tags from content', async () => {
    const mockLogger = MockLogger.createFresh({ silent: true });
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Override the complete method to return tag data
    mockClaudeModel.complete = async <T>() => ({
      object: { tags: ['ecosystem-architecture', 'innovation'] } as unknown as T,
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const tagExtractor = TagExtractor.createFresh(
      { defaultMaxTags: 5 },
      { logger: mockLogger, claudeModel: mockClaudeModel as unknown as ClaudeModel },
    );

    const content = 'Ecosystem architecture is a practice of designing';
    const tags = await tagExtractor.extractTags(content, [], 5);
    
    expect(tags).toContain('ecosystem-architecture');
    expect(tags).toContain('innovation');
  });

  test('considers existing tags', async () => {
    const mockLogger = MockLogger.createFresh({ silent: true });
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Mock returns tags that might include existing ones Claude decides to keep
    mockClaudeModel.complete = async <T>() => ({
      object: { tags: ['existing1', 'new-tag'] } as unknown as T,
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const tagExtractor = TagExtractor.createFresh(
      { defaultMaxTags: 5 },
      { logger: mockLogger, claudeModel: mockClaudeModel as unknown as ClaudeModel },
    );

    const existingTags = ['existing1', 'existing2'];
    const tags = await tagExtractor.extractTags('Some content', existingTags, 5);
    
    // Claude decided to keep existing1 and add new-tag
    expect(tags).toContain('existing1');
    expect(tags).toContain('new-tag');
  });

  test('respects tag limit', async () => {
    const mockLogger = MockLogger.createFresh({ silent: true });
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Mock returns exactly the requested number of tags
    mockClaudeModel.complete = async <T>() => ({
      object: { tags: ['tag1', 'tag2', 'tag3'] } as unknown as T,  // Only 3 as requested
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const tagExtractor = TagExtractor.createFresh(
      { defaultMaxTags: 5 },
      { logger: mockLogger, claudeModel: mockClaudeModel as unknown as ClaudeModel },
    );

    const tags = await tagExtractor.extractTags('Some content', [], 3);
    
    expect(tags.length).toBe(3);
    expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  test('handles errors gracefully', async () => {
    const mockLogger = MockLogger.createFresh({ silent: true });
    const mockClaudeModel = MockClaudeModel.createFresh();

    // Mock throws error
    mockClaudeModel.complete = async () => {
      throw new Error('Test error');
    };

    const tagExtractor = TagExtractor.createFresh(
      { defaultMaxTags: 5 },
      { logger: mockLogger, claudeModel: mockClaudeModel as unknown as ClaudeModel },
    );

    const tags = await tagExtractor.extractTags('Error content', [], 5);
    expect(tags).toEqual([]);
  });
});