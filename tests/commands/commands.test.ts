import { beforeEach, describe, expect, test } from 'bun:test';

import type { CommandHandler } from '@commands/index';
import { MockCommandHandler } from '@test/__mocks__/commands/commandHandler';

describe('CommandHandler', () => {
  let commandHandler: Pick<CommandHandler, 'getCommands' | 'processCommand'>;

  beforeEach(async () => {
    commandHandler = new MockCommandHandler();
  });

  test('command handler provides expected functionality', async () => {
    // Get all test results
    const commandResults = {
      listCommands: commandHandler.getCommands(),
      errorCommand: await commandHandler.processCommand('unknown', ''),
      profileCommand: await commandHandler.processCommand('profile', ''),
      profileRelatedCommand: await commandHandler.processCommand('profile', 'related'),
      searchCommand: await commandHandler.processCommand('search', 'ecosystem'),
      listCommand: await commandHandler.processCommand('list', ''),
      tagListCommand: await commandHandler.processCommand('list', 'ecosystem'),
      noteCommand: await commandHandler.processCommand('note', 'note-1'),
      askCommand: await commandHandler.processCommand('ask', 'What is ecosystem architecture?'),
      statusCommand: await commandHandler.processCommand('status', ''),
    };

    // Format validation outputs
    const validationOutputs = {
      commands: {
        isArray: Array.isArray(commandResults.listCommands),
        hasExpectedCommands: commandResults.listCommands.some(cmd => cmd.command === 'help') && 
                            commandResults.listCommands.some(cmd => cmd.command === 'profile'),
      },
      errorCommand: {
        hasCorrectType: commandResults.errorCommand.type === 'error',
        hasErrorMessage: commandResults.errorCommand.type === 'error' && 
                         commandResults.errorCommand.message.includes('Unknown command'),
      },
      profileCommand: {
        hasCorrectType: commandResults.profileCommand.type === 'profile',
        hasProfileData: commandResults.profileCommand.type === 'profile' && 
                        typeof commandResults.profileCommand.profile === 'object',
      },
      profileRelatedCommand: {
        hasCorrectType: commandResults.profileRelatedCommand.type === 'profile',
        hasProfile: commandResults.profileRelatedCommand.type === 'profile' && 
                    typeof commandResults.profileRelatedCommand.profile === 'object',
      },
      searchCommand: {
        hasCorrectType: commandResults.searchCommand.type === 'search',
        hasCorrectQuery: commandResults.searchCommand.type === 'search' && 
                         commandResults.searchCommand.query === 'ecosystem',
        hasResults: commandResults.searchCommand.type === 'search' && 
                    Array.isArray(commandResults.searchCommand.notes) &&
                    commandResults.searchCommand.notes.length > 0,
        hasRelevantTitle: commandResults.searchCommand.type === 'search' && 
                          commandResults.searchCommand.notes[0]?.title.includes('Ecosystem'),
        hasRelevantTags: commandResults.searchCommand.type === 'search' && 
                        Array.isArray(commandResults.searchCommand.notes[0]?.tags) &&
                        commandResults.searchCommand.notes[0]?.tags.includes('ecosystem-architecture'),
      },
      listCommands: {
        hasCorrectListType: commandResults.listCommand.type === 'notes',
        hasExpectedTitle: commandResults.listCommand.type === 'notes' && 
                          commandResults.listCommand.notes[0]?.title === 'Building Communities',
        hasCorrectTagListType: commandResults.tagListCommand.type === 'notes',
        hasCorrectFilteredTag: commandResults.tagListCommand.type === 'notes' && 
                              Array.isArray(commandResults.tagListCommand.notes[0]?.tags) &&
                              commandResults.tagListCommand.notes[0]?.tags.includes('ecosystem'),
      },
      noteCommand: {
        hasCorrectType: commandResults.noteCommand.type === 'note',
        hasCorrectId: commandResults.noteCommand.type === 'note' && 
                      commandResults.noteCommand.note.id === 'note-1',
        hasCorrectTitle: commandResults.noteCommand.type === 'note' && 
                         commandResults.noteCommand.note.title === 'Ecosystem Architecture Principles',
        hasCorrectTags: commandResults.noteCommand.type === 'note' && 
                        Array.isArray(commandResults.noteCommand.note.tags) &&
                        commandResults.noteCommand.note.tags.includes('ecosystem-architecture'),
      },
      askCommand: {
        hasCorrectType: commandResults.askCommand.type === 'ask',
        hasAnswer: commandResults.askCommand.type === 'ask' && 
                   commandResults.askCommand.answer === 'Mock answer',
        hasCitations: commandResults.askCommand.type === 'ask' && 
                      Array.isArray(commandResults.askCommand.citations),
        hasRelatedNotes: commandResults.askCommand.type === 'ask' && 
                         Array.isArray(commandResults.askCommand.relatedNotes),
      },
      statusCommand: {
        hasCorrectType: commandResults.statusCommand.type === 'status',
        hasCorrectStatus: commandResults.statusCommand.type === 'status' && 
                          commandResults.statusCommand.status.apiConnected === true &&
                          commandResults.statusCommand.status.dbConnected === true &&
                          commandResults.statusCommand.status.noteCount === 10 &&
                          commandResults.statusCommand.status.externalSourcesEnabled === false &&
                          commandResults.statusCommand.status.externalSources['Wikipedia'] === true &&
                          commandResults.statusCommand.status.externalSources['NewsAPI'] === false,
      },
    };

    // Single consolidated assertion
    expect(validationOutputs).toMatchObject({
      commands: { isArray: true, hasExpectedCommands: true },
      errorCommand: { hasCorrectType: true, hasErrorMessage: true },
      profileCommand: { hasCorrectType: true, hasProfileData: true },
      profileRelatedCommand: { hasCorrectType: true, hasProfile: true },
      searchCommand: { hasCorrectType: true, hasCorrectQuery: true, hasResults: true, hasRelevantTitle: true, hasRelevantTags: true },
      listCommands: { hasCorrectListType: true, hasExpectedTitle: true, hasCorrectTagListType: true, hasCorrectFilteredTag: true },
      noteCommand: { hasCorrectType: true, hasCorrectId: true, hasCorrectTitle: true, hasCorrectTags: true },
      askCommand: { hasCorrectType: true, hasAnswer: true, hasCitations: true, hasRelatedNotes: true },
      statusCommand: { hasCorrectType: true, hasCorrectStatus: true },
    });
  });

  test('toggle external sources functionality', async () => {
    // Enable, check, disable, check sequence
    const externalSourcesResults = {
      enableCommand: await commandHandler.processCommand('external', 'on'),
      statusAfterEnable: await commandHandler.processCommand('status', ''),
      disableCommand: await commandHandler.processCommand('external', 'off'),
      statusAfterDisable: await commandHandler.processCommand('status', ''),
    };

    // Validation outputs
    const validationOutputs = {
      enableResults: {
        hasCorrectType: externalSourcesResults.enableCommand.type === 'external',
        isEnabled: externalSourcesResults.enableCommand.type === 'external' && 
                   externalSourcesResults.enableCommand.enabled === true,
      },
      statusAfterEnable: {
        hasCorrectType: externalSourcesResults.statusAfterEnable.type === 'status',
        showsEnabled: externalSourcesResults.statusAfterEnable.type === 'status' && 
                      externalSourcesResults.statusAfterEnable.status.externalSourcesEnabled === true,
      },
      disableResults: {
        hasCorrectType: externalSourcesResults.disableCommand.type === 'external',
        isDisabled: externalSourcesResults.disableCommand.type === 'external' && 
                    externalSourcesResults.disableCommand.enabled === false,
      },
      statusAfterDisable: {
        hasCorrectType: externalSourcesResults.statusAfterDisable.type === 'status',
        showsDisabled: externalSourcesResults.statusAfterDisable.type === 'status' && 
                       externalSourcesResults.statusAfterDisable.status.externalSourcesEnabled === false,
      },
    };

    // Single consolidated assertion
    expect(validationOutputs).toMatchObject({
      enableResults: { hasCorrectType: true, isEnabled: true },
      statusAfterEnable: { hasCorrectType: true, showsEnabled: true },
      disableResults: { hasCorrectType: true, isDisabled: true },
      statusAfterDisable: { hasCorrectType: true, showsDisabled: true },
    });
  });
});
