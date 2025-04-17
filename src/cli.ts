#!/usr/bin/env bun
import { conversationConfig } from '@/config';
import { getServerManager } from '@/contexts/website/services/serverManager';
import { BrainProtocol } from '@/protocol/brainProtocol';

import { createCommandHandler } from './commands';
import { CLIRenderer } from './commands/cli-renderer';
import { CLIApp } from './interfaces/cli-app';
import { CLIInterface } from './utils/cliInterface';
import logger from './utils/logger';

// Set environment variables for development auto-start if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

async function main() {
  // Initialize and start website servers for all environments
  logger.info('Initializing and starting website servers');
  const serverManager = getServerManager();
  await serverManager.initialize();
  
  // Explicitly start servers after initialization
  const startResult = await serverManager.startServers();
  if (startResult) {
    logger.info('Website servers started successfully');
  } else {
    logger.warn('Some website servers may not have started properly');
  }

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
  
  // Track if we're in the process of exiting
  let isExiting = false;
  
  // Create a function to handle cleanup with a promise
  const performCleanup = async (): Promise<void> => {
    if (isExiting) return; // Prevent multiple cleanup attempts
    isExiting = true;
    
    logger.info('Shutting down, cleaning up resources...');
    
    try {
      // Always use the ServerManager to stop servers in any environment
      logger.info('Stopping website servers via ServerManager...');
      
      const serverManager = getServerManager();
      // Use the stronger cleanup method that forcefully stops all servers
      await serverManager.cleanup();
      
      // Reset the server manager singleton to clean up its resources
      const { ServerManager } = await import('@/contexts/website/services/serverManager');
      ServerManager.resetInstance();
      
      logger.info('Website servers stopped successfully.');
      
      // Reset the brain protocol, which will cascade to reset other contexts
      logger.info('Resetting brain protocol...');
      BrainProtocol.resetInstance();
      
      logger.info('Cleanup completed successfully.');
    } catch (error) {
      logger.error('Error during cleanup:', { error });
    }
  };
  
  // Register normal exit handler
  process.on('exit', () => {
    logger.info('Process exiting.');
  });
  
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await cliApp.stop();
    await performCleanup();
    process.exit(0);
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await cliApp.stop();
    await performCleanup();
    process.exit(0);
  });
  
  // Start the CLI application
  try {
    await cliApp.start();
  } finally {
    // Ensure we clean up when the CLI is done
    // This is crucial for command line mode
    logger.info('CLI execution complete, cleaning up resources...');
    await performCleanup();
  }
}

main().catch(async error => {
  logger.error('Fatal error:', error);
  CLIInterface.error(`A fatal error occurred: ${error instanceof Error ? error.message : String(error)}`);
  
  // Clean up before exiting
  try {
    // Always use the ServerManager for cleanup
    logger.info('Stopping website servers after error...');
    const serverManager = getServerManager();
    await serverManager.cleanup();
    
    // Reset the brain protocol
    logger.info('Resetting brain protocol after error...');
    BrainProtocol.resetInstance();
    
    logger.info('Cleanup after error completed.');
  } catch (cleanupError) {
    logger.error('Error during cleanup after fatal error:', cleanupError);
  }
  
  process.exit(1);
});