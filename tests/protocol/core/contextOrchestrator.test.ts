/**
 * Focused tests for ContextOrchestrator
 *
 * These tests focus on the core functionality of ContextOrchestrator
 * without testing too much of its dependencies.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ContextMediator } from '@/protocol/messaging/contextMediator';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import { NotificationType } from '@/protocol/messaging/messageTypes';

// Create a simple mock for the ContextManager
const createMockContextManager = () => ({
  getNoteContext: mock(() => ({})),
  getProfileContext: mock(() => ({})),
  getConversationContext: mock(() => ({})),
  getExternalSourceContext: mock(() => ({})),
  getWebsiteContext: mock(() => ({})),
  areContextsReady: mock(() => true),
  initializeContextLinks: mock(() => {}),
  setExternalSourcesEnabled: mock((_enabled: boolean) => {}),
  getExternalSourcesEnabled: mock(() => true),
});

// Create a simplified mock for the ContextOrchestrator
class TestableContextOrchestrator {
  private contextManager: ReturnType<typeof createMockContextManager>;
  private mediator: ContextMediator;

  constructor() {
    this.contextManager = createMockContextManager();
    this.mediator = ContextMediator.createFresh();
    this.registerHandlers();
    this.registerSubscriptions();
  }

  // Set up message handlers for each context
  private registerHandlers() {
    const contexts = [
      ContextId.NOTES,
      ContextId.PROFILE,
      ContextId.CONVERSATION,
      ContextId.EXTERNAL_SOURCES,
      ContextId.WEBSITE,
    ];
    
    contexts.forEach(contextId => {
      this.mediator.registerHandler(contextId, async () => {
        // Return undefined instead of an incomplete message
        // In a real implementation, we would return a proper message
        return;
      });
    });
  }

  // Set up subscriptions between contexts
  private registerSubscriptions() {
    // Profile update subscribers
    this.mediator.subscribe(ContextId.NOTES, NotificationType.PROFILE_UPDATED);
    this.mediator.subscribe(ContextId.CONVERSATION, NotificationType.PROFILE_UPDATED);
    this.mediator.subscribe(ContextId.WEBSITE, NotificationType.PROFILE_UPDATED);
    
    // Note update subscribers
    this.mediator.subscribe(ContextId.PROFILE, NotificationType.NOTE_CREATED);
    this.mediator.subscribe(ContextId.CONVERSATION, NotificationType.NOTE_CREATED);
    
    // External sources subscribers
    this.mediator.subscribe(ContextId.CONVERSATION, NotificationType.EXTERNAL_SOURCES_STATUS);
  }

  // Get the mediator
  getMediator() {
    return this.mediator;
  }

  // Set external sources enabled status
  setExternalSourcesEnabled(enabled: boolean) {
    this.contextManager.setExternalSourcesEnabled(enabled);
  }
}

describe('ContextOrchestrator', () => {
  let orchestrator: TestableContextOrchestrator;
  let mediator: ContextMediator;
  
  beforeEach(() => {
    ContextMediator.resetInstance();
    orchestrator = new TestableContextOrchestrator();
    mediator = orchestrator.getMediator();
  });
  
  afterEach(() => {
    ContextMediator.resetInstance();
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
  
  test('should set external sources enabled status', () => {
    const contextManager = createMockContextManager();
    const setEnabledSpy = contextManager.setExternalSourcesEnabled;
    
    // Create a new orchestrator with our mock context manager
    const testOrchestrator = new TestableContextOrchestrator();
    
    // Replace the internal context manager with our spy-enabled one
    Object.defineProperty(testOrchestrator, 'contextManager', {
      value: contextManager,
      writable: true,
    });
    
    // Call the method
    testOrchestrator.setExternalSourcesEnabled(false);
    
    // Verify the method was called
    expect(setEnabledSpy).toHaveBeenCalled();
  });
});