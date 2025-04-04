/**
 * CLI Application for Personal Brain
 * 
 * This class handles the CLI lifecycle and input processing,
 * separating the concerns of:
 * - Command line argument parsing
 * - Command execution
 * - Input/output handling
 * - Error handling
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

import type { CommandHandler } from '../commands';
import type { CLIRenderer } from '../commands/cli-renderer';
import { CLIInterface } from '../utils/cliInterface';
import logger from '../utils/logger';

// Command parsing types
interface ParsedCommand {
  command: string;
  args: string;
}

export interface CLIAppOptions {
  commandHandler: CommandHandler;
  renderer: CLIRenderer;
}

export class CLIApp {
  private commandHandler: CommandHandler;
  private renderer: CLIRenderer;
  private running = false;

  constructor(options: CLIAppOptions) {
    this.commandHandler = options.commandHandler;
    this.renderer = options.renderer;
    // Connect the command handler to the renderer for interactive commands
    this.renderer.setCommandHandler(this.commandHandler);
  }

  /**
   * Start the CLI application
   * First checks for command line arguments, 
   * otherwise starts interactive mode
   */
  async start(): Promise<void> {
    // Check if we're running in command line mode
    if (process.argv.length > 2) {
      await this.runCommandLineMode();
    } else {
      await this.runInteractiveMode();
    }
  }

  /**
   * Run a single command from command line arguments
   */
  private async runCommandLineMode(): Promise<void> {
    const command = process.argv[2].toLowerCase();
    const args = process.argv.slice(3).join(' ');

    logger.info(`Running command: ${command} ${args}`);

    if (command === 'help') {
      this.renderer.renderHelp(this.commandHandler.getCommands());
      return;
    }

    try {
      const result = await this.commandHandler.processCommand(command, args);
      this.renderer.render(result);
    } catch (error) {
      CLIInterface.error(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Command error: ${error instanceof Error ? error.stack : String(error)}`);
    }
  }

  /**
   * Run interactive mode with command prompt
   */
  private async runInteractiveMode(): Promise<void> {
    CLIInterface.displayTitle('Personal Brain CLI');
    CLIInterface.info('Type "help" to see available commands, or "exit" to quit');

    this.running = true;
    while (this.running) {
      try {
        const input = await this.promptForCommand();
        if (!input) continue;

        // Handle special commands
        if (this.handleSpecialCommands(input)) continue;

        // Parse and execute regular commands
        const { command, args } = this.parseCommand(input);
        await this.executeCommand(command, args);
      } catch (error) {
        CLIInterface.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        logger.error(`Interactive mode error: ${error instanceof Error ? error.stack : String(error)}`);
      }
    }

    CLIInterface.success('Goodbye!');
  }

  /**
   * Prompt the user for a command
   */
  private async promptForCommand(): Promise<string> {
    const { action } = await inquirer.prompt({
      type: 'input',
      name: 'action',
      message: chalk.cyan('brain>'),
    });

    const input = action.trim();
    logger.info(`User entered: ${input}`);
    return input;
  }

  /**
   * Handle special commands like exit and help
   * @returns true if handled as special command
   */
  private handleSpecialCommands(input: string): boolean {
    const normalizedInput = input.toLowerCase();

    // Exit command
    if (normalizedInput === 'exit' || normalizedInput === 'quit') {
      this.running = false;
      return true;
    }

    // Help command
    if (normalizedInput === 'help') {
      this.renderer.renderHelp(this.commandHandler.getCommands());
      return true;
    }

    return false;
  }

  /**
   * Parse a command string into command and arguments
   */
  private parseCommand(input: string): ParsedCommand {
    if (input.includes(' ')) {
      const spaceIndex = input.indexOf(' ');
      const command = input.substring(0, spaceIndex).toLowerCase();
      const args = input.substring(spaceIndex + 1).trim();
      return { command, args };
    } else {
      return { command: input.toLowerCase(), args: '' };
    }
  }

  /**
   * Execute a parsed command
   */
  private async executeCommand(command: string, args: string): Promise<void> {
    try {
      // Show a spinner for commands that might take time
      if (['search', 'ask', 'profile'].includes(command) && args) {
        await CLIInterface.withSpinner(`Processing ${command} command...`, async () => {
          const result = await this.commandHandler.processCommand(command, args);
          this.renderer.render(result);
          return null;
        });
      } else {
        const result = await this.commandHandler.processCommand(command, args);
        this.renderer.render(result);
      }
    } catch (error) {
      CLIInterface.error(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Command error: ${error instanceof Error ? error.stack : String(error)}`);
    }
  }

  /**
   * Stop the CLI application
   */
  stop(): void {
    this.running = false;
  }
}
