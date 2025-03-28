import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { displayNotes, formatNotePreview, getExcerpt } from '../src/utils/noteUtils';
import { CLIInterface } from '../src/utils/cliInterface';
import type { Note } from '../src/models/note';

// Store track of mock calls instead of replacing functions
let printCalls: Array<[string]> = [];
let printLabelValueCalls: Array<[string, any, any]> = [];
let warnCalls: Array<[string]> = [];

// Mock functions for logger
import logger from '../src/utils/logger';

// Save original logger methods
const originalLoggerInfo = logger.info;
const originalLoggerDebug = logger.debug;
const originalLoggerWarn = logger.warn;
const originalLoggerError = logger.error;

describe('noteUtils', () => {
  let mockNotes: Note[];
  
  beforeEach(() => {
    // Create sample notes for testing
    mockNotes = [
      {
        id: 'note-1',
        title: 'Test Note 1',
        content: 'This is the content of test note 1',
        tags: ['tag1', 'tag2'],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02')
      },
      {
        id: 'note-2',
        title: 'Test Note 2',
        content: 'This is the content of test note 2',
        tags: [],
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-04')
      }
    ];
    
    // Clear call tracking arrays
    printCalls = [];
    printLabelValueCalls = [];
    warnCalls = [];
    
    // Save original methods
    const originalPrint = CLIInterface.print;
    const originalPrintLabelValue = CLIInterface.printLabelValue;
    const originalWarn = CLIInterface.warn;
    
    // Create spy methods that track calls but still invoke the original
    CLIInterface.print = function(message) {
      printCalls.push([message]);
      // Don't actually print during tests
      // return originalPrint(message);
    };
    
    CLIInterface.printLabelValue = function(label, value, options) {
      printLabelValueCalls.push([label, value, options]);
      // Don't actually print during tests
      // return originalPrintLabelValue(label, value, options);
    };
    
    CLIInterface.warn = function(message) {
      warnCalls.push([message]);
      // Don't actually print during tests
      // return originalWarn(message);
    };
    
    // Mock logger methods to suppress output
    logger.info = () => {};
    logger.debug = () => {};
    logger.warn = () => {};
    logger.error = () => {};
  });
  
  afterEach(() => {
    // Restore original logger methods
    logger.info = originalLoggerInfo;
    logger.debug = originalLoggerDebug;
    logger.warn = originalLoggerWarn;
    logger.error = originalLoggerError;
  });
  
  describe('displayNotes', () => {
    test('should display notes with proper formatting', () => {
      // Call the function under test
      displayNotes(mockNotes);
      
      // Check that print was called at least once for each note
      expect(printCalls.length).toBeGreaterThanOrEqual(mockNotes.length);
      
      // Check that printLabelValue was called 4 times per note (ID, Tags, Created, Preview)
      expect(printLabelValueCalls.length).toBe(mockNotes.length * 4);
      
      // Check specific calls for the first note
      let foundTitleCall = false;
      for (const call of printCalls) {
        if (call[0].includes('Test Note 1')) {
          foundTitleCall = true;
          break;
        }
      }
      expect(foundTitleCall).toBeTrue();
      
      // Check Tags formatter exists
      const tagsCall = printLabelValueCalls.find(call => 
        call[0] === 'Tags' && 
        Array.isArray(call[1]) && 
        call[1].includes('tag1')
      );
      expect(tagsCall).toBeDefined();
      
      if (tagsCall) {
        const options = tagsCall[2];
        expect(options.formatter).toBeDefined();
        
        // Test the formatter by directly calling it
        if (options.formatter) {
          const result = options.formatter('test-tag');
          expect(result.includes('#test-tag')).toBeTrue();
        }
      }
      
      // Check empty tags handling
      const emptyTagsCall = printLabelValueCalls.find(call => 
        call[0] === 'Tags' && 
        Array.isArray(call[1]) && 
        call[1].length === 0
      );
      expect(emptyTagsCall).toBeDefined();
      
      if (emptyTagsCall) {
        const options = emptyTagsCall[2];
        expect(options.emptyText).toBe('none');
      }
    });
    
    test('should handle empty notes array', () => {
      displayNotes([]);
      
      // Check warn was called
      expect(warnCalls.length).toBe(1);
      expect(warnCalls[0][0]).toBe('No notes found.');
      
      // Print shouldn't be called for note display
      const relevantPrintCalls = printCalls.filter(
        call => call[0].includes('Test Note')
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
      expect(result).toContain('This is the content of test note 1');
    });
    
    test('should handle notes without tags', () => {
      const result = formatNotePreview(mockNotes[1], 2);
      expect(result).toContain('**2. Test Note 2**');
      expect(result).toContain('No tags');
    });
    
    test('should truncate long content', () => {
      const longContentNote = {
        ...mockNotes[0],
        content: 'a'.repeat(200)
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