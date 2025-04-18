/**
 * Tests for the ContextMediator component
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ContextMediator, DataRequestType, MessageFactory, NotificationType } from '@/protocol/messaging';

describe('ContextMediator', () => {
  // Reset the singleton instance before each test
  beforeEach(() => {
    ContextMediator.resetInstance();
  });
  
  // Reset after each test to clean up
  afterEach(() => {
    ContextMediator.resetInstance();
  });
  
  test('getInstance should create a singleton instance', () => {
    const mediator1 = ContextMediator.getInstance();
    const mediator2 = ContextMediator.getInstance();
    
    expect(mediator1).toBe(mediator2);
  });
  
  test('createFresh should create a new instance each time', () => {
    const mediator1 = ContextMediator.createFresh();
    const mediator2 = ContextMediator.createFresh();
    
    expect(mediator1).not.toBe(mediator2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const mediator1 = ContextMediator.getInstance();
    ContextMediator.resetInstance();
    const mediator2 = ContextMediator.getInstance();
    
    expect(mediator1).not.toBe(mediator2);
  });
  
  test('registerHandler should add a message handler', () => {
    const mediator = ContextMediator.createFresh();
    const handler = async () => {};
    
    mediator.registerHandler('test-context', handler);
    
    const contexts = mediator.getRegisteredContexts();
    expect(contexts).toContain('test-context');
  });
  
  test('unregisterHandler should remove a message handler', () => {
    const mediator = ContextMediator.createFresh();
    const handler = async () => {};
    
    mediator.registerHandler('test-context', handler);
    const removed = mediator.unregisterHandler('test-context');
    
    expect(removed).toBe(true);
    const contexts = mediator.getRegisteredContexts();
    expect(contexts).not.toContain('test-context');
  });
  
  test('subscribe should register a subscription for a notification type', () => {
    const mediator = ContextMediator.createFresh();
    
    mediator.subscribe('test-context', 'test-notification');
    
    const subscribers = mediator.getSubscribers('test-notification');
    expect(subscribers).toContain('test-context');
  });
  
  test('unsubscribe should remove a subscription', () => {
    const mediator = ContextMediator.createFresh();
    
    mediator.subscribe('test-context', 'test-notification');
    const removed = mediator.unsubscribe('test-context', 'test-notification');
    
    expect(removed).toBe(true);
    const subscribers = mediator.getSubscribers('test-notification');
    expect(subscribers).not.toContain('test-context');
  });
  
  test('sendRequest should deliver a data request and return a response', async () => {
    const mediator = ContextMediator.createFresh();
    const mockData = { result: 'success' };
    
    // Create a mock handler
    const mockHandler = mock(async (message) => {
      // Simply echo back a success response with the mock data
      if (message.category === 'request') {
        return MessageFactory.createSuccessResponse(
          'target-context',
          message.sourceContext,
          message.id,
          mockData,
        );
      }
      
      // Return acknowledgment for other message types
      return MessageFactory.createAcknowledgment(
        'target-context',
        message.sourceContext,
        message.id,
        'processed',
      );
    });
    
    // Register the mock handler
    mediator.registerHandler('target-context', mockHandler);
    
    // Create and send a request
    const request = MessageFactory.createDataRequest(
      'source-context',
      'target-context',
      DataRequestType.NOTES_SEARCH,
      { query: 'test' },
    );
    const response = await mediator.sendRequest(request);
    
    // Verify the response
    expect(response.status).toBe('success');
    expect(response.data).toEqual(mockData);
    expect(mockHandler).toHaveBeenCalledWith(request);
  });
  
  test('sendRequest should handle errors', async () => {
    const mediator = ContextMediator.createFresh();
    
    // Create a mock handler that throws an error
    const mockHandler = mock(async () => {
      throw new Error('Test error');
    });
    
    // Register the mock handler
    mediator.registerHandler('target-context', mockHandler);
    
    // Create and send a request
    const request = MessageFactory.createDataRequest(
      'source-context',
      'target-context',
      DataRequestType.NOTES_SEARCH,
      { query: 'test' },
    );
    const response = await mediator.sendRequest(request);
    
    // Verify the response is an error
    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('HANDLER_ERROR');
  });
  
  test('sendRequest should handle missing handlers', async () => {
    const mediator = ContextMediator.createFresh();
    
    // Create and send a request to a non-existent context
    const request = MessageFactory.createDataRequest(
      'source-context',
      'non-existent-context',
      DataRequestType.NOTES_SEARCH,
      { query: 'test' },
    );
    const response = await mediator.sendRequest(request);
    
    // Verify the response is an error
    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('CONTEXT_NOT_FOUND');
  });
  
  test('sendNotification should deliver to all subscribers', async () => {
    const mediator = ContextMediator.createFresh();
    
    // Create mock handlers
    const mockHandler1 = mock(async (message) => {
      return MessageFactory.createAcknowledgment(
        'context1',
        message.sourceContext || '*',
        message.id || 'unknown',
        'processed',
      );
    });
    const mockHandler2 = mock(async (message) => {
      return MessageFactory.createAcknowledgment(
        'context2',
        message.sourceContext || '*',
        message.id || 'unknown',
        'processed',
      );
    });
    
    // Register handlers
    mediator.registerHandler('context1', mockHandler1);
    mediator.registerHandler('context2', mockHandler2);
    
    // Subscribe to notifications
    mediator.subscribe('context1', NotificationType.PROFILE_UPDATED);
    mediator.subscribe('context2', NotificationType.PROFILE_UPDATED);
    
    // Create and send a notification
    const notification = MessageFactory.createNotification(
      'source-context',
      '*', // Broadcast
      NotificationType.PROFILE_UPDATED,
      { name: 'New Name' },
    );
    const recipients = await mediator.sendNotification(notification);
    
    // Verify notification was sent to both contexts
    expect(recipients).toContain('context1');
    expect(recipients).toContain('context2');
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });
  
  test('sendNotification with specific target should only go to that target', async () => {
    const mediator = ContextMediator.createFresh();
    
    // Create mock handlers
    const mockHandler1 = mock(async () => {});
    const mockHandler2 = mock(async () => {});
    
    // Register handlers
    mediator.registerHandler('context1', mockHandler1);
    mediator.registerHandler('context2', mockHandler2);
    
    // Subscribe to notifications
    mediator.subscribe('context1', NotificationType.PROFILE_UPDATED);
    mediator.subscribe('context2', NotificationType.PROFILE_UPDATED);
    
    // Create and send a notification to a specific target
    const notification = MessageFactory.createNotification(
      'source-context',
      'context1',
      NotificationType.PROFILE_UPDATED,
      { name: 'New Name' },
    );
    const recipients = await mediator.sendNotification(notification);
    
    // Verify notification was only sent to context1
    expect(recipients).toContain('context1');
    expect(recipients).not.toContain('context2');
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).not.toHaveBeenCalled();
  });
});