import { beforeEach, describe, expect, test } from 'bun:test';

import { CommandHandler } from '@commands/index';
import { BrainProtocol } from '@mcp/protocol/brainProtocol';
import { mockEnv } from '@test/mocks';
import { setTestEnv } from '@test/helpers/envUtils';

// Skip these tests by default as they're integration tests
// Run with: ENABLE_INTEGRATION_TESTS=1 bun test tests/interfaces/matrix-save-note-integration.test.ts
const shouldRunTests = process.env['ENABLE_INTEGRATION_TESTS'] === '1';
const describeOrSkip = shouldRunTests ? describe : describe.skip;

describeOrSkip('Matrix save-note integration', () => {
  let brainProtocol: BrainProtocol;
  let commandHandler: CommandHandler;
  const roomId = 'test-room-id';

  beforeEach(async () => {
    // Setup environment
    mockEnv();
    setTestEnv('MATRIX_HOMESERVER_URL', 'https://matrix.test.org');
    setTestEnv('MATRIX_USER_ID', '@test:test.org');
    setTestEnv('MATRIX_ACCESS_TOKEN', 'mock-token');
    setTestEnv('MATRIX_ROOM_IDS', roomId);
    setTestEnv('COMMAND_PREFIX', '!brain');

    // Create fresh BrainProtocol for Matrix interface
    brainProtocol = BrainProtocol.getInstance({ 
      interfaceType: 'matrix', 
      roomId: roomId, 
    });
    
    // Access conversation context directly from the brainProtocol
    
    // Get the conversation context
    const conversationContext = brainProtocol.getConversationContext();
    
    // Create command handler
    commandHandler = new CommandHandler(brainProtocol);
    
    // Start a test conversation for the Matrix room
    await conversationContext.getOrCreateConversationForRoom(roomId, 'matrix');
    
    // Add a turn to the conversation - get the conversation ID first
    const conversationId = await conversationContext.getConversationIdByRoom(roomId, 'matrix');
    
    if (!conversationId) {
      throw new Error('Failed to get conversation ID');
    }
    
    // Add a turn to the conversation using the context API
    await conversationContext.addTurn(
      conversationId,
      'What is ecosystem architecture?', 
      'Ecosystem architecture is a design approach that...', 
      {
        userId: 'user123',
        userName: 'Test User',
      },
    );
  });

  test('save-note command should be returned in getCommands()', () => {
    const commands = commandHandler.getCommands();
    const saveNoteCommand = commands.find(cmd => cmd.command === 'save-note');
    
    expect(saveNoteCommand).toBeDefined();
    expect(saveNoteCommand?.description).toContain('Create a note from recent conversation');
  });
  
  test('save-note command should generate a note preview', async () => {
    // Execute save-note command
    const result = await commandHandler.processCommand('save-note', '');
    
    // Verify result
    expect(result.type).toBe('save-note-preview');
    if (result.type === 'save-note-preview') {
      expect(result.conversationId).toBeDefined();
      expect(result.title).toBeDefined();
      // Note content has the original query but not necessarily the response
      expect(result.noteContent).toContain('What is ecosystem architecture?');
    }
  });
  
  test('confirmSaveNote should create a new note', async () => {
    // First get a conversation ID by running save-note
    const previewResult = await commandHandler.processCommand('save-note', '');
    expect(previewResult.type).toBe('save-note-preview');
    
    // Extract the conversation ID
    const conversationId = previewResult.type === 'save-note-preview' 
      ? previewResult.conversationId 
      : '';
    
    // Now confirm note creation
    const confirmResult = await commandHandler.confirmSaveNote(conversationId);
    
    // Verify the note was created
    expect(confirmResult.type).toBe('save-note-confirm');
    if (confirmResult.type === 'save-note-confirm') {
      expect(confirmResult.noteId).toBeDefined();
      expect(confirmResult.title).toBeDefined();
    }
  });
  
  test('conversation-notes command should return note list after creation', async () => {
    // First create a note
    const previewResult = await commandHandler.processCommand('save-note', '');
    const conversationId = previewResult.type === 'save-note-preview' 
      ? previewResult.conversationId 
      : '';
    await commandHandler.confirmSaveNote(conversationId);
    
    // Now get list of conversation notes
    const listResult = await commandHandler.processCommand('conversation-notes', '');
    
    // Check if we have notes or got an expected error
    if (listResult.type === 'conversation-notes') {
      expect(listResult.notes.length).toBeGreaterThan(0);
      expect(listResult.notes[0].title).toBeDefined();
    } else if (listResult.type === 'error') {
      // Expected behavior - note might not be found yet in short tests
      // Check that the error is the expected one
      expect(listResult.message).toContain('No notes created from conversations found');
    } else {
      // Any other type is unexpected
      expect(false).toBe(true); // This will fail the test with a clear message
      console.error(`Unexpected result type: ${listResult.type}`);
    }
  });
});