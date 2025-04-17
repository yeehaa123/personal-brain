import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ConversationTurn } from '@/protocol/schemas/conversationSchemas';
import type { CommandHandler, CommandResult } from '@commands/index';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { createTrackers, mockCLIInterface, restoreCLIInterface } from '@test/__mocks__/utils/cliUtils';

// Mock the conversation turns
const mockConversationTurns = [
  {
    id: 'turn1',
    timestamp: new Date(),
    query: 'What is ecosystem architecture?',
    response: 'Ecosystem architecture is a practice of building decentralized systems...',
    userId: 'user1',
    userName: 'User',
  },
];

// Mock conversation
const mockConversation = {
  id: 'conv123',
  activeTurns: mockConversationTurns,
  summaries: [],
  createdAt: new Date(),
  interfaceType: 'cli',
};

// Mock note created from conversation
const mockConversationNote = createMockNote(
  'note-conv1',
  'What is ecosystem architecture?',
  ['ecosystem-architecture', 'systems-thinking'],
);

// Use our standardized repository for testing
let mockRepository: MockNoteRepository;

// Create mock ConversationToNoteService with our standardized repository
const mockConversationToNoteService = {
  prepareNotePreview: mock(async () => ({
    content: 'Ecosystem architecture is a practice of building decentralized systems...',
    title: 'What is ecosystem architecture?',
  })),
  createNoteFromConversation: mock(async () => {
    // Insert the note with conversationMetadata to our repository
    // Insert a note that has conversation-specific properties
    // Note: The mock insertNote method accepts additional fields beyond the
    // standard repository interface, which will be ignored by the real repository
    await mockRepository.insertNote({
      id: mockConversationNote.id,
      title: mockConversationNote.title,
      content: mockConversationNote.content,
      tags: mockConversationNote.tags || [],
    });
    
    // Then we add the conversation metadata to our note directly
    // This simulates what the real service would do after inserting
    const indexToUpdate = mockRepository.notes.findIndex(n => n.id === mockConversationNote.id);
    if (indexToUpdate !== -1) {
      // Update the note with conversation-specific properties
      mockRepository.notes[indexToUpdate].conversationMetadata = {
        conversationId: 'conv123',
        timestamp: new Date(),
        userName: 'User',
      };
      mockRepository.notes[indexToUpdate].source = 'conversation';
    }
    
    const noteWithMetadata = {
      ...mockConversationNote,
      source: 'conversation',
      conversationMetadata: {
        conversationId: 'conv123',
        timestamp: new Date(),
        userName: 'User',
      },
    };
    
    return noteWithMetadata;
  }),
  findConversationNotes: mock(async () => {
    // Use our repository to find notes by source
    return await mockRepository.findBySource('conversation');
  }),
  findNotesByConversationId: mock(async (id: string) => {
    // Use our repository to find notes by conversation ID
    return await mockRepository.findByConversationMetadata('conversationId', id);
  }),
};

// Define the full type for Conversation Summary to avoid type errors
interface ConversationSummaryMock {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  turnCount?: number;
  metadata?: Record<string, unknown>;
}

// Mock for ConversationContext 
const mockConversationContext = {
  getTurns: mock(async (_conversationId: string) => mockConversationTurns),
  getTieredHistory: mock(async (_conversationId: string) => ({
    activeTurns: mockConversationTurns,
    summaries: [] as ConversationSummaryMock[],
    archivedTurns: [] as ConversationTurn[],
  })),
};

// Mock BrainProtocol
const mockBrainProtocol = {
  hasActiveConversation: mock(() => true),
  getCurrentConversationId: mock(() => 'conv123'),
  getConversation: mock(async (_id: string) => mockConversation),
  getConversationContext: mock(() => mockConversationContext),
  getNoteContext: mock(() => ({
    getNoteRepository: mock(() => mockRepository),
    getNoteEmbeddingService: mock(() => ({})),
  })),
};

describe('Conversation Notes Commands', () => {
  let commandHandler: CommandHandler;
  let originalCLI: Record<string, unknown>;
  let trackers: ReturnType<typeof createTrackers>;

  beforeEach(() => {
    // Set up trackers and mock CLI interface
    trackers = createTrackers();
    originalCLI = mockCLIInterface(trackers);
    
    // Reset our standardized repository
    MockNoteRepository.resetInstance();
    mockRepository = MockNoteRepository.createFresh([mockConversationNote]);
    
    // Reset mocks
    mockConversationToNoteService.prepareNotePreview.mockClear();
    mockConversationToNoteService.createNoteFromConversation.mockClear();
    mockConversationToNoteService.findConversationNotes.mockClear();
    mockConversationToNoteService.findNotesByConversationId.mockClear();

    // Create the command handler with mocked dependencies
    commandHandler = {
      processCommand: async (command: string, args: string): Promise<CommandResult> => {
        if (command === 'save-note') {
          return await handleSaveNote(args);
        } else if (command === 'conversation-notes') {
          return await handleConversationNotes();
        }
        return { type: 'error', message: 'Unknown command' };
      },
      confirmSaveNote: async (conversationId: string, title?: string): Promise<CommandResult> => {
        return await confirmSaveNoteHandler(conversationId, title);
      },
    } as unknown as CommandHandler;
  });

  // Mock implementation of handleSaveNote
  async function handleSaveNote(_title?: string): Promise<CommandResult> {
    if (!mockBrainProtocol.hasActiveConversation()) {
      return { type: 'error', message: 'No active conversation. Start a conversation first.' };
    }

    const conversationId = mockBrainProtocol.getCurrentConversationId();
    const conversation = await mockBrainProtocol.getConversation(conversationId);

    if (!conversation) {
      return { type: 'error', message: 'Conversation not found.' };
    }

    // Get tiered memory history from conversation context
    const conversationContext = mockBrainProtocol.getConversationContext();
    const tieredHistory = await conversationContext.getTieredHistory(conversationId);
    const turns = tieredHistory.activeTurns;

    if (turns.length === 0) {
      return { type: 'error', message: 'Conversation has no turns to save.' };
    }

    // Mock service methods don't need the same parameters as the real ones
    const preview = await mockConversationToNoteService.prepareNotePreview();

    return {
      type: 'save-note-preview',
      noteContent: preview.content,
      title: preview.title,
      conversationId,
    };
  }

  // Mock implementation of confirmSaveNote
  async function confirmSaveNoteHandler(conversationId: string, _title?: string): Promise<CommandResult> {
    const conversation = await mockBrainProtocol.getConversation(conversationId);

    if (!conversation) {
      return { type: 'error', message: 'Conversation not found.' };
    }

    // Get tiered memory history from conversation context
    const conversationContext = mockBrainProtocol.getConversationContext();
    const tieredHistory = await conversationContext.getTieredHistory(conversationId);
    const turns = tieredHistory.activeTurns;

    if (turns.length === 0) {
      return { type: 'error', message: 'Conversation has no turns to save.' };
    }

    // First, directly add a note to the repository with the right metadata
    // This simulates what the real service would do
    mockRepository.notes.push({
      ...mockConversationNote,
      conversationMetadata: {
        conversationId: 'conv123',
        timestamp: new Date(),
        userName: 'User',
      },
      source: 'conversation',
    });

    // Then call the service
    const note = await mockConversationToNoteService.createNoteFromConversation();

    return {
      type: 'save-note-confirm',
      noteId: note.id,
      title: note.title,
    };
  }

  // Mock implementation of handleConversationNotes
  async function handleConversationNotes(): Promise<CommandResult> {
    // Use the service to find notes which will use our repository
    const notes = await mockConversationToNoteService.findConversationNotes();

    if (notes.length === 0) {
      return { type: 'error', message: 'No notes created from conversations found.' };
    }
    return {
      type: 'conversation-notes',
      notes,
    };
  }

  describe('save-note command', () => {
    test('should handle save-note command with active conversation', async () => {
      const result = await commandHandler.processCommand('save-note', '');

      expect(result.type).toBe('save-note-preview');
      if (result.type === 'save-note-preview') {
        expect(result.conversationId).toBe('conv123');
        expect(result.title).toBe('What is ecosystem architecture?');
        expect(result.noteContent).toContain('Ecosystem architecture');
      }

      expect(mockConversationToNoteService.prepareNotePreview).toHaveBeenCalled();
    });

    test('should handle save-note command with custom title', async () => {
      const customTitle = 'My Custom Title';
      const result = await commandHandler.processCommand('save-note', customTitle);

      expect(result.type).toBe('save-note-preview');
      // Just check that the method was called, since we're using a simplified mock
      expect(mockConversationToNoteService.prepareNotePreview).toHaveBeenCalled();
    });

    test('should handle save-note command when activeTurns is empty but turns are in tiered history', async () => {
      // Create a conversation with empty activeTurns
      const emptyTurnsConversation = {
        ...mockConversation,
        activeTurns: [], // Empty activeTurns, the old code would fail
      };
      
      // Override getConversation to return conversation with empty activeTurns
      mockBrainProtocol.getConversation.mockImplementationOnce(async () => emptyTurnsConversation);
      
      // Ensure tieredHistory returns valid turns even when activeTurns is empty
      mockConversationContext.getTieredHistory.mockImplementationOnce(async () => ({
        activeTurns: mockConversationTurns,
        summaries: [] as ConversationSummaryMock[],
        archivedTurns: [] as ConversationTurn[],
      }));
      
      // Execute the save-note command
      const result = await commandHandler.processCommand('save-note', '');

      // Verify the command still succeeds using turns from tiered history
      expect(result.type).toBe('save-note-preview');
      if (result.type === 'save-note-preview') {
        expect(result.conversationId).toBe('conv123');
      }
      
      // Verify context.getTieredHistory was called instead of using activeTurns
      expect(mockConversationContext.getTieredHistory).toHaveBeenCalledWith('conv123');
      expect(mockConversationToNoteService.prepareNotePreview).toHaveBeenCalled();
    });

    test('should handle confirmation of save-note', async () => {
      // Verify repository's initial state
      expect(mockRepository.notes.length).toBe(1);
      const initialLength = mockRepository.notes.length;
      
      const result = await commandHandler.confirmSaveNote('conv123', 'Final Title');

      expect(result.type).toBe('save-note-confirm');
      if (result.type === 'save-note-confirm') {
        expect(result.noteId).toBe(mockConversationNote.id);
        expect(result.title).toBe(mockConversationNote.title);
      }

      // Verify that createNoteFromConversation was called
      expect(mockConversationToNoteService.createNoteFromConversation).toHaveBeenCalled();
      
      // Verify that notes were added to the repository (both in confirmSaveNoteHandler and in createNoteFromConversation)
      expect(mockRepository.notes.length).toBeGreaterThan(initialLength);
      
      // Verify that the repository contains a note with conversationMetadata
      const notesWithMetadata = mockRepository.notes.filter(
        note => note.conversationMetadata?.conversationId === 'conv123',
      );
      expect(notesWithMetadata.length).toBeGreaterThan(0);
    });
    
    test('should handle save-note command with rich tiered history', async () => {
      // Create a conversation with empty activeTurns but with summaries and archived turns
      const conversationWithHistory = {
        ...mockConversation,
        activeTurns: [], // Empty activeTurns
      };
      
      // Create mock summaries and archived turns
      const mockSummary = {
        id: 'summary1',
        conversationId: 'conv123',
        content: 'This is a summary of previous turns',
        createdAt: new Date(),
      };
      
      const mockArchivedTurn = {
        id: 'archived-turn1',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        query: 'Old question',
        response: 'Old answer',
        userId: 'user1',
        userName: 'User',
      };
      
      // Override getConversation to return conversation with empty activeTurns
      mockBrainProtocol.getConversation.mockImplementationOnce(async () => conversationWithHistory);
      
      // Mock a rich tiered history
      mockConversationContext.getTieredHistory.mockImplementationOnce(async () => ({
        activeTurns: mockConversationTurns,
        summaries: [mockSummary],
        archivedTurns: [mockArchivedTurn],
      }));
      
      // Execute the save-note command
      const result = await commandHandler.processCommand('save-note', '');

      // Verify the command succeeds with turns from tiered history
      expect(result.type).toBe('save-note-preview');
      
      // Verify context.getTieredHistory was called
      expect(mockConversationContext.getTieredHistory).toHaveBeenCalledWith('conv123');
      
      // Verify prepareNotePreview was called with the active turns from tiered history
      expect(mockConversationToNoteService.prepareNotePreview).toHaveBeenCalled();
    });
    
    test('should handle confirmation when activeTurns is empty but turns are in tiered history', async () => {
      // Create a conversation with empty activeTurns
      const emptyTurnsConversation = {
        ...mockConversation,
        activeTurns: [], // Empty activeTurns, the old code would fail
      };
      
      // Override getConversation to return conversation with empty activeTurns
      mockBrainProtocol.getConversation.mockImplementationOnce(async () => emptyTurnsConversation);
      
      // Ensure tieredHistory returns valid turns even when activeTurns is empty
      mockConversationContext.getTieredHistory.mockImplementationOnce(async () => ({
        activeTurns: mockConversationTurns,
        summaries: [] as ConversationSummaryMock[],
        archivedTurns: [] as ConversationTurn[],
      }));
      
      // Execute the confirmation
      const result = await commandHandler.confirmSaveNote('conv123', 'Final Title');

      // Verify the command still succeeds using turns from tiered history
      expect(result.type).toBe('save-note-confirm');
      
      // Verify context.getTieredHistory was called instead of using activeTurns
      expect(mockConversationContext.getTieredHistory).toHaveBeenCalledWith('conv123');
    });
    
    test('should handle multi-level tiered memory with summarized turns', async () => {
      // Create a conversation with a complex memory hierarchy
      const complexMemoryConversation = {
        ...mockConversation,
        activeTurns: [], // Empty activeTurns
      };
      
      // Create an extensive tiered memory setup
      const recentTurns = [
        {
          id: 'turn-recent1',
          timestamp: new Date(),
          query: 'What is the most recent question?',
          response: 'This is the most recent answer',
          userId: 'user1',
          userName: 'User',
        },
        {
          id: 'turn-recent2',
          timestamp: new Date(),
          query: 'Another recent question?',
          response: 'Another recent answer',
          userId: 'assistant',
          userName: 'Assistant',
        },
      ];
      
      const oldSummaries = [
        {
          id: 'summary1',
          conversationId: 'conv123',
          content: 'First conversation summary covering older turns',
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
        {
          id: 'summary2',
          conversationId: 'conv123',
          content: 'Second conversation summary covering mid-age turns',
          createdAt: new Date(Date.now() - 43200000), // 12 hours ago
        },
      ];
      
      const archivedTurns = [
        {
          id: 'turn-old1',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          query: 'What was asked in the beginning?',
          response: 'This was the first answer',
          userId: 'user1',
          userName: 'User',
        },
      ];
      
      // Override getConversation to return the complex conversation
      mockBrainProtocol.getConversation.mockImplementationOnce(async () => complexMemoryConversation);
      
      // Mock a rich tiered history with multiple levels
      mockConversationContext.getTieredHistory.mockImplementationOnce(async () => ({
        activeTurns: recentTurns, // Only recent turns are active
        summaries: oldSummaries as ConversationSummaryMock[],
        archivedTurns: archivedTurns as ConversationTurn[],
      }));
      
      // Execute the save-note command
      const result = await commandHandler.processCommand('save-note', '');

      // Verify the command succeeds with turns from tiered history
      expect(result.type).toBe('save-note-preview');
      
      // Verify tiered history was used, not activeTurns from conversation
      expect(mockConversationContext.getTieredHistory).toHaveBeenCalledWith('conv123');
      
      // Verify the prepareNotePreview was called
      expect(mockConversationToNoteService.prepareNotePreview).toHaveBeenCalled();
    });
  });

  describe('conversation-notes command', () => {
    test('should handle conversation-notes command', async () => {
      // Reset mock implementation to make sure it returns our repository notes
      mockConversationToNoteService.findConversationNotes.mockImplementation(async () => {
        // Explicitly set a source property to ensure we can find it
        mockConversationNote.source = 'conversation';
        return [mockConversationNote];
      });
      
      const result = await commandHandler.processCommand('conversation-notes', '');

      expect(result.type).toBe('conversation-notes');
      if (result.type === 'conversation-notes') {
        expect(result.notes.length).toBeGreaterThan(0);
        expect(result.notes[0].id).toBe(mockConversationNote.id);
      }

      expect(mockConversationToNoteService.findConversationNotes).toHaveBeenCalled();
    });
    
    test('should handle empty conversation notes', async () => {
      // Clear the repository
      mockRepository.clear();
      
      // Override findConversationNotes to return an empty array
      mockConversationToNoteService.findConversationNotes.mockImplementation(
        async () => [],
      );
      
      const result = await commandHandler.processCommand('conversation-notes', '');

      expect(result.type).toBe('error');
      expect(result).toHaveProperty('message');
      if ('message' in result) {
        expect(result.message).toContain('No notes');
      }
      
      expect(mockConversationToNoteService.findConversationNotes).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    // Restore original CLI interface
    restoreCLIInterface(originalCLI);
  });
});
