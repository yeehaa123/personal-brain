/**
 * Mock ContextManager for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type {
  MCPConversationContext,
  MCPExternalSourceContext,
  MCPNoteContext,
  MCPWebsiteContext,
} from '@/contexts';
import type { MCPProfileContext } from '@/contexts/profiles';
import type { IContextManager } from '@/protocol/types';

export class MockContextManager implements IContextManager {
  private static instance: MockContextManager | null = null;
  private externalSourcesEnabled = false;
  private noteContext: MCPNoteContext | null = null;
  private profileContext: MCPProfileContext | null = null;
  private conversationContext: MCPConversationContext | null = null;
  private externalSourceContext: MCPExternalSourceContext | null = null;
  private websiteContext: MCPWebsiteContext | null = null;
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

  getNoteContext(): MCPNoteContext {
    if (!this.noteContext) {
      // Create a mock MCP context
      this.noteContext = {} as MCPNoteContext;
    }
    return this.noteContext;
  }

  getProfileContext(): MCPProfileContext {
    if (!this.profileContext) {
      this.profileContext = {} as MCPProfileContext;
    }
    return this.profileContext;
  }

  getConversationContext(): MCPConversationContext {
    if (!this.conversationContext) {
      this.conversationContext = {} as MCPConversationContext;
    }
    return this.conversationContext;
  }

  getExternalSourceContext(): MCPExternalSourceContext {
    if (!this.externalSourceContext) {
      this.externalSourceContext = {} as MCPExternalSourceContext;
    }
    return this.externalSourceContext;
  }

  getWebsiteContext(): MCPWebsiteContext {
    if (!this.websiteContext) {
      this.websiteContext = {} as MCPWebsiteContext;
    }
    return this.websiteContext;
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