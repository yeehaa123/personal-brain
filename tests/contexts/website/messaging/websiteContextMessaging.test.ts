/**
 * Tests for the WebsiteContextMessaging class
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { MCPWebsiteContext } from '@/contexts/website';
import { WebsiteContextMessaging } from '@/contexts/website/messaging/websiteContextMessaging';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { ContextMediator } from '@/protocol/messaging';
import type { MessageHandler } from '@/protocol/messaging/contextMediator';
import type { DataRequestMessage, DataResponseMessage } from '@/protocol/messaging/messageTypes';
import { MockMCPWebsiteContext } from '@test/__mocks__/contexts/MCPWebsiteContext';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';

describe('WebsiteContextMessaging', () => {
  let websiteContextMessaging: WebsiteContextMessaging;
  let mockWebsiteContext: MockMCPWebsiteContext;
  let mockMediator: MockContextMediator;
  
  beforeEach(() => {
    // Reset singletons
    WebsiteContextMessaging.resetInstance();
    MockContextMediator.resetInstance();
    MockMCPWebsiteContext.resetInstance();
    
    // Create fresh instances
    mockWebsiteContext = MockMCPWebsiteContext.createFresh();
    mockMediator = MockContextMediator.createFresh({
      mockResponseData: { success: true },
    }) as unknown as MockContextMediator;
    
    // Clear all mocks
    (mockWebsiteContext.generateLandingPage as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.buildWebsite as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.handleWebsiteBuild as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.handleWebsitePromote as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.getWebsiteStatus as unknown as { mockClear: () => void }).mockClear();
    
    // Create a new WebsiteContextMessaging instance with our mocks
    websiteContextMessaging = new WebsiteContextMessaging(
      mockWebsiteContext as unknown as MCPWebsiteContext,
      mockMediator as unknown as ContextMediator,
    );
  });
  
  afterEach(() => {
    WebsiteContextMessaging.resetInstance();
    MockContextMediator.resetInstance();
    MockMCPWebsiteContext.resetInstance();
  });
  
  test('should register a message handler on initialization', () => {
    expect(mockMediator.registerHandler).toHaveBeenCalledWith(
      ContextId.WEBSITE,
      expect.any(Function),
    );
  });
  
  test('should return the original context', () => {
    const context = websiteContextMessaging.getContext();
    expect(context).toBeDefined();
    expect(context.getContextName()).toBe('website');
  });
  
  test('should delegate generateLandingPage to the original context and send notification', async () => {
    const result = await websiteContextMessaging.generateLandingPage();
    
    expect(mockWebsiteContext.generateLandingPage).toHaveBeenCalled();
    expect(mockMediator.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: ContextId.WEBSITE,
        targetContext: '*',
        notificationType: expect.any(String),
        payload: expect.objectContaining({
          id: 'landing-page',
        }),
      }),
    );
    
    // Test the essential properties without checking the full object structure
    expect(result.success).toBe(true);
    expect(result.message).toBe('Landing page generated');
    expect(result.data).toBeTruthy();
    expect(result.data?.title).toBe('Test User - Personal Website');
  });
  
  test('should delegate buildWebsite to the original context and send notification', async () => {
    const result = await websiteContextMessaging.buildWebsite();
    
    expect(mockWebsiteContext.buildWebsite).toHaveBeenCalled();
    expect(mockMediator.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: ContextId.WEBSITE,
        targetContext: '*',
        notificationType: expect.any(String),
        payload: expect.objectContaining({
          id: 'build',
        }),
      }),
    );
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Website built successfully');
  });
  
  test('should delegate handleWebsiteBuild to the original context and send notification', async () => {
    const result = await websiteContextMessaging.handleWebsiteBuild();
    
    expect(mockWebsiteContext.handleWebsiteBuild).toHaveBeenCalled();
    expect(mockMediator.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: ContextId.WEBSITE,
        targetContext: '*',
        notificationType: expect.any(String),
        payload: expect.objectContaining({
          id: 'preview-build',
        }),
      }),
    );
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Website built successfully');
    expect(result.path).toBe('/path/to/build');
    expect(result.url).toBe('http://example.com');
  });
  
  test('should delegate handleWebsitePromote to the original context and send notification', async () => {
    const result = await websiteContextMessaging.handleWebsitePromote();
    
    expect(mockWebsiteContext.handleWebsitePromote).toHaveBeenCalled();
    expect(mockMediator.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: ContextId.WEBSITE,
        targetContext: '*',
        notificationType: expect.any(String),
        payload: expect.objectContaining({
          id: 'production',
        }),
      }),
    );
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Website promoted successfully');
    expect(result.url).toBe('http://example.com');
  });
  
  test('should handle request messages', async () => {
    // Testing via WebsiteMessageHandler directly since the integration is complex
    const { WebsiteMessageHandler } = await import('@/contexts/website/messaging/websiteMessageHandler');
    const handler = WebsiteMessageHandler.createFresh({ websiteContext: mockWebsiteContext as unknown as MCPWebsiteContext });
    
    const request = {
      category: 'request' as const,
      dataType: 'website.status',
      id: 'test-id',
      sourceContext: 'test-context',
      targetContext: ContextId.WEBSITE,
      type: 'data-request',
      source: 'test',
      timestamp: new Date(),
    };
    
    const response = await handler.handleRequest(request);
    
    expect(mockWebsiteContext.getWebsiteStatus).toHaveBeenCalled();
    expect(response).toBeDefined();
    expect(response.category).toBe('response');
    expect(response.status).toBe('success');
  });
  
  test('should handle notification messages', async () => {
    // Testing via WebsiteMessageHandler directly
    const { WebsiteMessageHandler } = await import('@/contexts/website/messaging/websiteMessageHandler');
    const handler = WebsiteMessageHandler.createFresh({ websiteContext: mockWebsiteContext as unknown as MCPWebsiteContext });
    
    const notification = {
      category: 'notification' as const,
      notificationType: 'profile.updated',
      id: 'test-id',
      sourceContext: 'test-context',
      targetContext: ContextId.WEBSITE,
      type: 'notification',
      source: 'test',
      timestamp: new Date(),
      payload: { profileId: 'test-profile' },
    };
    
    await handler.handleNotification(notification);
    
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });
  
  test('should handle unknown message types', async () => {
    // Mock the function to be returned by registerHandler
    let messageHandler: MessageHandler | undefined;
    
    // Create a new mock with the captured handler
    const captureHandler = (_contextId: string, handler: MessageHandler) => {
      messageHandler = handler;
    };
    
    // Create a fresh mock mediator with our capture function
    mockMediator = MockContextMediator.createFresh() as unknown as MockContextMediator;
    mockMediator.registerHandler = captureHandler;
    
    // Recreate the websiteContextMessaging to capture the handler
    websiteContextMessaging = new WebsiteContextMessaging(
      mockWebsiteContext as unknown as MCPWebsiteContext,
      mockMediator as unknown as ContextMediator,
    );
    
    // Now test the message handler
    if (messageHandler) {
      // Create a data request message with an unknown type
      const unknownMessage: DataRequestMessage = {
        category: 'request',
        id: 'test-id',
        sourceContext: ContextId.NOTES,
        targetContext: ContextId.WEBSITE,
        dataType: 'unknown.type',
        timestamp: new Date(),
        type: 'data',
        source: 'test',
      };
      
      const response = await messageHandler(unknownMessage);
      
      expect(response).toBeDefined();
      expect((response as DataResponseMessage)?.category).toBe('response');
    } else {
      throw new Error('Message handler was not registered');
    }
  });
  
  test('should delegate context lifecycle methods', async () => {
    expect(websiteContextMessaging.getContextName()).toBe('website');
    expect(websiteContextMessaging.getContextVersion()).toBe('1.0.0');
    
    const initResult = await websiteContextMessaging.initialize();
    expect(initResult).toBe(true);
    expect(mockWebsiteContext.initialize).toHaveBeenCalled();
  });
  
  test('should delegate context data methods', async () => {
    const config = await websiteContextMessaging.getConfig();
    expect(config).toBeDefined();
    expect(mockWebsiteContext.getConfig).toHaveBeenCalled();
    
    const landingPageData = await websiteContextMessaging.getLandingPageData();
    expect(landingPageData).toBeDefined();
    expect(mockWebsiteContext.getLandingPageData).toHaveBeenCalled();
  });
  
  test('should handle website status with proper transformation', async () => {
    const result = await websiteContextMessaging.handleWebsiteStatus('preview');
    
    expect(mockWebsiteContext.getWebsiteStatus).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Website is deployed');
    expect(result.data).toBeDefined();
    expect(result.data?.url).toBe('http://example.com');
  });
});