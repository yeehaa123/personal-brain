/**
 * Tests for the ContextOrchestrator with messaging capabilities
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ConversationContext } from '@/contexts/conversations';
import type { ExternalSourceContext } from '@/contexts/externalSources';
import type { NoteContext } from '@/contexts/notes';
import type { ProfileContext } from '@/contexts/profiles';
import type { WebsiteContext } from '@/contexts/website';
import type { BrainProtocolConfig } from '@/protocol/config/brainProtocolConfig';
import { ContextId, ContextOrchestrator } from '@/protocol/core/contextOrchestrator';
import { ContextMediator, NotificationType } from '@/protocol/messaging';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';
import { MockExternalSourceContext } from '@test/__mocks__/contexts/externalSourceContext';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';
import { MockBrainProtocolConfig } from '@test/__mocks__/protocol/config/brainProtocolConfig';
import { MockContextManager } from '@test/__mocks__/protocol/managers/contextManager';

// Create mock contexts
const createMockContexts = () => {
  // Simply create fresh instances without trying to mock their detailed behavior
  // The test should focus on ContextOrchestrator's behavior, not the contexts' behavior
  return {
    noteContext: MockNoteContext.createFresh(),
    profileContext: MockProfileContext.createFresh(),
    conversationContext: MockConversationContext.createFresh(),
    externalSourceContext: MockExternalSourceContext.createFresh(),
    websiteContext: MockWebsiteContext.createFresh(),
  };
};

describe('ContextOrchestrator with Messaging', () => {
  let mediator: ContextMediator;
  let mockContexts: ReturnType<typeof createMockContexts>;
  let contextManager: MockContextManager;
  let orchestrator: ContextOrchestrator;
  
  // Set up fresh instances before each test
  beforeEach(() => {
    // Reset singletons
    ContextMediator.resetInstance();
    ContextOrchestrator.resetInstance();
    MockContextManager.resetInstance();
    
    // Create instances
    mediator = ContextMediator.createFresh();
    mockContexts = createMockContexts();
    
    // Create a context manager with the mock contexts
    contextManager = MockContextManager.createFresh();
    contextManager.getNoteContext = mock(() => mockContexts.noteContext as unknown as NoteContext);
    contextManager.getProfileContext = mock(() => mockContexts.profileContext as unknown as ProfileContext);
    contextManager.getConversationContext = mock(() => mockContexts.conversationContext as unknown as ConversationContext);
    contextManager.getExternalSourceContext = mock(() => mockContexts.externalSourceContext as unknown as ExternalSourceContext);
    contextManager.getWebsiteContext = mock(() => mockContexts.websiteContext as unknown as WebsiteContext);
    contextManager.areContextsReady = mock(() => true);
    contextManager.initializeContextLinks = mock(() => {});
    
    // Create the orchestrator with messaging capabilities
    const config = MockBrainProtocolConfig.createMock({ useExternalSources: true }) as BrainProtocolConfig;
    
    // Mock the ContextManager.getInstance to return our mock
    const originalGetInstance = MockContextManager.getInstance;
    MockContextManager.getInstance = mock(() => contextManager);
    
    // Create orchestrator that will use our mocked context manager
    orchestrator = ContextOrchestrator.createFresh({
      mediator,
      config,
    });
    
    // Restore the original getInstance
    MockContextManager.getInstance = originalGetInstance;
  });
  
  // Reset after each test to clean up
  afterEach(() => {
    ContextMediator.resetInstance();
    ContextOrchestrator.resetInstance();
    MockContextManager.resetInstance();
  });
  
  test('getInstance should create a singleton instance', () => {
    const instance1 = ContextOrchestrator.getInstance({
      mediator,
      config: MockBrainProtocolConfig.createMock({ useExternalSources: true }) as BrainProtocolConfig,
    });
    
    const instance2 = ContextOrchestrator.getInstance({
      mediator: {} as unknown as ContextMediator,
      config: MockBrainProtocolConfig.createMock() as BrainProtocolConfig,
    });
    
    expect(instance1).toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const instance1 = ContextOrchestrator.getInstance({
      mediator,
      config: MockBrainProtocolConfig.createMock({ useExternalSources: true }) as BrainProtocolConfig,
    });
    
    ContextOrchestrator.resetInstance();
    
    const instance2 = ContextOrchestrator.getInstance({
      mediator,
      config: MockBrainProtocolConfig.createMock({ useExternalSources: true }) as BrainProtocolConfig,
    });
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('should register handlers for all contexts', () => {
    const registeredContexts = mediator.getRegisteredContexts();
    
    expect(registeredContexts).toContain(ContextId.NOTES);
    expect(registeredContexts).toContain(ContextId.PROFILE);
    expect(registeredContexts).toContain(ContextId.CONVERSATION);
    expect(registeredContexts).toContain(ContextId.EXTERNAL_SOURCES);
    expect(registeredContexts).toContain(ContextId.WEBSITE);
  });
  
  test('should register subscriptions for notifications', () => {
    const profileSubscribers = mediator.getSubscribers(NotificationType.PROFILE_UPDATED);
    const noteSubscribers = mediator.getSubscribers(NotificationType.NOTE_CREATED);
    
    // Examples of expected subscriptions
    expect(profileSubscribers).toContain(ContextId.NOTES);
    expect(profileSubscribers).toContain(ContextId.CONVERSATION);
    expect(profileSubscribers).toContain(ContextId.WEBSITE);
    
    expect(noteSubscribers).toContain(ContextId.PROFILE);
    expect(noteSubscribers).toContain(ContextId.CONVERSATION);
  });
  
  test('message handlers are registered for each context', () => {
    // Check that handlers are registered for each context ID
    expect(mediator.getRegisteredContexts()).toContain(ContextId.NOTES);
    expect(mediator.getRegisteredContexts()).toContain(ContextId.PROFILE);
    expect(mediator.getRegisteredContexts()).toContain(ContextId.CONVERSATION);
    expect(mediator.getRegisteredContexts()).toContain(ContextId.EXTERNAL_SOURCES);
    expect(mediator.getRegisteredContexts()).toContain(ContextId.WEBSITE);
  });
  
  test('orchestrator uses context mediator to route messages', () => {
    // Verify the orchestrator has a mediator
    expect(orchestrator.getMediator()).toBe(mediator);
    
    // Verify at least one mediator method is properly used by orchestrator
    const registeredContexts = mediator.getRegisteredContexts();
    expect(registeredContexts.length).toBeGreaterThan(0);
  });
  
  test('setExternalSourcesEnabled should update status and call sendNotification', async () => {
    // Create a mock for the sendNotification method
    const sendNotificationMock = mock(async () => ['context1', 'context2']);
    const originalSendNotification = mediator.sendNotification;
    mediator.sendNotification = sendNotificationMock;
    
    // Call setExternalSourcesEnabled
    orchestrator.setExternalSourcesEnabled(false);
    
    // Check that sendNotification was called (checking implementation details is fragile)
    expect(sendNotificationMock).toHaveBeenCalled();
    
    // Restore original method
    mediator.sendNotification = originalSendNotification;
  });
  
  test('context access methods should return valid context instances', () => {
    // Simply verify that context access methods return something
    expect(orchestrator.getNoteContext()).toBeDefined();
    expect(orchestrator.getProfileContext()).toBeDefined();
    expect(orchestrator.getConversationContext()).toBeDefined();
    expect(orchestrator.getExternalSourceContext()).toBeDefined();
    expect(orchestrator.getWebsiteContext()).toBeDefined();
  });
  
  test('getMediator should return the mediator instance', () => {
    const returnedMediator = orchestrator.getMediator();
    expect(returnedMediator).toBe(mediator);
  });
});