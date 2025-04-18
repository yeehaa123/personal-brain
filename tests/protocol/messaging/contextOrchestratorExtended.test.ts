/**
 * Tests for the ContextOrchestratorExtended component
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { BrainProtocolConfig } from '@/protocol/config/brainProtocolConfig';
import type { ContextOrchestrator } from '@/protocol/core/contextOrchestrator';
import { ContextId, ContextOrchestratorExtended } from '@/protocol/core/contextOrchestratorExtended';
import { ContextMediator, DataRequestType, MessageFactory, NotificationType } from '@/protocol/messaging';

// Create mock classes for contexts
const createMockContext = () => ({
  searchNotes: mock(async () => [{ id: '1', title: 'Note 1', content: 'Content 1' }]),
  getNoteById: mock(async (id) => ({ id, title: `Note ${id}`, content: `Content ${id}` })),
  getProfile: mock(async () => ({ name: 'Test User' })),
  getConversationTextHistory: mock(async () => 'Conversation history'),
  searchExternalSources: mock(async () => [{ title: 'Source 1', source: 'Test', url: 'https://example.com', content: 'Content' }]),
  getDeploymentStatus: mock(async () => ({ status: 'deployed' })),
});

// Mock context orchestrator
const createMockOrchestrator = () => {
  const mockContext = createMockContext();
  
  return {
    getNoteContext: mock(() => ({ 
      searchNotes: mockContext.searchNotes,
      getNoteById: mockContext.getNoteById, 
    })),
    getProfileContext: mock(() => ({ 
      getProfile: mockContext.getProfile, 
    })),
    getConversationContext: mock(() => ({ 
      getConversationTextHistory: mockContext.getConversationTextHistory, 
    })),
    getExternalSourceContext: mock(() => ({ 
      searchExternalSources: mockContext.searchExternalSources, 
    })),
    getWebsiteContext: mock(() => ({ 
      getDeploymentStatus: mockContext.getDeploymentStatus, 
    })),
    getContextManager: mock(() => ({})),
    setExternalSourcesEnabled: mock(() => {}),
    getExternalSourcesEnabled: mock(() => true),
    areContextsReady: mock(() => true),
  };
};

describe('ContextOrchestratorExtended', () => {
  let mediator: ContextMediator;
  let orchestrator: ReturnType<typeof createMockOrchestrator>;
  let extendedOrchestrator: ContextOrchestratorExtended;
  
  // Set up fresh instances before each test
  beforeEach(() => {
    // Reset singletons
    ContextMediator.resetInstance();
    ContextOrchestratorExtended.resetInstance();
    
    // Create instances
    mediator = ContextMediator.createFresh();
    orchestrator = createMockOrchestrator();
    
    // Create extended orchestrator
    extendedOrchestrator = ContextOrchestratorExtended.createFresh({
      orchestrator: orchestrator as unknown as ContextOrchestrator,
      mediator,
      config: { useExternalSources: true } as unknown as BrainProtocolConfig,
    });
  });
  
  // Reset after each test to clean up
  afterEach(() => {
    ContextMediator.resetInstance();
    ContextOrchestratorExtended.resetInstance();
  });
  
  test('getInstance should create a singleton instance', () => {
    const instance1 = ContextOrchestratorExtended.getInstance({
      orchestrator: orchestrator as unknown as ContextOrchestrator,
      mediator,
      config: { useExternalSources: true } as unknown as BrainProtocolConfig,
    });
    
    const instance2 = ContextOrchestratorExtended.getInstance({
      orchestrator: {} as unknown as ContextOrchestrator,
      mediator: {} as unknown as ContextMediator,
      config: {} as unknown as BrainProtocolConfig,
    });
    
    expect(instance1).toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const instance1 = ContextOrchestratorExtended.getInstance({
      orchestrator: orchestrator as unknown as ContextOrchestrator,
      mediator,
      config: { useExternalSources: true } as unknown as BrainProtocolConfig,
    });
    
    ContextOrchestratorExtended.resetInstance();
    
    const instance2 = ContextOrchestratorExtended.getInstance({
      orchestrator: orchestrator as unknown as ContextOrchestrator,
      mediator,
      config: { useExternalSources: true } as unknown as BrainProtocolConfig,
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
  
  test('notes context handler should process search requests', async () => {
    // Create a request for notes search
    const request = MessageFactory.createDataRequest(
      'test-context',
      ContextId.NOTES,
      DataRequestType.NOTES_SEARCH,
      { query: 'test' },
    );
    
    // Send the request
    const response = await mediator.sendRequest(request);
    
    // Verify the response
    expect(response.status).toBe('success');
    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty('notes');
    expect(Array.isArray(response.data?.['notes'])).toBe(true);
    
    // Verify the orchestrator method was called
    expect(orchestrator.getNoteContext).toHaveBeenCalled();
    expect(orchestrator.getNoteContext().searchNotes).toHaveBeenCalledWith({
      query: 'test',
      limit: undefined,
      semanticSearch: true,
    });
  });
  
  test('notes context handler should process get by ID requests', async () => {
    // Create a request for note by ID
    const request = MessageFactory.createDataRequest(
      'test-context',
      ContextId.NOTES,
      DataRequestType.NOTE_BY_ID,
      { id: '123' },
    );
    
    // Send the request
    const response = await mediator.sendRequest(request);
    
    // Verify the response
    expect(response.status).toBe('success');
    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty('note');
    expect(response.data?.['note']).toHaveProperty('id', '123');
    
    // Verify the orchestrator method was called
    expect(orchestrator.getNoteContext).toHaveBeenCalled();
    expect(orchestrator.getNoteContext().getNoteById).toHaveBeenCalledWith('123');
  });
  
  test('profile context handler should process profile data requests', async () => {
    // Create a request for profile data
    const request = MessageFactory.createDataRequest(
      'test-context',
      ContextId.PROFILE,
      DataRequestType.PROFILE_DATA,
    );
    
    // Send the request
    const response = await mediator.sendRequest(request);
    
    // Verify the response
    expect(response.status).toBe('success');
    expect(response.data).toBeDefined();
    expect(response.data).toHaveProperty('profile');
    expect(response.data?.['profile']).toHaveProperty('name', 'Test User');
    
    // Verify the orchestrator method was called
    expect(orchestrator.getProfileContext).toHaveBeenCalled();
    expect(orchestrator.getProfileContext().getProfile).toHaveBeenCalled();
  });
  
  test('should delegate to original orchestrator for setExternalSourcesEnabled', async () => {
    // Call setExternalSourcesEnabled
    extendedOrchestrator.setExternalSourcesEnabled(false);
    
    // Verify the orchestrator method was called
    expect(orchestrator.setExternalSourcesEnabled).toHaveBeenCalledWith(false);
  });
  
  test('should delegate methods to the original orchestrator', () => {
    extendedOrchestrator.getNoteContext();
    expect(orchestrator.getNoteContext).toHaveBeenCalled();
    
    extendedOrchestrator.getProfileContext();
    expect(orchestrator.getProfileContext).toHaveBeenCalled();
    
    extendedOrchestrator.getConversationContext();
    expect(orchestrator.getConversationContext).toHaveBeenCalled();
    
    extendedOrchestrator.getExternalSourceContext();
    expect(orchestrator.getExternalSourceContext).toHaveBeenCalled();
    
    extendedOrchestrator.getWebsiteContext();
    expect(orchestrator.getWebsiteContext).toHaveBeenCalled();
    
    extendedOrchestrator.getExternalSourcesEnabled();
    expect(orchestrator.getExternalSourcesEnabled).toHaveBeenCalled();
    
    extendedOrchestrator.areContextsReady();
    expect(orchestrator.areContextsReady).toHaveBeenCalled();
    
    extendedOrchestrator.getContextManager();
    expect(orchestrator.getContextManager).toHaveBeenCalled();
  });
  
  test('getMediator should return the mediator instance', () => {
    const returnedMediator = extendedOrchestrator.getMediator();
    expect(returnedMediator).toBe(mediator);
  });
});