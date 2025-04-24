/**
 * Unit tests for handling assistant responses in conversation turns
 * 
 * This file tests specifically how the conversation-to-note service processes
 * user and assistant turns when creating notes.
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import type { ConversationStorage, ConversationSummary } from '@/contexts/conversations';
import type { ConversationInfo, SearchCriteria } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/protocol/schemas/conversationSchemas';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
// Mock classes to avoid external dependencies
class MockConversationStorage implements ConversationStorage {
  private conversations = new Map<string, Conversation>();

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<boolean> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
      return true;
    }
    return false;
  }

  setConversation(id: string, conversation: Conversation): void {
    this.conversations.set(id, conversation);
  }

  // Add required stub methods for ConversationStorage interface
  async createConversation(): Promise<string> { return ''; }
  async getConversationByRoom(): Promise<string | null> { return null; }
  async updateConversation(): Promise<boolean> { return false; }
  async deleteConversation(): Promise<boolean> { return false; }
  async addTurn(): Promise<string> { return ''; }
  async getTurns(): Promise<ConversationTurn[]> { return []; }
  async updateTurn(): Promise<boolean> { return false; }
  async addSummary(): Promise<string> { return ''; }
  async getSummaries(): Promise<ConversationSummary[]> { return []; }
  async findConversations(_criteria: SearchCriteria): Promise<ConversationInfo[]> {
    const now = new Date();
    return [{
      id: 'mock-conv-1',
      interfaceType: 'cli',
      roomId: 'mock-room-1',
      startedAt: now,
      updatedAt: now,
      turnCount: 2,
    }];
  }

  async getRecentConversations(_limit?: number, _interfaceType?: 'cli' | 'matrix'): Promise<ConversationInfo[]> {
    const now = new Date();
    return [{
      id: 'mock-conv-1',
      interfaceType: 'cli',
      roomId: 'mock-room-1',
      startedAt: now,
      updatedAt: now,
      turnCount: 2,
    }];
  }
  async getMetadata(): Promise<Record<string, unknown> | null> { return null; }
}

describe('Assistant Response Handling in Conversations', () => {
  // Setup mocks and service
  let mockStorage: MockConversationStorage;
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

  // Use our standardized MockNoteRepository
  const mockNoteRepository = MockNoteRepository.createFresh([sampleNote]);
  
  // Override methods for test-specific behavior
  mockNoteRepository.insertNote = async () => Promise.resolve('note-test');

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
    // Reset our standardized mock repository
    MockNoteRepository.resetInstance();
    
    // Ensure mockNoteRepository has the sample note
    mockNoteRepository.notes = [sampleNote];
    
    // Override methods for test-specific behavior
    mockNoteRepository.insertNote = async () => Promise.resolve('note-test');
    
    // Create fresh mock storage
    mockStorage = new MockConversationStorage();

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
      mockNoteRepository as unknown as NoteRepository,
      mockEmbeddingService,
      mockStorage,
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

    // Note: We're no longer logging the preview content to keep test output clean
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
  });
});
