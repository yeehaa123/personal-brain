#!/usr/bin/env bun
import { createInterface } from 'readline/promises';
import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { NoteContext } from './mcp/context/noteContext';
import { displayNotes } from './utils/noteUtils';

async function processCommand(command: string, args: string, context: NoteContext, protocol: BrainProtocol) {
  if (command === 'list') {
    console.log('\nListing all notes:');
    const notes = await context.searchNotes({ limit: 100 });
    displayNotes(notes);
    return;
  }
  
  if (command === 'search') {
    console.log(`\nSearching for: ${args}`);
    const notes = await context.searchNotes({ query: args, limit: 10 });
    displayNotes(notes);
    return;
  }
  
  if (command === 'profile') {
    console.log('\nProfile Information:');
    try {
      // Get the profile using the protocol's profile context
      const profileContext = protocol.getProfileContext();
      const profile = await profileContext.getProfile();
      
      if (!profile) {
        console.log('No profile found. Use "bun run src/import.ts profile <path/to/profile.yaml>" to import a profile.');
        return;
      }
      
      // Display basic profile info
      console.log(`Name: ${profile.fullName}`);
      if (profile.headline) console.log(`Headline: ${profile.headline}`);
      if (profile.occupation) console.log(`Occupation: ${profile.occupation}`);
      
      // Display location
      const location = [profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ');
      if (location) console.log(`Location: ${location}`);
      
      // Display summary
      if (profile.summary) {
        console.log('\nSummary:');
        console.log(profile.summary);
      }
      
      // Display current experience
      if (profile.experiences && profile.experiences.length > 0) {
        console.log('\nCurrent Work:');
        const currentExperiences = profile.experiences.filter(exp => !exp.endDate);
        if (currentExperiences.length > 0) {
          currentExperiences.forEach(exp => {
            console.log(`- ${exp.title} at ${exp.company}`);
            if (exp.description) {
              // Trim long descriptions
              const desc = exp.description.length > 100 
                ? exp.description.substring(0, 100) + '...' 
                : exp.description;
              console.log(`  ${desc}`);
            }
          });
        } else {
          console.log('No current work experiences found.');
        }
      }
      
      // Display skills
      if (profile.languages && profile.languages.length > 0) {
        console.log('\nLanguages:');
        console.log(profile.languages.join(', '));
      }
      
      // Check for embedding
      if (profile.embedding) {
        console.log('\nProfile has embeddings: Yes');
      } else {
        console.log('\nProfile has embeddings: No');
        console.log('Run "bun run src/embed.ts profile" to generate embeddings.');
      }
      
      // Display tags if available
      if (profile.tags && profile.tags.length > 0) {
        console.log('\nProfile Tags:');
        console.log(profile.tags.join(', '));
      } else {
        console.log('\nProfile Tags: None');
        console.log('Run "bun run tag" to generate tags.');
      }
      
      // If we have args "related", show notes related to profile
      if (args && args.toLowerCase() === 'related') {
        console.log('\nFinding notes related to your profile...');
        
        // Find notes related to profile
        const noteContext = protocol.getNoteContext();
        const relatedNotes = await profileContext.findRelatedNotes(noteContext, 5);
        
        console.log('\nNotes related to your profile:');
        if (relatedNotes.length > 0) {
          // Explain how we found the notes
          if (profile.tags && profile.tags.length > 0) {
            console.log('(Matched by profile tags and semantic similarity)\n');
          } else if (profile.embedding) {
            console.log('(Matched by semantic similarity)\n');
          } else {
            console.log('(Matched by keyword similarity)\n');
          }
          
          displayNotes(relatedNotes);
        } else {
          console.log('No related notes found. Try generating embeddings and tags for your notes and profile.');
          console.log('You can run "bun run tag" to generate profile tags.');
        }
      }
      
      // Extract profile keywords for search purposes
      const keywords = profileContext.extractProfileKeywords(profile);
      console.log('\nProfile Keywords:');
      console.log(keywords.slice(0, 15).join(', '));
      
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    return;
  }
  
  if (command === 'ask') {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('\nError: To use the ask feature, you need to set the ANTHROPIC_API_KEY environment variable.');
      console.log('You can do this by running: export ANTHROPIC_API_KEY=your_api_key');
      return;
    }
    
    console.log(`\nAsking: ${args}`);
    console.log('Thinking...');
    
    try {
      const result = await protocol.processQuery(args);
      
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
      
      // Display profile if it was included in the response
      if (result.profile) {
        console.log('\nProfile Information:');
        console.log(`Name: ${result.profile.fullName}`);
        if (result.profile.occupation) console.log(`Occupation: ${result.profile.occupation}`);
        if (result.profile.headline) console.log(`Headline: ${result.profile.headline}`);
        // Additional profile information could be displayed here
      }
    } catch (error) {
      console.error('Error processing question:', error);
    }
    
    return;
  }
  
  // Default case - unknown command
  console.log('Unknown command. Type "help" to see available commands.');
}

async function main() {
  const context = new NoteContext();
  const protocol = new BrainProtocol();
  
  // Check if we're running in command line mode
  if (process.argv.length > 2) {
    const command = process.argv[2].toLowerCase();
    const args = process.argv.slice(3).join(' ');
    
    await processCommand(command, args, context, protocol);
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
      console.log('\nAvailable commands:');
      console.log('  search [query]    - Search for notes');
      console.log('  list              - List all notes');
      console.log('  profile           - View your profile information');
      console.log('  profile related   - Find notes related to your profile');
      console.log('  ask [question]    - Ask a question to your brain (requires API key)');
      console.log('  exit              - Exit the program');
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
    
    await processCommand(command, args, context, protocol);
  }
  
  rl.close();
  console.log('Goodbye!');
}

main();