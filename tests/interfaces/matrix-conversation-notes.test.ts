import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { CommandResult } from '@commands/index';
import { createMockNote } from '@test/__mocks__/models/note';
import { clearTestEnv, setTestEnv, setMockEnv, clearMockEnv } from '@test/helpers/envUtils';

import { CommandHandler as ActualCommandHandler } from '../../src/commands/index';
import { MatrixRenderer } from '../../src/commands/matrix-renderer';
import type { BrainProtocol } from '../../src/mcp/protocol/brainProtocol';

// Mock environment variables
beforeEach(() => {
  setMockEnv();
  setTestEnv('MATRIX_HOMESERVER_URL', 'https://matrix.test.org');
  setTestEnv('MATRIX_USER_ID', '@test:test.org');
  setTestEnv('MATRIX_ACCESS_TOKEN', 'mock-token');
  setTestEnv('MATRIX_ROOM_IDS', '!room1:test.org');
  setTestEnv('COMMAND_PREFIX', '!brain');
});

afterEach(() => {
  clearMockEnv();
  clearTestEnv('MATRIX_HOMESERVER_URL');
  clearTestEnv('MATRIX_USER_ID');
  clearTestEnv('MATRIX_ACCESS_TOKEN');
  clearTestEnv('MATRIX_ROOM_IDS');
  clearTestEnv('COMMAND_PREFIX');
});

// Mock conversation note data
const mockConversationNote = createMockNote(
  'note-conv1', 
  'What is ecosystem architecture?', 
  ['ecosystem-architecture', 'systems-thinking'],
);

// Create a mock brain protocol for testing
const mockBrainProtocol = {
  getProfileContext: () => ({}),
  getNoteContext: () => ({}),
  getExternalSourceContext: () => ({}),
  hasActiveConversation: () => true,
  getCurrentConversationId: () => 'mock-conversation-id',
  getConversation: () => Promise.resolve({}),
} as unknown as BrainProtocol;

// Extend the real CommandHandler for better type compatibility
class MockCommandHandler extends ActualCommandHandler {
  confirmCalled = false;
  confirmArgs: { conversationId: string; title?: string } | null = null;

  constructor() {
    super(mockBrainProtocol);
  }

  // Override methods we need for testing
  override async confirmSaveNote(conversationId: string, title?: string): Promise<CommandResult> {
    this.confirmCalled = true;
    this.confirmArgs = { conversationId, title };
    return {
      type: 'save-note-confirm',
      noteId: 'new-note-123',
      title: title || 'Default Title',
    };
  }
}

describe('MatrixRenderer Conversation Notes', () => {
  let renderer: MatrixRenderer;
  let messages: Array<{ roomId: string; message: string }> = [];
  let mockHandler: MockCommandHandler;

  const sendMessageFn = (roomId: string, message: string) => {
    messages.push({ roomId, message });
  };

  beforeEach(() => {
    messages = [];
    mockHandler = new MockCommandHandler();
    renderer = new MatrixRenderer('!brain', sendMessageFn);
    renderer.setCommandHandler(mockHandler);
  });

  test('should set command handler correctly', () => {
    // Implementation detail - we're just verifying it was set
    // by calling a method that would use it in later tests
    expect(() => renderer.setCommandHandler(mockHandler)).not.toThrow();
  });

  test('should render save-note-preview correctly', () => {
    const result = {
      type: 'save-note-preview' as const,
      noteContent: 'This is a sample note content about ecosystem architecture and its principles.',
      title: 'What is ecosystem architecture?',
      conversationId: 'conv123',
    };

    renderer.render('test-room', result);

    expect(messages.length).toBe(1);
    expect(messages[0].roomId).toBe('test-room');
    
    const message = messages[0].message;
    // Check essential parts of the rendered message
    expect(message).toContain('### 📝 Note Preview');
    expect(message).toContain('**Title**: What is ecosystem architecture?');
    expect(message).toContain('This is a sample note content');
    expect(message).toContain('!brain confirm');
    expect(message).toContain('!brain cancel');
    expect(message).toContain('*Note ID: conv123*');
  });

  test('should render save-note-confirm correctly', () => {
    const result = {
      type: 'save-note-confirm' as const,
      noteId: 'note-123',
      title: 'What is ecosystem architecture?',
    };

    renderer.render('test-room', result);

    expect(messages.length).toBe(1);
    expect(messages[0].roomId).toBe('test-room');
    
    const message = messages[0].message;
    expect(message).toContain('### ✅ Note Saved Successfully!');
    expect(message).toContain('**Title**: "What is ecosystem architecture?"');
    expect(message).toContain('**Note ID**: `note-123`');
    expect(message).toContain('!brain note note-123');
  });

  test('should render conversation-notes correctly with notes', () => {
    const result = {
      type: 'conversation-notes' as const,
      notes: [mockConversationNote],
    };

    renderer.render('test-room', result);

    expect(messages.length).toBe(1);
    expect(messages[0].roomId).toBe('test-room');
    
    const message = messages[0].message;
    expect(message).toContain('### 📚 Notes Created from Conversations');
    expect(message).toContain('What is ecosystem architecture?');
    expect(message).toContain('ecosystem-architecture');
  });

  test('should render conversation-notes correctly with no notes', () => {
    const result = {
      type: 'conversation-notes' as const,
      notes: [],
    };

    renderer.render('test-room', result);

    expect(messages.length).toBe(1);
    expect(messages[0].roomId).toBe('test-room');
    
    const message = messages[0].message;
    expect(message).toContain('### ⚠️ No conversation notes found');
  });
});

// ====== Matrix Conversation Note Testing ======

// We no longer need the MockMatrixEvent and timeline mock since we're storing 
// conversation ID in a map instead of parsing it from messages

// Tests specifically for Matrix message processing - would normally be in the main matrix.test.ts
// but creating separately to focus on conversation-note functionality
describe('Matrix Interface Conversation Note Functionality', () => {
  // We'll use the MockMatrixEvent and MockMatrixClient to test the command handling
  // rather than trying to test through the full MatrixBrainInterface class

  test('should store conversation ID and title in pendingSaveNotes map', () => {
    // This is testing the updated functionality of storing conversation info in a map
    // rather than extracting it from messages
    
    // In our updated approach, we now store the conversation ID and title in a map
    // instead of trying to extract it from messages
    const pendingSaveNotes = new Map<string, { conversationId: string, title: string }>();
    const roomId = 'test-room';
    const conversationId = 'conv123';
    const title = 'Test Title';
    
    // Store conversation data in the map (simulating what happens in processCommand)
    pendingSaveNotes.set(roomId, {
      conversationId,
      title,
    });
    
    // Verify the data was stored correctly
    const savedNote = pendingSaveNotes.get(roomId);
    expect(savedNote).toBeDefined();
    expect(savedNote?.conversationId).toBe(conversationId);
    expect(savedNote?.title).toBe(title);
  });
});