/**
 * Mock BrainProtocol for testing
 */

import type { BaseCommandHandler } from '@/commands/core/baseCommandHandler';
import { MockWebsiteCommandHandler } from '@test/__mocks__/commands/websiteCommandHandler';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';

export class MockBrainProtocol {
  private static instance: MockBrainProtocol | null = null;
  private websiteContext: MockWebsiteContext;
  private profileContext: MockProfileContext;
  private websiteCommandHandler: MockWebsiteCommandHandler;

  constructor() {
    // Create mock contexts
    this.websiteContext = MockWebsiteContext.getInstance();
    this.profileContext = MockProfileContext.createFresh();
    this.websiteCommandHandler = MockWebsiteCommandHandler.getInstance();
  }

  static getInstance(): MockBrainProtocol {
    if (!MockBrainProtocol.instance) {
      MockBrainProtocol.instance = new MockBrainProtocol();
    }
    return MockBrainProtocol.instance;
  }

  static resetInstance(): void {
    MockBrainProtocol.instance = null;
  }

  static createFresh(): MockBrainProtocol {
    return new MockBrainProtocol();
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

  processQuery(query: unknown) {
    return Promise.resolve({
      query, // Include the query in the response
      answer: 'Mock answer',
      citations: [],
      relatedNotes: [],
    });
  }
}