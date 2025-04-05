/**
 * Base command handler
 * Abstract class that all command handlers extend
 */

import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import logger from '@/utils/logger';

import type { CommandInfo, CommandResult } from './commandTypes';

/**
 * Abstract base command handler
 * Provides common functionality for all command handlers
 */
export abstract class BaseCommandHandler {
  protected brainProtocol: BrainProtocol;

  constructor(brainProtocol: BrainProtocol) {
    this.brainProtocol = brainProtocol;
  }

  /**
   * Get a list of commands this handler supports
   */
  abstract getCommands(): CommandInfo[];

  /**
   * Check if this handler can process the given command
   */
  abstract canHandle(command: string): boolean;

  /**
   * Execute a command with the given arguments
   */
  abstract execute(command: string, args: string): Promise<CommandResult>;

  /**
   * Format an error response
   */
  protected formatError(message: string): CommandResult {
    logger.error(`Command error: ${message}`);
    return { type: 'error', message };
  }

  /**
   * Check if API key is available
   */
  protected requireApiKey(): boolean {
    return this.brainProtocol.hasAnthropicApiKey() || this.brainProtocol.hasOpenAIApiKey();
  }

  /**
   * Check if there's an active conversation
   */
  protected hasActiveConversation(): boolean {
    return this.brainProtocol.hasActiveConversation();
  }

  /**
   * Get the API key error message
   */
  protected getApiKeyErrorMessage(): string {
    return 'No Anthropic API key found. Set the ANTHROPIC_API_KEY environment variable to use this feature.';
  }
}