/**
 * Mock Note Model Implementation
 * 
 * This file provides standardized mock implementations of the Note model
 * for use in tests across the codebase.
 */

import type { NewNote, Note, NoteSearchParams } from '@models/note';
import { createMockEmbedding, hashString } from '@test/__mocks__/utils/embeddingUtils';

/**
 * MockNote class with factory methods for creating notes
 */
export class MockNote {
  static createWithDefaults(id: string, title: string, tags: string[] = []): Note {
    return {
      id,
      title,
      content: `This is the content of ${title}`,
      tags,
      embedding: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      source: 'import',
      confidence: null,
      conversationMetadata: null,
      verified: null,
    };
  }

  static createWithEmbedding(id: string, title: string, tags: string[] = []): Note {
    const note = this.createWithDefaults(id, title, tags);
    note.embedding = createMockEmbedding(`${id}-${title}`);
    return note;
  }

  static createFromConversation(id: string, title: string, conversationId: string): Note {
    const note = this.createWithDefaults(id, title);
    note.source = 'conversation';
    note.confidence = 85;
    note.conversationMetadata = {
      conversationId,
      timestamp: new Date(),
      userName: 'Test User',
      promptSegment: 'Test prompt segment',
    };
    return note;
  }

  static createStandardSet(): Note[] {
    return [
      this.createWithDefaults('note-1', 'Test Note 1', ['tag1', 'tag2']),
      this.createWithDefaults('note-2', 'Test Note 2'),
      this.createWithEmbedding('note-3', 'Test Note with Embedding', ['embedding', 'vector']),
      this.createFromConversation('note-4', 'Conversation Note', 'conv-123'),
    ];
  }
}

/**
 * Create a mock note with specified properties
 * For backward compatibility with existing tests
 */
export function createMockNote(id: string, title: string, tags: string[] = []): Note {
  return MockNote.createWithDefaults(id, title, tags);
}

/**
 * Create a standard set of mock notes for testing
 * For backward compatibility with existing tests
 */
export function createMockNotes(): Note[] {
  return [
    createMockNote('note-1', 'Test Note 1', ['tag1', 'tag2']),
    createMockNote('note-2', 'Test Note 2'),
  ];
}

/**
 * Create a custom note with specific properties
 */
export function createTestNote(params: Partial<Note> = {}): Note {
  const defaultNote: Note = {
    id: 'test-note-id',
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    embedding: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'import',
    confidence: null,
    conversationMetadata: null,
    verified: null,
  };

  return { ...defaultNote, ...params };
}

/**
 * Create a new note (for insertion)
 */
export function createNewNote(params: Partial<NewNote> = {}): Partial<Note> {
  // Note: This isn't a complete Note as required by the schema,
  // but represents fields used for creating a new note
  const defaultNewNote: Partial<Note> = {
    title: 'New Test Note',
    content: 'New test content',
    tags: [],
    embedding: null,
    source: 'import',
    verified: false,
    id: `note-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaultNewNote, ...params };
}

/**
 * Create mock note search parameters
 */
export function createMockSearchParams(params: Partial<NoteSearchParams> = {}): NoteSearchParams {
  const defaultParams: NoteSearchParams = {
    query: '',
    tags: [],
    limit: 20,
    offset: 0,
  };

  return { ...defaultParams, ...params };
}

/**
 * Utility functions for note mock operations
 */
export const NoteMockUtils = {
  createEmbedding: createMockEmbedding,
  hashString,
  createNote: createMockNote,
  createNotes: createMockNotes,
  createTestNote,
  createNewNote,
  createSearchParams: createMockSearchParams,
};