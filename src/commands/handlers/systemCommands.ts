/**
 * System commands handler
 * Handles system-related commands like help, status, and external sources
 */

import type { ExternalSourceContext, NoteContext } from '@/mcp';
import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import logger from '@/utils/logger';

import { BaseCommandHandler } from '../core/baseCommandHandler';
import type { CommandInfo, CommandResult } from '../core/commandTypes';

/**
 * Handler for system-related commands
 */
export class SystemCommandHandler extends BaseCommandHandler {
  private noteContext: NoteContext;
  private externalContext: ExternalSourceContext;

  constructor(brainProtocol: BrainProtocol) {
    super(brainProtocol);
    this.noteContext = brainProtocol.getNoteContext();
    this.externalContext = brainProtocol.getExternalSourceContext();
  }

  /**
   * Get supported commands
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'help',
        description: 'Show available commands',
        usage: 'help',
      },
      {
        command: 'external',
        description: 'Enable or disable external knowledge sources',
        usage: 'external <on|off>',
        examples: ['external on', 'external off'],
      },
      {
        command: 'status',
        description: 'Check system status including external sources',
        usage: 'status',
        examples: ['status'],
      },
    ];
  }

  /**
   * Check if this handler can process the command
   */
  canHandle(command: string): boolean {
    return ['help', 'external', 'status'].includes(command);
  }

  /**
   * Execute a command
   */
  async execute(command: string, args: string): Promise<CommandResult> {
    switch (command) {
    case 'help':
      // The help command is typically handled at a higher level
      // by displaying all registered commands
      return { type: 'error', message: 'Help command should be handled by the main command handler' };
    case 'external':
      return await this.handleExternal(args);
    case 'status':
      return await this.handleStatus();
    default:
      return this.formatError(`Unknown command: ${command}`);
    }
  }

  /**
   * Handle external command - toggle external sources
   */
  private async handleExternal(args: string): Promise<CommandResult> {
    const arg = args.trim().toLowerCase();

    if (arg === 'on' || arg === 'enable') {
      this.brainProtocol.setUseExternalSources(true);
      return {
        type: 'external',
        enabled: true,
        message: 'External knowledge sources have been enabled.',
      };
    } else if (arg === 'off' || arg === 'disable') {
      this.brainProtocol.setUseExternalSources(false);
      return {
        type: 'external',
        enabled: false,
        message: 'External knowledge sources have been disabled.',
      };
    } else {
      return {
        type: 'error',
        message: 'Usage: external <on|off> - Enable or disable external knowledge sources',
      };
    }
  }

  /**
   * Handle status command - check system status
   */
  private async handleStatus(): Promise<CommandResult> {
    // Check API connection using BrainProtocol methods
    const apiConnected = this.brainProtocol.hasAnthropicApiKey() || this.brainProtocol.hasOpenAIApiKey();

    // Check database connection with a single operation
    let dbConnected = false;
    let noteCount = 0;

    try {
      // Get recent notes - this operation will tell us both if DB is connected
      // and how many notes exist (length of returned array)
      const notes = await this.noteContext.searchNotes({ limit: 1 });
      dbConnected = true;

      // If we were able to get notes, we can also get the total count
      try {
        noteCount = await this.noteContext.getNoteCount();
      } catch (countError) {
        // If count fails but we got notes, use the notes array length as fallback
        noteCount = notes.length;
        logger.error(`Error getting note count, using fallback: ${countError}`);
      }
    } catch (error) {
      logger.error(`Error checking database connection: ${error}`);
      dbConnected = false;
    }

    // Check external sources with error handling
    let externalSources = {};
    try {
      externalSources = await this.externalContext.checkSourcesAvailability();
    } catch (error) {
      logger.error(`Error checking external sources: ${error}`);
      // Failed to check external sources, continue with empty object
    }

    const externalSourcesEnabled = this.brainProtocol.getUseExternalSources();

    return {
      type: 'status',
      status: {
        apiConnected,
        dbConnected,
        noteCount,
        externalSources,
        externalSourcesEnabled,
      },
    };
  }
}