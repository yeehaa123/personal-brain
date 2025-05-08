import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { CLIInterface } from '@/utils/cliInterface';
import type { Note } from '@models/note';
import { createMockNotes } from '@test/__mocks__/models/note';
import { MockCLIInterface } from '@test/__mocks__/utils/cliInterface';
import { displayNotes, formatNotePreview, getExcerpt } from '@utils/noteUtils';

describe('noteUtils', () => {
  let mockNotes: Note[];
  let mockCLI: MockCLIInterface;

  beforeEach(() => {
    // Create sample notes for testing
    mockNotes = createMockNotes();

    // Reset mock CLI and get a fresh instance
    MockCLIInterface.resetInstance();
    // Use createFresh to create an isolated instance for each test
    mockCLI = MockCLIInterface.createFresh();
  });

  afterEach(() => {
    MockCLIInterface.resetInstance();
  });

  describe('displayNotes', () => {
    test('should display notes correctly', () => {
      // Call the function under test with our mock
      displayNotes(mockNotes, mockCLI as unknown as CLIInterface);

      // Use direct expectations instead
      expect(mockCLI.print).toHaveBeenCalled();
      expect(mockCLI.printLabelValue).toHaveBeenCalled();
      
      // Check that specific label names were used
      const labelCalls = mockCLI.printLabelValue.mock.calls;
      // Only check if calls exist first to prevent array indexing errors
      if (labelCalls.length > 0) {
        const calledLabels = labelCalls.map(call => call[0]);
        expect(calledLabels).toEqual(expect.arrayContaining(['ID', 'Tags', 'Created']));
      }
      
      // We now use print with renderMarkdown for preview instead of printLabelValue
      expect(mockCLI.renderMarkdown).toHaveBeenCalled();
    });

    test('should handle empty notes array', () => {
      displayNotes([], mockCLI as unknown as CLIInterface);
      
      // Use consolidated expectations
      // Check if warn was called with the right message
      expect(mockCLI.warn).toHaveBeenCalledTimes(1);
      expect(mockCLI.warn).toHaveBeenCalledWith('No notes found.');
      // Check that print wasn't called
      expect(mockCLI.print).not.toHaveBeenCalled();
    });
  });

  describe('formatNotePreview', () => {
    test('should format note preview with expected content', () => {
      // Test with a note that has tags
      const withTags = formatNotePreview(mockNotes[0], 1);
      // Test with a note that has no tags
      const withoutTags = formatNotePreview(mockNotes[1], 2);
      
      // Use consolidated expectations
      expect({
        containsTitle: withTags.includes(`**1. ${mockNotes[0].title}**`),
        containsId: withTags.includes(`ID: \`${mockNotes[0].id}\``),
        tagFormatting: withTags.includes('Tags: `tag1`, `tag2`'),
        noTagsHandling: withoutTags.includes('No tags'),
      }).toEqual({
        containsTitle: true,
        containsId: true,
        tagFormatting: true,
        noTagsHandling: true,
      });
    });

    test('should handle formatting options correctly', () => {
      // Test long content truncation
      const longContentNote = {
        ...mockNotes[0],
        content: 'a'.repeat(200),
      };
      
      // Test newline handling
      const withNewlines = formatNotePreview(mockNotes[0], 1, true);
      const withoutNewlines = formatNotePreview(mockNotes[0], 1, false);
      const longResult = formatNotePreview(longContentNote, 1);
      
      // Use consolidated expectations
      expect({
        truncatesLongContent: longResult.includes('...'),
        withNewlinesHasBreaks: withNewlines.includes('\n'),
        withoutNewlinesHasNoBreaks: !withoutNewlines.includes('\n'),
      }).toEqual({
        truncatesLongContent: true,
        withNewlinesHasBreaks: true,
        withoutNewlinesHasNoBreaks: true,
      });
    });
  });

  describe('getExcerpt', () => {
    test('should handle text excerpting correctly', () => {
      const longContent = 'a'.repeat(200);
      const shortContent = 'This is a short content';
      const contentWithComment = '<!-- source:test.md -->\nActual content';
      
      // Use consolidated expectations
      expect({
        longContentTruncated: getExcerpt(longContent, 100).endsWith('...'),
        longContentLength: getExcerpt(longContent, 100).length,
        shortContentPreserved: getExcerpt(shortContent) === shortContent,
        sourceCommentSkipped: getExcerpt(contentWithComment) === 'Actual content',
      }).toEqual({
        longContentTruncated: true,
        longContentLength: 103, // 100 chars + '...'
        shortContentPreserved: true,
        sourceCommentSkipped: true,
      });
    });
  });
});
