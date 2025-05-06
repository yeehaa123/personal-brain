/**
 * Tests for CLIRenderer
 * 
 * This file tests that CLI rendering works correctly
 * for the most important command types.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { Logger } from '@/utils/logger';
import { CLIRenderer } from '@commands/cli-renderer';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createMockNotes } from '@test/__mocks__/models/note';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockCLIInterface } from '@test/__mocks__/utils/cliInterface';

describe('CLIRenderer', () => {
  // Setup test components
  let renderer: CLIRenderer;
  let mockCLI: MockCLIInterface;
  let mockLogger: ReturnType<typeof MockLogger.getInstance>;
  
  beforeEach(() => {
    // Reset dependencies
    MockCLIInterface.resetInstance();
    MockLogger.resetInstance();
    
    // Create fresh instances of dependencies
    mockCLI = MockCLIInterface.getInstance();
    mockLogger = MockLogger.getInstance();
    
    // Create the renderer with mocked dependencies
    renderer = CLIRenderer.createFresh({
      cliInterface: mockCLI,
      logger: mockLogger as unknown as Logger,
    });
  });
  
  afterEach(() => {
    // Reset all test dependencies
    MockCLIInterface.resetInstance();
    MockLogger.resetInstance();
    CLIRenderer.resetInstance();
  });

  test('renders note list correctly', () => {
    // Test with notes
    renderer.render({
      type: 'notes',
      notes: createMockNotes(),
      title: 'All Notes',
    });
    
    expect(mockCLI.displayTitle).toHaveBeenCalledWith('All Notes');
    expect(mockCLI.print).toHaveBeenCalled();
    
    // Test empty list
    mockCLI.displayTitle.mockClear();
    mockCLI.displayList.mockClear();
    
    renderer.render({
      type: 'notes',
      notes: [],
      title: 'No Notes',
    });
    
    expect(mockCLI.warn).toHaveBeenCalledWith('No notes found.');
  });
  
  test('renders note details correctly', () => {
    const note = createTestNote({
      id: 'note-123', 
      title: 'Test Note',
      content: 'Test content',
    });
    
    renderer.render({
      type: 'note',
      note,
    });
    
    expect(mockCLI.displayTitle).toHaveBeenCalledWith(note.title);
    // The CLIRenderer calls renderNote which uses formatId
    expect(mockCLI.printLabelValue).toHaveBeenCalledTimes(4);
    expect(mockCLI.displaySubtitle).toHaveBeenCalledWith('Content');
    expect(mockCLI.print).toHaveBeenCalledWith(note.content);
  });

  test('renders error message correctly', () => {
    renderer.render({
      type: 'error',
      message: 'Command not found!',
    });
    
    expect(mockCLI.error).toHaveBeenCalledWith('Command not found!');
  });

  test('renders search results with query in title', () => {
    renderer.render({
      type: 'search',
      query: 'test query',
      notes: createMockNotes(),
    });
    
    // Verify correct behavior
    expect(mockCLI.displayTitle).toHaveBeenCalled();
    
    // Type-safe way to check mock call argument
    expect(mockCLI.displayTitle).toHaveBeenCalledWith(
      expect.stringContaining('test query'),
    );
    expect(mockCLI.print).toHaveBeenCalled();
  });
});