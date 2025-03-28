#!/usr/bin/env bun
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { CommandHandler } from './commands';
import { CLIRenderer } from './commands/cli-renderer';
import { CLIInterface } from './utils/cliInterface';
import logger from './utils/logger';

async function main() {
  const brainProtocol = new BrainProtocol();
  const commandHandler = new CommandHandler(brainProtocol);
  const renderer = new CLIRenderer();
  
  // Check if we're running in command line mode
  if (process.argv.length > 2) {
    const command = process.argv[2].toLowerCase();
    const args = process.argv.slice(3).join(' ');
    
    logger.info(`Running command: ${command} ${args}`);
    
    if (command === 'help') {
      renderer.renderHelp(commandHandler.getCommands());
      return;
    }
    
    const result = await commandHandler.processCommand(command, args);
    renderer.render(result);
    return;
  }
  
  // Interactive mode
  CLIInterface.displayTitle('Personal Brain CLI');
  CLIInterface.info('Type "help" to see available commands, or "exit" to quit');
  
  let running = true;
  while (running) {
    const { action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'action',
        message: chalk.cyan('brain>'),
        prefix: ''
      }
    ]);
    
    const input = action.trim();
    logger.info(`User entered: ${input}`);
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      running = false;
      continue;
    }
    
    if (input.toLowerCase() === 'help') {
      renderer.renderHelp(commandHandler.getCommands());
      continue;
    }
    
    let command = '';
    let args = '';
    
    if (input.includes(' ')) {
      const spaceIndex = input.indexOf(' ');
      command = input.substring(0, spaceIndex).toLowerCase();
      args = input.substring(spaceIndex + 1).trim();
    } else {
      command = input.toLowerCase();
    }
    
    try {
      // Show a spinner for commands that might take time
      if (['search', 'ask', 'profile'].includes(command) && args) {
        await CLIInterface.withSpinner(`Processing ${command} command...`, async () => {
          const result = await commandHandler.processCommand(command, args);
          renderer.render(result);
          return null;
        });
      } else {
        const result = await commandHandler.processCommand(command, args);
        renderer.render(result);
      }
    } catch (error) {
      CLIInterface.error(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Command error: ${error instanceof Error ? error.stack : String(error)}`);
    }
  }
  
  CLIInterface.success('Goodbye!');
}

main().catch(error => {
  logger.error('Fatal error:', error);
  CLIInterface.error(`A fatal error occurred: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});