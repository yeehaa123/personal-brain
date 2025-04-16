/**
 * Mock BrainProtocol for testing
 */

import type { BaseCommandHandler } from '@/commands/core/baseCommandHandler';
import type { ProtocolResponse } from '@/mcp/protocol/types';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import { MockWebsiteCommandHandler } from '@test/__mocks__/commands/websiteCommandHandler';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

/**
 * Options for configuring MockBrainProtocol behavior
 */
export interface MockBrainProtocolOptions {
  /**
   * Custom response for processQuery method
   */
  customQueryResponse?: Omit<ProtocolResponse, 'query'> & {
    answer: string;
    citations: Array<{ noteId: string; noteTitle: string; excerpt: string }>;
    relatedNotes: Note[];
    profile?: Profile;
    externalSources?: Array<{ title: string; source: string; url: string; excerpt: string }>;
  };
}

export class MockBrainProtocol {
  private static instance: MockBrainProtocol | null = null;
  private websiteContext: MockWebsiteContext;
  private profileContext: MockProfileContext;
  private websiteCommandHandler: MockWebsiteCommandHandler;
  private options: MockBrainProtocolOptions = {};

  constructor(options?: MockBrainProtocolOptions) {
    // Create mock contexts
    this.websiteContext = MockWebsiteContext.getInstance();
    this.profileContext = MockProfileContext.createFresh();
    this.websiteCommandHandler = MockWebsiteCommandHandler.getInstance();
    
    // Store options
    if (options) {
      this.options = { ...options };
    }
  }

  /**
   * Set custom options for this mock instance
   */
  setOptions(options: MockBrainProtocolOptions): void {
    this.options = { ...this.options, ...options };
  }

  static getInstance(options?: MockBrainProtocolOptions): MockBrainProtocol {
    if (!MockBrainProtocol.instance) {
      MockBrainProtocol.instance = new MockBrainProtocol(options);
    } else if (options) {
      MockBrainProtocol.instance.setOptions(options);
    }
    return MockBrainProtocol.instance;
  }

  static resetInstance(): void {
    MockBrainProtocol.instance = null;
  }

  static createFresh(options?: MockBrainProtocolOptions): MockBrainProtocol {
    return new MockBrainProtocol(options);
  }

  getWebsiteContext(): MockWebsiteContext {
    return this.websiteContext;
  }

  getProfileContext(): MockProfileContext {
    return this.profileContext;
  }

  getWebsiteCommandHandler(): MockWebsiteCommandHandler {
    return this.websiteCommandHandler;
  }

  registerHandlers(commandHandler: { registerHandler: (handler: BaseCommandHandler) => void }): void {
    // Register all mock command handlers with the provided CommandHandler
    commandHandler.registerHandler(this.websiteCommandHandler as unknown as BaseCommandHandler);
    // Add other command handlers as needed
  }

  /**
   * Mock implementation of BrainProtocol's processQuery
   * @param _query The query to process (unused in mock)
   * @returns Promise with protocol response
   */
  processQuery(_query: unknown): Promise<ProtocolResponse> {
    // If we have a custom response configured, use it
    if (this.options.customQueryResponse) {
      return Promise.resolve({
        ...this.options.customQueryResponse,
      });
    }
    
    // Otherwise use the default mock response
    return Promise.resolve({
      answer: 'Mock answer',
      citations: [],
      relatedNotes: [],
    });
  }
}