/**
 * Comprehensive tests for Matrix interface components
 * 
 * This file consolidates tests for:
 * - MatrixBrainInterface
 * - Matrix formatters
 * - Matrix conversation notes functionality
 * - Matrix command rendering
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type * as sdk from 'matrix-js-sdk';

import type { CommandHandler, CommandResult } from '@/commands';
import { CommandHandler as ActualCommandHandler } from '@/commands';
import { MatrixRenderer } from '@/commands/matrix-renderer';
import type { ServerManager } from '@/contexts/website/services/serverManager';
import { MatrixBrainInterface } from '@/interfaces/matrix';
import { 
  MatrixBlockBuilder, 
  MatrixCitationFormatter, 
  MatrixMarkdownFormatter, 
  MatrixResponseFormatter, 
} from '@/interfaces/matrix/formatters';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { IBrainProtocol } from '@/protocol/types';
import type { Logger } from '@/utils/logger';
import { MockCommandHandler } from '@test/__mocks__/commands/commandHandler';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';

// ==================================
// MAIN MATRIX INTERFACE TESTS
// ==================================
describe('MatrixBrainInterface', () => {
  // Reset singletons before each test to ensure isolation
  beforeEach(() => {
    MatrixBrainInterface.resetInstance();
    MockBrainProtocol.resetInstance();
    MockCommandHandler.resetInstance();
    MockLogger.resetInstance();

    // Set necessary environment variables
    process.env['MATRIX_ACCESS_TOKEN'] = 'test-token';
    process.env['MATRIX_USER_ID'] = '@test:matrix.org';
    process.env['MATRIX_ROOM_IDS'] = 'room1,room2';
    process.env['NODE_ENV'] = 'test';
  });

  // Clean up after each test
  afterEach(() => {
    // Reset mocked singletons
    MatrixBrainInterface.resetInstance();
    MockBrainProtocol.resetInstance();
    MockCommandHandler.resetInstance();
    MockLogger.resetInstance();

    // Clean up environment variables
    delete process.env['MATRIX_ACCESS_TOKEN'];
    delete process.env['MATRIX_USER_ID'];
    delete process.env['MATRIX_ROOM_IDS'];
    delete process.env['NODE_ENV'];
  });

  test('Should create MatrixBrainInterface instance with dependencies', () => {
    // Create mock dependencies
    const mockClient = {
      startClient: mock(() => Promise.resolve()),
      on: mock(),
      once: mock(),
      joinRoom: mock(() => Promise.resolve()),
    } as unknown as sdk.MatrixClient;

    const mockBrainProtocol = MockBrainProtocol.createFresh() as unknown as IBrainProtocol;
    const mockCommandHandler = MockCommandHandler.createFresh() as unknown as CommandHandler;

    const mockConfig = {
      homeserverUrl: 'https://test.matrix.org',
      accessToken: 'test-token',
      userId: '@test:matrix.org',
      roomIds: ['room1', 'room2'],
      commandPrefix: '!brain',
    };

    const mockServerManager = {
      initialize: mock(() => Promise.resolve()),
      startServers: mock(() => Promise.resolve(true)),
      cleanup: mock(() => Promise.resolve()),
    } as unknown as ServerManager;

    // Create a fresh instance with explicit dependencies
    const matrixInterface = MatrixBrainInterface.createFresh(
      mockClient,
      mockBrainProtocol,
      mockCommandHandler,
      mockConfig,
      MockLogger.createFresh({ silent: true, name: 'test-instance-1' }) as unknown as Logger,
      mockServerManager,
    );

    // Verify instance was created
    expect(matrixInterface).toBeDefined();
  });

  test('Should maintain singleton instance', () => {
    // Get singleton instance
    const instance1 = MatrixBrainInterface.getInstance();
    const instance2 = MatrixBrainInterface.getInstance();

    // Verify both references point to the same instance
    expect(instance1).toBe(instance2);

    // Reset singleton
    MatrixBrainInterface.resetInstance();

    // Get new instance
    const instance3 = MatrixBrainInterface.getInstance();

    // Verify it's different from the original instance
    expect(instance1).not.toBe(instance3);
  });

  test('Should start without initializing server if specified', async () => {
    // Create mock dependencies
    const mockClient = {
      startClient: mock(() => Promise.resolve()),
      on: mock(),
      once: mock((event, callback) => {
        // Simulate successful sync
        if (event === 'sync') {
          callback('PREPARED');
        }
        return { removeListener: mock() };
      }),
      joinRoom: mock(() => Promise.resolve()),
    } as unknown as sdk.MatrixClient;

    const mockBrainProtocol = MockBrainProtocol.createFresh() as unknown as IBrainProtocol;
    mockBrainProtocol.initialize = mock(() => Promise.resolve());

    const mockCommandHandler = MockCommandHandler.createFresh() as unknown as CommandHandler;

    const mockConfig = {
      homeserverUrl: 'https://test.matrix.org',
      accessToken: 'test-token',
      userId: '@test:matrix.org',
      roomIds: ['room1'],
      commandPrefix: '!brain',
    };

    const mockServerManager = {
      initialize: mock(() => Promise.resolve()),
      startServers: mock(() => Promise.resolve(true)),
      cleanup: mock(() => Promise.resolve()),
    } as unknown as ServerManager;

    // Create a fresh instance with explicit dependencies
    const matrixInterface = MatrixBrainInterface.createFresh(
      mockClient,
      mockBrainProtocol,
      mockCommandHandler,
      mockConfig,
      MockLogger.createFresh({ silent: true, name: 'test-instance-2' }) as unknown as Logger,
      mockServerManager,
    );

    // Start the interface without initializing the server
    await matrixInterface.start(false);

    // Verify server was not initialized
    expect(mockServerManager.initialize).not.toHaveBeenCalled();

    // Verify client was started
    expect(mockClient.startClient).toHaveBeenCalled();

    // Verify brainProtocol was initialized
    expect(mockBrainProtocol.initialize).toHaveBeenCalled();

    // Verify room was joined
    expect(mockClient.joinRoom).toHaveBeenCalledTimes(1);
  });

  test('Basic protocol instantiation test', () => {
    // Create a protocol instance for testing
    const protocol = MockBrainProtocol.getInstance({
      interfaceType: 'matrix',
      roomId: 'test-room',
    });

    // Verify it was initialized correctly
    expect(protocol).toBeDefined();
    expect(protocol.getContextManager()).toBeDefined();
    expect(protocol.getConversationManager()).toBeDefined();
  });
});

// ==================================
// MATRIX FORMATTERS TESTS
// ==================================
describe('Matrix Formatters', () => {
  describe('MarkdownFormatter', () => {
    test('should format basic markdown', () => {
      const formatter = MatrixMarkdownFormatter.getInstance();
      const result = formatter.format('# Hello World');
      
      // Should contain the header with no styling
      expect(result).toContain('<h1>Hello World</h1>');
    });
    
    test('should format code blocks', () => {
      const formatter = MatrixMarkdownFormatter.getInstance();
      const result = formatter.formatCodeBlock('console.log("Hello")', 'javascript');
      
      // Should contain the code and language formatting
      expect(result).toContain('console.log');
    });
  });
  
  describe('CitationFormatter', () => {
    test('should format a citation', () => {
      const formatter = MatrixCitationFormatter.getInstance();
      const result = formatter.formatCitation({
        source: 'Test Source',
        title: 'Test Title',
        content: 'Test content',
        type: 'note',
        id: 'test-id',
      });
      
      // Should contain the citation elements
      expect(result).toContain('Test Title');
      expect(result).toContain('Test content');
      expect(result).toContain('Source: Test Source');
      expect(result).toContain('test-id');
    });
    
    test('should create a note-based citation', () => {
      const formatter = MatrixCitationFormatter.getInstance();
      const note = {
        id: 'note-id',
        title: 'Note Title',
        content: 'Note content',
        createdAt: new Date().toISOString(),
      };
      
      const citation = formatter.createNoteBasedCitation(note);
      
      expect(citation.title).toBe('Note Title');
      expect(citation.id).toBe('note-id');
      expect(citation.type).toBe('note');
    });
  });
  
  describe('BlockBuilder', () => {
    test('should build blocks with HTML fallback', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: false });
      
      builder.addHeader('Test Header');
      builder.addSection('Test Section');
      builder.addDivider();
      
      const result = builder.build() as string;
      
      expect(result).toContain('<h3>Test Header</h3>');
      expect(result).toContain('Test Section');
      expect(result).toContain('<hr>');
    });
    
    test('should generate plain text fallback', () => {
      const builder = new MatrixBlockBuilder({ clientSupportsBlocks: true });
      
      builder.addHeader('Test Header');
      builder.addSection('Test Section');
      
      const result = builder.build() as Record<string, unknown>;
      
      expect(result['body']).toContain('Test Header');
      expect(result['blocks']).toBeDefined();
    });
  });
  
  describe('ResponseFormatter', () => {
    test('should format search results', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const notes = [
        { 
          id: 'note-1', 
          title: 'Note 1', 
          content: 'Content 1', 
          tags: ['tag1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { 
          id: 'note-2', 
          title: 'Note 2', 
          content: 'Content 2', 
          tags: ['tag2'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      const result = formatter.formatSearchResults('test', notes);
      
      expect(result).toContain('Search Results for "test"');
      expect(result).toContain('Note 1');
      expect(result).toContain('Note 2');
    });
    
    test('should format note display', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const note = {
        id: 'note-id',
        title: 'Note Title',
        content: 'Note content with some **markdown**',
        tags: ['tag1', 'tag2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const result = formatter.formatNote(note);
      
      expect(result).toContain('Note Title');
      expect(result).toContain('Note content');
      expect(result).toContain('tag1');
      expect(result).toContain('tag2');
    });
    
    test('should format an answer with citations', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      const answer = 'This is the answer with some *markdown*.';
      const citations = [
        { noteId: 'note-1', noteTitle: 'Source 1', excerpt: 'Excerpt 1' },
        { noteId: 'note-2', noteTitle: 'Source 2', excerpt: 'Excerpt 2' },
      ];
      
      const result = formatter.formatAnswer(answer, citations);
      
      // Check for the formatted content, not raw markdown
      expect(result).toContain('This is the answer with some');
      expect(result).toContain('<em>markdown</em>');
      expect(result).toContain('Source 1');
      expect(result).toContain('Source 2');
    });
  });
});

// ==================================
// MATRIX CONVERSATION NOTES TESTS
// ==================================

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
class MockConversationCommandHandler extends ActualCommandHandler {
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
  let mockHandler: MockConversationCommandHandler;

  const sendMessageFn = (roomId: string, message: string) => {
    messages.push({ roomId, message });
  };

  beforeEach(() => {
    messages = [];
    mockHandler = new MockConversationCommandHandler();
    renderer = new MatrixRenderer('!brain', sendMessageFn);
    renderer.setCommandHandler(mockHandler);
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
    expect(message).toContain('Note Preview');
    expect(message).toContain('<strong>Title</strong>: What is ecosystem architecture?');
    expect(message).toContain('This is a sample note content');
    expect(message).toContain('confirm');
    expect(message).toContain('cancel');
    expect(message).toContain('Note ID: conv123');
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
    expect(message).toContain('Note Saved Successfully');
    expect(message).toContain('<strong>Title</strong>: "What is ecosystem architecture?"');
    expect(message).toContain('<strong>Note ID</strong>: <code>note-123</code>');
    expect(message).toContain('note-123');
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
    expect(message).toContain('Notes Created from Conversations');
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
    expect(message).toContain('No conversation notes found');
  });
});