/**
 * Tests for the Context Integration helper functions
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { ContextId } from '@/protocol/core/contextOrchestrator';
import { 
  ContextMediator, 
  DataRequestType, 
  MessageFactory,
  type MessageHandler,
  requestContextData,
  requestConversationHistory,
  requestNoteById,
  requestNotes,
  requestProfile,
} from '@/protocol/messaging';
import type { ContextCommunicationMessage } from '@/protocol/messaging/messageTypes';

describe('Context Integration', () => {
  let mediator: ContextMediator;
  
  // Set up fresh mediator instance before each test
  beforeEach(() => {
    mediator = ContextMediator.createFresh();
  });
  
  // Reset after each test to clean up
  afterEach(() => {
    ContextMediator.resetInstance();
  });
  
  test('requestContextData should properly format request and return data', async () => {
    // Create a successful mock response
    const mockData = { testData: 'success' };
    
    // Create a mock handler that returns success with test data
    const mockHandler: MessageHandler = async (message: ContextCommunicationMessage) => {
      // Ensure the message is a DataRequestMessage
      if (message.category !== 'request' || !('dataType' in message)) {
        throw new Error('Expected DataRequestMessage');
      }
      return MessageFactory.createSuccessResponse(
        ContextId.NOTES,
        message.sourceContext,
        message.id,
        mockData,
      );
    };
    
    // Register the handler for notes context
    mediator.registerHandler(ContextId.NOTES, mockHandler);
    
    // Request data using the helper function
    const result = await requestContextData(
      mediator,
      'test-source',
      ContextId.NOTES,
      DataRequestType.NOTES_SEARCH,
      { query: 'test' },
    );
    
    // Verify the result
    expect(result).toEqual(mockData);
  });
  
  test('requestContextData should return null on error', async () => {
    // Create a mock handler that returns an error
    const mockHandler: MessageHandler = async (message: ContextCommunicationMessage) => {
      // Ensure the message is a DataRequestMessage
      if (message.category !== 'request' || !('dataType' in message)) {
        throw new Error('Expected DataRequestMessage');
      }
      return MessageFactory.createErrorResponse(
        ContextId.NOTES,
        message.sourceContext,
        message.id,
        'TEST_ERROR',
        'Test error message',
      );
    };
    
    // Register the handler for notes context
    mediator.registerHandler(ContextId.NOTES, mockHandler);
    
    // Request data using the helper function
    const result = await requestContextData(
      mediator,
      'test-source',
      ContextId.NOTES,
      DataRequestType.NOTES_SEARCH,
      { query: 'test' },
    );
    
    // Verify the result is null
    expect(result).toBeNull();
  });
  
  test('requestNotes should return notes array', async () => {
    // Mock notes data
    const mockNotes = [
      { id: '1', title: 'Note 1', content: 'Content 1' },
      { id: '2', title: 'Note 2', content: 'Content 2' },
    ];
    
    // Create a mock handler that returns success with notes
    const mockHandler: MessageHandler = async (message: ContextCommunicationMessage) => {
      // Ensure the message is a DataRequestMessage
      if (message.category !== 'request' || !('dataType' in message)) {
        throw new Error('Expected DataRequestMessage');
      }
      return MessageFactory.createSuccessResponse(
        ContextId.NOTES,
        message.sourceContext,
        message.id,
        { notes: mockNotes },
      );
    };
    
    // Register the handler for notes context
    mediator.registerHandler(ContextId.NOTES, mockHandler);
    
    // Request notes using the helper function
    const result = await requestNotes(
      mediator,
      'test-source',
      'test query',
      10,
    );
    
    // Verify the result
    expect(result).toEqual(mockNotes);
  });
  
  test('requestNoteById should return a single note', async () => {
    // Mock note data
    const mockNote = { id: '1', title: 'Note 1', content: 'Content 1' };
    
    // Create a mock handler that returns success with a note
    const mockHandler: MessageHandler = async (message: ContextCommunicationMessage) => {
      // Ensure the message is a DataRequestMessage
      if (message.category !== 'request' || !('dataType' in message)) {
        throw new Error('Expected DataRequestMessage');
      }
      return MessageFactory.createSuccessResponse(
        ContextId.NOTES,
        message.sourceContext,
        message.id,
        { note: mockNote },
      );
    };
    
    // Register the handler for notes context
    mediator.registerHandler(ContextId.NOTES, mockHandler);
    
    // Request a note by ID using the helper function
    const result = await requestNoteById(
      mediator,
      'test-source',
      '1',
    );
    
    // Verify the result
    expect(result).toEqual(mockNote);
  });
  
  test('requestProfile should return profile data', async () => {
    // Mock profile data
    const mockProfile = { name: 'Test User', email: 'test@example.com' };
    
    // Create a mock handler that returns success with profile
    const mockHandler: MessageHandler = async (message: ContextCommunicationMessage) => {
      // Ensure the message is a DataRequestMessage
      if (message.category !== 'request' || !('dataType' in message)) {
        throw new Error('Expected DataRequestMessage');
      }
      return MessageFactory.createSuccessResponse(
        ContextId.PROFILE,
        message.sourceContext,
        message.id,
        { profile: mockProfile },
      );
    };
    
    // Register the handler for profile context
    mediator.registerHandler(ContextId.PROFILE, mockHandler);
    
    // Request profile using the helper function
    const result = await requestProfile(
      mediator,
      'test-source',
    );
    
    // Verify the result
    expect(result).toEqual(mockProfile);
  });
  
  test('requestConversationHistory should return conversation history', async () => {
    // Mock conversation history
    const mockHistory = 'User: Hello\nAssistant: Hi there';
    
    // Create a mock handler that returns success with history
    const mockHandler: MessageHandler = async (message: ContextCommunicationMessage) => {
      // Ensure the message is a DataRequestMessage
      if (message.category !== 'request' || !('dataType' in message)) {
        throw new Error('Expected DataRequestMessage');
      }
      return MessageFactory.createSuccessResponse(
        ContextId.CONVERSATION,
        message.sourceContext,
        message.id,
        { history: mockHistory },
      );
    };
    
    // Register the handler for conversation context
    mediator.registerHandler(ContextId.CONVERSATION, mockHandler);
    
    // Request conversation history using the helper function
    const result = await requestConversationHistory(
      mediator,
      'test-source',
      'conv-id',
    );
    
    // Verify the result
    expect(result).toEqual(mockHistory);
  });
});