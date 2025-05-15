/**
 * Mock ContextOrchestrator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type { ConversationContext } from '@/contexts/conversations';
import type { ExternalSourceContext } from '@/contexts/externalSources';
import type { NoteContext } from '@/contexts/notes';
import type { ProfileContext } from '@/contexts/profiles';
import type { WebsiteContext } from '@/contexts/website';
import type { IContextManager } from '@/protocol/types';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';
import { MockExternalSourceContext } from '@test/__mocks__/contexts/externalSourceContext';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

/**
 * Mock ContextOrchestrator options
 */
interface MockContextOrchestratorOptions {
  ready?: boolean;
  contextManager?: IContextManager;
  noteContext?: NoteContext;
  profileContext?: ProfileContext;
  conversationContext?: ConversationContext;
  externalSourceContext?: ExternalSourceContext;
  websiteContext?: WebsiteContext;
  mediator?: unknown; // For messaging tests
  config?: unknown; // For config options
}

/**
 * Mock ContextOrchestrator for testing protocol layer
 */
export class MockContextOrchestrator {
  private static instance: MockContextOrchestrator | null = null;
  private ready = true;
  private contextManager: IContextManager = {
    getMockContext: () => 'mock-context',
  } as unknown as IContextManager;
  
  // Individual contexts
  private noteContext: NoteContext;
  private profileContext: ProfileContext;
  private conversationContext: ConversationContext;
  private externalSourceContext: ExternalSourceContext;
  private websiteContext: WebsiteContext;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: MockContextOrchestratorOptions): MockContextOrchestrator {
    if (!MockContextOrchestrator.instance) {
      MockContextOrchestrator.instance = new MockContextOrchestrator(options);
    }
    return MockContextOrchestrator.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContextOrchestrator.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: MockContextOrchestratorOptions): MockContextOrchestrator {
    return new MockContextOrchestrator(options);
  }
  
  private constructor(options?: MockContextOrchestratorOptions) {
    // Set up with options if provided
    if (options?.ready !== undefined) {
      this.ready = options.ready;
    }
    
    if (options?.contextManager) {
      this.contextManager = options.contextManager;
    }
    
    // Initialize contexts with provided options or defaults
    this.noteContext = options?.noteContext || 
      MockNoteContext.getInstance() as unknown as NoteContext;
      
    this.profileContext = options?.profileContext || 
      MockProfileContext.getInstance() as unknown as ProfileContext;
      
    this.conversationContext = options?.conversationContext || 
      MockConversationContext.getInstance() as unknown as ConversationContext;
      
    this.externalSourceContext = options?.externalSourceContext || 
      MockExternalSourceContext.getInstance() as unknown as ExternalSourceContext;
      
    this.websiteContext = options?.websiteContext || 
      MockWebsiteContext.getInstance() as unknown as WebsiteContext;
  }
  
  /**
   * Check if all contexts are ready
   */
  areContextsReady(): boolean { 
    return this.ready; 
  }
  
  /**
   * Get the context manager
   */
  getContextManager(): IContextManager { 
    return this.contextManager; 
  }
  
  /**
   * Get the note context
   */
  getNoteContext(): NoteContext {
    return this.noteContext;
  }
  
  /**
   * Get the profile context
   */
  getProfileContext(): ProfileContext {
    return this.profileContext;
  }
  
  /**
   * Get the conversation context
   */
  getConversationContext(): ConversationContext {
    return this.conversationContext;
  }
  
  /**
   * Get the external source context
   */
  getExternalSourceContext(): ExternalSourceContext {
    return this.externalSourceContext;
  }
  
  /**
   * Get the website context
   */
  getWebsiteContext(): WebsiteContext {
    return this.websiteContext;
  }
  
  /**
   * For testing - set the ready state
   */
  setReady(ready: boolean): void { 
    this.ready = ready; 
  }
}