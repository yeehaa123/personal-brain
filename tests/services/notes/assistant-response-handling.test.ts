/**
 * Tests for handling assistant responses in conversation turns
 * 
 * This file tests specifically how assistant responses are stored and retrieved
 * in the context of creating notes from conversations.
 */
import { beforeEach, describe, expect, test, timeout } from 'bun:test';

// Set a shorter timeout for all tests in this file
timeout(5000); // 5 seconds timeout (the default is likely too long)

import { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
// No need to import the Conversation type as it's defined implicitly via BrainProtocol
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createTestNote } from '@test/utils/embeddingUtils';
import { createIsolatedMemory } from '@test/utils/memoryUtils';

describe('Assistant Response Handling in Conversations', () => {
  // Setup storage and mock services
  let isolatedStorage: InMemoryStorage;
  let service: ConversationToNoteService;
  let brainProtocol: BrainProtocol;
  let testConversationId: string;

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
    // Add necessary repository methods
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(true),
    getById: () => Promise.resolve(sampleNote),
    getAll: () => Promise.resolve([sampleNote]),
    getCount: () => Promise.resolve(1),
    insert: () => Promise.resolve(sampleNote),
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

  beforeEach(async () => {
    // Create isolated memory storage
    const { storage } = await createIsolatedMemory();
    isolatedStorage = storage as InMemoryStorage;

    // Create instance with isolated storage
    service = new ConversationToNoteService(
      mockNoteRepository,
      mockEmbeddingService,
      isolatedStorage,
    );

    // Initialize brain protocol with isolated storage to add test conversations
    brainProtocol = BrainProtocol.getInstance(
      {
        interfaceType: 'matrix',
        memoryStorage: isolatedStorage,
      },
      true,
    );

    // Create a test conversation
    testConversationId = await brainProtocol.getConversationMemory().startConversation();
  });

  test('should correctly identify assistant vs user turns', async () => {
    // Create separate user and assistant turns with explicit user IDs
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?', // User query
      '',  // No response for user turn
      {
        userId: 'matrix-user',
        userName: 'User',
      },
    );
    
    // Per the schema validation, we need to provide a non-empty query string
    // even for assistant turns (we'll handle this in our implementation)
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?',  // We need to provide the user's query again
      'Ecosystem architecture refers to designing systems with interconnected components.',
      {
        userId: 'assistant',
        userName: 'Assistant',
      },
    );
    
    // Get the conversation from storage
    const conversation = await isolatedStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Check that we have two turns
    expect(conversation?.activeTurns.length).toBe(2);
    
    // Verify that turns have the correct user IDs
    const userTurn = conversation?.activeTurns[0];
    const assistantTurn = conversation?.activeTurns[1];
    
    expect(userTurn?.userId).toBe('matrix-user');
    expect(userTurn?.query).toBe('What is ecosystem architecture?');
    expect(userTurn?.response).toBe('');
    
    expect(assistantTurn?.userId).toBe('assistant');
    expect(assistantTurn?.query).toBe('What is ecosystem architecture?'); // The query is duplicated per schema requirement
    expect(assistantTurn?.response).toBe('Ecosystem architecture refers to designing systems with interconnected components.');
    
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
    // First pair
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?',
      '',
      {
        userId: 'matrix-user',
        userName: 'User',
      },
    );
    
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?', // Use the original query again
      'Ecosystem architecture refers to designing systems with interconnected components.',
      {
        userId: 'assistant',
        userName: 'Assistant',
      },
    );
    
    // Second pair
    await brainProtocol.getConversationMemory().addTurn(
      'Can you give me examples?',
      '',
      {
        userId: 'matrix-user',
        userName: 'User',
      },
    );
    
    await brainProtocol.getConversationMemory().addTurn(
      'Can you give me examples?', // Use the original query again
      'Examples include cloud platforms like AWS, Kubernetes ecosystems, and open source communities.',
      {
        userId: 'assistant',
        userName: 'Assistant',
      },
    );
    
    // Get the conversation
    const conversation = await isolatedStorage.getConversation(testConversationId);
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
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?',
      '',
      {
        userId: 'matrix-user',
        userName: 'User',
      },
    );
    
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?', // Use the original query again
      '<h3>Ecosystem Architecture</h3><p>Ecosystem architecture refers to designing systems with interconnected components.</p>',
      {
        userId: 'assistant',
        userName: 'Assistant',
      },
    );
    
    // Get the conversation
    const conversation = await isolatedStorage.getConversation(testConversationId);
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
    
    // User with typical Matrix ID
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?',
      '',
      {
        userId: matrixUserId,
        userName: 'Matrix User',
      },
    );
    
    // Assistant with proper assistant ID (should not start with @ but with 'assistant')
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?', // Use the original query again
      'Ecosystem architecture refers to designing systems with interconnected components.',
      {
        userId: 'assistant',
        userName: 'Assistant',
      },
    );
    
    // Get the conversation
    const conversation = await isolatedStorage.getConversation(testConversationId);
    expect(conversation).toBeDefined();
    
    // Check that we have two turns
    expect(conversation?.activeTurns.length).toBe(2);
    
    // Verify that turns have the correct user IDs
    const userTurn = conversation?.activeTurns[0];
    const assistantTurn = conversation?.activeTurns[1];
    
    expect(userTurn?.userId).toBe(matrixUserId);
    expect(assistantTurn?.userId).toBe('assistant');
    
    // Generate note preview
    const preview = await service.prepareNotePreview(conversation!, conversation!.activeTurns);
    
    // Check that the note contains the question-answer pair
    expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
    expect(preview.content).toContain('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.');
    
    // Log the content for inspection
    console.log('Matrix userId format handling:');
    console.log(preview.content);
  });

  test('should test the actual BrainProtocol processing with explicit assistant userId', async () => {
    // This is a key test that simulates how BrainProtocol will be modified
    
    // 1. First, add the user query
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?',
      '',
      {
        userId: 'matrix-user',
        userName: 'User',
        metadata: {
          turnType: 'user',
        },
      },
    );
    
    // 2. Then add the assistant response as a separate turn
    await brainProtocol.getConversationMemory().addTurn(
      'What is ecosystem architecture?', // Use the original query again
      'Ecosystem architecture refers to designing systems with interconnected components.',
      {
        userId: 'assistant', // This is the critical part we're testing
        userName: 'Assistant',
        metadata: {
          turnType: 'assistant',
        }, 
      },
    );
    
    // Get the conversation
    const conversation = await isolatedStorage.getConversation(testConversationId);
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
    console.log('BrainProtocol simulation:');
    console.log(preview.content);
  });
});