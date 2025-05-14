import { mock } from 'bun:test';

import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { BrainProtocol } from '@/protocol/brainProtocol'; // This now points to BrainProtocol
import type { CommandInfo, CommandResult } from '@commands/core/commandTypes';
import { MockProfile } from '@test/__mocks__/models/profile';

/**
 * Mock implementation of CommandHandler for testing
 * This implementation follows the Component Interface Standardization pattern
 */
export class MockCommandHandler {
  private static instance: MockCommandHandler | null = null;
  
  // Mock state
  private mockCommands: CommandInfo[] = [
    { command: 'help', description: 'Show available commands', usage: 'help' },
    { command: 'profile', description: 'View profile information', usage: 'profile [related]' },
    { command: 'search', description: 'Search for notes', usage: 'search <query>' },
    { command: 'list', description: 'List all notes or notes with a specific tag', usage: 'list [tag]' },
    { command: 'note', description: 'Show a specific note by ID', usage: 'note <id>' },
    { command: 'ask', description: 'Ask a question to your brain', usage: 'ask <question>' },
    { command: 'external', description: 'Enable or disable external sources', usage: 'external <on|off>' },
    { command: 'status', description: 'Check system status', usage: 'status' },
  ];
  
  private externalSourcesEnabled = false;
  
  // Mock methods
  getCommands = mock(() => this.mockCommands);
  
  // Use the standard mock profile from the mocks
  private async createMockProfile(): Promise<Profile> {
    return await MockProfile.createDefault('profile-1');
  }
  
  // Create a standard mock note that matches the Note type
  private createMockNote(id: string, title: string, content: string, tags: string[]): Note {
    const now = new Date();
    return {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      embedding: null,
      tags,
      source: 'user-created',
      conversationMetadata: null,
      confidence: null,
      verified: true,
    };
  }
  
  processCommand = mock(async (command: string, args: string): Promise<CommandResult> => {
    switch (command) {
    case 'profile': {  
      if (args === 'related') {
        const profile = await this.createMockProfile();
        return {
          // Use a valid type without relatedNotes property
          type: 'profile',
          profile,
        };
      }
      
      {
        const profile = await this.createMockProfile();
        return {
          type: 'profile',
          profile,
        };
      }}
        
    case 'search':
      return Promise.resolve({
        type: 'search',
        query: args,
        notes: [
          this.createMockNote(
            'note-1',
            'Ecosystem Architecture Principles',
            'Content about ecosystem architecture',
            ['ecosystem-architecture', 'innovation'],
          ),
        ],
      });
        
    case 'list':
      if (args === 'ecosystem') {
        return Promise.resolve({
          type: 'notes',
          title: 'Notes with tag: ecosystem',
          notes: [
            this.createMockNote(
              'note-1',
              'Ecosystem Architecture Principles',
              'Content about ecosystem architecture',
              ['ecosystem', 'innovation'],
            ),
          ],
        });
      }
        
      return Promise.resolve({
        type: 'notes',
        title: 'Recent Notes',
        notes: [
          this.createMockNote(
            'note-2',
            'Building Communities',
            'Content about building communities',
            ['community', 'collaboration'],
          ),
        ],
      });
        
    case 'note':
      if (args === 'note-1') {
        return Promise.resolve({
          type: 'note',
          note: this.createMockNote(
            'note-1',
            'Ecosystem Architecture Principles',
            'Content about ecosystem architecture',
            ['ecosystem-architecture', 'innovation'],
          ),
        });
      }
        
      return Promise.resolve({
        type: 'error',
        message: `Note with ID ${args} not found`,
      });
        
    case 'ask':
      return Promise.resolve({
        type: 'ask',
        answer: 'Mock answer',
        citations: [],
        relatedNotes: [],
        externalSources: undefined,
      });
        
    case 'status':
      return Promise.resolve({
        type: 'status',
        status: {
          apiConnected: true,
          dbConnected: true,
          noteCount: 10,
          externalSourcesEnabled: this.externalSourcesEnabled,
          externalSources: {
            'Wikipedia': true,
            'NewsAPI': false,
          },
        },
      });
        
    case 'external':
      this.externalSourcesEnabled = args === 'on';
      return Promise.resolve({
        type: 'external',
        enabled: this.externalSourcesEnabled,
        message: `External knowledge sources have been ${this.externalSourcesEnabled ? 'enabled' : 'disabled'}.`,
      });
        
    default:
      return Promise.resolve({
        type: 'error',
        message: `Unknown command: ${command}`,
      });
    }
  });
  
  registerHandler = mock(() => {});
  
  // Mock confirmSaveNote method required by MatrixBrainInterface
  confirmSaveNote = mock((_conversationId: string, title?: string): Promise<CommandResult> => {
    return Promise.resolve({
      type: 'note',
      note: this.createMockNote(
        'note-from-conversation',
        title || 'Saved Conversation',
        'Content from conversation',
        ['conversation'],
      ),
    });
  });
  
  /**
   * Get the singleton instance
   */
  static getInstance(_brainProtocol?: BrainProtocol): MockCommandHandler {
    if (!MockCommandHandler.instance) {
      MockCommandHandler.instance = new MockCommandHandler();
    }
    return MockCommandHandler.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    if (MockCommandHandler.instance) {
      MockCommandHandler.instance.getCommands.mockClear();
      MockCommandHandler.instance.processCommand.mockClear();
      MockCommandHandler.instance.registerHandler.mockClear();
    }
    MockCommandHandler.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockCommandHandler {
    return new MockCommandHandler();
  }
  
  /**
   * Set custom commands for testing
   */
  setCommands(commands: CommandInfo[]): void {
    this.mockCommands = commands;
  }
}