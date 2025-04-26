/**
 * Mock implementation for NoteSearchService
 * 
 * Provides a standardized mock that follows the Component Interface Standardization pattern.
 */

import type { Note } from '@/models/note';
import type { NoteSearchOptions } from '@/services/notes/noteSearchService';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockBaseSearchService } from '@test/__mocks__/services/common/baseSearchService';

/**
 * Standardized mock implementation for NoteSearchService
 * Implements the Component Interface Standardization pattern
 */
export class MockNoteSearchService extends MockBaseSearchService {
  /** Singleton instance - use a different name to avoid property shadowing from parent class */
  private static noteSearchInstance: MockNoteSearchService | null = null;

  /**
   * Get the singleton instance
   */
  public static override getInstance(): MockNoteSearchService {
    if (!MockNoteSearchService.noteSearchInstance) {
      MockNoteSearchService.noteSearchInstance = new MockNoteSearchService();
    }
    return MockNoteSearchService.noteSearchInstance;
  }

  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockNoteSearchService.noteSearchInstance = null;
  }

  /**
   * Create a fresh instance
   */
  public static override createFresh(): MockNoteSearchService {
    return new MockNoteSearchService();
  }

  /**
   * Search notes by query, tags, etc.
   */
  async searchNotes(options: NoteSearchOptions): Promise<Note[]> {
    const { limit = 10 } = options;
    
    const mockNotes = Array.from({ length: limit }, (_, i) => {
      return createMockNote(`note-${i + 1}`, `Test Note ${i + 1}`, ['test']);
    });
    
    return mockNotes;
  }

  /**
   * Find related notes by note ID
   */
  async findRelated(noteId: string, limit = 5): Promise<Note[]> {
    const mockNotes = Array.from({ length: limit }, (_, i) => {
      return createMockNote(`related-${noteId}-${i + 1}`, `Related to ${noteId} - ${i + 1}`, ['test']);
    });
    
    return mockNotes;
  }
  
  /**
   * Find notes by keywords
   */
  async findByKeywords(keywords: string[], limit = 10): Promise<Note[]> {
    const mockNotes = Array.from({ length: limit }, (_, i) => {
      return createMockNote(`keyword-${i + 1}`, `Note matching keywords: ${keywords.join(', ')}`, keywords);
    });
    
    return mockNotes;
  }
}