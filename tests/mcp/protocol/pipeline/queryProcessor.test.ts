/**
 * Test suite for QueryProcessor
 * 
 * Tests the query processing pipeline with mocked dependencies.
 */
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { ExternalSourceContext, NoteContext, ProfileContext } from '@/mcp';
import type { ConversationContext } from '@/mcp/contexts/conversations';
import type { ExternalSourceResult } from '@/mcp/contexts/externalSources/sources';
import { ClaudeModel } from '@/mcp/model';
import type { ModelResponse } from '@/mcp/model/claude';
import { NoteService } from '@/mcp/protocol/components/noteService';
import { QueryProcessor } from '@/mcp/protocol/pipeline/queryProcessor';
import type {
  IContextManager,
  IConversationManager,
  IExternalSourceManager,
  IProfileManager,
  ProfileAnalysisResult,
} from '@/mcp/protocol/types/index';
import type { Note } from '@/models/note';
import logger from '@/utils/logger';

import { createMockNote, createMockProfile } from '../../../mocks';
import { mockLogger, restoreLogger } from '../../../utils/loggerUtils';

// Import types

// Sample data for tests
const sampleNote = createMockNote('note-1', 'Ecosystem Architecture', ['ecosystem', 'architecture']);
// Override content for specific test needs
sampleNote.content = 'Ecosystem architecture is an approach that designs systems as interconnected components.';
sampleNote.source = 'user-created';
sampleNote.verified = true;

const sampleRelatedNote = createMockNote('note-2', 'Component Design', ['component', 'design']);
// Override content for specific test needs
sampleRelatedNote.content = 'Component design is important for ecosystem architecture.';
sampleRelatedNote.source = 'user-created';
sampleRelatedNote.verified = true;

// Use the mock profile creator
const sampleProfile = createMockProfile('profile-1');

const sampleExternalResult: ExternalSourceResult = {
  title: 'Ecosystem Architecture Principles',
  source: 'Wikipedia',
  sourceType: 'wikipedia',
  url: 'https://example.com/wiki/ecosystem_architecture',
  content: 'Ecosystem architecture focuses on building systems that work together...',
  confidence: 0.85,
  timestamp: new Date(),
};

// Mock minimal context for testing
class MockNoteContext {
  async getNoteById() { return null; }
  async searchNotes() { return []; }
  async getRelatedNotes() { return []; }
  async createNote() { return 'note-id'; }
  async getNoteCount() { return 0; }
}

describe('QueryProcessor', () => {
  // Setup for mocking services
  beforeEach(() => {
    // Mock NoteService methods
    spyOn(NoteService.prototype, 'fetchRelevantContext').mockImplementation(
      async (query: string): Promise<Note[]> => {
        if (query.includes('ecosystem')) {
          return [sampleNote];
        }
        return [];
      },
    );
    
    spyOn(NoteService.prototype, 'getRelatedNotes').mockImplementation(
      async (): Promise<Note[]> => {
        return [sampleRelatedNote];
      },
    );
    
    // Mock the ClaudeModel complete method with correct signature
    spyOn(ClaudeModel.prototype, 'complete').mockImplementation(
      async (_systemPrompt: string, userPrompt: string, _maxTokens?: number): Promise<ModelResponse> => {
        if (userPrompt.includes('ecosystem')) {
          return { 
            response: 'Ecosystem architecture involves designing interconnected components that work together.',
            usage: { inputTokens: 100, outputTokens: 20 },
          };
        }
        
        if (userPrompt.includes('profile')) {
          return { 
            response: 'Your profile shows expertise in software development and architecture.',
            usage: { inputTokens: 150, outputTokens: 25 },
          };
        }
        
        return { 
          response: 'I don\'t have specific information about that in my knowledge base.',
          usage: { inputTokens: 50, outputTokens: 15 },
        };
      },
    );
  });
  
  // Create mock instances that will be used across tests
  
  // Mock Context Manager
  const createMockContextManager = (): IContextManager => {
    return {
      getNoteContext: () => new MockNoteContext() as unknown as NoteContext,
      getProfileContext: () => ({} as unknown as ProfileContext),
      getExternalSourceContext: () => ({} as unknown as ExternalSourceContext),
      getConversationContext: () => ({} as unknown as ConversationContext),
      setExternalSourcesEnabled: () => {},
      getExternalSourcesEnabled: () => true,
      areContextsReady: () => true,
      initializeContextLinks: () => {},
    };
  };
  
  // Mock Conversation Manager
  const createMockConversationManager = (): IConversationManager => {
    let hasActive = true;
    
    return {
      getConversationContext: () => ({} as unknown as ConversationContext),
      setCurrentRoom: async () => {},
      initializeConversation: async () => { hasActive = true; },
      hasActiveConversation: () => hasActive,
      getCurrentConversationId: () => 'conv-123',
      getConversation: async () => null,
      saveTurn: async () => {},
      getConversationHistory: async () => 'User: What is ecosystem architecture?\nAssistant: It\'s a design approach.',
    };
  };
  
  // Mock Profile Manager
  const createMockProfileManager = (): IProfileManager => {
    return {
      getProfile: async () => sampleProfile,
      getProfileText: async () => 'John Doe - Software Engineer',
      analyzeProfileRelevance: async (query: string): Promise<ProfileAnalysisResult> => {
        if (query.toLowerCase().includes('profile') || query.toLowerCase().includes('about me')) {
          return { isProfileQuery: true, relevance: 0.9 };
        }
        if (query.toLowerCase().includes('software') || query.toLowerCase().includes('engineer')) {
          return { isProfileQuery: false, relevance: 0.7 };
        }
        return { isProfileQuery: false, relevance: 0.1 };
      },
    };
  };
  
  // Mock External Source Manager
  const createMockExternalSourceManager = (): IExternalSourceManager => {
    return {
      isEnabled: () => true,
      setEnabled: () => {},
      getExternalResults: async (query: string): Promise<ExternalSourceResult[] | null> => {
        if (query.includes('ecosystem')) {
          return [sampleExternalResult];
        }
        return null;
      },
    };
  };
  
  // Test basic query processing
  test('should process a basic query successfully', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    // Set up spies
    const profileAnalyzeSpy = spyOn(profileManager, 'analyzeProfileRelevance');
    const historyGetSpy = spyOn(conversationManager, 'getConversationHistory');
    const externalGetSpy = spyOn(externalSourceManager, 'getExternalResults');
    const turnSaveSpy = spyOn(conversationManager, 'saveTurn');
    
    const processor = new QueryProcessor(
      contextManager,
      conversationManager,
      profileManager,
      externalSourceManager,
      'mock-api-key',
    );
    
    // Act
    const result = await processor.processQuery('What is ecosystem architecture?');
    
    // Assert
    expect(result).toBeDefined();
    expect(result.answer).toContain('Ecosystem architecture');
    expect(result.citations).toBeDefined();
    expect(result.relatedNotes).toBeDefined();
    expect(result.relatedNotes.length).toBeGreaterThan(0);
    
    // Verify method calls via spies
    expect(profileAnalyzeSpy).toHaveBeenCalledWith('What is ecosystem architecture?');
    expect(historyGetSpy).toHaveBeenCalled();
    expect(externalGetSpy).toHaveBeenCalled();
    expect(turnSaveSpy).toHaveBeenCalledTimes(2); // Once for user, once for assistant
  });
  
  // Test profile-specific query
  test('should include profile information for profile queries', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    // Set up spies
    const profileGetSpy = spyOn(profileManager, 'getProfile');
    
    const processor = new QueryProcessor(
      contextManager,
      conversationManager,
      profileManager,
      externalSourceManager,
      'mock-api-key',
    );
    
    // Act
    const result = await processor.processQuery('Tell me about my profile');
    
    // Assert
    expect(result).toBeDefined();
    expect(result.profile).toBeDefined();
    expect(result.profile?.fullName).toBe('John Doe');
    
    // Verify method calls
    expect(profileGetSpy).toHaveBeenCalled();
  });
  
  // Test room-based conversation
  test('should set the current room when roomId is provided', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    // Set up spies
    const roomSetSpy = spyOn(conversationManager, 'setCurrentRoom');
    const initSpy = spyOn(conversationManager, 'initializeConversation');
    
    // Override for this test
    spyOn(conversationManager, 'hasActiveConversation').mockImplementation(() => false);
    
    const processor = new QueryProcessor(
      contextManager,
      conversationManager,
      profileManager,
      externalSourceManager,
      'mock-api-key',
    );
    
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
  
  // Test external source handling
  test('should include external sources when relevant', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    const processor = new QueryProcessor(
      contextManager,
      conversationManager,
      profileManager,
      externalSourceManager,
      'mock-api-key',
    );
    
    // Act
    const result = await processor.processQuery('What is ecosystem architecture in external sources?');
    
    // Assert
    expect(result).toBeDefined();
    expect(result.externalSources).toBeDefined();
    expect(result.externalSources?.length).toBeGreaterThan(0);
    expect(result.externalSources?.[0].source).toBe('Wikipedia');
  });
  
  // Test empty query handling
  test('should handle empty queries with a default question', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    // Set up spy to capture the actual query used
    let capturedQuery = '';
    const analyzeProfileRelevanceOriginal = profileManager.analyzeProfileRelevance;
    profileManager.analyzeProfileRelevance = async (query: string) => {
      capturedQuery = query; // Capture the query
      return analyzeProfileRelevanceOriginal(query);
    };
    
    // Temporarily mock the logger to suppress warning about empty query
    const originalLogger = mockLogger(logger);
    
    try {
      const processor = new QueryProcessor(
        contextManager,
        conversationManager,
        profileManager,
        externalSourceManager,
        'mock-api-key',
      );
      
      // Act
      const result = await processor.processQuery('');
      
      // Assert
      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
      
      // Verify it used a default question
      expect(capturedQuery).toBe('What information do you have in this brain?');
    } finally {
      // Restore original logger
      restoreLogger(logger, originalLogger);
    }
  });
  
  // Test error handling during turn saving
  test('should continue processing even if saving turns fails', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    // Mock a failure when saving turns
    spyOn(conversationManager, 'saveTurn').mockImplementation(async () => {
      throw new Error('Failed to save turn');
    });
    
    // Temporarily mock the logger to avoid warning noise in test output
    const originalLogger = mockLogger(logger);
    
    try {
      const processor = new QueryProcessor(
        contextManager,
        conversationManager,
        profileManager,
        externalSourceManager,
        'mock-api-key',
      );
      
      // Act - Should not throw despite the saveTurn error
      const result = await processor.processQuery('What is ecosystem architecture?');
      
      // Assert - Should still return a result
      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
    } finally {
      // Restore original logger
      restoreLogger(logger, originalLogger);
    }
  });
  
  // Test handling inactive conversations
  test('should initialize a conversation if none is active', async () => {
    // Arrange
    const contextManager = createMockContextManager();
    const conversationManager = createMockConversationManager();
    const profileManager = createMockProfileManager();
    const externalSourceManager = createMockExternalSourceManager();
    
    // Mock no active conversation
    spyOn(conversationManager, 'hasActiveConversation').mockImplementation(() => false);
    
    // Set up spy
    const initSpy = spyOn(conversationManager, 'initializeConversation');
    
    const processor = new QueryProcessor(
      contextManager,
      conversationManager,
      profileManager,
      externalSourceManager,
      'mock-api-key',
    );
    
    // Act
    await processor.processQuery('What is ecosystem architecture?');
    
    // Assert
    expect(initSpy).toHaveBeenCalled();
  });
});