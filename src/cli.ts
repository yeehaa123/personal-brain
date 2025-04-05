#!/usr/bin/env bun
import { conversationConfig } from '@/config';
import { BrainProtocol } from '@mcp/protocol/brainProtocol';

import { createCommandHandler } from './commands';
import { CLIRenderer } from './commands/cli-renderer';
import { CLIApp } from './interfaces/cli-app';
import { CLIInterface } from './utils/cliInterface';
import logger from './utils/logger';

async function main() {
  // Initialize components using the singleton pattern with room ID
  const brainProtocol = BrainProtocol.getInstance({
    interfaceType: 'cli',
    roomId: conversationConfig.defaultCliRoomId,
  });
  
  const commandHandler = createCommandHandler(brainProtocol);
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