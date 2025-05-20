/**
 * Tests for ConversationNoteAdapter
 * 
 * This file tests the adapter pattern for conversation-related note operations.
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ConversationNoteAdapterDependencies } from '@/contexts/notes/adapters/conversationNoteAdapter';  
import { ConversationNoteAdapter } from '@/contexts/notes/adapters/conversationNoteAdapter';
import type { db as defaultDb } from '@/db';
import type { Note } from '@/models/note';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';

// Create a mock note with conversation metadata
const mockConversationNote = createMockNote('note-conv-2', 'Note with specific metadata', ['conversation', 'metadata']);
mockConversationNote.source = 'conversation';
mockConversationNote.conversationMetadata = {
  conversationId: 'conv-123',
  timestamp: new Date('2025-01-01'),
};
mockConversationNote.content = 'Content with specific metadata';

// Create additional test notes
const mockNotes: Note[] = [
  mockConversationNote,
  createMockNote('note-1', 'Regular Note', ['test']),
  createMockNote('note-conv-1', 'Another Conversation Note', ['conversation']),
];

// Set source and metadata for the conversation note
mockNotes[2].source = 'conversation';
mockNotes[2].conversationMetadata = {
  conversationId: 'conv-456',
  timestamp: new Date('2025-01-02'),
  userName: 'TestUser',
};

describe('ConversationNoteAdapter', () => {
  // Create mock adapter for testing
  let adapter: ConversationNoteAdapter;
  
  // Mock db execute method
  const mockDbExecute = mock(() => ({
    rows: [mockConversationNote],
  }));
  
  // Mock db for direct database operations
  const mockDb = {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => Promise.resolve([mockConversationNote])),
        })),
      })),
    })),
    $client: {
      get execute() { return mockDbExecute; },
    },
  };
  
  beforeEach(() => {
    // Reset mocks and adapter
    ConversationNoteAdapter.resetInstance();
    MockNoteRepository.resetInstance();
    
    // Create fresh repository with test notes using our standardized mock
    const repository = MockNoteRepository.createFresh(mockNotes);
    
    // Set up the notes in our repository - need to cast to access the type
    (repository as unknown as MockNoteRepository).setNotes(mockNotes);
    
    // Create adapter with standardized mock dependencies 
    adapter = ConversationNoteAdapter.createFresh({
      repository: repository as NoteRepository,
      db: mockDb as unknown as typeof defaultDb,
      logger: MockLogger.createFresh(),
    } as ConversationNoteAdapterDependencies);
  });
  
  test('getInstance returns a singleton instance', () => {
    const instance1 = ConversationNoteAdapter.getInstance();
    const instance2 = ConversationNoteAdapter.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh returns a new instance each time', () => {
    const instance1 = ConversationNoteAdapter.createFresh();
    const instance2 = ConversationNoteAdapter.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('findConversationNotes returns notes with conversation source', async () => {
    const result = await adapter.findConversationNotes();
    
    expect(result).toHaveLength(2);
    expect(result.every(note => note.source === 'conversation')).toBe(true);
  });
  
  test('findByConversationId returns notes with matching conversation ID', async () => {
    const result = await adapter.findByConversationId('conv-123');
    
    expect(result).toHaveLength(1);
    expect(result[0].conversationMetadata?.conversationId).toBe('conv-123');
    expect(result[0].title).toBe('Note with specific metadata');
  });
  
  test('findByMetadataField returns notes with matching metadata field', async () => {
    const result = await adapter.findByMetadataField('userName', 'TestUser');
    
    // This uses the direct DB query mock which returns mockConversationNote
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-conv-2');
  });
  
  test('findConversationNotesByTag returns conversation notes with matching tag', async () => {
    const result = await adapter.findConversationNotesByTag('metadata');
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-conv-2');
    expect(result[0].source).toBe('conversation');
    expect(result[0].tags).toContain('metadata');
  });
});