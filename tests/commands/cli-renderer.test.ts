import { beforeEach, describe, expect, test } from 'bun:test';

import { CLIRenderer } from '@commands/cli-renderer';
import { createMockNotes, createTestNote } from '@test/__mocks__/models/note';

describe('CLIRenderer Behavior', () => {
  let renderer: CLIRenderer;
  let outputCapture: string[] = [];
  
  const mockCLI = {
    print: (text: string) => outputCapture.push(text),
    displayTitle: (text: string) => outputCapture.push(`TITLE: ${text}`),
    displaySubtitle: (text: string) => outputCapture.push(`SUBTITLE: ${text}`),
    printLabelValue: (label: string, value: unknown) => outputCapture.push(`${label}: ${String(value)}`),
    warn: (text: string) => outputCapture.push(`WARNING: ${text}`),
    error: (text: string) => outputCapture.push(`ERROR: ${text}`),
    displayList: () => outputCapture.push('LIST'),
    formatId: (id: string) => `[${id}]`,
    formatDate: (date: Date) => date.toISOString(),
    renderMarkdown: (markdown: string) => outputCapture.push(markdown),
    styles: {
      title: (text: string) => text,
      subtitle: (text: string) => text,
      number: (text: string) => text,
      tag: (text: string) => text,
      label: (text: string) => text,
      success: (text: string) => text,
      error: (text: string) => text,
      warning: (text: string) => text,
    },
  };
  
  beforeEach(() => {
    outputCapture = [];
    // Type assertion for mock CLI, since it's a partial implementation of the interface
    renderer = CLIRenderer.createFresh({ cliInterface: mockCLI as unknown as typeof mockCLI });
  });

  test('displays notes list', () => {
    const notes = createMockNotes();
    
    renderer.render({
      type: 'notes',
      notes,
      title: 'All Notes',
    });
    
    expect(outputCapture).toContain('TITLE: All Notes');
    // Check that notes are rendered with their data instead of expecting LIST
    expect(outputCapture.some(line => line.includes('note-1'))).toBe(true);
  });
  
  test('handles empty notes list', () => {
    renderer.render({
      type: 'notes',
      notes: [],
      title: 'No Notes',
    });
    
    expect(outputCapture).toContain('WARNING: No notes found.');
  });
  
  test('displays note details', () => {
    const note = createTestNote({
      id: 'note-123', 
      title: 'Test Note',
      content: 'Test content',
    });
    
    renderer.render({
      type: 'note',
      note,
    });
    
    expect(outputCapture).toContain('TITLE: Test Note');
    expect(outputCapture).toContain('SUBTITLE: Content');
    expect(outputCapture).toContain('Test content');
  });

  test('displays error messages', () => {
    renderer.render({
      type: 'error',
      message: 'Command not found!',
    });
    
    expect(outputCapture).toContain('ERROR: Command not found!');
  });

  test('displays search results', () => {
    renderer.render({
      type: 'search',
      query: 'test query',
      notes: createMockNotes(),
    });
    
    expect(outputCapture.some(line => line.includes('test query'))).toBe(true);
  });
});