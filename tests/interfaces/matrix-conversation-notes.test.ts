import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { CommandResult } from '@commands/index';
import { createMockNote, mockEnv, resetMocks } from '@test/mocks';
import { clearTestEnv, setTestEnv } from '@test/utils/envUtils';

import { CommandHandler as ActualCommandHandler } from '../../src/commands/index';
import { MatrixRenderer } from '../../src/commands/matrix-renderer';
import type { BrainProtocol } from '../../src/mcp/protocol/brainProtocol';

// Mock environment variables
beforeEach(() => {
  mockEnv();
  setTestEnv('MATRIX_HOMESERVER_URL', 'https://matrix.test.org');
  setTestEnv('MATRIX_USER_ID', '@test:test.org');
  setTestEnv('MATRIX_ACCESS_TOKEN', 'mock-token');
  setTestEnv('MATRIX_ROOM_IDS', '!room1:test.org');
  setTestEnv('COMMAND_PREFIX', '!brain');
});

afterEach(() => {
  resetMocks();
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
    expect(message).toContain('Conversation ID: conv123');
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
    expect(message).toContain('📚 Notes Created from Conversations');
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
    expect(message).toContain('⚠️ No conversation notes found');
  });
});

// ====== Mock Matrix client and room for testing command handling ======

// Mock Matrix Event for testing message parsing
class MockMatrixEvent {
  private type: string;
  private content: Record<string, unknown>;

  constructor(type: string, content: Record<string, unknown>) {
    this.type = type;
    this.content = content;
  }

  getType(): string {
    return this.type;
  }

  getContent(): Record<string, unknown> {
    return this.content;
  }
}

// Mock room timeline for testing conversation ID extraction
const createMockTimeline = (messages: Array<{ body: string, type: string, msgtype: string }>) => {
  return messages.map(msg => new MockMatrixEvent(msg.type, {
    'msgtype': msg.msgtype,
    'body': msg.body,
  }));
};

// Tests specifically for Matrix message processing - would normally be in the main matrix.test.ts
// but creating separately to focus on conversation-note functionality
describe('Matrix Interface Conversation Note Functionality', () => {
  // We'll use the MockMatrixEvent and MockMatrixClient to test the command handling
  // rather than trying to test through the full MatrixBrainInterface class

  test('can extract conversation ID from message', () => {
    // This is testing the functionality of extracting the conversation ID
    // from a save-note-preview message when confirming
    
    const timeline = createMockTimeline([
      {
        type: 'm.room.message',
        msgtype: 'm.text',
        body: 'Some other message',
      },
      {
        type: 'm.room.message',
        msgtype: 'm.text',
        body: '### Note Preview\n\n**Title**: Test Title\n\nSome content\n\n_Conversation ID: conv123_',
      },
    ]);
    
    // Check if the message extraction works by manually implementing the logic
    // from handleConfirmSaveNote
    let conversationId: string | null = null;
    let title: string | null = null;
    
    // Look for a message containing the conversation ID marker
    for (let i = timeline.length - 1; i >= 0; i--) {
      const event = timeline[i];
      if (event.getType() === 'm.room.message') {
        const content = event.getContent();
        if (content['msgtype'] === 'm.text') {
          const body = content['body'] as string;
          
          // Look for the hidden conversation ID in the message
          const match = body.match(/_Conversation ID: ([a-zA-Z0-9-_]+)_/);
          if (match && match[1]) {
            conversationId = match[1];
            
            // Extract the title from the same message
            const titleMatch = body.match(/\*\*Title\*\*: (.+)$/m);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1];
            }
            
            break;
          }
        }
      }
    }
    
    expect(conversationId).toBe('conv123');
    expect(title).toBe('Test Title');
  });
});