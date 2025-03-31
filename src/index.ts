import { BrainProtocol } from './mcp/protocol/brainProtocol';
import { NoteContext } from './mcp/context/noteContext';
import { displayNotes } from './utils/noteUtils';
import logger from './utils/logger';

async function main() {
  try {
    logger.info('Welcome to your Personal Brain!', { context: 'Main' });

    // Initialize the context manager
    const context = new NoteContext();

    // Fetch all notes from the database
    const allNotes = await context.searchNotes({ limit: 100 });

    logger.info(`Found ${allNotes.length} notes in your database:`, { context: 'Main' });
    await displayNotes(allNotes);

    if (process.env.ANTHROPIC_API_KEY) {
      logger.info('--- Example Query using MCP ---', { context: 'Main' });
      const protocol = new BrainProtocol();
      const result = await protocol.processQuery('What are the main features of this system?');

      logger.info('\nAnswer:', { context: 'Main' });
      logger.info(result.answer, { context: 'Main' });

      if (result.citations.length > 0) {
        logger.info('\nCitations:', { context: 'Main' });
        result.citations.forEach(citation => {
          logger.info(`- ${citation.noteTitle}`, { context: 'Main' });
        });
      }

      if (result.relatedNotes.length > 0) {
        logger.info('\nRelated Notes:', { context: 'Main' });
        await displayNotes(result.relatedNotes);
      }
    } else {
      logger.warn('To use the AI features, set the ANTHROPIC_API_KEY environment variable.', { context: 'Main' });
    }

  } catch (error) {
    logger.error('Error in main application:', { error, context: 'Main' });
  }
}

main();
