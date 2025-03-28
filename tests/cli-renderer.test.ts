import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { CLIRenderer } from '../src/commands/cli-renderer';
import { CLIInterface } from '../src/utils/cliInterface';
import type { CommandResult } from '../src/commands';
import type { Note } from '../src/models/note';
import logger from '../src/utils/logger';

// Track function calls
let displayTitleCalls: string[] = [];
let displaySubtitleCalls: string[] = [];
let errorCalls: string[] = [];
let warnCalls: string[] = [];
let successCalls: string[] = [];
let infoCalls: string[] = [];
let printCalls: string[] = [];
let displayListCalls: any[] = [];

// Mute logger
logger.info = () => {};
logger.debug = () => {};
logger.warn = () => {};
logger.error = () => {};

// Import and track displayNotes calls
import { displayNotes } from '../src/utils/noteUtils';
let displayNotesCalls: any[] = [];

describe('CLIRenderer', () => {
  let renderer: CLIRenderer;
  let mockNotes: Note[];
  
  beforeEach(() => {
    renderer = new CLIRenderer();
    
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
    
    // Clear call tracking
    displayTitleCalls = [];
    displaySubtitleCalls = [];
    errorCalls = [];
    warnCalls = [];
    successCalls = [];
    infoCalls = [];
    printCalls = [];
    displayListCalls = [];
    displayNotesCalls = [];
    
    // Store original functions
    const originalDisplayTitle = CLIInterface.displayTitle;
    const originalDisplaySubtitle = CLIInterface.displaySubtitle;
    const originalError = CLIInterface.error;
    const originalWarn = CLIInterface.warn;
    const originalSuccess = CLIInterface.success;
    const originalInfo = CLIInterface.info;
    const originalPrint = CLIInterface.print;
    const originalDisplayList = CLIInterface.displayList;
    const originalFormatId = CLIInterface.formatId;
    
    // Create spy functions
    CLIInterface.displayTitle = (title) => {
      displayTitleCalls.push(title);
    };
    
    CLIInterface.displaySubtitle = (title) => {
      displaySubtitleCalls.push(title);
    };
    
    CLIInterface.error = (msg) => {
      errorCalls.push(msg);
    };
    
    CLIInterface.warn = (msg) => {
      warnCalls.push(msg);
    };
    
    CLIInterface.success = (msg) => {
      successCalls.push(msg);
    };
    
    CLIInterface.info = (msg) => {
      infoCalls.push(msg);
    };
    
    CLIInterface.print = (msg) => {
      printCalls.push(msg);
    };
    
    CLIInterface.displayList = (items, formatter) => {
      displayListCalls.push({ items, formatter });
    };
    
    // Create a simple proxy for displayNotes to track calls
    (global as any).displayNotes = function(notes: any) {
      displayNotesCalls.push(notes);
    };
    
    // Fix the formatId issue
    CLIInterface.formatId = function(id: string) {
      return id;
    };
  });
  
  afterEach(() => {
    // No need to restore, we're using a fresh test environment each time
  });
  
  describe('render method', () => {
    test('should handle notes type result', () => {
      const result: CommandResult = {
        type: 'notes',
        notes: mockNotes,
        title: 'Test Notes'
      };
      
      renderer.render(result);
      
      // Check that the title is displayed
      expect(displayTitleCalls).toContain('Test Notes');
      
      // For now, we can't properly test displayNotes being called
    });
    
    test('should handle empty notes array', () => {
      const result: CommandResult = {
        type: 'notes',
        notes: [],
        title: 'Empty Notes'
      };
      
      renderer.render(result);
      
      expect(displayTitleCalls).toContain('Empty Notes');
      expect(warnCalls).toContain('No notes found.');
    });
    
    test('should handle error result', () => {
      const result: CommandResult = {
        type: 'error',
        message: 'Test error message'
      };
      
      renderer.render(result);
      
      expect(errorCalls).toContain('Test error message');
    });
    
    test('should handle search result', () => {
      const result: CommandResult = {
        type: 'search',
        query: 'test query',
        notes: mockNotes
      };
      
      renderer.render(result);
      
      expect(displayTitleCalls).toContain('Search Results for "test query"');
    });
    
    test('should handle tags result', () => {
      const result: CommandResult = {
        type: 'tags',
        tags: [
          { tag: 'tag1', count: 5 },
          { tag: 'tag2', count: 3 }
        ]
      };
      
      renderer.render(result);
      
      expect(displayTitleCalls).toContain('Available Tags');
      expect(displayListCalls.length).toBeGreaterThan(0);
      
      // Verify that displayList was called with the right items
      expect(displayListCalls[0].items.length).toBe(2);
    });
  });
  
  describe('renderNote method', () => {
    test('should display note correctly', () => {
      const note = mockNotes[0];
      
      renderer['renderNote'](note);
      
      expect(displayTitleCalls).toContain(note.title);
      expect(displaySubtitleCalls).toContain('Content');
      expect(printCalls).toContain(note.content);
    });
    
    test('should handle note without tags', () => {
      const note = mockNotes[1]; // Note without tags
      
      renderer['renderNote'](note);
      
      expect(displayTitleCalls).toContain(note.title);
    });
  });
  
  // Additional tests for other render methods can be added here
});