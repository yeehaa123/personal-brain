/**
 * Mock ContextManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type {
  ConversationContext,
  ExternalSourceContext,
  NoteContext,
  WebsiteContext,
} from '@/contexts';
import type { ProfileContextV2 } from '@/contexts/profiles/profileContextV2';
import type { IContextManager } from '@/protocol/types';
import {
  MockConversationContext,
} from '@test/__mocks__/contexts/conversationContext';
import {
  MockExternalSourceContext,
} from '@test/__mocks__/contexts/externalSourceContext';
import {
  MockNoteContext,
} from '@test/__mocks__/contexts/noteContext';
import {
  MockProfileContextV2,
} from '@test/__mocks__/contexts/profileContextV2';
import {
  MockWebsiteContext,
} from '@test/__mocks__/contexts/websiteContext';

export class MockContextManager implements IContextManager {
  private static instance: MockContextManager | null = null;
  private externalSourcesEnabled = false;
  private noteContext = MockNoteContext.createFresh();
  private profileContext = MockProfileContextV2.createFresh();
  private conversationContext = MockConversationContext.createFresh();
  private externalSourceContext = MockExternalSourceContext.createFresh();
  private websiteContext = MockWebsiteContext.createFresh();
  private renderer = null;

  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockContextManager {
    if (!MockContextManager.instance) {
      MockContextManager.instance = new MockContextManager(options);
    }
    return MockContextManager.instance;
  }

  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockContextManager.instance = null;

    // Reset all context instances too
    MockNoteContext.resetInstance();
    MockProfileContextV2.resetInstance();
    MockConversationContext.resetInstance();
    MockExternalSourceContext.resetInstance();
    MockWebsiteContext.resetInstance();
  }

  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockContextManager {
    return new MockContextManager(options);
  }

  private constructor(options?: Record<string, unknown>) {
    // Initialize with options if provided
    if (options && options['externalSourcesEnabled'] === true) {
      this.externalSourcesEnabled = true;
    }
  }

  getNoteContext(): NoteContext {
    return this.noteContext as unknown as NoteContext;
  }

  getProfileContext(): ProfileContextV2 {
    return this.profileContext as unknown as ProfileContextV2;
  }
  
  getProfileContextV2(): ProfileContextV2 {
    return this.profileContext as unknown as ProfileContextV2;
  }

  getConversationContext(): ConversationContext {
    return this.conversationContext as unknown as ConversationContext;
  }

  getExternalSourceContext(): ExternalSourceContext {
    return this.externalSourceContext as unknown as ExternalSourceContext;
  }

  getWebsiteContext(): WebsiteContext {
    return this.websiteContext as unknown as WebsiteContext;
  }

  setExternalSourcesEnabled(enabled: boolean): void {
    this.externalSourcesEnabled = enabled;
  }

  getExternalSourcesEnabled(): boolean {
    return this.externalSourcesEnabled;
  }

  areContextsReady(): boolean {
    return true;
  }

  initializeContextLinks(): void {
    // Nothing to do in the mock
  }
  
  getRenderer(): unknown {
    return this.renderer;
  }
}
