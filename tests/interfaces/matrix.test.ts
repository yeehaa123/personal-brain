/**
 * Comprehensive tests for Matrix interface components
 * 
 * This file consolidates tests for:
 * - MatrixBrainInterface
 * - Matrix formatters
 * - Matrix conversation notes functionality
 * - Matrix command rendering
 * 
 * Refactored to use table-driven tests for improved maintainability and readability
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
import { createTestNote } from '@test/__mocks__/models/note';
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

  test('matrix interface functionality', async () => {
    // Standard mock client creation function for testing
    const createMockClient = (syncCallback?: (state: string) => void) => {
      return {
        startClient: mock(() => Promise.resolve()),
        on: mock(),
        once: mock((event, callback) => {
          // Simulate successful sync if callback provided
          if (event === 'sync' && callback && syncCallback) {
            callback('PREPARED');
          }
          return { removeListener: mock() };
        }),
        joinRoom: mock(() => Promise.resolve()),
      } as unknown as sdk.MatrixClient;
    };

    // Standard mock dependencies
    const createMockDependencies = () => {
      const mockBrainProtocol = MockBrainProtocol.createFresh() as unknown as IBrainProtocol;
      mockBrainProtocol.initialize = mock(() => Promise.resolve());
      
      const mockCommandHandler = MockCommandHandler.createFresh() as unknown as CommandHandler;
      const mockServerManager = {
        initialize: mock(() => Promise.resolve()),
        startServers: mock(() => Promise.resolve(true)),
        cleanup: mock(() => Promise.resolve()),
      } as unknown as ServerManager;
      
      const mockConfig = {
        homeserverUrl: 'https://test.matrix.org',
        accessToken: 'test-token',
        userId: '@test:matrix.org',
        roomIds: ['room1', 'room2'],
        commandPrefix: '!brain',
      };
      
      const mockLogger = MockLogger.createFresh({ 
        silent: true, 
        name: 'test-matrix-interface', 
      }) as unknown as Logger;
      
      return {
        brainProtocol: mockBrainProtocol,
        commandHandler: mockCommandHandler,
        serverManager: mockServerManager,
        config: mockConfig,
        logger: mockLogger,
      };
    };

    // Define test cases for MatrixBrainInterface functionality
    const matrixInterfaceTestCases = [
      {
        name: 'singleton pattern behavior',
        test: () => {
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
        },
      },
      {
        name: 'instance creation with dependencies',
        test: () => {
          // Create mock dependencies
          const client = createMockClient();
          const deps = createMockDependencies();

          // Create a fresh instance with explicit dependencies
          const matrixInterface = MatrixBrainInterface.createFresh(
            client,
            deps.brainProtocol,
            deps.commandHandler,
            deps.config,
            deps.logger,
            deps.serverManager,
          );

          // Verify instance was created
          expect(matrixInterface).toBeDefined();
        },
      },
      {
        name: 'start without initializing server',
        test: async () => {
          // Create mock dependencies with sync callback
          let syncCalled = false;
          const client = {
            startClient: mock(() => Promise.resolve()),
            on: mock(),
            once: mock((event, callback) => {
              // Immediately call the callback with 'PREPARED' when 'sync' is registered
              if (event === 'sync' && callback) {
                syncCalled = true;
                callback('PREPARED');
              }
              return { removeListener: mock() };
            }),
            joinRoom: mock(() => Promise.resolve()),
          } as unknown as sdk.MatrixClient;
          
          const deps = createMockDependencies();

          // Create a fresh instance with explicit dependencies
          const matrixInterface = MatrixBrainInterface.createFresh(
            client,
            deps.brainProtocol,
            deps.commandHandler,
            deps.config,
            deps.logger,
            deps.serverManager,
          );

          // Start the interface without initializing the server
          await matrixInterface.start(false);

          // Verify server was not initialized
          expect(deps.serverManager.initialize).not.toHaveBeenCalled();
          
          // Verify client was started
          expect(client.startClient).toHaveBeenCalled();
          
          // Verify brainProtocol was initialized
          expect(deps.brainProtocol.initialize).toHaveBeenCalled();
          
          // Verify room was joined
          expect(client.joinRoom).toHaveBeenCalledTimes(deps.config.roomIds.length);
          
          // Verify sync callback was called
          expect(syncCalled).toBe(true);
        },
      },
      {
        name: 'protocol instantiation',
        test: () => {
          // Create a protocol instance for testing
          const protocol = MockBrainProtocol.getInstance({
            interfaceType: 'matrix',
            roomId: 'test-room',
          });

          // Verify it was initialized correctly
          expect(protocol).toBeDefined();
          expect(protocol.getContextManager()).toBeDefined();
          expect(protocol.getConversationManager()).toBeDefined();
        },
      },
    ];

    // Run all test cases
    for (const { test: testFn } of matrixInterfaceTestCases) {
      // Run the test and await its completion
      await testFn();
    }
  });
});

// ==================================
// MATRIX FORMATTERS TESTS
// ==================================
describe('Matrix Formatters', () => {
  // MarkdownFormatter Tests
  describe('MarkdownFormatter', () => {
    test('markdown formatting', () => {
      const formatter = MatrixMarkdownFormatter.getInstance();
      
      // Define test cases for markdown formatting
      const markdownTestCases = [
        {
          input: '# Hello World',
          checkOutput: (output: string) => {
            expect(output).toContain('<h1>Hello World</h1>');
          },
        },
        {
          // The formatCodeBlock method is tested with this case
          formatFn: () => formatter.formatCodeBlock('console.log("Hello")', 'javascript'),
          checkOutput: (output: string) => {
            expect(output).toContain('console.log');
          },
        },
      ];
      
      // Run all test cases
      markdownTestCases.forEach(({ input, formatFn, checkOutput }) => {
        // Get output either from input or custom formatFn
        const output = input ? formatter.format(input) : formatFn!();
        
        // Check output meets expectations
        checkOutput(output);
      });
    });
  });
  
  // CitationFormatter Tests
  describe('CitationFormatter', () => {
    test('citation formatting', () => {
      const formatter = MatrixCitationFormatter.getInstance();
      
      // Define test cases for citation formatting
      const citationTestCases = [
        {
          formatFn: () => formatter.formatCitation({
            source: 'Test Source',
            title: 'Test Title',
            content: 'Test content',
            type: 'note',
            id: 'test-id',
          }),
          checkOutput: (output: string | unknown) => {
            // We know this will be a string but need to handle type correctly
            if (typeof output === 'string') {
              expect(output).toContain('Test Title');
              expect(output).toContain('Test content');
              expect(output).toContain('Source: Test Source');
              expect(output).toContain('test-id');
            }
          },
        },
        {
          formatFn: () => {
            const note = {
              id: 'note-id',
              title: 'Note Title',
              content: 'Note content',
              createdAt: new Date().toISOString(),
            };
            
            return formatter.createNoteBasedCitation(note);
          },
          checkOutput: (citation: unknown) => {
            // This returns an object, not a string
            const typedCitation = citation as { title: string; id: string; type: string };
            expect(typedCitation.title).toBe('Note Title');
            expect(typedCitation.id).toBe('note-id');
            expect(typedCitation.type).toBe('note');
          },
        },
      ];
      
      // Run all test cases
      citationTestCases.forEach(({ formatFn, checkOutput }) => {
        // Get output from format function
        const output = formatFn();
        
        // Check output meets expectations
        checkOutput(output);
      });
    });
  });
  
  // BlockBuilder Tests
  describe('BlockBuilder', () => {
    test('block building with different client support', () => {
      // Define test cases for block building
      const blockBuilderTestCases = [
        {
          setup: () => {
            const builder = new MatrixBlockBuilder({ clientSupportsBlocks: false });
            builder.addHeader('Test Header');
            builder.addSection('Test Section');
            builder.addDivider();
            
            return builder.build() as string;
          },
          checkOutput: (output: string) => {
            expect(output).toContain('<h3>Test Header</h3>');
            expect(output).toContain('Test Section');
            expect(output).toContain('<hr>');
          },
        },
        {
          setup: () => {
            const builder = new MatrixBlockBuilder({ clientSupportsBlocks: true });
            builder.addHeader('Test Header');
            builder.addSection('Test Section');
            
            return builder.build() as Record<string, unknown>;
          },
          checkOutput: (output: Record<string, unknown>) => {
            expect(output['body']).toContain('Test Header');
            expect(output['blocks']).toBeDefined();
          },
        },
      ];
      
      // Run all test cases
      blockBuilderTestCases.forEach(({ setup, checkOutput }) => {
        // Build blocks according to test case
        const output = setup();
        
        // Check output meets expectations - need to handle different output types
        if (typeof output === 'string') {
          (checkOutput as (output: string) => void)(output);
        } else {
          (checkOutput as (output: Record<string, unknown>) => void)(output);
        }
      });
    });
  });
  
  // ResponseFormatter Tests
  describe('ResponseFormatter', () => {
    test('response formatting for different content types', () => {
      const formatter = MatrixResponseFormatter.getInstance();
      
      // Sample notes to use in tests
      const sampleNotes = [
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
      
      // Sample note for display
      const sampleNote = {
        id: 'note-id',
        title: 'Note Title',
        content: 'Note content with some **markdown**',
        tags: ['tag1', 'tag2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Sample citations
      const sampleCitations = [
        { noteId: 'note-1', noteTitle: 'Source 1', excerpt: 'Excerpt 1' },
        { noteId: 'note-2', noteTitle: 'Source 2', excerpt: 'Excerpt 2' },
      ];
      
      // Define test cases for response formatting
      const responseFormatterTestCases = [
        {
          formatFn: () => formatter.formatSearchResults('test', sampleNotes),
          checkOutput: (output: string) => {
            expect(output).toContain('Search Results for "test"');
            expect(output).toContain('Note 1');
            expect(output).toContain('Note 2');
          },
        },
        {
          formatFn: () => formatter.formatNote(sampleNote),
          checkOutput: (output: string) => {
            expect(output).toContain('Note Title');
            expect(output).toContain('Note content');
            expect(output).toContain('tag1');
            expect(output).toContain('tag2');
          },
        },
        {
          formatFn: () => formatter.formatAnswer('This is the answer with some *markdown*.', sampleCitations),
          checkOutput: (output: string) => {
            expect(output).toContain('This is the answer with some');
            expect(output).toContain('<em>markdown</em>');
            expect(output).toContain('Source 1');
            expect(output).toContain('Source 2');
          },
        },
      ];
      
      // Run all test cases
      responseFormatterTestCases.forEach(({ formatFn, checkOutput }) => {
        // Format according to test case
        const output = formatFn();
        
        // Check output meets expectations
        checkOutput(output);
      });
    });
  });
});

// ==================================
// MATRIX CONVERSATION NOTES TESTS
// ==================================

// Mock conversation note data
const mockConversationNote = createTestNote({
  id: 'note-conv1', 
  title: 'What is ecosystem architecture?', 
  tags: ['ecosystem-architecture', 'systems-thinking'],
  content: 'Mock note content about ecosystem architecture',
});

// Create a mock brain protocol for testing
const mockBrainProtocol = {
  getProfileContextV2: () => ({}),
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

  test('should render different command result types correctly', () => {
    // Define test cases for rendering different types of command results
    const renderTestCases = [
      {
        name: 'save-note-preview',
        result: {
          type: 'save-note-preview' as const,
          noteContent: 'This is a sample note content about ecosystem architecture and its principles.',
          title: 'What is ecosystem architecture?',
          conversationId: 'conv123',
        },
        expectations: (message: string) => {
          expect(message).toContain('Note Preview');
          expect(message).toContain('<strong>Title</strong>: What is ecosystem architecture?');
          expect(message).toContain('This is a sample note content');
          expect(message).toContain('confirm');
          expect(message).toContain('cancel');
          expect(message).toContain('Note ID: conv123');
        },
      },
      {
        name: 'save-note-confirm',
        result: {
          type: 'save-note-confirm' as const,
          noteId: 'note-123',
          title: 'What is ecosystem architecture?',
        },
        expectations: (message: string) => {
          expect(message).toContain('Note Saved Successfully');
          expect(message).toContain('<strong>Title</strong>: "What is ecosystem architecture?"');
          expect(message).toContain('<strong>Note ID</strong>: <code>note-123</code>');
          expect(message).toContain('note-123');
        },
      },
      {
        name: 'conversation-notes with notes',
        result: {
          type: 'conversation-notes' as const,
          notes: [mockConversationNote],
        },
        expectations: (message: string) => {
          expect(message).toContain('Notes Created from Conversations');
          expect(message).toContain('What is ecosystem architecture?');
          expect(message).toContain('ecosystem-architecture');
        },
      },
      {
        name: 'conversation-notes with no notes',
        result: {
          type: 'conversation-notes' as const,
          notes: [],
        },
        expectations: (message: string) => {
          expect(message).toContain('No conversation notes found');
        },
      },
    ];

    // Execute each test case
    renderTestCases.forEach(({ name, result, expectations }) => {
      // Clear messages before each test case
      messages = [];
      
      // Render the result
      renderer.render('test-room', result);
      
      // Verify expectations
      expect(messages.length, `${name} should produce one message`).toBe(1);
      expect(messages[0].roomId, `${name} should target correct room`).toBe('test-room');
      
      // Check message content expectations
      expectations(messages[0].message);
    });
  });
});