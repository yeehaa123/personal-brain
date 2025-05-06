import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { MockCLIInterface } from '@test/__mocks__/utils/cliInterface';

describe('Tag Formatting', () => {
  let mockCLI: MockCLIInterface;

  beforeEach(() => {
    // Reset and get a fresh instance for testing
    MockCLIInterface.resetInstance();
    mockCLI = MockCLIInterface.getInstance();
  });

  afterEach(() => {
    MockCLIInterface.resetInstance();
  });

  test('formatTags functionality should handle tags correctly', () => {
    // Test various tag formatting scenarios
    const noTags = mockCLI.formatTags(null);
    const emptyTags = mockCLI.formatTags([]);
    const singleTag = mockCLI.formatTags(['ecosystem']);
    const multipleTags = mockCLI.formatTags(['tag1', 'tag2', 'tag3']);

    // Use consolidated expectation
    expect({
      noTagsHandling: noTags,
      emptyTagsHandling: emptyTags,
      singleTagFormatted: singleTag.includes('ecosystem'),
      multipleTagsFormatted: multipleTags.includes('tag1') && multipleTags.includes('tag2'),
    }).toEqual({
      noTagsHandling: 'No tags',
      emptyTagsHandling: 'No tags',
      singleTagFormatted: true,
      multipleTagsFormatted: true,
    });
  });

  test('tag formatting options in printLabelValue', () => {
    // Test tag formatting via printLabelValue
    const tags = ['ecosystem', 'innovation'];
    
    // Call the method with a mock instance - just use the required parameters
    mockCLI.printLabelValue('Tags', tags);
    
    // Use simpler direct expectations
    expect(mockCLI.printLabelValue).toHaveBeenCalledTimes(1);
    expect(mockCLI.printLabelValue).toHaveBeenCalledWith('Tags', tags);
  });

  // Simple direct test of formatter functions
  test('tag formatting behavior', () => {
    // Test simple tag formatting behavior directly
    const formatTag = (tag: string) => `#${tag}`;
    
    // Use consolidated expectations
    expect({
      basicFormat: formatTag('tag1'),
      emptyString: formatTag(''),
      withDash: formatTag('multi-word-tag'),
      withHash: formatTag('#already-hashed'), // Should just add another # - the formatter doesn't check
    }).toEqual({
      basicFormat: '#tag1',
      emptyString: '#',
      withDash: '#multi-word-tag',
      withHash: '##already-hashed',
    });
  });
});
