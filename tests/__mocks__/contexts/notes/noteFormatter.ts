/**
 * MockNoteFormatter
 * 
 * Mock implementation of NoteFormatter for testing
 * Implements FormatterInterface for compatibility with the interface standardization
 */

import type { FormatterInterface, FormattingOptions } from '@/contexts/formatterInterface';
import type { Note } from '@/models/note';

/**
 * Mock implementation of NoteFormatter
 * 
 * Implements FormatterInterface for compatibility with interface standardization.
 */
export class MockNoteFormatter implements FormatterInterface<Note, string> {
  // Singleton pattern implementation
  private static instance: MockNoteFormatter | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // No initialization needed for the mock
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockNoteFormatter {
    if (!MockNoteFormatter.instance) {
      MockNoteFormatter.instance = new MockNoteFormatter();
    }
    return MockNoteFormatter.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockNoteFormatter.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   */
  public static createFresh(): MockNoteFormatter {
    return new MockNoteFormatter();
  }

  /**
   * Format method implementation for FormatterInterface
   */
  format(data: Note, options?: FormattingOptions): string {
    const format = options?.['format'] as string || 'text';
    
    switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'html':
      return this.formatAsHtml(data);
    case 'markdown':
      return this.formatAsMarkdown(data);
    case 'text':
    default:
      return this.formatAsText(data);
    }
  }

  /**
   * Format a note as plain text
   */
  formatAsText(note: Note): string {
    let result = `Title: ${note.title || 'Untitled'}\n`;
    
    if (note.tags && note.tags.length > 0) {
      result += `Tags: ${note.tags.join(', ')}\n`;
    }
    
    if (note.createdAt) {
      result += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
    }
    
    if (note.updatedAt) {
      result += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;
    }
    
    result += '\n';
    result += note.content || '';
    
    return result;
  }
  
  /**
   * Format a note as markdown
   */
  formatAsMarkdown(note: Note): string {
    let result = `# ${note.title || 'Untitled'}\n\n`;
    
    if (note.tags && note.tags.length > 0) {
      result += `Tags: \`${note.tags.join('`, `')}\`\n\n`;
    }
    
    const dateInfo = [];
    if (note.createdAt) {
      dateInfo.push(`Created: ${new Date(note.createdAt).toLocaleString()}`);
    }
    if (note.updatedAt) {
      dateInfo.push(`Updated: ${new Date(note.updatedAt).toLocaleString()}`);
    }
    
    if (dateInfo.length > 0) {
      result += `*${dateInfo.join(' | ')}*\n\n`;
    }
    
    result += note.content || '';
    
    return result;
  }
  
  /**
   * Format a note as HTML
   */
  formatAsHtml(note: Note): string {
    let result = '<div class="note">\n';
    result += `  <h1>${this.escapeHtml(note.title || 'Untitled')}</h1>\n`;
    
    if (note.tags && note.tags.length > 0) {
      result += '  <div class="tags">\n';
      result += '    ' + note.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(' ');
      result += '\n  </div>\n';
    }
    
    result += '  <div class="meta">\n';
    if (note.createdAt) {
      result += `    <span class="created">Created: ${new Date(note.createdAt).toLocaleString()}</span>\n`;
    }
    if (note.updatedAt) {
      result += `    <span class="updated">Updated: ${new Date(note.updatedAt).toLocaleString()}</span>\n`;
    }
    result += '  </div>\n';
    
    result += `  <div class="content">\n    ${this.escapeHtml(note.content || '').replace(/\n/g, '<br/>')}\n  </div>\n`;
    result += '</div>';
    
    return result;
  }
  
  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}