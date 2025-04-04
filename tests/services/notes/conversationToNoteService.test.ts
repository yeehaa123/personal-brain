/**
 * Tests for ConversationToNoteService
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import type { Note } from '@/models/note';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createTestNote } from '@test/utils/embeddingUtils';

// Mock the tagExtractor module
const mockExtractTags = mock(() => Promise.resolve(['ecosystem', 'architecture', 'example']));
mock.module('@/utils/tagExtractor', () => ({
  extractTags: mockExtractTags,
}));

// Mock the uuid module
const mockUuidv4 = mock(() => 'mock-uuid');
mock.module('uuid', () => ({
  v4: mockUuidv4,
}));

describe('ConversationToNoteService', () => {
  // Setup mocks
  const sampleNote = createTestNote({
    id: 'note-12345678',
    title: 'Test Title',
    content: 'Test Content',
    tags: ['tag1', 'tag2'],
    source: 'conversation',
    conversationMetadata: {
      conversationId: 'conv-123',
      timestamp: new Date(),
    },
    confidence: 75,
    verified: false,
  });

  // Create mock functions with manual call tracking for test assertions
  let insertNoteCalls: Note[] = [];
  const insertNoteMock = (data: Note) => {
    insertNoteCalls.push(data);
    return Promise.resolve('note-12345678');
  };

  // Create proper mock objects with functions - no jest mock methods
  const mockNoteRepository = {
    insertNote: insertNoteMock,
    getNoteById: () => Promise.resolve(sampleNote),
    findBySource: () => Promise.resolve([]),
    findByConversationMetadata: () => Promise.resolve([]),
    // Add all other required NoteRepository methods as empty implementations
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(true),
    getById: () => Promise.resolve(sampleNote),
    getAll: () => Promise.resolve([sampleNote]),
    getCount: () => Promise.resolve(1),
    insert: () => Promise.resolve(sampleNote),
    // Add repository-specific methods
    getRecentNotes: () => Promise.resolve([sampleNote]),
    updateNoteEmbedding: () => Promise.resolve(),
    getNotesWithoutEmbeddings: () => Promise.resolve([]),
    getNotesWithEmbeddings: () => Promise.resolve([sampleNote]),
    getOtherNotesWithEmbeddings: () => Promise.resolve([]),
    getNoteCount: () => Promise.resolve(1),
    searchNotesByKeywords: () => Promise.resolve([sampleNote]),
    insertNoteChunk: () => Promise.resolve('chunk-id'),
  } as unknown as NoteRepository;

  const mockEmbeddingService = {
    generateNoteEmbedding: () => Promise.resolve([1, 2, 3]),
    generateEmbeddingsForAllNotes: () => Promise.resolve({ updated: 1, failed: 0 }),
    searchSimilarNotes: () => Promise.resolve([{ id: 'note-1', score: 0.9 }]),
    findRelatedNotes: () => Promise.resolve([{ id: 'note-2', score: 0.8 }]),
    createNoteChunks: () => Promise.resolve(),
  } as unknown as NoteEmbeddingService;

  // Create service instance
  let service: ConversationToNoteService;

  // Sample conversation and turns for testing
  const sampleConversation: Conversation = {
    id: 'conv-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    activeTurns: [],
    summaries: [],
    archivedTurns: [],
    interfaceType: 'cli',
  };

  const sampleTurns: ConversationTurn[] = [
    {
      id: 'turn-1',
      timestamp: new Date('2025-01-01T10:00:00Z'),
      query: 'What is ecosystem architecture?',
      response: 'Ecosystem architecture refers to...',
      userId: 'user-1',
      userName: 'Alice',
    },
    {
      id: 'turn-2',
      timestamp: new Date('2025-01-01T10:01:00Z'),
      query: 'Can you give me examples?',
      response: 'Ecosystem architecture refers to...',
      userId: 'assistant',
      userName: 'Assistant',
    },
  ];

  beforeEach(() => {
    // Clear tracking variables
    insertNoteCalls = [];

    // Reset the mock for extractTags
    mockExtractTags.mockClear();
    mockExtractTags.mockImplementation(
      async () => ['ecosystem', 'architecture', 'example'],
    );

    // Create service instance
    service = new ConversationToNoteService(
      mockNoteRepository,
      mockEmbeddingService,
    );
  });

  test('should create a note from conversation turns', async () => {
    // Act
    await service.createNoteFromConversation(sampleConversation, sampleTurns);

    // Assert
    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];

    expect(insertCall.source).toBe('conversation');
    expect(insertCall.conversationMetadata).toBeDefined();
    expect(insertCall.conversationMetadata?.conversationId).toBe('conv-123');
    expect(insertCall.title).toBe('What is ecosystem architecture?');
  });

  test('should format conversation with attribution header', async () => {
    // Act
    const result = await service.prepareNotePreview(
      sampleConversation,
      sampleTurns,
    );

    // Assert
    expect(result.content).toContain('**Note**: This content was derived from a conversation');
    expect(result.content).toContain('**Source**: Conversation with AI assistant');
    expect(result.content).toContain('**Original Query**: "What is ecosystem architecture?"');

    // Should contain formatted turns
    expect(result.content).toContain('**Question**: What is ecosystem architecture?');
    expect(result.content).toContain('**Answer**: Ecosystem architecture refers to...');
  });

  test('should handle user-edited content', async () => {
    // Arrange
    const userEdits = 'This is my custom edited content about ecosystem architecture.';

    // Act
    await service.createNoteFromConversation(
      sampleConversation,
      sampleTurns,
      'Custom Title',
      userEdits,
    );

    // Assert
    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.title).toBe('Custom Title');
    expect(insertCall.content).toContain('This is my custom edited content');
    // Should still include attribution header even with user edits
    expect(insertCall.content).toContain('**Note**: This content was derived from a conversation');
  });

  test('should generate tags from conversation content', async () => {
    // Act
    await service.createNoteFromConversation(sampleConversation, sampleTurns);

    // Assert
    expect(mockExtractTags).toHaveBeenCalledTimes(1);

    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.tags).toEqual(['ecosystem', 'architecture', 'example']);
  });

  test('should use fallback tag extraction if AI generation fails', async () => {
    // Arrange
    mockExtractTags.mockImplementation(
      async () => { throw new Error('Tag generation failed'); },
    );

    // Act
    await service.createNoteFromConversation(sampleConversation, sampleTurns);

    // Assert
    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.tags).toBeDefined();
    expect(insertCall.tags?.length).toBeGreaterThan(0);
  });

  test('should extract main user name from conversation turns', async () => {
    // Arrange
    const multipleTurns: ConversationTurn[] = [
      ...sampleTurns,
      {
        id: 'turn-3',
        timestamp: new Date('2025-01-01T10:02:00Z'),
        query: 'How is this different from system architecture?',
        response: 'The main difference is...',
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        id: 'turn-4',
        timestamp: new Date('2025-01-01T10:03:00Z'),
        query: 'Can you elaborate?',
        response: 'Of course...',
        userId: 'user-2',
        userName: 'Bob',
      },
    ];

    // Act
    await service.createNoteFromConversation(sampleConversation, multipleTurns);

    // Assert
    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.conversationMetadata?.userName).toBe('Alice');
  });

  test('should truncate long titles', async () => {
    // Arrange
    const longQueryTurns: ConversationTurn[] = [
      {
        id: 'turn-1',
        timestamp: new Date(),
        query: 'This is a very long query that should be truncated because it exceeds the maximum length for a title and would be too unwieldy in the UI',
        response: 'Answer',
        userId: 'user-1',
        userName: 'User',
      },
    ];

    // Act
    const result = await service.prepareNotePreview(
      sampleConversation,
      longQueryTurns,
    );

    // Assert
    expect(result.title.length).toBeLessThan(51);
    expect(result.title.endsWith('...')).toBe(true);
  });

  test('should prepare note preview', async () => {
    // Act
    const preview = await service.prepareNotePreview(
      sampleConversation,
      sampleTurns,
      'Custom Preview Title',
    );

    // Assert
    expect(preview.title).toBe('Custom Preview Title');
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to...');
  });

  test('should handle highlighting of conversation segments', async () => {
    // Act
    const result = await service.highlightConversationSegment(
      'conv-123',
      'turn-1',
      'Ecosystem architecture refers to',
    );

    // Assert
    expect(result).toBe(true);
  });
});
