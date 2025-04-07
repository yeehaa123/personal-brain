/**
 * Tests for ConversationToNoteService
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { conversationConfig } from '@/config';
import type { ConversationStorage } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import type { NewNote, Note } from '@/models/note';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { MockConversationStorage } from '@test/__mocks__/storage';
import { createTestNote } from '@test/utils/embeddingUtils';

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

  // Use our standardized mock repository implementation
  const mockNoteRepository = MockNoteRepository.createFresh([sampleNote]);

  // Override insertNote method to track calls for test assertions
  mockNoteRepository.insertNote = async (data: Partial<NewNote>) => {
    // Store the entire data object for assertions
    const noteData = {
      ...data,
      id: data.id || 'note-12345678',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      source: data.source || 'conversation',
      confidence: data.confidence !== undefined ? data.confidence : null,
      verified: data.verified !== undefined ? data.verified : null,
      conversationMetadata: data.conversationMetadata || null,
    } as Note;

    insertNoteCalls.push(noteData);
    return 'note-12345678';
  };

  const mockEmbeddingService = {
    generateNoteEmbedding: () => Promise.resolve([1, 2, 3]),
    generateEmbeddingsForAllNotes: () => Promise.resolve({ updated: 1, failed: 0 }),
    searchSimilarNotes: () => Promise.resolve([{ id: 'note-1', score: 0.9 }]),
    findRelatedNotes: () => Promise.resolve([{ id: 'note-2', score: 0.8 }]),
    createNoteChunks: () => Promise.resolve(),
  } as unknown as NoteEmbeddingService;

  // Create service instance
  let service: ConversationToNoteService;

  // Storage for isolated ConversationStorage instance
  let isolatedStorage: MockConversationStorage;

  // Sample conversation and turns for testing
  const sampleConversation: Conversation = {
    id: 'conv-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    activeTurns: [],
    summaries: [],
    archivedTurns: [],
    interfaceType: 'cli',
    roomId: conversationConfig.defaultCliRoomId,
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

    // Reset our standardized repository mock
    MockNoteRepository.resetInstance();

    // Reset the mock for extractTags
    mockExtractTags.mockClear();
    mockExtractTags.mockImplementation(
      async () => ['ecosystem', 'architecture', 'example'],
    );

    // Create a fresh storage instance for testing
    isolatedStorage = MockConversationStorage.createFresh();

    // Create a test conversation with a known ID using the MockConversationStorage API
    await isolatedStorage.createConversation({
      id: 'conv-123',
      interfaceType: 'cli',
      roomId: conversationConfig.defaultCliRoomId,
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    // Reset the mockNoteRepository to have the sample note
    mockNoteRepository.notes = [sampleNote];

    // Re-implement the custom insertNote method for tracking
    mockNoteRepository.insertNote = async (data: Partial<NewNote>) => {
      // Store the entire data object for assertions
      const noteData = {
        ...data,
        id: data.id || 'note-12345678',
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
        source: data.source || 'conversation',
        confidence: data.confidence !== undefined ? data.confidence : null,
        verified: data.verified !== undefined ? data.verified : null,
        conversationMetadata: data.conversationMetadata || null,
      } as Note;

      insertNoteCalls.push(noteData);
      return 'note-12345678';
    };

    // Create service instance with isolated storage
    // We're using type assertion here as the test only needs a subset of the methods
    service = new ConversationToNoteService(
      mockNoteRepository as unknown as NoteRepository,
      mockEmbeddingService,
      isolatedStorage as unknown as ConversationStorage, // Using type assertion for test simplicity
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

  test('should handle HTML content in responses correctly', async () => {
    // Create a sample turn with HTML in the response - make sure user/assistant roles are correct
    const htmlTurns: ConversationTurn[] = [
      {
        id: 'turn-html-1',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        query: 'What is ecosystem architecture?',
        response: '', // User turn has no response
        userId: 'user-1', // This is a user turn
        userName: 'Alice',
      },
      {
        id: 'turn-html-2',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        query: '', // Assistant turn has no query
        response: '<h3>Ecosystem Architecture</h3><p>Ecosystem architecture refers to an approach where systems are designed with interconnected components.</p>',
        userId: 'assistant', // This is an assistant turn
        userName: 'Assistant',
      },
      {
        id: 'turn-html-3',
        timestamp: new Date('2025-01-01T10:02:00Z'),
        query: 'Can you give me examples?',
        response: '',
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        id: 'turn-html-4',
        timestamp: new Date('2025-01-01T10:03:00Z'),
        query: '',
        response: '<ul><li>Cloud platforms like AWS</li><li>Open source ecosystems</li></ul>',
        userId: 'assistant',
        userName: 'Assistant',
      },
    ];

    // Generate preview with HTML content
    const preview = await service.prepareNotePreview(
      sampleConversation,
      htmlTurns,
    );


    // Expect both questions and answers with HTML converted to markdown
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**:');
    expect(preview.content).toContain('**Ecosystem Architecture**');
    expect(preview.content).toContain('**Question**: Can you give me examples?');
    expect(preview.content).toContain('**Answer**:');
    expect(preview.content).toContain('- Cloud platforms like AWS');

    // Now test the actual note creation
    await service.createNoteFromConversation(sampleConversation, htmlTurns);

    expect(insertNoteCalls.length).toBe(1);
    const insertCall = insertNoteCalls[0];

    // Check that HTML is sanitized and converted to markdown in the created note
    expect(insertCall.content).toContain('**Ecosystem Architecture**');
    expect(insertCall.content).toContain('- Cloud platforms like AWS');
  });

  test('should handle missing or empty response values', async () => {
    // Create sample turns with empty or missing responses - proper user/assistant role separation
    const emptyResponseTurns: ConversationTurn[] = [
      {
        id: 'turn-empty-1',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        query: 'What is ecosystem architecture?',
        response: '', // Empty string response
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        id: 'turn-empty-2',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        query: '',
        response: '', // Empty assistant response
        userId: 'assistant',
        userName: 'Assistant',
      },
      {
        id: 'turn-empty-3',
        timestamp: new Date('2025-01-01T10:02:00Z'),
        query: 'Can you give me examples?',
        response: '',
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        id: 'turn-empty-4',
        timestamp: new Date('2025-01-01T10:03:00Z'),
        query: '',
        response: 'Examples of ecosystem architecture include cloud platforms and open source communities.',
        userId: 'assistant',
        userName: 'Assistant',
      },
    ];

    // Generate preview with empty response
    const preview = await service.prepareNotePreview(
      sampleConversation,
      emptyResponseTurns,
    );


    // Verify that questions are shown and empty response is handled
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: (No response)'); // Empty response should show placeholder
    expect(preview.content).toContain('**Question**: Can you give me examples?');
    expect(preview.content).toContain('**Answer**: Examples of ecosystem architecture');

    // Now create turns with undefined response - proper user/assistant role separation
    const undefinedResponseTurns: ConversationTurn[] = [
      {
        id: 'turn-undef-1',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        query: 'What is ecosystem architecture?',
        response: undefined as unknown as string, // Undefined response
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        id: 'turn-undef-2',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        query: '',
        response: undefined as unknown as string, // Undefined assistant response
        userId: 'assistant',
        userName: 'Assistant',
      },
      {
        id: 'turn-undef-3',
        timestamp: new Date('2025-01-01T10:02:00Z'),
        query: 'Can you give me examples?',
        response: undefined as unknown as string,
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        id: 'turn-undef-4',
        timestamp: new Date('2025-01-01T10:03:00Z'),
        query: '',
        response: 'Examples include AWS, Kubernetes ecosystem, etc.',
        userId: 'assistant',
        userName: 'Assistant',
      },
    ];

    // Generate preview with undefined response
    const previewUndef = await service.prepareNotePreview(
      sampleConversation,
      undefinedResponseTurns,
    );


    // Verify that questions are shown and undefined response is handled
    expect(previewUndef.content).toContain('**Question**: What is ecosystem architecture?');
    expect(previewUndef.content).toContain('**Answer**: (No response)'); // Should have a placeholder
    expect(previewUndef.content).toContain('**Question**: Can you give me examples?');
    expect(previewUndef.content).toContain('**Answer**: Examples include AWS');
  });
});
