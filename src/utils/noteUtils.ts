import type { Note } from '../models/note';

/**
 * Helper functions for displaying and formatting notes
 */

/**
 * Display a collection of notes in the console
 */
export function displayNotes(notes: Note[]) {
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