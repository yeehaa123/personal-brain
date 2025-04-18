/**
 * Mock ContextOrchestratorExtended for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import { mock } from 'bun:test';

import type { ConversationContext, ExternalSourceContext, NoteContext, ProfileContext, WebsiteContext } from '@/contexts';
import { ContextId } from '@/protocol/core/contextOrchestratorExtended';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';
import { MockExternalSourceContext } from '@test/__mocks__/contexts/externalSourceContext';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

import { MockContextOrchestrator } from './contextOrchestrator';

/**
 * Interface for constructor options
 */
interface MockContextOrchestratorExtendedOptions {
  noteContext?: NoteContext;
  profileContext?: ProfileContext;
  conversationContext?: ConversationContext;
  externalSourceContext?: ExternalSourceContext;
  websiteContext?: WebsiteContext;
  orchestrator?: MockContextOrchestrator;
  mediator?: ContextMediator;
}

/**
 * Mock implementation of ContextOrchestratorExtended
 */
export class MockContextOrchestratorExtended {
  private static instance: MockContextOrchestratorExtended | null = null;
  
  // Internal properties
  private mockOrchestrator: MockContextOrchestrator;
  private mockMediator: ContextMediator;
  private mockNoteContext: NoteContext;
  private mockProfileContext: ProfileContext;
  private mockConversationContext: ConversationContext;
  private mockExternalSourceContext: ExternalSourceContext;
  private mockWebsiteContext: WebsiteContext;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: MockContextOrchestratorExtendedOptions): MockContextOrchestratorExtended {
    if (!MockContextOrchestratorExtended.instance) {
      MockContextOrchestratorExtended.instance = new MockContextOrchestratorExtended(options);
    }
    return MockContextOrchestratorExtended.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContextOrchestratorExtended.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: MockContextOrchestratorExtendedOptions): MockContextOrchestratorExtended {
    return new MockContextOrchestratorExtended(options);
  }
  
  /**
   * Private constructor
   */
  private constructor(options?: MockContextOrchestratorExtendedOptions) {
    // Initialize all mock contexts if not provided explicitly
    this.mockNoteContext = (options?.noteContext || MockNoteContext.getInstance()) as NoteContext;
    this.mockProfileContext = (options?.profileContext || MockProfileContext.getInstance()) as ProfileContext;
    this.mockConversationContext = (options?.conversationContext || MockConversationContext.getInstance()) as ConversationContext;
    this.mockExternalSourceContext = (options?.externalSourceContext || MockExternalSourceContext.getInstance()) as ExternalSourceContext;
    this.mockWebsiteContext = (options?.websiteContext || MockWebsiteContext.getInstance()) as WebsiteContext;
    
    // Initialize mock orchestrator if not provided
    this.mockOrchestrator = options?.orchestrator || 
      MockContextOrchestrator.createFresh({
        noteContext: this.mockNoteContext,
        profileContext: this.mockProfileContext,
        conversationContext: this.mockConversationContext,
        externalSourceContext: this.mockExternalSourceContext,
        websiteContext: this.mockWebsiteContext,
      });
    
    // Initialize mock mediator if not provided
    this.mockMediator = (options?.mediator || {
      registerHandler: mock(() => {}),
      unregisterHandler: mock(() => {}),
      sendRequest: mock(async () => ({
        id: 'mock-response',
        sourceContext: ContextId.NOTES,
        targetContext: ContextId.PROFILE,
        category: 'response',
        requestId: 'mock-request',
        status: 'success',
        timestamp: new Date(),
        type: 'data',
        source: 'test',
        data: {},
      })),
      sendNotification: mock(async () => []),
      subscribe: mock(() => {}),
      getRegisteredContexts: mock(() => []),
      // Additional required properties for interface compatibility
      pendingRequests: new Map(),
      logger: { debug: () => {}, error: () => {} },
      handleResponse: () => true,
      handleAcknowledgment: () => true,
      cleanupTimedOutRequests: () => {},
    }) as ContextMediator;
  }
  
  /**
   * Check if all contexts are ready
   */
  areContextsReady(): boolean {
    return this.mockOrchestrator.areContextsReady();
  }
  
  /**
   * Get the context manager
   * Note: We use unknown to avoid interface implementation complexity
   */
  getContextManager(): unknown {
    return this.mockOrchestrator.getContextManager();
  }
  
  /**
   * Get the Note context
   */
  getNoteContext(): NoteContext {
    return this.mockNoteContext;
  }
  
  /**
   * Get the Profile context
   */
  getProfileContext(): ProfileContext {
    return this.mockProfileContext;
  }
  
  /**
   * Get the Conversation context
   */
  getConversationContext(): ConversationContext {
    return this.mockConversationContext;
  }
  
  /**
   * Get the External Source context
   */
  getExternalSourceContext(): ExternalSourceContext {
    return this.mockExternalSourceContext;
  }
  
  /**
   * Get the Website context
   */
  getWebsiteContext(): WebsiteContext {
    return this.mockWebsiteContext;
  }
  
  /**
   * Get external sources enabled status
   */
  getExternalSourcesEnabled(): boolean {
    return true;
  }
  
  /**
   * Set external sources enabled status
   */
  setExternalSourcesEnabled(_enabled: boolean): void {
    // Nothing to do in the mock
  }
  
  /**
   * Get the mediator
   */
  getMediator(): ContextMediator {
    return this.mockMediator;
  }
}