/**
 * Test suite for QueryProcessor
 * 
 * Tests the query processing pipeline with mocked dependencies.
 */
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { z } from 'zod';

import { QueryProcessor } from '@/protocol/pipeline/queryProcessor';
import type { IContextManager } from '@/protocol/types';
import { ResourceRegistry } from '@/resources';
import { MockConversationContext } from '@test/__mocks__/contexts/conversationContext';
import { MockNoteContext } from '@test/__mocks__/contexts/noteContext';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { createMockNote } from '@test/__mocks__/models/note';
import { createMockProfile } from '@test/__mocks__/models/profile';
import { MockContextManager } from '@test/__mocks__/protocol/managers/contextManager';
import { MockConversationManager } from '@test/__mocks__/protocol/managers/conversationManager';
import { ClaudeModel } from '@test/__mocks__/resources/ai/claude/claude';
import { MockResourceRegistry } from '@test/__mocks__/resources/resourceRegistry';

// Sample data
const sampleNote = createMockNote('note-1', 'Ecosystem Architecture', ['ecosystem', 'architecture']);
sampleNote.content = 'Ecosystem architecture is an approach that designs systems as interconnected components.';

const sampleRelatedNote = createMockNote('note-2', 'Component Design', ['component', 'design']);
sampleRelatedNote.content = 'Component design is important for ecosystem architecture.';

const sampleProfile = createMockProfile('profile-1');


describe('QueryProcessor', () => {
  // Setup for mocking services
  beforeEach(() => {
    // Reset mocks between tests
    MockContextManager.resetInstance();
    MockConversationManager.resetInstance();
    MockResourceRegistry.resetInstance();
    ResourceRegistry.resetInstance();
    ClaudeModel.resetInstance();

    // Reset mock note context
    MockNoteContext.resetInstance();
    const noteContext = MockNoteContext.getInstance();

    // Setup mock note context to return sample notes
    spyOn(noteContext, 'searchNotes').mockResolvedValue([sampleNote]);
    spyOn(noteContext, 'getRelatedNotes').mockResolvedValue([sampleRelatedNote]);

    // Setup mock profile context
    MockProfileContext.resetInstance();
    const profileContext = MockProfileContext.getInstance();
    spyOn(profileContext, 'getProfile').mockResolvedValue(sampleProfile);

    // Setup mock conversation context
    MockConversationContext.resetInstance();

    // Create a real ResourceRegistry instance that we can spy on
    const resourceRegistry = ResourceRegistry.createFresh();
    
    // Create a standardized mock Claude model
    const mockClaudeModel = ClaudeModel.createFresh();
    
    // Mock the ResourceRegistry.getInstance to return our real instance
    spyOn(ResourceRegistry, 'getInstance').mockReturnValue(resourceRegistry);
    
    // Mock the getClaudeModel method to return our mock model
    spyOn(resourceRegistry, 'getClaudeModel').mockReturnValue(mockClaudeModel as unknown as ReturnType<typeof resourceRegistry.getClaudeModel>);
  });

  // Test basic query processing
  test('should process a basic query successfully', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh();

    // Set up spies
    const historyGetSpy = spyOn(conversationManager, 'getConversationHistory');
    const turnSaveSpy = spyOn(conversationManager, 'saveTurn');

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Act
    const result = await processor.processQuery('What is ecosystem architecture?');

    // Assert
    expect(result).toBeDefined();
    expect(historyGetSpy).toHaveBeenCalled();
    expect(turnSaveSpy).toHaveBeenCalled();
  });

  // Test room-based conversation
  test('should set the current room when roomId is provided', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh({
      hasActiveConversation: false,
    });

    // Set up spies
    const roomSetSpy = spyOn(conversationManager, 'setCurrentRoom');
    const initSpy = spyOn(conversationManager, 'initializeConversation');

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Act
    await processor.processQuery('What is ecosystem architecture?', {
      roomId: 'room-123',
      userId: 'user-123',
      userName: 'Test User',
    });

    // Assert
    expect(roomSetSpy).toHaveBeenCalledWith('room-123');
    expect(initSpy).toHaveBeenCalled();
  });

  // Test empty query handling
  test('should handle empty queries with a default question', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh();

    // Set up spy to capture the actual query used
    let capturedQuery = '';
    spyOn(contextManager.getNoteContext(), 'searchNotes').mockImplementation(
      async (options: unknown) => {
        if (options && typeof options === 'object' && 'query' in options) {
          capturedQuery = options.query as string;
        }
        return [sampleNote];
      },
    );

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Act
    await processor.processQuery('');

    // Assert
    expect(capturedQuery).toBe('What information do you have in this brain?');
  });

  // Test schema-based query processing
  test('should process a query with schema and return structured data', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh();

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Define a test schema for user data
    const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      preferences: z.object({
        theme: z.string(),
        notifications: z.boolean(),
      }),
    });

    type UserData = z.infer<typeof UserSchema>;

    // Act
    const result = await processor.processQuery<UserData>(
      'Get user data for this profile',
      {
        userId: 'user-123',
        userName: 'Test User',
        schema: UserSchema,
      },
    );

    // Assert
    expect(result).toBeDefined();
    expect(result.object).toBeDefined();
    expect(result.object?.name).toBe('John Doe');
    expect(result.object?.email).toBe('john@example.com');
    expect(result.object?.preferences.theme).toBe('dark');
    expect(result.object?.preferences.notifications).toBe(true);
  });

  // Test landing page schema integration
  test('should process a landing page generation request with schema', async () => {
    // Arrange
    const contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    const conversationManager = MockConversationManager.createFresh();

    const processor = QueryProcessor.createFresh({
      contextManager,
      conversationManager,
      apiKey: 'mock-api-key',
    });

    // Define a simplified version of the landing page schema for testing
    const LandingPageSchema = z.object({
      title: z.string(),
      description: z.string(),
      name: z.string(),
      tagline: z.string(),
      hero: z.object({
        headline: z.string(),
        subheading: z.string(),
        ctaText: z.string(),
        ctaLink: z.string(),
      }),
      services: z.object({
        title: z.string(),
        items: z.array(z.object({
          title: z.string(),
          description: z.string(),
        })),
      }),
      sectionOrder: z.array(z.string()),
    });

    type LandingPageData = z.infer<typeof LandingPageSchema>;

    // Act
    const result = await processor.processQuery<LandingPageData>(
      'Create a professional landing page for my profile, include sections on services',
      {
        userId: 'user-123',
        userName: 'Test User',
        schema: LandingPageSchema,
      },
    );

    // Assert
    expect(result).toBeDefined();
    expect(result.object).toBeDefined();
    expect(result.object?.title).toBe('Professional Services');
    expect(result.object?.name).toBe('Test Professional');
    expect(result.object?.hero.headline).toBe('Transform Your Business');
    expect(result.object?.services.items.length).toBe(2);
    expect(result.object?.services.items[0].title).toBe('Consulting');
    expect(result.object?.sectionOrder).toContain('hero');
    expect(result.object?.sectionOrder).toContain('services');
  });
});
