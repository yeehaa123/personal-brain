import { beforeEach, describe, expect, test } from 'bun:test';

import type { CommandHandler } from '@commands/index';
import { MockCommandHandler } from '@test/__mocks__/commands/commandHandler';

describe('CommandHandler Behavior', () => {
  let commandHandler: CommandHandler;

  beforeEach(() => {
    // Type assertion for mock command handler
    commandHandler = new MockCommandHandler() as unknown as CommandHandler;
  });

  test('processes various commands correctly', async () => {
    // List available commands
    const commands = commandHandler.getCommands();
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.some(cmd => cmd.command === 'help')).toBe(true);
    
    // Unknown command
    const errorResult = await commandHandler.processCommand('unknown', '');
    expect(errorResult.type).toBe('error');
    
    // Profile command
    const profileResult = await commandHandler.processCommand('profile', '');
    expect(profileResult.type).toBe('profile');
    
    // Search command
    const searchResult = await commandHandler.processCommand('search', 'ecosystem');
    expect(searchResult.type).toBe('search');
    if (searchResult.type === 'search') {
      expect(searchResult.query).toBe('ecosystem');
      expect(Array.isArray(searchResult.notes)).toBe(true);
    }
    
    // List command
    const listResult = await commandHandler.processCommand('list', '');
    expect(listResult.type).toBe('notes');
    if (listResult.type === 'notes') {
      expect(Array.isArray(listResult.notes)).toBe(true);
    }
    
    // Note command
    const noteResult = await commandHandler.processCommand('note', 'note-1');
    expect(noteResult.type).toBe('note');
    if (noteResult.type === 'note') {
      expect(noteResult.note.id).toBe('note-1');
    }
    
    // Ask command
    const askResult = await commandHandler.processCommand('ask', 'What is ecosystem architecture?');
    expect(askResult.type).toBe('ask');
    if (askResult.type === 'ask') {
      expect(askResult.answer).toBeDefined();
      expect(Array.isArray(askResult.citations)).toBe(true);
    }
    
    // Status command
    const statusResult = await commandHandler.processCommand('status', '');
    expect(statusResult.type).toBe('status');
  });

  test('toggles external sources on and off', async () => {
    // Enable external sources
    const enableResult = await commandHandler.processCommand('external', 'on');
    expect(enableResult.type).toBe('external');
    if (enableResult.type === 'external') {
      expect(enableResult.enabled).toBe(true);
    }
    
    // Check status shows enabled
    const statusEnabled = await commandHandler.processCommand('status', '');
    if (statusEnabled.type === 'status') {
      expect(statusEnabled.status.externalSourcesEnabled).toBe(true);
    }
    
    // Disable external sources
    const disableResult = await commandHandler.processCommand('external', 'off');
    expect(disableResult.type).toBe('external');
    if (disableResult.type === 'external') {
      expect(disableResult.enabled).toBe(false);
    }
    
    // Check status shows disabled
    const statusDisabled = await commandHandler.processCommand('status', '');
    if (statusDisabled.type === 'status') {
      expect(statusDisabled.status.externalSourcesEnabled).toBe(false);
    }
  });
});