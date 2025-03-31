#!/usr/bin/env bun
import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { CommandHandler } from './commands';
import { CLIRenderer } from './commands/cli-renderer';
import { CLIApp } from './interfaces/cli-app';
import { CLIInterface } from './utils/cliInterface';
import logger from './utils/logger';

async function main() {
  // Initialize components
  const brainProtocol = new BrainProtocol();
  const commandHandler = new CommandHandler(brainProtocol);
  const renderer = new CLIRenderer();
  
  // Create CLI application with dependencies
  const cliApp = new CLIApp({
    commandHandler,
    renderer,
  });
  
  // Start the CLI application
  await cliApp.start();
}

main().catch(error => {
  logger.error('Fatal error:', error);
  CLIInterface.error(`A fatal error occurred: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});