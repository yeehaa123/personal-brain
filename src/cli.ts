#!/usr/bin/env bun
import { createInterface } from 'readline/promises';
import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { NoteContext } from './mcp/context/noteContext';
import { displayNotes } from './utils/noteUtils';

async function main() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const context = new NoteContext();
  const protocol = new BrainProtocol();
  
  console.log('Welcome to your Personal Brain CLI!');
  console.log('Type "help" to see available commands, or "exit" to quit');
  
  while (true) {
    const input = await rl.question('\n> ');
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      break;
    }
    
    if (input.toLowerCase() === 'help') {
      console.log('\nAvailable commands:');
      console.log('  search [query]    - Search for notes');
      console.log('  list              - List all notes');
      console.log('  ask [question]    - Ask a question to your brain (requires API key)');
      console.log('  exit              - Exit the program');
      continue;
    }
    
    if (input.toLowerCase().startsWith('list')) {
      console.log('\nListing all notes:');
      const notes = await context.searchNotes({ limit: 100 });
      displayNotes(notes);
      continue;
    }
    
    if (input.toLowerCase().startsWith('search ')) {
      const query = input.substring(7).trim();
      console.log(`\nSearching for: ${query}`);
      const notes = await context.searchNotes({ query, limit: 10 });
      displayNotes(notes);
      continue;
    }
    
    if (input.toLowerCase().startsWith('ask ')) {
      const question = input.substring(4).trim();
      
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('\nError: To use the ask feature, you need to set the ANTHROPIC_API_KEY environment variable.');
        console.log('You can do this by running: export ANTHROPIC_API_KEY=your_api_key');
        continue;
      }
      
      console.log(`\nAsking: ${question}`);
      console.log('Thinking...');
      
      try {
        const result = await protocol.processQuery(question);
        
        console.log('\nAnswer:');
        console.log(result.answer);
        
        if (result.citations.length > 0) {
          console.log('\nCitations:');
          result.citations.forEach(citation => {
            console.log(`- ${citation.noteTitle} (${citation.noteId})`);
          });
        }
        
        if (result.relatedNotes.length > 0) {
          console.log('\nRelated Notes:');
          displayNotes(result.relatedNotes);
        }
      } catch (error) {
        console.error('Error processing question:', error);
      }
      
      continue;
    }
    
    // Default case - unknown command
    console.log('Unknown command. Type "help" to see available commands.');
  }
  
  rl.close();
  console.log('Goodbye!');
}

main();