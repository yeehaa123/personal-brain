/**
 * Tests for ConversationToNoteService
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import type { Note } from '@/models/note';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createTestNote } from '@test/utils/embeddingUtils';
import { createIsolatedMemory } from '@test/utils/memoryUtils';

// Mock the tagExtractor module
const mockExtractTags = mock(() => Promise.resolve(['ecosystem', 'architecture', 'example']));
mock.module('@/utils/tagExtractor', () => ({
  extractTags: mockExtractTags,
}));

// Mock the nanoid module
const mockNanoid = mock(() => 'mock-id');
mock.module('nanoid', () => ({
  nanoid: mockNanoid,
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

  // Storage for isolated InMemoryStorage instance
  let isolatedStorage: InMemoryStorage;

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

  beforeEach(async () => {
    // Clear tracking variables
    insertNoteCalls = [];

    // Reset the mock for extractTags
    mockExtractTags.mockClear();
    mockExtractTags.mockImplementation(
      async () => ['ecosystem', 'architecture', 'example'],
    );

    // Create a fresh isolated memory storage instance for testing
    const { storage } = await createIsolatedMemory();
    isolatedStorage = storage as InMemoryStorage;

    // We need to manually create a conversation with ID 'conv-123' in our test storage
    // Since we can't mock nanoid in InMemoryStorage easily, use direct object manipulation
    // to insert the test conversation directly
    const testConversation = {
      id: 'conv-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      interfaceType: 'cli' as const,
      roomId: undefined,
    };
    
    // Add the conversation directly to the storage's conversations map
    Object.defineProperty(isolatedStorage, 'conversations', {
      value: new Map([['conv-123', testConversation]]),
    });

    // Create service instance with isolated storage
    service = new ConversationToNoteService(
      mockNoteRepository,
      mockEmbeddingService,
      isolatedStorage,
    );
  });

  test('should create a note from conversation turns', async () => {
    await service.createNoteFromConversation(sampleConversation, sampleTurns);

    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];

    expect(insertCall.source).toBe('conversation');
    expect(insertCall.conversationMetadata).toBeDefined();
    expect(insertCall.conversationMetadata?.conversationId).toBe('conv-123');
    expect(insertCall.title).toBe('What is ecosystem architecture?');
  });

  test('should format conversation with attribution header', async () => {
    const result = await service.prepareNotePreview(
      sampleConversation,
      sampleTurns,
    );

    expect(result.content).toContain('**Note**: This content was derived from a conversation');
    expect(result.content).toContain('**Source**: Conversation with AI assistant');
    expect(result.content).toContain('**Original Query**: "What is ecosystem architecture?"');

    // Should contain formatted turns
    expect(result.content).toContain('**Question**: What is ecosystem architecture?');
    expect(result.content).toContain('**Answer**: Ecosystem architecture refers to...');
  });

  test('should handle user-edited content', async () => {
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
    await service.createNoteFromConversation(sampleConversation, sampleTurns);

    expect(mockExtractTags).toHaveBeenCalledTimes(1);

    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.tags).toEqual(['ecosystem', 'architecture', 'example']);
  });

  test('should use fallback tag extraction if AI generation fails', async () => {
    mockExtractTags.mockImplementation(
      async () => { throw new Error('Tag generation failed'); },
    );

    await service.createNoteFromConversation(sampleConversation, sampleTurns);

    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.tags).toBeDefined();
    expect(insertCall.tags?.length).toBeGreaterThan(0);
  });

  test('should extract main user name from conversation turns', async () => {
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

    await service.createNoteFromConversation(sampleConversation, multipleTurns);

    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];
    expect(insertCall.conversationMetadata?.userName).toBe('Alice');
  });

  test('should truncate long titles', async () => {
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

    const result = await service.prepareNotePreview(
      sampleConversation,
      longQueryTurns,
    );

    expect(result.title.length).toBeLessThan(51);
    expect(result.title.endsWith('...')).toBe(true);
  });

  test('should prepare note preview', async () => {
    const preview = await service.prepareNotePreview(
      sampleConversation,
      sampleTurns,
      'Custom Preview Title',
    );

    expect(preview.title).toBe('Custom Preview Title');
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to...');
  });

  test('should handle highlighting of conversation segments', async () => {
    const result = await service.highlightConversationSegment(
      'conv-123',
      'turn-1',
      'Ecosystem architecture refers to',
    );

    expect(result).toBe(true);
  });

  test('should update conversation metadata when creating a note', async () => {
    // We'll use the existing conv-123 from storage
    const testConversation = await isolatedStorage.getConversation('conv-123');
    
    expect(testConversation).toBeDefined();
    
    await service.createNoteFromConversation(testConversation!, sampleTurns);
    
    const updatedConversation = await isolatedStorage.getConversation('conv-123');
    
    expect(updatedConversation).toBeDefined();
    expect(updatedConversation?.metadata).toBeDefined();
    
    // Use bracket notation to access dynamic properties
    expect(updatedConversation?.metadata?.['noteId']).toBeDefined();
    expect(updatedConversation?.metadata?.['noteCreatedAt']).toBeDefined();
  });
});
