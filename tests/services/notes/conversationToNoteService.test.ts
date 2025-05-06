/**
 * Tests for ConversationToNoteService
 * 
 * This file tests how the conversation-to-note service processes conversations,
 * including user and assistant turns, to create formatted notes.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { conversationConfig } from '@/config';
import type { ConversationStorage } from '@/contexts/conversations/storage/conversationStorage';
import type { NewNote, Note } from '@/models/note';
import type { Conversation, ConversationTurn } from '@/protocol/schemas/conversationSchemas';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { TagExtractor } from '@/utils/tagExtractor';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { MockConversationStorage } from '@test/__mocks__/storage/conversationStorage';
import { MockTagExtractor } from '@test/__mocks__/utils/tagExtractor';

// Create a spy for extractTags calls
const mockExtractTags = mock(() => Promise.resolve(['ecosystem', 'architecture', 'example']));

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
  let mockNoteRepository = MockNoteRepository.createFresh();

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

  // Store original getInstance for cleanup
  let originalGetInstance: typeof TagExtractor.getInstance;
  
  beforeEach(async () => {
    // Clear tracking variables
    insertNoteCalls = [];

    // Reset our standardized repository mock
    MockNoteRepository.resetInstance();
    TagExtractor.resetInstance();
    MockTagExtractor.resetInstance();
    
    // Store original function for restoration
    originalGetInstance = TagExtractor.getInstance;
    
    // Set up a temporary override for TagExtractor.getInstance
    // This avoids using mock.module which breaks isolation
    TagExtractor.getInstance = () => {
      // Return our MockTagExtractor but cast it as TagExtractor
      return MockTagExtractor.getInstance() as unknown as TagExtractor;
    };

    // Reset the mock for extractTags
    mockExtractTags.mockClear();
    mockExtractTags.mockImplementation(
      async () => ['ecosystem', 'architecture', 'example'],
    );
    
    // Set the extractTags method on our mock instance
    const mockTagExtractorInstance = MockTagExtractor.getInstance();
    mockTagExtractorInstance.extractTags = mockExtractTags;

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

    // Create a fresh mock repository for testing
    mockNoteRepository = MockNoteRepository.createFresh();
    
    // Setup getNoteById to return the sample note
    mockNoteRepository.getNoteById = async () => Promise.resolve(sampleNote);

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
      mockEmbeddingService as unknown as NoteEmbeddingService,
      isolatedStorage as unknown as ConversationStorage, // Using type assertion for test simplicity
    );
  });
  
  // Clean up after each test in the test teardown
  afterEach(() => {
    // Restore original TagExtractor.getInstance
    if (originalGetInstance) {
      TagExtractor.getInstance = originalGetInstance;
    }
  });

  const mockEmbeddingService = {
    generateNoteEmbedding: () => Promise.resolve([1, 2, 3]),
    generateEmbeddingsForAllNotes: () => Promise.resolve({ updated: 1, failed: 0 }),
    searchSimilarNotes: () => Promise.resolve([{ id: 'note-1', score: 0.9 }]),
    findRelatedNotes: () => Promise.resolve([{ id: 'note-2', score: 0.8 }]),
    createNoteChunks: () => Promise.resolve(),
  };

  describe('Note Creation from Conversations', () => {
    test('creates properly formatted note from conversation with correct metadata', async () => {
      // Create a note from our sample conversation data
      await service.createNoteFromConversation(sampleConversation, sampleTurns);

      // Extract properties to check
      const insertCallCount = insertNoteCalls.length;
      const noteCreated = (insertCalls: Note[]) => insertCalls.length > 0;
      
      // Only proceed with validation if a note was created
      if (noteCreated(insertNoteCalls)) {
        const noteData = insertNoteCalls[0];
        
        // Validate all expected properties
        const validation = {
          database: {
            noteWasCreated: noteCreated(insertNoteCalls),
            exactlyOneNoteCreated: insertCallCount === 1,
          },
          metadata: {
            hasCorrectSource: noteData.source === 'conversation',
            hasConversationMetadata: !!noteData.conversationMetadata,
            correctConversationId: noteData.conversationMetadata?.conversationId === 'conv-123',
          },
          content: {
            titleFromFirstQuestion: noteData.title === 'What is ecosystem architecture?',
            hasTags: Array.isArray(noteData.tags),
            contentIncludesQuestion: noteData.content.includes('What is ecosystem architecture?'),
            contentIncludesAnswer: noteData.content.includes('Ecosystem architecture refers to'),
            hasAttributionFooter: noteData.content.includes('**Note**: This content was derived from a conversation'),
          },
        };
        
        // Comprehensive single assertion
        expect(validation).toMatchObject({
          database: {
            noteWasCreated: true,
            exactlyOneNoteCreated: true,
          },
          metadata: {
            hasCorrectSource: true,
            hasConversationMetadata: true,
            correctConversationId: true,
          },
          content: {
            titleFromFirstQuestion: true,
            hasTags: true,
            contentIncludesQuestion: true,
            contentIncludesAnswer: true,
            hasAttributionFooter: true,
          },
        });
      } else {
        // If no note was created, fail the test
        expect(noteCreated(insertNoteCalls)).toBe(true);
      }
    });

    test('formats notes and handles various content types', async () => {
      // Test cases covering different formatting scenarios
      const testCases = [
        {
          name: 'standard formatting with attribution footer',
          conversation: sampleConversation,
          turns: sampleTurns,
          customTitle: undefined,
          userEdits: undefined, 
          validate: (result: Record<string, unknown>) => {
            const content = result['content'] as string;
            const contentParts = content.split('---');
            
            // Single assertion with comprehensive validation
            expect({
              hasAttributionNote: content.includes('**Note**: This content was derived from a conversation'),
              hasSourceInfo: content.includes('**Source**: Conversation with AI assistant'),
              hasOriginalQuery: content.includes('**Original Query**: "What is ecosystem architecture?"'),
              hasQuestion: content.includes('**Question**: What is ecosystem architecture?'),
              hasAnswer: content.includes('**Answer**: Ecosystem architecture refers to...'),
              hasDivider: contentParts.length > 1,
              attributionAtEnd: contentParts[contentParts.length - 1].includes('**Note**: This content was derived from a conversation'),
            }).toMatchObject({
              hasAttributionNote: true,
              hasSourceInfo: true,
              hasOriginalQuery: true,
              hasQuestion: true,
              hasAnswer: true,
              hasDivider: true,
              attributionAtEnd: true,
            });
          },
        },
        {
          name: 'user-edited content with attribution',
          conversation: sampleConversation,
          turns: sampleTurns,
          customTitle: 'Custom Title',
          userEdits: 'This is my custom edited content about ecosystem architecture.',
          validate: async (_result: Record<string, unknown>) => {
            // Clear previous calls
            insertNoteCalls = [];
            
            // Create a note with user edits
            await service.createNoteFromConversation(
              sampleConversation,
              sampleTurns,
              'Custom Title',
              'This is my custom edited content about ecosystem architecture.',
            );
            
            // Single comprehensive validation
            const insertCall = insertNoteCalls[0];
            const contentLines = insertCall.content.split('\n');
            const lastContentSection = contentLines.slice(-5).join('\n');
            
            expect({
              callCount: insertNoteCalls.length,
              title: insertCall.title,
              hasEditedContent: insertCall.content.includes('This is my custom edited content'),
              hasAttribution: insertCall.content.includes('**Note**: This content was derived from a conversation'),
              attributionAtEnd: lastContentSection.includes('**Note**: This content was derived from a conversation'),
            }).toMatchObject({
              callCount: 1,
              title: 'Custom Title',
              hasEditedContent: true,
              hasAttribution: true,
              attributionAtEnd: true,
            });
          },
        },
        {
          name: 'complex user-edited content with proper attribution placement',
          conversation: sampleConversation,
          turns: sampleTurns,
          customTitle: 'Complex Note',
          userEdits: `# Complex Note Structure

## First Section
This is the first section of content.

## Second Section
- Item 1
- Item 2
- Item 3

## Final Section
This is the final section with some concluding thoughts.`,
          validate: async () => {
            // Clear previous calls
            insertNoteCalls = [];
            
            // Create a note with complex user edits
            await service.createNoteFromConversation(
              sampleConversation,
              sampleTurns,
              'Complex Note',
              `# Complex Note Structure

## First Section
This is the first section of content.

## Second Section
- Item 1
- Item 2
- Item 3

## Final Section
This is the final section with some concluding thoughts.`,
            );
            
            // Comprehensive validation with single assertion
            const insertCall = insertNoteCalls[0];
            const lastLine = insertCall.content.split('\n').pop() || '';
            const finalSectionPos = insertCall.content.indexOf('## Final Section');
            const attributionPos = insertCall.content.indexOf('**Note**: This content was derived');
            
            expect({
              callCount: insertNoteCalls.length,
              startsWithHeader: insertCall.content.startsWith('# Complex Note Structure'),
              lastLineContains: lastLine.includes('Original Query'),
              hasFinalSection: finalSectionPos > 0,
              hasAttribution: attributionPos > 0,
              properOrder: finalSectionPos < attributionPos,
            }).toMatchObject({
              callCount: 1,
              startsWithHeader: true,
              lastLineContains: true,
              hasFinalSection: true,
              hasAttribution: true,
              properOrder: true,
            });
          },
        },
        {
          name: 'custom preview title',
          conversation: sampleConversation,
          turns: sampleTurns,
          customTitle: 'Custom Preview Title',
          validate: async (_result: Record<string, unknown>) => {
            // This test doesn't use insertNoteCalls so no need to clear
            const preview = await service.prepareNotePreview(
              sampleConversation,
              sampleTurns,
              'Custom Preview Title',
            );
            
            // Comprehensive validation with single assertion
            expect({
              title: preview.title,
              hasQuestion: preview.content.includes('**Question**: What is ecosystem architecture?'),
              hasAnswer: preview.content.includes('**Answer**: Ecosystem architecture refers to...'),
            }).toMatchObject({
              title: 'Custom Preview Title',
              hasQuestion: true,
              hasAnswer: true,
            });
          },
        },
      ];
      
      // Run the standard preview test cases
      for (const testCase of testCases) {
        if (!testCase.validate.toString().includes('await')) {
          // For test cases that don't need async validation
          // Create note preview based on the available params
          // Note: prepareNotePreview only has 3 parameters (conversation, turns, suggestedTitle)
          // The userEdits param is not used in this method, so we'll ignore it here
          let result;
          
          if (testCase.customTitle === undefined) {
            // Only conversation and turns
            result = await service.prepareNotePreview(testCase.conversation, testCase.turns);
          } else {
            // Conversation, turns, and title
            result = await service.prepareNotePreview(
              testCase.conversation, 
              testCase.turns, 
              testCase.customTitle,
            );
          }
          testCase.validate(result);
        } else {
          // For test cases that do async validation themselves
          await testCase.validate({});
        }
      }
    });

    test('handles specialized content formats correctly', async () => {
      // Test cases for different content formats
      const testCases = [
        {
          name: 'long title truncation',
          turns: [
            {
              id: 'turn-1',
              timestamp: new Date(),
              query: 'This is a very long query that should be truncated because it exceeds the maximum length for a title and would be too unwieldy in the UI',
              response: 'Answer',
              userId: 'user-1',
              userName: 'User',
            },
          ],
          validate: async (result: Record<string, unknown>) => {
            const preview = await service.prepareNotePreview(
              sampleConversation,
              result['turns'] as ConversationTurn[],
            );
            
            expect(preview.title.length).toBeLessThan(51);
            expect(preview.title.endsWith('...')).toBe(true);
          },
        },
        {
          name: 'HTML content in responses',
          turns: [
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
          ],
          validate: async (result: Record<string, unknown>) => {
            // Generate preview with HTML content
            const preview = await service.prepareNotePreview(
              sampleConversation,
              result['turns'] as ConversationTurn[],
            );
            
            // Combined validation for preview content
            expect({
              previewContent: {
                hasFirstQuestion: preview.content.includes('**Question**: What is ecosystem architecture?'),
                hasFirstAnswer: preview.content.includes('**Answer**:'),
                hasConvertedHeading: preview.content.includes('**Ecosystem Architecture**'),
                hasSecondQuestion: preview.content.includes('**Question**: Can you give me examples?'),
                hasSecondAnswer: preview.content.includes('**Answer**:'),
                hasConvertedList: preview.content.includes('- Cloud platforms like AWS'),
              },
            }).toMatchObject({
              previewContent: {
                hasFirstQuestion: true,
                hasFirstAnswer: true,
                hasConvertedHeading: true,
                hasSecondQuestion: true,
                hasSecondAnswer: true,
                hasConvertedList: true,
              },
            });
            
            // Test the actual note creation
            await service.createNoteFromConversation(
              sampleConversation, 
              result['turns'] as ConversationTurn[],
            );
            
            // Combined validation for created note
            expect({
              noteCreated: insertNoteCalls.length === 1,
              content: {
                hasConvertedHeading: insertNoteCalls[0].content.includes('**Ecosystem Architecture**'),
                hasConvertedList: insertNoteCalls[0].content.includes('- Cloud platforms like AWS'),
              },
            }).toMatchObject({
              noteCreated: true,
              content: {
                hasConvertedHeading: true,
                hasConvertedList: true,
              },
            });
          },
        },
        {
          name: 'missing or empty response values',
          turns: [
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
          ],
          validate: async (result: Record<string, unknown>) => {
            // Generate preview with empty response
            const preview = await service.prepareNotePreview(
              sampleConversation,
              result['turns'] as ConversationTurn[],
            );
            
            // Verify that questions are shown and empty response is handled
            expect(preview.content).toContain('**Question**: What is ecosystem architecture?');
            expect(preview.content).toContain('**Answer**: (No response)'); // Empty response should show placeholder
            expect(preview.content).toContain('**Question**: Can you give me examples?');
            expect(preview.content).toContain('**Answer**: Examples of ecosystem architecture');
          },
        },
        {
          name: 'undefined response values',
          turns: [
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
          ],
          validate: async (result: Record<string, unknown>) => {
            // Generate preview with undefined response
            const previewUndef = await service.prepareNotePreview(
              sampleConversation,
              result['turns'] as ConversationTurn[],
            );
            
            // Verify that questions are shown and undefined response is handled
            expect(previewUndef.content).toContain('**Question**: What is ecosystem architecture?');
            expect(previewUndef.content).toContain('**Answer**: (No response)'); // Should have a placeholder
            expect(previewUndef.content).toContain('**Question**: Can you give me examples?');
            expect(previewUndef.content).toContain('**Answer**: Examples include AWS');
          },
        },
      ];
      
      // Run test cases
      for (const testCase of testCases) {
        await testCase.validate({ turns: testCase.turns });
        // Clear insertNoteCalls between test cases
        insertNoteCalls = [];
      }
    });

    test('handles metadata and tag operations correctly', async () => {
      // Test cases for metadata and tag-related operations
      const testCases = [
        {
          name: 'tag extraction',
          action: async () => {
            await service.createNoteFromConversation(sampleConversation, sampleTurns);
            
            expect(mockExtractTags).toHaveBeenCalledTimes(1);
            
            expect(insertNoteCalls.length).toBe(1);
            const insertCall = insertNoteCalls[0];
            expect(insertCall.tags).toEqual(['ecosystem', 'architecture', 'example']);
          },
        },
        {
          name: 'tag extraction failure',
          action: async () => {
            // Configure our mock to throw an error for this test
            mockExtractTags.mockImplementationOnce(
              async () => { throw new Error('Tag generation failed'); },
            );
            
            await service.createNoteFromConversation(sampleConversation, sampleTurns);
            
            expect(insertNoteCalls.length).toBe(1);
            const insertCall = insertNoteCalls[0];
            
            // Since we removed the fallback mechanism and return empty array on error,
            // we expect tags to be an empty array
            expect(insertCall.tags).toEqual([]);
          },
        },
        {
          name: 'extract main user name from turns',
          action: async () => {
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
          },
        },
        {
          name: 'update conversation metadata',
          action: async () => {
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
          },
        },
      ];
      
      // Run metadata test cases
      for (const testCase of testCases) {
        await testCase.action();
        // Clear insertNoteCalls between test cases
        insertNoteCalls = [];
      }
    });

    test('highlights conversation segment for future reference', async () => {
      // Call the highlight method with test parameters
      const highlightResult = await service.highlightConversationSegment(
        'conv-123',     // conversationId
        'turn-1',       // turnId
        'Ecosystem architecture refers to',  // highlightedText
      );
      
      // This is already a simple test, but we'll add some context for clarity
      // and use a more descriptive name that explains what the function is for
      expect({
        highlightResult,
        description: 'Highlighting a conversation segment should store the highlight in the conversation metadata',
      }).toMatchObject({
        highlightResult: true,
        description: expect.any(String),
      });
    });
  });

  describe('Assistant Response Handling', () => {
    // Helper to create test conversation turns
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

    test('correctly identifies and formats assistant vs user turns in notes', async () => {
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
      const testConversation = {
        ...sampleConversation,
        activeTurns: [userTurn, assistantTurn],
      };

      // Generate note preview
      const preview = await service.prepareNotePreview(testConversation, testConversation.activeTurns);

      // Verify note content structure with consolidated assertions
      expect({
        noteContent: {
          includesQuestion: preview.content.includes('**Question**: What is ecosystem architecture?'),
          includesAnswer: preview.content.includes('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.'),
          noEmptyAnswers: !preview.content.includes('**Answer**: (No response)'),
        },
      }).toMatchObject({
        noteContent: {
          includesQuestion: true,
          includesAnswer: true,
          noEmptyAnswers: true,
        },
      });
    });

    test('handles multiple question-answer pairs in conversation notes', async () => {
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
      const testConversation = {
        ...sampleConversation,
        activeTurns: turns,
      };

      // Generate note preview
      const preview = await service.prepareNotePreview(testConversation, testConversation.activeTurns);

      // Verify note content includes all Q&A pairs
      expect({
        noteContent: {
          includesFirstQuestion: preview.content.includes('**Question**: What is ecosystem architecture?'),
          includesFirstAnswer: preview.content.includes('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.'),
          includesSecondQuestion: preview.content.includes('**Question**: Can you give me examples?'),
          includesSecondAnswer: preview.content.includes('**Answer**: Examples include cloud platforms like AWS'),
        },
      }).toMatchObject({
        noteContent: {
          includesFirstQuestion: true,
          includesFirstAnswer: true,
          includesSecondQuestion: true,
          includesSecondAnswer: true,
        },
      });
    });

    test('properly sanitizes HTML in assistant responses', async () => {
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
      const testConversation = {
        ...sampleConversation,
        activeTurns: turns,
      };

      // Generate note preview
      const preview = await service.prepareNotePreview(testConversation, testConversation.activeTurns);

      // Verify HTML handling
      expect({
        noteContent: {
          includesQuestion: preview.content.includes('**Question**: What is ecosystem architecture?'),
          includesAnswer: preview.content.includes('**Answer**:'),
          includesFormattedHeading: preview.content.includes('**Ecosystem Architecture**'),
          includesContent: preview.content.includes('Ecosystem architecture refers to designing systems with interconnected components.'),
          noHtmlTags: {
            noH3Tags: !preview.content.includes('<h3>'),
            noPTags: !preview.content.includes('<p>'),
          },
        },
      }).toMatchObject({
        noteContent: {
          includesQuestion: true,
          includesAnswer: true,
          includesFormattedHeading: true,
          includesContent: true,
          noHtmlTags: {
            noH3Tags: true,
            noPTags: true,
          },
        },
      });
    });

    test('handles different userId formats and conversation metadata', async () => {
      // Create test data covering both Matrix userId and metadata handling
      const matrixUserId = '@user:matrix.org';
      
      const turns = [
        // User with Matrix ID and metadata
        createConversationTurn({
          id: 'user-turn-1',
          query: 'What is ecosystem architecture?',
          response: '',
          userId: matrixUserId,
          userName: 'Matrix User',
          metadata: {
            turnType: 'user',
          },
        }),
        
        // Assistant with proper ID and metadata
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
      const testConversation = {
        ...sampleConversation,
        activeTurns: turns,
      };

      // Generate note preview
      const preview = await service.prepareNotePreview(testConversation, testConversation.activeTurns);

      // Verify metadata handling and content formatting
      expect({
        turns: {
          firstTurnUser: testConversation.activeTurns[0].userId === matrixUserId,
          firstTurnMetadata: testConversation.activeTurns[0].metadata?.['turnType'] === 'user',
          secondTurnUser: testConversation.activeTurns[1].userId === 'assistant',
          secondTurnMetadata: testConversation.activeTurns[1].metadata?.['turnType'] === 'assistant',
        },
        noteContent: {
          includesQuestion: preview.content.includes('**Question**: What is ecosystem architecture?'),
          includesAnswer: preview.content.includes('**Answer**: Ecosystem architecture refers to designing systems with interconnected components.'),
        },
      }).toMatchObject({
        turns: {
          firstTurnUser: true,
          firstTurnMetadata: true,
          secondTurnUser: true,
          secondTurnMetadata: true,
        },
        noteContent: {
          includesQuestion: true,
          includesAnswer: true,
        },
      });
    });
  });
});