/**
 * Mock ContextIntegrator for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */

import type { ConversationContext } from '@/contexts/conversations';
import type { ExternalSourceContext } from '@/contexts/externalSources';
import type { NoteContext } from '@/contexts/notes';
import type { NoteContextMessaging } from '@/contexts/notes/messaging/noteContextMessaging';
import type { ProfileContextV2Messaging } from '@/contexts/profiles/messaging';
import type { ProfileContextV2 } from '@/contexts/profiles/profileContextV2';
import type { WebsiteContext } from '@/contexts/website';
import type { WebsiteContextMessaging } from '@/contexts/website/messaging';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';
import { MockExternalSourceContext } from '@test/__mocks__/contexts/externalSourceContext';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileContextV2 } from '@test/__mocks__/contexts/profileContextV2';
import { MockProfileContextV2Messaging } from '@test/__mocks__/contexts/profiles/messaging/profileContextV2Messaging';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

import { MockContextMediator } from './contextMediator';

/**
 * Interface for constructor options
 */
interface MockContextIntegratorOptions {
  noteContext?: NoteContext;
  profileContext?: ProfileContextV2;
  conversationContext?: ConversationContext;
  externalSourceContext?: ExternalSourceContext;
  websiteContext?: WebsiteContext;
  mediator?: ContextMediator;
}

/**
 * Mock implementation of ContextIntegrator
 */
export class MockContextIntegrator {
  private static instance: MockContextIntegrator | null = null;
  
  // Base contexts
  private noteContext: NoteContext;
  private profileContext: ProfileContextV2;
  private conversationContext: ConversationContext;
  private externalSourceContext: ExternalSourceContext;
  private websiteContext: WebsiteContext;
  
  // Context mediator
  private mediator: ContextMediator;
  
  // Messaging-enabled contexts (mocks)
  private noteContextMessaging: NoteContextMessaging;
  private profileContextMessaging: ProfileContextV2Messaging;
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
    // Initialize base contexts with type assertions to avoid type errors
    this.noteContext = (options?.noteContext || MockNoteContext.getInstance()) as NoteContext;
    this.profileContext = (options?.profileContext || MockProfileContextV2.getInstance()) as ProfileContextV2;
    this.conversationContext = (options?.conversationContext || MockConversationContext.getInstance()) as ConversationContext;
    this.externalSourceContext = (options?.externalSourceContext || MockExternalSourceContext.getInstance()) as ExternalSourceContext;
    this.websiteContext = (options?.websiteContext || MockWebsiteContext.getInstance()) as WebsiteContext;
    
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
    
    this.profileContextMessaging = MockProfileContextV2Messaging.createFresh(this.profileContext);
    
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
    profile: ProfileContextV2Messaging;
    conversation: ConversationContext;
    externalSource: ExternalSourceContext;
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
  getProfileContext(): ProfileContextV2Messaging {
    return this.profileContextMessaging;
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