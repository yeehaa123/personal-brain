/**
 * Mock ContextIntegrator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */

import type { MCPConversationContext } from '@/contexts/conversations';
import type { MCPExternalSourceContext } from '@/contexts/externalSources';
import type { MCPNoteContext } from '@/contexts/notes';
import type { NoteContextMessaging } from '@/contexts/notes/messaging/noteContextMessaging';
import type { MCPProfileContext } from '@/contexts/profiles';
import type { ProfileContextMessaging } from '@/contexts/profiles/messaging';
import type { MCPWebsiteContext } from '@/contexts/website';
import type { WebsiteContextMessaging } from '@/contexts/website/messaging';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { MockProfileContextMessaging } from '@test/__mocks__/contexts/profiles/messaging/profileContextMessaging';

import { MockContextMediator } from './contextMediator';

/**
 * Interface for constructor options
 */
interface MockContextIntegratorOptions {
  noteContext?: MCPNoteContext;
  profileContext?: MCPProfileContext;
  conversationContext?: MCPConversationContext;
  externalSourceContext?: MCPExternalSourceContext;
  websiteContext?: MCPWebsiteContext;
  mediator?: ContextMediator;
}

/**
 * Mock implementation of ContextIntegrator
 */
export class MockContextIntegrator {
  private static instance: MockContextIntegrator | null = null;
  
  // Base contexts
  private noteContext: MCPNoteContext;
  private profileContext: MCPProfileContext;
  private conversationContext: MCPConversationContext;
  private externalSourceContext: MCPExternalSourceContext;
  private websiteContext: MCPWebsiteContext;
  
  // Context mediator
  private mediator: ContextMediator;
  
  // Messaging-enabled contexts (mocks)
  private noteContextMessaging: NoteContextMessaging;
  private profileContextMessaging: ProfileContextMessaging;
  private websiteContextMessaging: WebsiteContextMessaging;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: MockContextIntegratorOptions): MockContextIntegrator {
    if (!MockContextIntegrator.instance) {
      MockContextIntegrator.instance = new MockContextIntegrator(options);
    }
    return MockContextIntegrator.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContextIntegrator.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: MockContextIntegratorOptions): MockContextIntegrator {
    return new MockContextIntegrator(options);
  }
  
  /**
   * Constructor
   */
  constructor(options?: MockContextIntegratorOptions) {
    // Initialize base contexts
    this.noteContext = options?.noteContext || {} as MCPNoteContext;
    this.profileContext = options?.profileContext || {} as MCPProfileContext;
    this.conversationContext = options?.conversationContext || {} as MCPConversationContext;
    this.externalSourceContext = options?.externalSourceContext || {} as MCPExternalSourceContext;
    this.websiteContext = options?.websiteContext || {} as MCPWebsiteContext;
    
    // Initialize mediator (use provided or create new instance)
    this.mediator = (options?.mediator || MockContextMediator.getInstance()) as ContextMediator;
    
    // Mock note context methods that we know exist to avoid type errors
    const mockedNoteContext = this.noteContext as unknown as Record<string, unknown>;
    
    if (typeof mockedNoteContext['updateNote'] !== 'function') {
      mockedNoteContext['updateNote'] = async () => true;
    }
    
    if (typeof mockedNoteContext['deleteNote'] !== 'function') {
      mockedNoteContext['deleteNote'] = async () => true;
    }
    
    // Create mock messaging-enabled contexts
    // These are simplified mocks that just delegate to the base contexts
    this.noteContextMessaging = {
      // Base NoteContext methods
      getContext: () => this.noteContext,
      getNoteById: (id: string) => this.noteContext.getNoteById(id),
      searchNotes: (params: unknown) => this.noteContext.searchNotes(params as Record<string, unknown>),
      createNote: (note: unknown) => this.noteContext.createNote(note as Record<string, unknown>),
      updateNote: (id: string, updates: unknown) => (mockedNoteContext['updateNote'] as (id: string, updates: unknown) => Promise<boolean>)(id, updates),
      deleteNote: (id: string) => (mockedNoteContext['deleteNote'] as (id: string) => Promise<boolean>)(id),
      
      // Additional messaging methods that would be in NoteContextMessaging
      notifyNoteCreated: async () => {},
      notifyNoteUpdated: async () => {},
      notifyNoteDeleted: async () => {},
    } as unknown as NoteContextMessaging;
    
    this.profileContextMessaging = MockProfileContextMessaging.createFresh(this.profileContext);
    
    this.websiteContextMessaging = {
      // Base WebsiteContext methods
      getContext: () => this.websiteContext,
      
      // Additional messaging methods that would be in WebsiteContextMessaging
      notifyWebsiteUpdated: async () => {},
    } as unknown as WebsiteContextMessaging;
  }
  
  /**
   * Get all messaging-enabled contexts
   */
  getContexts(): {
    note: NoteContextMessaging;
    profile: ProfileContextMessaging;
    conversation: MCPConversationContext;
    externalSource: MCPExternalSourceContext;
    website: WebsiteContextMessaging;
    } {
    return {
      note: this.noteContextMessaging,
      profile: this.profileContextMessaging,
      conversation: this.conversationContext,
      externalSource: this.externalSourceContext,
      website: this.websiteContextMessaging,
    };
  }
  
  /**
   * Get the messaging-enabled note context
   */
  getNoteContext(): NoteContextMessaging {
    return this.noteContextMessaging;
  }
  
  /**
   * Get the messaging-enabled profile context
   */
  getProfileContext(): ProfileContextMessaging {
    return this.profileContextMessaging;
  }
  
  /**
   * Get the conversation context
   */
  getConversationContext(): MCPConversationContext {
    return this.conversationContext;
  }
  
  /**
   * Get the external source context
   */
  getExternalSourceContext(): MCPExternalSourceContext {
    return this.externalSourceContext;
  }
  
  /**
   * Get the messaging-enabled website context
   */
  getWebsiteContext(): WebsiteContextMessaging {
    return this.websiteContextMessaging;
  }
  
  /**
   * Get the context mediator
   */
  getMediator(): ContextMediator {
    return this.mediator;
  }
}