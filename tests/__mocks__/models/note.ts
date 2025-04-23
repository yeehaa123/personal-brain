/**
 * Mock Note Model Implementation
 * 
 * This file provides standardized mock implementations of the Note model
 * for use in tests across the codebase.
 */

import type { Note } from '@models/note';
import { EmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

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
    note.embedding = EmbeddingService.createMockEmbedding(`${id}-${title}`);
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
