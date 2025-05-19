/**
 * Mock ContextOrchestrator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type { MCPConversationContext } from '@/contexts/conversations';
import type { MCPExternalSourceContext } from '@/contexts/externalSources';
import type { MCPNoteContext } from '@/contexts/notes';
import type { MCPProfileContext } from '@/contexts/profiles';
import type { MCPWebsiteContext } from '@/contexts/website';
import type { IContextManager } from '@/protocol/types';
import { MockMCPConversationContext } from '@test/__mocks__/contexts/conversations/MCPConversationContext';
import { MockMCPExternalSourceContext } from '@test/__mocks__/contexts/externalSources/MCPExternalSourceContext';
import { MockMCPWebsiteContext } from '@test/__mocks__/contexts/MCPWebsiteContext';
import { MockMCPNoteContext } from '@test/__mocks__/contexts/notes/MCPNoteContext';
import { MockMCPProfileContext } from '@test/__mocks__/contexts/profiles/MCPProfileContext';

/**
 * Mock ContextOrchestrator options
 */
interface MockContextOrchestratorOptions {
  ready: boolean;
  contextManager: IContextManager;
  noteContext: MockMCPNoteContext;
  profileContext: MockMCPProfileContext;
  conversationContext: MockMCPConversationContext;
  externalSourceContext: MockMCPExternalSourceContext;
  websiteContext: MockMCPWebsiteContext;
  mediator: unknown; // For messaging tests
  config: unknown; // For config options
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
  private noteContext: MockMCPNoteContext;
  private profileContext: MockMCPProfileContext;
  private conversationContext: MockMCPConversationContext;
  private externalSourceContext: MockMCPExternalSourceContext;
  private websiteContext: MockMCPWebsiteContext;
  
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
    this.noteContext = options?.noteContext || MockMCPNoteContext.getInstance();
      
    this.profileContext = options?.profileContext || MockMCPProfileContext.getInstance();
      
    this.conversationContext = options?.conversationContext || MockMCPConversationContext.getInstance();
      
    this.externalSourceContext = options?.externalSourceContext || MockMCPExternalSourceContext.getInstance();
      
    this.websiteContext = options?.websiteContext || MockMCPWebsiteContext.getInstance();
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
  getNoteContext(): MCPNoteContext {
    return this.noteContext as unknown as MCPNoteContext;
  }
  
  /**
   * Get the profile context
   */
  getProfileContext(): MCPProfileContext {
    return this.profileContext as unknown as MCPProfileContext;
  }
  
  /**
   * Get the conversation context
   */
  getConversationContext(): MCPConversationContext {
    return this.conversationContext as unknown as MCPConversationContext;
  }
  
  /**
   * Get the external source context
   */
  getExternalSourceContext(): MCPExternalSourceContext {
    return this.externalSourceContext as unknown as MCPExternalSourceContext;
  }
  
  /**
   * Get the website context
   */
  getWebsiteContext(): MCPWebsiteContext {
    return this.websiteContext as unknown as MCPWebsiteContext;
  }
  
  /**
   * For testing - set the ready state
   */
  setReady(ready: boolean): void { 
    this.ready = ready; 
  }
}