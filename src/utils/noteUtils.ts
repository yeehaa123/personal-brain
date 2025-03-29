import type { Note } from '../models/note';
import chalk from 'chalk';
import { CLIInterface } from './cliInterface';
import logger from './logger';

/**
 * Helper functions for displaying and formatting notes
 */

/**
 * Display a collection of notes in the console
 */
export function displayNotes(notes: Note[]) {
  if (notes.length === 0) {
    CLIInterface.warn('No notes found.');
    return;
  }

  logger.info(`Displaying ${notes.length} notes`);
  
  notes.forEach((note, index) => {
    // Title with index
    CLIInterface.print(`\n${CLIInterface.styles.number(`[${index + 1}]`)} ${CLIInterface.styles.subtitle(note.title)}`);
    
    // Display metadata using label-value formatting
    CLIInterface.printLabelValue('ID', note.id, { formatter: id => CLIInterface.formatId(id) });
    // Convert tags to a proper string array or null to handle database types
    const tagArray = note.tags ? Array.isArray(note.tags) ? note.tags.map(String) : null : null;
    CLIInterface.printLabelValue('Tags', tagArray, { emptyText: 'none', formatter: tag => CLIInterface.styles.tag(`#${tag}`) });
    CLIInterface.printLabelValue('Created', CLIInterface.formatDate(new Date(note.createdAt)));

    // Content preview
    const contentPreview = note.content.length > 100
      ? note.content.substring(0, 100) + '...'
      : note.content;
    CLIInterface.printLabelValue('Preview', contentPreview);
  });
}

/**
 * Format a note as a preview string (useful for CLI and Matrix interfaces)
 */
export function formatNotePreview(note: Note, index: number, includeNewlines = true): string {
  const nl = includeNewlines ? '\n' : ' ';
  const title = `**${index}. ${note.title}**`;
  const id = `ID: \`${note.id}\``;
  
  const tags = note.tags && note.tags.length > 0
    ? `Tags: ${note.tags.map(tag => `\`${tag}\``).join(', ')}`
    : 'No tags';
  
  // Extract a content preview
  const contentWithoutSource = note.content.replace(/<!--\s*source:[^>]+-->\n?/, '');
  const preview = contentWithoutSource.length > 100
    ? contentWithoutSource.substring(0, 100) + '...'
    : contentWithoutSource;
  
  return `${title}${nl}${id} - ${tags}${nl}${preview}`;
}

/**
 * Get a short excerpt from the content
 */
export function getExcerpt(content: string, maxLength = 150): string {
  // Skip the source ID comment if present
  let cleanContent = content;
  if (content.startsWith('<!--') && content.includes('-->')) {
    cleanContent = content.substring(content.indexOf('-->') + 3).trim();
  }
  
  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }
  
  return cleanContent.substring(0, maxLength) + '...';
}