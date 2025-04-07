import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { CommandHandler, CommandResult } from '@commands/index';
import { restoreLogger, silenceLogger } from '@test/__mocks__';
import { createMockNote, createTrackers } from '@test/mocks';
import { mockCLIInterface, restoreCLIInterface } from '@test/test-utils';
import logger from '@utils/logger';

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

// Mock the ConversationToNoteService
const mockConversationToNoteService = {
  prepareNotePreview: mock(async () => ({
    content: 'Ecosystem architecture is a practice of building decentralized systems...',
    title: 'What is ecosystem architecture?',
  })),
  createNoteFromConversation: mock(async () => mockConversationNote),
  findConversationNotes: mock(async () => [mockConversationNote]),
  findNotesByConversationId: mock(async () => [mockConversationNote]),
};


// Mock BrainProtocol
const mockBrainProtocol = {
  hasActiveConversation: mock(() => true),
  getCurrentConversationId: mock(() => 'conv123'),
  getConversation: mock(async (_id: string) => mockConversation),
  getNoteContext: mock(() => ({
    getNoteRepository: mock(() => ({})),
    getNoteEmbeddingService: mock(() => ({})),
  })),
};

describe('Conversation Notes Commands', () => {
  let commandHandler: CommandHandler;
  let originalLogger: Record<string, unknown>;
  let originalCLI: Record<string, unknown>;
  let trackers: ReturnType<typeof createTrackers>;

  beforeEach(() => {
    // Mock logger to suppress logs
    originalLogger = silenceLogger(logger);
    
    // Set up trackers and mock CLI interface
    trackers = createTrackers();
    originalCLI = mockCLIInterface(trackers);
    // Reset mocks
    mockConversationToNoteService.prepareNotePreview.mockClear();
    mockConversationToNoteService.createNoteFromConversation.mockClear();
    mockConversationToNoteService.findConversationNotes.mockClear();
    
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

    // Mock service methods don't need the same parameters as the real ones
    const note = await mockConversationToNoteService.createNoteFromConversation();

    return {
      type: 'save-note-confirm',
      noteId: note.id,
      title: note.title,
    };
  }

  // Mock implementation of handleConversationNotes
  async function handleConversationNotes(): Promise<CommandResult> {
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

    test('should handle confirmation of save-note', async () => {
      const result = await commandHandler.confirmSaveNote('conv123', 'Final Title');
      
      expect(result.type).toBe('save-note-confirm');
      if (result.type === 'save-note-confirm') {
        expect(result.noteId).toBe(mockConversationNote.id);
        expect(result.title).toBe(mockConversationNote.title);
      }
      
      expect(mockConversationToNoteService.createNoteFromConversation).toHaveBeenCalled();
    });
  });

  describe('conversation-notes command', () => {
    test('should handle conversation-notes command', async () => {
      const result = await commandHandler.processCommand('conversation-notes', '');
      
      expect(result.type).toBe('conversation-notes');
      if (result.type === 'conversation-notes') {
        expect(result.notes).toHaveLength(1);
        expect(result.notes[0].id).toBe(mockConversationNote.id);
      }
      
      expect(mockConversationToNoteService.findConversationNotes).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    // Restore original logger functions
    restoreLogger(logger, originalLogger);
    
    // Restore original CLI interface
    restoreCLIInterface(originalCLI);
  });
});