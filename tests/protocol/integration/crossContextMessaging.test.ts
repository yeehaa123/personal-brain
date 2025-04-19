/**
 * Integration tests for cross-context messaging
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { ConversationContext } from '@/contexts/conversations';
import type { ExternalSourceContext } from '@/contexts/externalSources';
import type { NoteContext } from '@/contexts/notes';
import type { ProfileContext } from '@/contexts/profiles';
import type { WebsiteContext } from '@/contexts/website';
import { BrainProtocolIntegrated } from '@/protocol/core/brainProtocolIntegrated';
import type { BrainProtocolIntegratedDependencies } from '@/protocol/core/brainProtocolIntegrated';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';
import { MockExternalSourceContext } from '@test/__mocks__/contexts/externalSourceContext';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteContext } from '@test/__mocks__/contexts/websiteContext';
import { MockContextOrchestrator } from '@test/__mocks__/protocol/core/contextOrchestrator';
import { MockContextIntegrator } from '@test/__mocks__/protocol/messaging/contextIntegrator';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';

describe('Cross-Context Messaging Integration', () => {
  // Mock dependencies for cross-context messaging tests
  const createMockDependencies = () => {
    // Reset and recreate all required standard mocks
    MockNoteContext.resetInstance();
    MockProfileContext.resetInstance();
    MockConversationContext.resetInstance();
    MockExternalSourceContext.resetInstance();
    MockWebsiteContext.resetInstance();
    MockContextOrchestrator.resetInstance();
    MockContextMediator.resetInstance();
    MockContextIntegrator.resetInstance();
    
    // Create instances using standardized mocks with proper type assertions
    const noteContext = MockNoteContext.getInstance() as unknown as NoteContext;
    const profileContext = MockProfileContext.getInstance() as unknown as ProfileContext;
    const conversationContext = MockConversationContext.getInstance() as unknown as ConversationContext;
    const externalSourceContext = MockExternalSourceContext.getInstance() as unknown as ExternalSourceContext;
    const websiteContext = MockWebsiteContext.getInstance() as unknown as WebsiteContext;
    const contextMediator = MockContextMediator.getInstance() as unknown as ContextMediator;
    
    // Get mock storage to set initial response values
    const noteStorage = noteContext.getStorage();
    (noteStorage.create as unknown as { mockImplementation: (fn: () => Promise<string>) => void })
      .mockImplementation(() => Promise.resolve('note-123'));
    
    // Configure and return all required mocks
    return {
      ConfigManager: {
        getInstance: () => ({
          getUseExternalSources: () => true,
          getInterfaceType: () => 'cli',
          getApiKey: () => 'mock-api-key',
        }),
      },
      ContextOrchestrator: {
        getInstance: () => MockContextOrchestrator.getInstance({
          noteContext,
          profileContext,
          conversationContext,
          externalSourceContext,
          websiteContext,
          mediator: contextMediator,
          config: { useExternalSources: true },
        }) as unknown as typeof MockContextOrchestrator,
      },
      ContextMediator: {
        getInstance: () => contextMediator,
      },
      ContextIntegrator: {
        getInstance: () => MockContextIntegrator.getInstance({
          noteContext,
          profileContext,
          conversationContext,
          externalSourceContext,
          websiteContext,
          mediator: contextMediator,
        }) as unknown as typeof MockContextIntegrator,
      },
      McpServerManager: {
        getInstance: () => ({
          getMcpServer: () => ({}),
        }),
      },
      ConversationManager: {
        getInstance: () => ({
          initializeConversation: async () => { },
          getCurrentConversationId: () => 'conversation-1',
          hasActiveConversation: () => true,
        }),
      },
      StatusManager: {
        getInstance: () => ({
          isReady: () => true,
        }),
      },
      FeatureCoordinator: {
        getInstance: () => ({}),
      },
      QueryProcessor: {
        getInstance: () => ({
          processQuery: async () => ({
            answer: 'Test answer',
            citations: [],
            relatedNotes: [],
          }),
        }),
      },
    };
  };

  let brainProtocol: BrainProtocolIntegrated;

  // Set up a fresh instance before each test
  beforeEach(() => {
    BrainProtocolIntegrated.resetInstance();
    brainProtocol = BrainProtocolIntegrated.createFresh({}, createMockDependencies() as unknown as BrainProtocolIntegratedDependencies);
  });

  // Reset after each test
  afterEach(() => {
    BrainProtocolIntegrated.resetInstance();
    MockNoteContext.resetInstance();
    MockProfileContext.resetInstance();
    MockConversationContext.resetInstance();
    MockExternalSourceContext.resetInstance();
    MockWebsiteContext.resetInstance();
    MockContextOrchestrator.resetInstance();
    MockContextMediator.resetInstance();
    MockContextIntegrator.resetInstance();
  });

  test('should initialize with messaging components', () => {
    // Verify that messaging components are properly initialized
    expect(brainProtocol.getContextMediator()).toBeDefined();
    expect(brainProtocol.getContextIntegrator()).toBeDefined();
  });

  test('should provide access to messaging-enabled contexts', () => {
    // Verify that messaging-enabled contexts are accessible
    const noteContext = brainProtocol.getMessagingNoteContext();
    const profileContext = brainProtocol.getMessagingProfileContext();

    expect(noteContext).toBeDefined();
    expect(profileContext).toBeDefined();
  });

  test('should be able to create a note through messaging context', async () => {
    // Get the messaging-enabled note context
    const noteContext = brainProtocol.getMessagingNoteContext();

    // Create a new note
    const noteId = await noteContext.createNote({
      title: 'New Test Note',
      content: 'This is a test note created through messaging',
      tags: ['test', 'messaging'],
    });

    expect(noteId).toBe('note-123');
  });

  test('should be able to update a profile through messaging context', async () => {
    // Get the messaging-enabled profile context
    const profileContext = brainProtocol.getMessagingProfileContext();

    // Update the profile with a property that exists in the Profile type
    await profileContext.updateProfile({
      summary: 'Updated profile summary',
    });

    // For this test, we just verify the operation completes without errors
    expect(await profileContext.getProfile()).toBeNull();
  });
});
