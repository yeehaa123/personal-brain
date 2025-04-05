/**
 * Main command handler
 * Coordinates all command handlers and delegates commands to the appropriate handler
 */

import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import logger from '@/utils/logger';

import type { BaseCommandHandler } from './baseCommandHandler';
import type { CommandInfo, CommandResult } from './commandTypes';

/**
 * Main command handler that delegates to specialized handlers
 */
export class CommandHandler {
  private handlers: BaseCommandHandler[] = [];
  
  constructor(_brainProtocol: BrainProtocol) {
    // brainProtocol is not used in this class but is passed to handlers
  }

  /**
   * Register a command handler
   */
  registerHandler(handler: BaseCommandHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Get all available commands
   */
  getCommands(): CommandInfo[] {
    return this.handlers.flatMap(handler => handler.getCommands());
  }

  /**
   * Process a command string and delegate to the appropriate handler
   */
  async processCommand(command: string, args: string): Promise<CommandResult> {
    try {
      // Find the appropriate handler
      const handler = this.handlers.find(h => h.canHandle(command));

      if (handler) {
        logger.debug(`Executing command ${command} with handler ${handler.constructor.name}`);
        return await handler.execute(command, args);
      }

      // No handler found
      logger.warn(`No handler found for command: ${command}`);
      return {
        type: 'error',
        message: `Unknown command: ${command}`,
      };
    } catch (error: unknown) {
      logger.error(`Error processing command ${command}: ${error instanceof Error ? error.stack : String(error)}`);
      return {
        type: 'error',
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Special method for handling save-note confirmations
   */
  async confirmSaveNote(conversationId: string, title?: string, userEdits?: string): Promise<CommandResult> {
    // Find the command handler that manages conversation notes
    const handler = this.handlers.find(h => h.canHandle('save-note'));
    
    if (!handler || !('confirmSaveNote' in handler)) {
      return {
        type: 'error',
        message: 'Save note confirmation is not supported',
      };
    }

    try {
      // Call the handler's confirmSaveNote method
      // This is a special case for ConversationCommandHandler
      const conversationHandler = handler as { confirmSaveNote: (id: string, title?: string, edits?: string) => Promise<CommandResult> };
      return await conversationHandler.confirmSaveNote(conversationId, title, userEdits);
    } catch (error: unknown) {
      logger.error(`Error confirming save note: ${error instanceof Error ? error.stack : String(error)}`);
      return {
        type: 'error',
        message: `Error confirming save note: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}