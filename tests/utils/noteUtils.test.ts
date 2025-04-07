import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { Note } from '@models/note';
import { restoreLogger, silenceLogger } from '@test/__mocks__';
import { createMockNotes, createTrackers } from '@test/mocks';
import { mockCLIInterface, restoreCLIInterface } from '@test/test-utils';
import logger from '@utils/logger';
import { displayNotes, formatNotePreview, getExcerpt } from '@utils/noteUtils';




describe('noteUtils', () => {
  let mockNotes: Note[];
  let trackers: ReturnType<typeof createTrackers>;
  let originalCLI: Record<string, unknown>;
  let originalLogger: Record<string, unknown>;
  
  beforeEach(() => {
    // Create sample notes for testing
    mockNotes = createMockNotes();
    
    // Set up trackers and mocks
    trackers = createTrackers();
    originalCLI = mockCLIInterface(trackers);
    originalLogger = silenceLogger(logger);
  });
  
  afterEach(() => {
    // Restore original functionality
    restoreCLIInterface(originalCLI);
    restoreLogger(logger, originalLogger);
  });
  
  describe('displayNotes', () => {
    test('should display notes with proper formatting', () => {
      // Call the function under test
      displayNotes(mockNotes);
      
      // Check that print was called at least once for each note
      expect(trackers.printCalls.length).toBeGreaterThanOrEqual(mockNotes.length);
      
      // Check that printLabelValue was called 4 times per note (ID, Tags, Created, Preview)
      expect(trackers.printLabelValueCalls.length).toBe(mockNotes.length * 4);
      
      // Check specific calls for the first note
      let foundTitleCall = false;
      for (const call of trackers.printCalls) {
        if (call.includes('Test Note 1')) {
          foundTitleCall = true;
          break;
        }
      }
      expect(foundTitleCall).toBeTrue();
      
      // Check Tags formatter exists
      const tagsCall = trackers.printLabelValueCalls.find(call => 
        call[0] === 'Tags' && 
        Array.isArray(call[1]) && 
        call[1].includes('tag1'),
      );
      expect(tagsCall).toBeDefined();
      
      if (tagsCall) {
        const options = tagsCall[2] || {};
        const formatter = options['formatter'] as ((tag: string) => string) | undefined;
        expect(formatter).toBeDefined();
        
        // Test the formatter by directly calling it
        if (formatter) {
          const result = formatter('test-tag');
          expect(result.includes('#test-tag')).toBeTrue();
        }
      }
      
      // Check empty tags handling
      const emptyTagsCall = trackers.printLabelValueCalls.find(call => 
        call[0] === 'Tags' && 
        Array.isArray(call[1]) && 
        call[1].length === 0,
      );
      expect(emptyTagsCall).toBeDefined();
      
      if (emptyTagsCall) {
        const options = emptyTagsCall[2] || {};
        expect(options['emptyText']).toBe('none');
      }
    });
    
    test('should handle empty notes array', () => {
      displayNotes([]);
      
      // Check warn was called
      expect(trackers.warnCalls.length).toBe(1);
      expect(trackers.warnCalls[0]).toBe('No notes found.');
      
      // Print shouldn't be called for note display
      const relevantPrintCalls = trackers.printCalls.filter(
        call => call.includes('Test Note'),
      );
      expect(relevantPrintCalls.length).toBe(0);
    });
  });
  
  describe('formatNotePreview', () => {
    test('should format note preview correctly', () => {
      const result = formatNotePreview(mockNotes[0], 1);
      expect(result).toContain('**1. Test Note 1**');
      expect(result).toContain('ID: `note-1`');
      expect(result).toContain('Tags: `tag1`, `tag2`');
      expect(result).toContain('This is the content of Test Note 1');
    });
    
    test('should handle notes without tags', () => {
      const result = formatNotePreview(mockNotes[1], 2);
      expect(result).toContain('**2. Test Note 2**');
      expect(result).toContain('No tags');
    });
    
    test('should truncate long content', () => {
      const longContentNote = {
        ...mockNotes[0],
        content: 'a'.repeat(200),
      };
      
      const result = formatNotePreview(longContentNote, 1);
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(longContentNote.content.length);
    });
    
    test('should not include newlines when specified', () => {
      const withNewlines = formatNotePreview(mockNotes[0], 1, true);
      const withoutNewlines = formatNotePreview(mockNotes[0], 1, false);
      
      expect(withNewlines).toContain('\n');
      expect(withoutNewlines).not.toContain('\n');
    });
  });
  
  describe('getExcerpt', () => {
    test('should return truncated content', () => {
      const longContent = 'a'.repeat(200);
      const result = getExcerpt(longContent, 100);
      
      expect(result.length).toBeLessThan(longContent.length);
      expect(result.length).toBe(103); // 100 chars + '...'
      expect(result.endsWith('...')).toBeTrue();
    });
    
    test('should return full content if shorter than max length', () => {
      const shortContent = 'This is a short content';
      const result = getExcerpt(shortContent);
      
      expect(result).toBe(shortContent);
    });
    
    test('should skip source ID comments', () => {
      const contentWithComment = '<!-- source:test.md -->\nActual content';
      const result = getExcerpt(contentWithComment);
      
      expect(result).toBe('Actual content');
    });
  });
});