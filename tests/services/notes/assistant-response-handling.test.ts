/**
 * Unit tests for handling assistant responses in conversation turns
 * 
 * This file tests specifically how the conversation-to-note service processes
 * user and assistant turns when creating notes.
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import type { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createTestNote } from '@test/utils/embeddingUtils';

// Mock classes to avoid external dependencies
class MockInMemoryStorage {
  private conversations = new Map<string, Conversation>();

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
    }
  }

  setConversation(id: string, conversation: Conversation): void {
    this.conversations.set(id, conversation);
  }
}

describe('Assistant Response Handling in Conversations', () => {
  // Setup mocks and service
  let mockStorage: MockInMemoryStorage;
  let service: ConversationToNoteService;
  let mockConversation: Conversation;
  const testConversationId = 'test-conversation-id';

  // Mock services
  const sampleNote = createTestNote({
    id: 'note-test',
    title: 'Test Note',
    content: 'Test content',
    source: 'conversation',
  });

  const mockNoteRepository = {
    insertNote: () => Promise.resolve('note-test'),
    getNoteById: () => Promise.resolve(sampleNote),
    findBySource: () => Promise.resolve([]),
    findByConversationMetadata: () => Promise.resolve([]),
    // Required repository methods for the test
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(true),
    getById: () => Promise.resolve(sampleNote),
    getAll: () => Promise.resolve([sampleNote]),
    getCount: () => Promise.resolve(1),
    insert: () => Promise.resolve(sampleNote),
  } as unknown as NoteRepository;

  const mockEmbeddingService = {
    generateNoteEmbedding: () => Promise.resolve([1, 2, 3]),
  } as unknown as NoteEmbeddingService;

  // Helper to create conversation turns for testing
  function createConversationTurn(
    options: {
      id?: string;
      query?: string;
      response?: string;
      userId?: string;
      userName?: string;
      metadata?: Record<string, unknown>;
    },
    offset: number = 0,
  ): ConversationTurn {
    return {
      id: options.id || `turn-${Date.now() + offset}`,
      timestamp: new Date(Date.now() + offset),
      query: options.query || '',
      response: options.response || '',
      userId: options.userId,
      userName: options.userName || 'Test User',
      metadata: options.metadata,
    };
  }

  beforeEach(() => {
    // Create fresh mock storage
    mockStorage = new MockInMemoryStorage();

    // Setup basic conversation
    mockConversation = {
      id: testConversationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      interfaceType: 'matrix',
      roomId: 'test-matrix-room',
    };
    
    // Store in mock storage
    mockStorage.setConversation(testConversationId, mockConversation);

    // Create service with mocks
    service = new ConversationToNoteService(
      mockNoteRepository,
      mockEmbeddingService,
      mockStorage as unknown as InMemoryStorage,
    );
  });

  test('should correctly identify assistant vs user turns', async () => {
    // Create test turns directly
    const userTurn = createConversationTurn({
      id: 'user-turn-1',
      query: 'What is ecosystem architecture?',
      response: '',
      userId: 'matrix-user',
      userName: 'User',
    });
    
    const assistantTurn = createConversationTurn({
      id: 'assistant-turn-1',
      query: 'What is ecosystem architecture?', // Query included to match real implementation
      response: 'Ecosystem architecture refers to designing systems with interconnected components.',
      userId: 'assistant', // This is the critical part we're testing
      userName: 'Assistant',
    }, 1000); // Later timestamp
    
    // Add turns to conversation
    mockConversation.activeTurns = [userTurn, assistantTurn];
    mockStorage.setConversation(testConversationId, mockConversation);
    
    // Get the conversation from storage
    const conversation = await mockStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Check that we have two turns
    expect(conversation?.activeTurns.length).toBe(2);
    
    // Generate note preview
    const preview = await service.prepareNotePreview(conversation!, conversation!.activeTurns);
    
    // Check that the note contains the question-answer pair
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.');
    
    // It should not contain empty answers or questions
    expect(preview.content).not.toContain('**Answer**: (No response)');
    
    // Log the content for inspection
    console.log('Note preview content:');
    console.log(preview.content);
  });

  test('should correctly handle multiple question-answer pairs', async () => {
    // Create multiple question-answer pairs
    const turns = [
      // First pair
      createConversationTurn({
        id: 'user-turn-1',
        query: 'What is ecosystem architecture?',
        response: '',
        userId: 'matrix-user',
        userName: 'User',
      }),
      
      createConversationTurn({
        id: 'assistant-turn-1',
        query: 'What is ecosystem architecture?',
        response: 'Ecosystem architecture refers to designing systems with interconnected components.',
        userId: 'assistant',
        userName: 'Assistant',
      }, 1000),
      
      // Second pair
      createConversationTurn({
        id: 'user-turn-2',
        query: 'Can you give me examples?',
        response: '',
        userId: 'matrix-user',
        userName: 'User',
      }, 2000),
      
      createConversationTurn({
        id: 'assistant-turn-2',
        query: 'Can you give me examples?',
        response: 'Examples include cloud platforms like AWS, Kubernetes ecosystems, and open source communities.',
        userId: 'assistant',
        userName: 'Assistant',
      }, 3000),
    ];
    
    // Add turns to conversation
    mockConversation.activeTurns = turns;
    mockStorage.setConversation(testConversationId, mockConversation);
    
    // Get the conversation
    const conversation = await mockStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Check that we have four turns
    expect(conversation?.activeTurns.length).toBe(4);
    
    // Generate note preview
    const preview = await service.prepareNotePreview(conversation!, conversation!.activeTurns);
    
    // Check that both question-answer pairs are included
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.');
    expect(preview.content).toContain('**Question**: Can you give me examples?');
    expect(preview.content).toContain('**Answer**: Examples include cloud platforms like AWS');
    
    // Log the content for inspection
    console.log('Multiple Q&A pairs content:');
    console.log(preview.content);
  });

  test('should handle HTML content in assistant responses', async () => {
    // Create a conversation with HTML in the assistant response
    const turns = [
      createConversationTurn({
        id: 'user-turn-1',
        query: 'What is ecosystem architecture?',
        response: '',
        userId: 'matrix-user',
        userName: 'User',
      }),
      
      createConversationTurn({
        id: 'assistant-turn-1',
        query: 'What is ecosystem architecture?',
        response: '<h3>Ecosystem Architecture</h3><p>Ecosystem architecture refers to designing systems with interconnected components.</p>',
        userId: 'assistant',
        userName: 'Assistant',
      }, 1000),
    ];
    
    // Add turns to conversation
    mockConversation.activeTurns = turns;
    mockStorage.setConversation(testConversationId, mockConversation);
    
    // Get the conversation
    const conversation = await mockStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Generate note preview
    const preview = await service.prepareNotePreview(conversation!, conversation!.activeTurns);
    
    // Check that HTML is cleaned in the content
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**:');
    expect(preview.content).toContain('**Ecosystem Architecture**');
    expect(preview.content).toContain('Ecosystem architecture refers to designing systems with interconnected components.');
    expect(preview.content).not.toContain('<h3>');
    expect(preview.content).not.toContain('<p>');
    
    // Log the content for inspection
    console.log('HTML content converted:');
    console.log(preview.content);
  });

  test('should correctly handle different Matrix userId formats', async () => {
    // Matrix userIds can be in various formats - simulate realistic IDs
    const matrixUserId = '@user:matrix.org';
    
    const turns = [
      // User with typical Matrix ID
      createConversationTurn({
        id: 'user-turn-1',
        query: 'What is ecosystem architecture?',
        response: '',
        userId: matrixUserId, // Matrix-style user ID
        userName: 'Matrix User',
      }),
      
      // Assistant with proper assistant ID
      createConversationTurn({
        id: 'assistant-turn-1',
        query: 'What is ecosystem architecture?',
        response: 'Ecosystem architecture refers to designing systems with interconnected components.',
        userId: 'assistant',
        userName: 'Assistant',
      }, 1000),
    ];
    
    // Add turns to conversation
    mockConversation.activeTurns = turns;
    mockStorage.setConversation(testConversationId, mockConversation);
    
    // Get the conversation
    const conversation = await mockStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Check that we have two turns
    expect(conversation?.activeTurns.length).toBe(2);
    
    // Generate note preview
    const preview = await service.prepareNotePreview(conversation!, conversation!.activeTurns);
    
    // Check that the note contains the question-answer pair
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.');
    
    // Log the content for inspection
    console.log('Matrix userId format handling:');
    console.log(preview.content);
  });

  test('should work with metadata in conversation turns', async () => {
    // Create turns with metadata
    const turns = [
      // User turn with metadata
      createConversationTurn({
        id: 'user-turn-1',
        query: 'What is ecosystem architecture?',
        response: '',
        userId: 'matrix-user',
        userName: 'User',
        metadata: {
          turnType: 'user',
        },
      }),
      
      // Assistant turn with metadata
      createConversationTurn({
        id: 'assistant-turn-1',
        query: 'What is ecosystem architecture?',
        response: 'Ecosystem architecture refers to designing systems with interconnected components.',
        userId: 'assistant',
        userName: 'Assistant',
        metadata: {
          turnType: 'assistant',
        },
      }, 1000),
    ];
    
    // Add turns to conversation
    mockConversation.activeTurns = turns;
    mockStorage.setConversation(testConversationId, mockConversation);
    
    // Get the conversation
    const conversation = await mockStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Check that turns have correct metadata
    expect(conversation?.activeTurns[0].metadata?.['turnType']).toBe('user');
    expect(conversation?.activeTurns[1].metadata?.['turnType']).toBe('assistant');
    
    // Generate note preview
    const preview = await service.prepareNotePreview(conversation!, conversation!.activeTurns);
    
    // Verify the content has proper question-answer format
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.');
    
    // Log the content for inspection
    console.log('Metadata handling:');
    console.log(preview.content);
  });
});