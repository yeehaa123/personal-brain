/**
 * Note commands handler
 * Handles note-related commands
 */

import type { NoteContext } from '@/mcp';
import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import logger from '@/utils/logger';

import { BaseCommandHandler } from '../core/baseCommandHandler';
import type { CommandInfo, CommandResult } from '../core/commandTypes';

/**
 * Handler for note-related commands
 */
export class NoteCommandHandler extends BaseCommandHandler {
  private noteContext: NoteContext;

  constructor(brainProtocol: BrainProtocol) {
    super(brainProtocol);
    this.noteContext = brainProtocol.getNoteContext();
  }

  /**
   * Get supported commands
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'note',
        description: 'Show a specific note by ID',
        usage: 'note <id>',
        examples: ['note abc123'],
      },
      {
        command: 'list',
        description: 'List all notes or notes with a specific tag',
        usage: 'list [tag]',
        examples: ['list', 'list ecosystem'],
      },
      {
        command: 'search',
        description: 'Search for notes',
        usage: 'search <query>',
        examples: ['search ecosystem', 'search "personal knowledge"'],
      },
    ];
  }

  /**
   * Check if this handler can process the command
   */
  canHandle(command: string): boolean {
    return ['note', 'list', 'search'].includes(command);
  }

  /**
   * Execute a command
   */
  async execute(command: string, args: string): Promise<CommandResult> {
    switch (command) {
    case 'note':
      return await this.handleNote(args);
    case 'list':
      return await this.handleList(args);
    case 'search':
      return await this.handleSearch(args);
    default:
      return this.formatError(`Unknown command: ${command}`);
    }
  }

  /**
   * Handle note command
   */
  private async handleNote(noteId: string): Promise<CommandResult> {
    if (!noteId) {
      return this.formatError('Please provide a note ID');
    }

    const note = await this.noteContext.getNoteById(noteId);

    if (!note) {
      return this.formatError(`Note with ID ${noteId} not found`);
    }

    return { type: 'note', note };
  }

  /**
   * Handle list command
   */
  private async handleList(tagFilter?: string): Promise<CommandResult> {
    let notes;
    let title;

    if (tagFilter) {
      notes = await this.noteContext.searchNotes({ tags: [tagFilter], limit: 10 });
      title = `Notes with tag: ${tagFilter}`;

      if (notes.length === 0) {
        return this.formatError(`No notes found with tag: ${tagFilter}`);
      }
    } else {
      notes = await this.noteContext.searchNotes({ limit: 10 });
      title = 'Recent Notes';

      if (notes.length === 0) {
        return this.formatError('No notes found in the system');
      }
    }

    return { type: 'notes', notes, title };
  }

  /**
   * Handle search command
   */
  private async handleSearch(query: string): Promise<CommandResult> {
    if (!query) {
      return this.formatError('Please provide a search query');
    }

    logger.info(`Searching for notes with query: ${query}`);
    const notes = await this.noteContext.searchNotes({ query, limit: 10 });
    return { type: 'search', query, notes };
  }
}