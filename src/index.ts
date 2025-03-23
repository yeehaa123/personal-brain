import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { NoteContext } from './mcp/context/noteContext';
import { displayNotes } from './utils/noteUtils';

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
