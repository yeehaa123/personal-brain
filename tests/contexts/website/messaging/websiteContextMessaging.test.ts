/**
 * Tests for the WebsiteContextMessaging class
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { WebsiteContext } from '@/contexts/website';
import { WebsiteContextMessaging } from '@/contexts/website/messaging/websiteContextMessaging';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { ContextMediator } from '@/protocol/messaging';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';

// Define the return type of buildWebsite method
type BuildWebsiteResult = { success: boolean; message: string; output?: string };

// Create a mock object for WebsiteContext
const mockWebsiteContext = /* @__PURE__ */ (({
  generateLandingPage: mock(() => Promise.resolve({
    success: true,
    message: 'Landing page generated',
    data: { 
      title: 'Test Landing Page',
      name: 'Test Name',
      tagline: 'Test Tagline', 
    },
  })),
  
  buildWebsite: mock(() => Promise.resolve({
    success: true,
    message: 'Website built successfully',
    output: 'Build output',
  })),
  
  handleWebsiteBuild: mock(() => Promise.resolve({
    success: true,
    message: 'Website built successfully',
    path: '/path/to/build',
    url: 'http://example.com',
  })),
  
  handleWebsitePromote: mock(() => Promise.resolve({
    success: true,
    message: 'Website promoted successfully',
    url: 'http://example.com',
  })),
  
  getContextName: mock(() => 'website'),
  getContextVersion: mock(() => '1.0.0'),
  initialize: mock(() => Promise.resolve(true)),
  setReadyState: mock(() => {}),
  getConfig: mock(() => Promise.resolve({ astroProjectPath: '/test/path' })),
  updateConfig: mock(() => Promise.resolve({ astroProjectPath: '/updated/path' })),
  getLandingPageData: mock(() => Promise.resolve(null)),
  saveLandingPageData: mock(() => Promise.resolve()),
  
  handleWebsiteStatus: mock(() => Promise.resolve({
    success: true,
    message: 'Status retrieved',
    data: {
      environment: 'preview',
      buildStatus: 'built',
      fileCount: 10,
      serverStatus: 'running',
      domain: 'example.com',
      accessStatus: 'accessible',
      url: 'http://example.com',
    },
  })),
  
  getDeploymentManager: mock(() => Promise.resolve({
    getEnvironmentStatus: mock(() => Promise.resolve({
      environment: 'preview',
      buildStatus: 'built',
      serverStatus: 'running',
      fileCount: 10,
      domain: 'example.com',
      accessStatus: 'accessible',
      url: 'http://example.com',
    })),
  })),
  
  // Add other required WebsiteContext methods and properties
  getReadyState: mock(() => true),
}) as unknown as WebsiteContext);

// Create a fresh mock mediator for testing
let mockMediator: MockContextMediator;

describe('WebsiteContextMessaging', () => {
  let websiteContextMessaging: WebsiteContextMessaging;
  
  beforeEach(() => {
    // Reset WebsiteContextMessaging singleton first
    WebsiteContextMessaging.resetInstance();
    
    // Reset and recreate the mock mediator
    MockContextMediator.resetInstance();
    mockMediator = MockContextMediator.createFresh({
      shouldRequestSucceed: true,
      mockResponseData: { success: true },
    });
    
    // Reset all mock WebsiteContext methods
    (mockWebsiteContext.generateLandingPage as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.buildWebsite as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.handleWebsiteBuild as unknown as { mockClear: () => void }).mockClear();
    (mockWebsiteContext.handleWebsitePromote as unknown as { mockClear: () => void }).mockClear();
    
    // Create a new WebsiteContextMessaging instance with our mocks
    websiteContextMessaging = new WebsiteContextMessaging(
      mockWebsiteContext,
      mockMediator as unknown as ContextMediator,
    );
  });
  
  afterEach(() => {
    WebsiteContextMessaging.resetInstance();
    MockContextMediator.resetInstance();
  });
  
  test('should register a message handler on initialization', () => {
    expect(mockMediator.registerHandler).toHaveBeenCalledWith(
      ContextId.WEBSITE,
      expect.any(Function),
    );
  });
  
  test('should return the original context', () => {
    expect(websiteContextMessaging.getContext()).toBe(mockWebsiteContext);
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
    expect(result).toEqual({
      success: true,
      message: 'Landing page generated',
      data: { 
        title: 'Test Landing Page',
        name: 'Test Name',
        tagline: 'Test Tagline',
      },
    });
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
          type: 'build',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Website built successfully',
      output: 'Build output',
    });
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
          type: 'preview',
          url: 'http://example.com',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Website built successfully',
      path: '/path/to/build',
      url: 'http://example.com',
    });
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
          url: 'http://example.com',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Website promoted successfully',
      url: 'http://example.com',
    });
  });
  
  test('should not send notification if operation fails', async () => {
    (mockWebsiteContext.buildWebsite as unknown as { mockImplementationOnce: (fn: () => Promise<BuildWebsiteResult>) => void }).mockImplementationOnce(() => Promise.resolve({
      success: false,
      message: 'Build failed',
      output: '', // Include output to match the expected return type
    }));
    
    const result = await websiteContextMessaging.buildWebsite();
    
    expect(mockWebsiteContext.buildWebsite).toHaveBeenCalled();
    expect(mockMediator.sendNotification).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Build failed',
      output: '',
    });
  });
  
  test('getInstance should return a singleton instance', () => {
    const instance1 = WebsiteContextMessaging.getInstance(
      mockWebsiteContext,
      mockMediator as unknown as ContextMediator,
    );
    
    // Create a new mock mediator to ensure we're using the singleton pattern correctly
    const newMediator = MockContextMediator.createFresh();
    
    const instance2 = WebsiteContextMessaging.getInstance(
      mockWebsiteContext,
      newMediator as unknown as ContextMediator, // Using a different mediator should still return the same instance
    );
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh should create a new instance', () => {
    const instance1 = WebsiteContextMessaging.createFresh(
      mockWebsiteContext,
      mockMediator as unknown as ContextMediator,
    );
    
    const instance2 = WebsiteContextMessaging.createFresh(
      mockWebsiteContext,
      mockMediator as unknown as ContextMediator,
    );
    
    expect(instance1).not.toBe(instance2);
  });
});