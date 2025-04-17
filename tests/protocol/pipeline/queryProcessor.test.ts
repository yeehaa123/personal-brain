/**
 * Test suite for QueryProcessor
 * 
 * Tests the query processing pipeline with mocked dependencies.
 */
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import { QueryProcessor } from '@/protocol/pipeline/queryProcessor';
import type { IContextManager } from '@/protocol/types';
import { ClaudeModel } from '@/resources/ai/claude';
import type { DefaultResponseType, ModelResponse } from '@/resources/ai/interfaces';
import { MockConversationContext, MockNoteContext, MockProfileContext } from '@test/__mocks__/contexts';
import { createMockNote } from '@test/__mocks__/models/note';
import { createMockProfile } from '@test/__mocks__/models/profile';
import { MockContextManager, MockConversationManager } from '@test/__mocks__/protocol/managers';

// Sample data
const sampleNote = createMockNote('note-1', 'Ecosystem Architecture', ['ecosystem', 'architecture']);
sampleNote.content = 'Ecosystem architecture is an approach that designs systems as interconnected components.';

const sampleRelatedNote = createMockNote('note-2', 'Component Design', ['component', 'design']);
sampleRelatedNote.content = 'Component design is important for ecosystem architecture.';

const sampleProfile = createMockProfile('profile-1');


describe('QueryProcessor', () => {
  // Setup for mocking services
  beforeEach(() => {
    // Reset mocks between tests
    MockContextManager.resetInstance();
    MockConversationManager.resetInstance();

    // Reset mock note context
    MockNoteContext.resetInstance();
    const noteContext = MockNoteContext.getInstance();

    // Setup mock note context to return sample notes
    spyOn(noteContext, 'searchNotes').mockResolvedValue([sampleNote]);
    spyOn(noteContext, 'getRelatedNotes').mockResolvedValue([sampleRelatedNote]);

    // Setup mock profile context
    MockProfileContext.resetInstance();
    const profileContext = MockProfileContext.getInstance();
    spyOn(profileContext, 'getProfile').mockResolvedValue(sampleProfile);

    // Setup mock conversation context
    MockConversationContext.resetInstance();

    // Mock the ClaudeModel complete method
    spyOn(ClaudeModel.prototype, 'complete').mockImplementation(
      function <T = DefaultResponseType>(options: { userPrompt: string }): Promise<ModelResponse<T>> {
        const userPrompt = options.userPrompt;

        let responseObject: DefaultResponseType;

        if (userPrompt.includes('ecosystem')) {
          responseObject = {
            answer: 'Ecosystem architecture involves designing interconnected components that work together.',
          };
        } else if (userPrompt.includes('profile')) {
          responseObject = {
            answer: 'Your profile shows expertise in software development and architecture.',
          };
        } else {
          responseObject = {
            answer: 'I don\'t have specific information about that in my knowledge base.',
          };
        }

        // For the tests we only use the default schema with { answer: string }
        return Promise.resolve({
          object: responseObject as unknown as T,
          usage: userPrompt.includes('ecosystem')
            ? { inputTokens: 100, outputTokens: 20 }
            : userPrompt.includes('profile')
              ? { inputTokens: 150, outputTokens: 25 }
              : { inputTokens: 50, outputTokens: 15 },
        });
      },
    );
  });

  // Test basic query processing
  test('should process a basic query successfully', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh();

    // Set up spies
    const historyGetSpy = spyOn(conversationManager, 'getConversationHistory');
    const turnSaveSpy = spyOn(conversationManager, 'saveTurn');

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Act
    const result = await processor.processQuery('What is ecosystem architecture?');

    // Assert
    expect(result).toBeDefined();
    expect(historyGetSpy).toHaveBeenCalled();
    expect(turnSaveSpy).toHaveBeenCalled();
  });

  // Test room-based conversation
  test('should set the current room when roomId is provided', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh({
      hasActiveConversation: false,
    });

    // Set up spies
    const roomSetSpy = spyOn(conversationManager, 'setCurrentRoom');
    const initSpy = spyOn(conversationManager, 'initializeConversation');

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Act
    await processor.processQuery('What is ecosystem architecture?', {
      roomId: 'room-123',
      userId: 'user-123',
      userName: 'Test User',
    });

    // Assert
    expect(roomSetSpy).toHaveBeenCalledWith('room-123');
    expect(initSpy).toHaveBeenCalled();
  });

  // Test empty query handling
  test('should handle empty queries with a default question', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh();

    // Set up spy to capture the actual query used
    let capturedQuery = '';
    spyOn(contextManager.getNoteContext(), 'searchNotes').mockImplementation(
      async (options: unknown) => {
        if (options && typeof options === 'object' && 'query' in options) {
          capturedQuery = options.query as string;
        }
        return [sampleNote];
      },
    );

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Act
    await processor.processQuery('');

    // Assert
    expect(capturedQuery).toBe('What information do you have in this brain?');
  });
});
