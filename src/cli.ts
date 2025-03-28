#!/usr/bin/env bun
import { createInterface } from 'readline/promises';
import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { CommandHandler } from './commands';
import { CLIRenderer } from './commands/cli-renderer';

async function main() {
  const brainProtocol = new BrainProtocol();
  const commandHandler = new CommandHandler(brainProtocol);
  const renderer = new CLIRenderer();
  
  // Check if we're running in command line mode
  if (process.argv.length > 2) {
    const command = process.argv[2].toLowerCase();
    const args = process.argv.slice(3).join(' ');
    
    if (command === 'help') {
      renderer.renderHelp(commandHandler.getCommands());
      return;
    }
    
    const result = await commandHandler.processCommand(command, args);
    renderer.render(result);
    return;
  }
  
  // Interactive mode
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('Welcome to your Personal Brain CLI!');
  console.log('Type "help" to see available commands, or "exit" to quit');
  
  while (true) {
    const input = await rl.question('\n> ');
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      break;
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
    
    const result = await commandHandler.processCommand(command, args);
    renderer.render(result);
  }
  
  rl.close();
  console.log('Goodbye!');
}

main();