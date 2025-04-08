import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { CLIRenderer } from '@commands/cli-renderer';
import type { CommandHandler, CommandResult } from '@commands/index';
import type { Note } from '@models/note';
import { createMockLogger, MockLogger } from '@test/__mocks__/core/logger';
import { createMockNotes } from '@test/__mocks__/models/note';
import { createTrackers, mockCLIInterface, mockDisplayNotes, restoreCLIInterface } from '@test/__mocks__/utils/cliUtils';
import { displayNotes } from '@utils/noteUtils';

describe('CLIRenderer', () => {
  let renderer: CLIRenderer;
  let mockNotes: Note[];
  let trackers: ReturnType<typeof createTrackers>;
  let originalCLI: Record<string, unknown>;

  beforeEach(() => {
    // Mock the Logger class to prevent logging
    const mockLogger = createMockLogger();
    mock.module('@/utils/logger', () => ({
      Logger: {
        getInstance: () => mockLogger,
        resetInstance: () => MockLogger.resetInstance(),
        createFresh: () => createMockLogger(),
      },
      default: mockLogger,
    }));
    
    renderer = new CLIRenderer();
    mockNotes = createMockNotes();

    // Set up trackers and mocks
    trackers = createTrackers();
    originalCLI = mockCLIInterface(trackers);

    // Mock displayNotes function
    mockDisplayNotes(displayNotes, trackers);
  });

  afterEach(() => {
    // Restore original functionality
    restoreCLIInterface(originalCLI);
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

  describe('conversation note rendering', () => {
    let mockCommandHandler: {
      confirmSaveNote: (_conversationId: string, title: string) => Promise<CommandResult>;
    };

    beforeEach(() => {
      // Create a mock command handler
      mockCommandHandler = {
        confirmSaveNote: (_conversationId: string, title: string) => {
          return Promise.resolve({
            type: 'save-note-confirm',
            noteId: 'note123',
            title,
          });
        },
      };

      // Set the command handler
      // Type cast to unknown then to CommandHandler to avoid TypeScript complaining about missing properties
      // For the test we only need the confirmSaveNote method
      renderer.setCommandHandler(mockCommandHandler as unknown as CommandHandler);
    });

    test('should render save-note-preview result', () => {
      const result = {
        type: 'save-note-preview',
        noteContent: 'This is the note content from a conversation.',
        title: 'Conversation Title',
        conversationId: 'conv123',
      } as unknown as CommandResult;

      renderer.render(result);

      // Verify UI elements were displayed
      expect(trackers.displayTitleCalls).toContain('Note Preview');
      expect(trackers.displaySubtitleCalls).toContain('Content Preview');
      expect(trackers.printCalls).toContain('This is the note content from a conversation.');

      // Check that info messages were shown
      expect(trackers.infoCalls).toContain('This is a preview of the note that will be created from your conversation.');
      expect(trackers.infoCalls).toContain('To save this note, type "y". To cancel, type "n".');
    });

    test('should render save-note-confirm result', () => {
      const result = {
        type: 'save-note-confirm',
        noteId: 'note123',
        title: 'Saved Note Title',
      } as unknown as CommandResult;

      renderer.render(result);

      // Verify UI elements were displayed
      expect(trackers.successCalls).toContain('Note "Saved Note Title" saved successfully!');
      expect(trackers.infoCalls).toContain('Note ID: note123');
      expect(trackers.infoCalls).toContain('To view the note, use the command:');
      expect(trackers.printCalls).toContain('  note note123');
    });

    test('should render conversation-notes result with notes', () => {
      // Let's simply check if the displayTitle method is called correctly
      const result = {
        type: 'conversation-notes',
        notes: mockNotes,
      } as unknown as CommandResult;

      renderer.render(result);

      // Verify UI elements were displayed
      expect(trackers.displayTitleCalls).toContain('Notes Created from Conversations');
    });

    test('should render conversation-notes result with no notes', () => {
      const result = {
        type: 'conversation-notes',
        notes: [],
      } as unknown as CommandResult;

      renderer.render(result);

      // Verify UI elements were displayed
      expect(trackers.displayTitleCalls).toContain('Notes Created from Conversations');
      expect(trackers.warnCalls).toContain('No conversation notes found.');
    });
  });
});
