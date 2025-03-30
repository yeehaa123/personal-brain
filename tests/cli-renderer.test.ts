import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { CLIRenderer } from '../src/commands/cli-renderer';
import type { CommandResult } from '../src/commands';
import type { Note } from '../src/models/note';
import logger from '../src/utils/logger';
import { createMockNotes, createTrackers, mockLogger, restoreLogger } from './mocks';
import { mockCLIInterface, restoreCLIInterface, mockDisplayNotes } from './test-utils';
import { displayNotes } from '../src/utils/noteUtils';

describe('CLIRenderer', () => {
  let renderer: CLIRenderer;
  let mockNotes: Note[];
  let trackers: ReturnType<typeof createTrackers>;
  let originalCLI: any;
  let originalLogger: any;
  let originalDisplayNotes: any;

  beforeEach(() => {
    renderer = new CLIRenderer();
    mockNotes = createMockNotes();

    // Set up trackers and mocks
    trackers = createTrackers();
    originalCLI = mockCLIInterface(trackers);
    originalLogger = mockLogger(logger);

    // Mock displayNotes function
    originalDisplayNotes = mockDisplayNotes(displayNotes, trackers);
  });

  afterEach(() => {
    // Restore original functionality
    restoreCLIInterface(originalCLI);
    restoreLogger(logger, originalLogger);
  });

  describe('render method', () => {
    test('should handle notes type result', () => {
      const result: CommandResult = {
        type: 'notes',
        notes: mockNotes,
        title: 'Test Notes',
      };

      renderer.render(result);

      // Check that the title is displayed
      expect(trackers.displayTitleCalls).toContain('Test Notes');
    });

    test('should handle empty notes array', () => {
      const result: CommandResult = {
        type: 'notes',
        notes: [],
        title: 'Empty Notes',
      };

      renderer.render(result);

      expect(trackers.displayTitleCalls).toContain('Empty Notes');
      expect(trackers.warnCalls).toContain('No notes found.');
    });

    test('should handle error result', () => {
      const result: CommandResult = {
        type: 'error',
        message: 'Test error message',
      };

      renderer.render(result);

      expect(trackers.errorCalls).toContain('Test error message');
    });

    test('should handle search result', () => {
      const result: CommandResult = {
        type: 'search',
        query: 'test query',
        notes: mockNotes,
      };

      renderer.render(result);

      expect(trackers.displayTitleCalls).toContain('Search Results for "test query"');
    });

    test('should handle tags result', () => {
      const result: CommandResult = {
        type: 'tags',
        tags: [
          { tag: 'tag1', count: 5 },
          { tag: 'tag2', count: 3 },
        ],
      };

      renderer.render(result);

      expect(trackers.displayTitleCalls).toContain('Available Tags');
      expect(trackers.displayListCalls.length).toBeGreaterThan(0);

      // Verify that displayList was called with the right items
      expect(trackers.displayListCalls[0].items.length).toBe(2);
    });
  });

  describe('renderNote method', () => {
    test('should display note correctly', () => {
      const note = mockNotes[0];

      renderer['renderNote'](note);

      expect(trackers.displayTitleCalls).toContain(note.title);
      expect(trackers.displaySubtitleCalls).toContain('Content');
      expect(trackers.printCalls).toContain(note.content);
    });

    test('should handle note without tags', () => {
      const note = mockNotes[1]; // Note without tags

      renderer['renderNote'](note);

      expect(trackers.displayTitleCalls).toContain(note.title);
    });
  });
});
