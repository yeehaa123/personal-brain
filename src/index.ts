import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { NoteContext } from './mcp/context/noteContext';
import type { Note } from './models/note';

async function displayNotes(notes: Note[]) {
  if (notes.length === 0) {
    console.log('No notes found.');
    return;
  }

  notes.forEach((note, index) => {
    console.log(`\n[${index + 1}] ${note.title}`);
    console.log(`ID: ${note.id}`);
    console.log(`Tags: ${note.tags ? note.tags.join(', ') : 'none'}`);
    console.log(`Created: ${new Date(note.createdAt).toLocaleString()}`);

    // Show a preview of the content (first 100 characters)
    const contentPreview = note.content.length > 100
      ? note.content.substring(0, 100) + '...'
      : note.content;
    console.log(`Preview: ${contentPreview}`);
  });
}

async function main() {
  try {
    console.log('Welcome to your Personal Brain!');

    // Initialize the context manager
    const context = new NoteContext();

    // Fetch all notes from the database
    const allNotes = await context.searchNotes({ limit: 100 });

    console.log(`Found ${allNotes.length} notes in your database:`);
    await displayNotes(allNotes);

    if (process.env.ANTHROPIC_API_KEY) {
      console.log('\n--- Example Query using MCP ---');
      const protocol = new BrainProtocol();
      const result = await protocol.processQuery('What are the main features of this system?');

      console.log('\nAnswer:');
      console.log(result.answer);

      if (result.citations.length > 0) {
        console.log('\nCitations:');
        result.citations.forEach(citation => {
          console.log(`- ${citation.noteTitle}`);
        });
      }

      if (result.relatedNotes.length > 0) {
        console.log('\nRelated Notes:');
        await displayNotes(result.relatedNotes);
      }
    } else {
      console.log('\nTo use the AI features, set the ANTHROPIC_API_KEY environment variable.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
