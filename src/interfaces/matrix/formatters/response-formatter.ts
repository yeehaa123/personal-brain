/**
 * Response formatter for Matrix
 * 
 * Creates consistent, structured responses for different result types
 */

import logger from '@/utils/logger';
import { getExcerpt } from '@/utils/noteUtils';

import { MatrixBlockBuilder } from './block-formatter';
import { getCitationFormatter } from './citation-formatter';
import { getMarkdownFormatter } from './markdown-formatter';
import type { 
  CitationReference, 
  LandingPageResult, 
  NotePreview, 
  SaveNoteConfirmResult, 
  SaveNotePreviewResult,
  SystemStatus,
  WebsiteBuildResult, 
  WebsiteConfigResult,
  WebsitePromoteResult,
  WebsiteStatusResult,
} from './types';

/**
 * Format a note preview for display in lists, removing attribution footers
 * 
 * @param note The note to format
 * @param index Display index number
 * @param includeNewlines Whether to include newlines in the output
 * @returns Formatted preview string
 */
function formatNotePreviewInternal(note: NotePreview, index: number, includeNewlines = true): string {
  const nl = includeNewlines ? '\n' : ' ';
  const title = `**${index}. ${note.title}**`;
  const id = `ID: \`${note.id}\``;
  
  const tags = note.tags && note.tags.length > 0
    ? `Tags: ${note.tags.map(tag => `\`${tag}\``).join(', ')}`
    : 'No tags';
  
  // Extract a content preview
  // First, remove source comments
  let cleanContent = note.content.replace(/<!--\\s*source:[^>]+-->\\n?/, '');
  
  // Remove attribution/footnote sections that appear at the end of conversation notes
  // The /s flag allows . to match newlines, so we can match across multiple lines
  cleanContent = cleanContent.replace(/(?:\n+---\n+)?>\s*\*\*Note\*\*: This content was derived from a conversation[\s\S]*$/m, '');
  
  // Get a preview of just the clean content
  const preview = cleanContent.length > 100
    ? cleanContent.substring(0, 100) + '...'
    : cleanContent;
  
  return `${title}${nl}${id} - ${tags}${nl}${preview}`;
}

/**
 * Helper function to safely format a date
 */
function formatDate(dateValue: string | Date | undefined | null, formatFn: (date: Date) => string): string {
  if (!dateValue) return 'Unknown';
  
  try {
    if (dateValue instanceof Date) {
      return formatFn(dateValue);
    }
    return formatFn(new Date(String(dateValue)));
  } catch (_error) {
    return 'Invalid date';
  }
}

// Response types
export type ResponseType = 
  'search' | 'note' | 'notes' | 'profile' | 
  'ask' | 'error' | 'status' | 'tags' |
  'save-note-preview' | 'save-note-confirm' | 'conversation-notes' |
  'website-config' | 'landing-page' |
  'website-build' | 'website-promote' | 'website-status';

// Response formatter options
export interface ResponseFormatterOptions {
  useBlocks?: boolean;
  commandPrefix?: string;
}

/**
 * Matrix Response Formatter
 * 
 * Creates structured, consistent responses for different result types
 */
export class MatrixResponseFormatter {
  private markdown = getMarkdownFormatter();
  private citations = getCitationFormatter();
  private useBlocks: boolean;
  private commandPrefix: string;

  constructor(options: ResponseFormatterOptions = {}) {
    this.useBlocks = options.useBlocks || false;
    this.commandPrefix = options.commandPrefix || '!brain';
  }

  /**
   * Format a search results response
   * 
   * @param query Search query
   * @param notes Search results
   * @returns Formatted response
   */
  formatSearchResults(query: string, notes: NotePreview[]): string {
    if (notes.length === 0) {
      return 'No results found.';
    }

    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader(`Search Results for "${query}"`);
      builder.addDivider();
      
      notes.forEach((note, index) => {
        builder.addSection(formatNotePreviewInternal(note, index + 1));
      });
      
      return builder.build() as string;
    } else {
      const searchResults = [
        `### Search Results for "${query}"`,
        '',
        ...notes.map((note, index) => formatNotePreviewInternal(note, index + 1)),
      ].join('\n');
      
      return this.markdown.format(searchResults);
    }
  }

  /**
   * Format a note display response
   * 
   * @param note Note object
   * @returns Formatted response
   */
  formatNote(note: NotePreview): string {
    // Debug: Check if this note has an attribution footer
    if (note.content.includes('**Note**: This content was derived from a conversation')) {
      logger.debug(`Note ${note.id} has an attribution footer in formatNote`);
    }
    
    // Format the note content - no need to remove attributions here 
    // as this is showing the full note content
    const formattedContent = note.content
      // Remove source comment if present
      .replace(/<!--\s*source:[^>]+-->\n?/, '')
      // Ensure the content has proper newlines
      .trim();
    
    const tags = note.tags && note.tags.length > 0
      ? `Tags: ${(note.tags as string[]).map(tag => `\`${tag}\``).join(', ')}`
      : 'No tags';
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader(note.title);
      
      builder.addContext([
        `**ID**: \`${note.id}\``,
        `**Created**: ${formatDate(note.createdAt, date => date.toLocaleString())}`,
        `**Updated**: ${formatDate(note.updatedAt, date => date.toLocaleString())}`,
        tags,
      ]);
      
      builder.addDivider();
      builder.addSection(formattedContent);
      
      return builder.build() as string;
    } else {
      const message = [
        `### ${note.title}`,
        '',
        tags,
        `**ID**: \`${note.id}\``,
        `**Created**: ${formatDate(note.createdAt, date => date.toLocaleString())}`,
        `**Updated**: ${formatDate(note.updatedAt, date => date.toLocaleString())}`,
        '',
        '---',
        '',
        formattedContent,
      ].join('\n');
      
      return this.markdown.format(message);
    }
  }

  /**
   * Format a notes list response
   * 
   * @param notes Array of notes
   * @param title Optional title
   * @returns Formatted response
   */
  formatNotesList(notes: NotePreview[], title?: string): string {
    if (notes.length === 0) {
      return 'No notes found.';
    }
    
    // Debug: log if we see any notes with attribution footers
    const notesWithAttributions = notes.filter(note => 
      note.content.includes('**Note**: This content was derived from a conversation'),
    );
    
    if (notesWithAttributions.length > 0) {
      logger.debug(`Found ${notesWithAttributions.length} notes with attribution footers in formatNotesList`);
      
      // Log preview of the first note to help debugging
      if (notesWithAttributions[0]) {
        const firstNoteId = notesWithAttributions[0].id;
        const contentPreview = notesWithAttributions[0].content.substring(0, 100) + '...';
        logger.debug(`Note ${firstNoteId} content preview: ${contentPreview}`);
      }
    }
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader(title || 'Notes');
      builder.addDivider();
      
      notes.forEach((note, index) => {
        // Process each note to remove attribution footer
        const formattedNote = formatNotePreviewInternal(note, index + 1);
        builder.addSection(formattedNote);
      });
      
      return builder.build() as string;
    } else {
      const notesResults = [
        `### ${title || 'Notes'}`,
        '',
        ...notes.map((note, index) => formatNotePreviewInternal(note, index + 1)),
      ].join('\n');
      
      return this.markdown.format(notesResults);
    }
  }

  /**
   * Format a tags list response
   * 
   * @param tags Array of tags with counts
   * @returns Formatted response
   */
  formatTags(tags: { tag: string; count: number }[]): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Available Tags');
      
      const sections: string[] = [];
      tags.forEach(({ tag, count }) => {
        sections.push(`- \`${tag}\` (${count})`);
      });
      
      builder.addSection(sections.join('\n'));
      
      return builder.build() as string;
    } else {
      const tagsMessage = [
        '### Available Tags',
        '',
        ...tags.map(({ tag, count }) => `- \`${tag}\` (${count})`),
      ].join('\n');
      
      return this.markdown.format(tagsMessage);
    }
  }

  /**
   * Format an answer response with citations
   * 
   * @param answer Answer text
   * @param citations Optional citations
   * @param relatedNotes Optional related notes
   * @returns Formatted response
   */
  formatAnswer(answer: string, citations: CitationReference[] = [], relatedNotes: NotePreview[] = []): string {
    // Log debug info
    logger.debug(`Formatting answer with ${citations.length} citations and ${relatedNotes.length} related notes`);
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Answer');
      builder.addSection(answer);
      
      // Add related notes if available (moved above citations)
      if (relatedNotes.length > 0) {
        builder.addDivider();
        builder.addHeader('Related Notes');
        
        relatedNotes.forEach((note, index) => {
          builder.addSection(formatNotePreviewInternal(note, index + 1, false));
        });
      }
      
      // Add citations if available (moved after related notes)
      if (citations.length > 0) {
        builder.addDivider();
        builder.addHeader('Sources');
        
        // Convert citations to formatted text
        const formattedCitations = citations.map(citation => {
          return this.citations.createNoteBasedCitation({
            id: citation.noteId,
            title: citation.noteTitle,
            content: citation.excerpt || 'No excerpt available',
          });
        });
        
        const citationsHtml = this.citations.formatCitationList(formattedCitations);
        builder.addSection(citationsHtml);
      }
      
      return builder.build() as string;
    } else {
      const askMessage = [
        '### Answer',
        '',
        answer,
      ];
      
      // Add related notes if available (moved above citations)
      if (relatedNotes.length > 0) {
        askMessage.push('', '#### Related Notes');
        relatedNotes.forEach((note, index) => {
          askMessage.push(formatNotePreviewInternal(note, index + 1, false));
        });
      }
      
      // Add citations if available (moved after related notes)
      if (citations.length > 0) {
        askMessage.push('', '#### Sources');
        
        // Create citation objects
        const formattedCitations = citations.map(citation => {
          return this.citations.createNoteBasedCitation({
            id: citation.noteId,
            title: citation.noteTitle,
            content: citation.excerpt || 'No excerpt available',
          });
        });
        
        // Format as HTML and add to message
        const citationsHtml = this.citations.formatCitationList(formattedCitations);
        askMessage.push(citationsHtml);
      }
      
      const formattedMessage = askMessage.join('\n');
      return this.markdown.format(formattedMessage);
    }
  }

  /**
   * Format a system status response
   * 
   * @param status Status object
   * @returns Formatted response
   */
  formatStatus(status: SystemStatus): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('System Status');
      
      // Add main status items
      builder.addSection(`
**API Connection**: ${status.apiConnected ? '✅ Connected' : '❌ Disconnected'}
**Database**: ${status.dbConnected ? '✅ Connected' : '❌ Disconnected'}
**Notes**: ${status.noteCount}
**External Sources**: ${status.externalSourcesEnabled ? '✅ Enabled' : '⚠️ Disabled'}
      `);
      
      // Add external sources availability
      if (Object.keys(status.externalSources).length > 0) {
        builder.addHeader('Available External Sources');
        
        const sourcesList = Object.entries(status.externalSources)
          .map(([name, available]) => `- **${name}**: ${(available as boolean) ? '✅ Available' : '❌ Unavailable'}`)
          .join('\n');
        
        builder.addSection(sourcesList);
      } else {
        builder.addSection('⚠️ No external sources configured');
      }
      
      return builder.build() as string;
    } else {
      const statusMsg = [
        '### System Status',
        '',
        `**API Connection**: ${status.apiConnected ? '✅ Connected' : '❌ Disconnected'}`,
        `**Database**: ${status.dbConnected ? '✅ Connected' : '❌ Disconnected'}`,
        `**Notes**: ${status.noteCount}`,
        `**External Sources**: ${status.externalSourcesEnabled ? '✅ Enabled' : '⚠️ Disabled'}`,
        '',
      ];
      
      // Add external sources availability
      if (Object.keys(status.externalSources).length > 0) {
        statusMsg.push('#### Available External Sources');
        
        Object.entries(status.externalSources).forEach(([name, available]) => {
          statusMsg.push(`- **${name}**: ${(available as boolean) ? '✅ Available' : '❌ Unavailable'}`);
        });
      } else {
        statusMsg.push('⚠️ No external sources configured');
      }
      
      return this.markdown.format(statusMsg.join('\n'));
    }
  }

  /**
   * Format a save-note preview response
   * 
   * @param result Preview result object
   * @returns Formatted response
   */
  formatSaveNotePreview(result: SaveNotePreviewResult): string {
    // Format preview message
    const previewContent = result.noteContent.length > 300
      ? result.noteContent.substring(0, 297) + '...'
      : result.noteContent;
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('📝 Note Preview');
      
      builder.addSection(`**Title**: ${result.title}`);
      
      builder.addSection(`**Content Preview**:\n\`\`\`\n${previewContent}\n\`\`\``);
      
      builder.addDivider();
      
      builder.addContext([
        '*This is a preview of the note that will be created from your conversation.*',
        '',
        `• To save this note: \`${this.commandPrefix} confirm\` or \`${this.commandPrefix} confirm "New Title"\``,
        `• To cancel: \`${this.commandPrefix} cancel\``,
        '',
        `*Note ID: ${result.conversationId}*`,
      ]);
      
      return builder.build() as string;
    } else {
      // Markdown formatting that works well in Element
      const message = [
        '### 📝 Note Preview',
        '',
        `**Title**: ${result.title}`,
        '',
        '**Content Preview**:',
        '',
        '```',
        previewContent,
        '```',
        '',
        '---',
        '',
        '*This is a preview of the note that will be created from your conversation.*',
        '',
        '> **🔵 Actions**',
        `> • To save this note: \`${this.commandPrefix} confirm\` or \`${this.commandPrefix} confirm "New Title"\``,
        `> • To cancel: \`${this.commandPrefix} cancel\``,
        '',
        `*Note ID: ${result.conversationId}*`,
      ].join('\n');
      
      return this.markdown.format(message);
    }
  }

  /**
   * Format a save-note confirmation response
   * 
   * @param result Confirmation result object
   * @returns Formatted response
   */
  formatSaveNoteConfirm(result: SaveNoteConfirmResult): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('✅ Note Saved Successfully!');
      
      builder.addSection(`
**Title**: "${result.title}"
**Note ID**: \`${result.noteId}\`
      `);
      
      builder.addContext([
        '**💡 Tip**: To view the complete note, use:',
        `\`${this.commandPrefix} note ${result.noteId}\``,
      ]);
      
      return builder.build() as string;
    } else {
      const message = [
        '### ✅ Note Saved Successfully!',
        '',
        `**Title**: "${result.title}"`,
        `**Note ID**: \`${result.noteId}\``,
        '',
        '> **💡 Tip**: To view the complete note, use:',
        `> \`${this.commandPrefix} note ${result.noteId}\``,
      ].join('\n');
      
      return this.markdown.format(message);
    }
  }

  /**
   * Format a conversation notes list response
   * 
   * @param notes Array of notes
   * @returns Formatted response
   */
  formatConversationNotes(notes: NotePreview[]): string {
    if (notes.length === 0) {
      return this.markdown.format('### ⚠️ No conversation notes found.');
    }
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('📚 Notes Created from Conversations');
      builder.addDivider();
      
      notes.forEach((note, index) => {
        // Extract tags and format them
        const tags = note.tags && note.tags.length > 0
          ? note.tags.map((tag: string) => `\`${tag}\``).join(' ')
          : '*No tags*';
        
        // Format content preview
        const preview = getExcerpt(note.content, 120);
        
        // Format date
        const created = formatDate(note.createdAt, date => date.toLocaleDateString());
        
        // Create a section for each note
        builder.addSection(`
#### ${index + 1}. ${note.title}

**ID**: \`${note.id}\` | **Created**: ${created}
**Tags**: ${tags}

> ${preview}

💡 View with: \`${this.commandPrefix} note ${note.id}\`
        `);
        
        if (index < notes.length - 1) {
          builder.addDivider();
        }
      });
      
      return builder.build() as string;
    } else {
      // Create a presentation for notes using Markdown formatting
      const messageParts = [
        '### 📚 Notes Created from Conversations',
        '---',
      ];
      
      // Add each note with Markdown formatting
      notes.forEach((note, index) => {
        // Extract tags and format them
        const tags = note.tags && note.tags.length > 0
          ? note.tags.map((tag: string) => `\`${tag}\``).join(' ')
          : '*No tags*';
        
        // Format content preview
        const preview = getExcerpt(note.content, 120);
        
        // Format date
        const created = formatDate(note.createdAt, date => date.toLocaleDateString());
        
        // Create a formatted note block
        messageParts.push(
          `#### ${index + 1}. ${note.title}`,
          '',
          `**ID**: \`${note.id}\` | **Created**: ${created}`,
          `**Tags**: ${tags}`,
          '',
          `> ${preview}`,
          '',
          `💡 View with: \`${this.commandPrefix} note ${note.id}\``,
          '',
          '---',
        );
      });
      
      return this.markdown.format(messageParts.join('\n'));
    }
  }
  
  /**
   * Format an error message
   * 
   * @param message Error message
   * @returns Formatted response
   */
  formatError(message: string): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('❌ Error');
      builder.addSection(message);
      
      return builder.build() as string;
    } else {
      return this.markdown.format(`### ❌ Error\n\n${message}`);
    }
  }
  
  /**
   * Format a profile information response
   * 
   * @param profile Profile object
   * @returns Formatted response
   */
  formatProfile(profile: Record<string, unknown>): string {
    const infoLines = this.buildProfileMessage(profile);
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Profile Information');
      builder.addSection(infoLines.join('\n'));
      
      return builder.build() as string;
    } else {
      return this.markdown.format(infoLines.join('\n'));
    }
  }
  
  /**
   * Format a profile-related response
   * 
   * @param profile Profile object
   * @param relatedNotes Related notes
   * @param matchType Match type
   * @returns Formatted response
   */
  formatProfileRelated(
    profile: Record<string, unknown>, 
    relatedNotes: NotePreview[], 
    matchType?: 'tags' | 'semantic' | 'keyword',
  ): string {
    const profileLines = this.buildProfileMessage(profile);
    
    // Add related notes section
    profileLines.push('');
    profileLines.push('### Notes related to your profile:');
    
    if (relatedNotes.length > 0) {
      // Explain how we found the notes
      switch (matchType) {
      case 'tags': {
        profileLines.push('(Matched by profile tags and semantic similarity)');
        break;
      }
      case 'semantic': {
        profileLines.push('(Matched by semantic similarity)');
        break;
      }
      case 'keyword': {
        profileLines.push('(Matched by keyword similarity)');
        break;
      }
      }
      
      profileLines.push('');
      relatedNotes.forEach((note, index) => {
        profileLines.push(formatNotePreviewInternal(note, index + 1));
      });
    } else {
      profileLines.push('No related notes found. Try generating embeddings and tags for your notes and profile.');
      profileLines.push('You can run "bun run tag:profile" to generate profile tags.');
    }
    
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Profile Information');
      builder.addSection(profileLines.join('\n'));
      
      return builder.build() as string;
    } else {
      return this.markdown.format(profileLines.join('\n'));
    }
  }

  // Website help formatter removed as it's no longer needed
  
  /**
   * Format website promote result
   */
  formatWebsitePromote(result: WebsitePromoteResult): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Website Promotion');
      
      const icon = result.success ? '✅' : '❌';
      builder.addSection(`${icon} ${result.message}`);
      
      if (result.success && result.url) {
        builder.addSection(`Production website available at: ${result.url}`);
      }
      
      return builder.build() as string;
    } else {
      const icon = result.success ? '✅' : '❌';
      const message = [
        '### Website Promotion',
        '',
        `${icon} ${result.message}`,
      ];
      
      if (result.success && result.url) {
        message.push('', `Production website available at: ${result.url}`);
      }
      
      return this.markdown.format(message.join('\n'));
    }
  }
  
  /**
   * Format website configuration result
   */
  formatWebsiteConfig(result: WebsiteConfigResult): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Website Configuration');
      
      // Add success/failure message if relevant
      if (result.success !== undefined) {
        const icon = result.success ? '✅' : '❌';
        builder.addSection(`${icon} ${result.message}`);
      } else {
        builder.addSection(result.message);
      }
      
      // Add config items if available
      if (result.config && Object.keys(result.config).length > 0) {
        builder.addDivider();
        
        // Format each config item
        Object.entries(result.config).forEach(([key, value]) => {
          const formattedValue = typeof value === 'object' && value !== null 
            ? '```json\n' + JSON.stringify(value, null, 2) + '\n```' 
            : String(value);
          builder.addSection(`**${key}**: ${formattedValue}`);
        });
      }
      
      return builder.build() as string;
    } else {
      const message = [
        '### Website Configuration',
        '',
      ];
      
      // Add success/failure message if relevant
      if (result.success !== undefined) {
        const icon = result.success ? '✅' : '❌';
        message.push(`${icon} ${result.message}`);
      } else {
        message.push(result.message);
      }
      
      // Add config items if available
      if (result.config && Object.keys(result.config).length > 0) {
        message.push('', '---', '');
        
        // Format each config item
        Object.entries(result.config).forEach(([key, value]) => {
          const formattedValue = typeof value === 'object' && value !== null 
            ? '```json\n' + JSON.stringify(value, null, 2) + '\n```' 
            : String(value);
          message.push(`**${key}**: ${formattedValue}`);
        });
      }
      
      return this.markdown.format(message.join('\n'));
    }
  }
  
  /**
   * Format landing page result
   */
  formatLandingPage(result: LandingPageResult): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      if (result.data) {
        // View mode - display landing page content
        builder.addHeader('Landing Page Content');
        
        // Format data properties
        Object.entries(result.data).forEach(([key, value]) => {
          if (typeof value === 'string') {
            builder.addSection(`**${key}**: ${value}`);
          } else if (Array.isArray(value)) {
            builder.addSection(`**${key}**:`);
            const items = (value as unknown[]).map(item => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n');
            builder.addSection(items);
          } else if (typeof value === 'object' && value !== null) {
            builder.addSection(`**${key}**:`);
            const items = Object.entries(value as Record<string, unknown>)
              .map(([subKey, subValue]) => `- **${subKey}**: ${subValue}`)
              .join('\n');
            builder.addSection(items);
          }
        });
      } else {
        // Generate mode - display success/failure message
        builder.addHeader('Landing Page');
        
        if (result.success !== undefined && result.message !== undefined) {
          const icon = result.success ? '✅' : '❌';
          builder.addSection(`${icon} ${result.message}`);
          
          if (result.success) {
            builder.addSection(`Use \`${this.commandPrefix} landing-page view\` to view the generated content.`);
          }
        }
      }
      
      return builder.build() as string;
    } else {
      let message: string[];
      
      if (result.data) {
        // View mode - display landing page content
        message = [
          '### Landing Page Content',
          '',
        ];
        
        // Format data properties
        Object.entries(result.data).forEach(([key, value]) => {
          if (typeof value === 'string') {
            message.push(`**${key}**: ${value}`);
          } else if (Array.isArray(value)) {
            message.push(`**${key}**:`);
            (value as unknown[]).forEach(item => {
              message.push(`- ${typeof item === 'string' ? item : JSON.stringify(item)}`);
            });
          } else if (typeof value === 'object' && value !== null) {
            message.push(`**${key}**:`);
            Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
              message.push(`- **${subKey}**: ${subValue}`);
            });
          }
          
          message.push('');
        });
      } else {
        // Generate mode - display success/failure message
        message = [
          '### Landing Page',
          '',
        ];
        
        if (result.success !== undefined && result.message !== undefined) {
          const icon = result.success ? '✅' : '❌';
          message.push(`${icon} ${result.message}`);
          
          if (result.success) {
            message.push('', `Use \`${this.commandPrefix} landing-page view\` to view the generated content.`);
          }
        }
      }
      
      return this.markdown.format(message.join('\n'));
    }
  }
  
  /**
   * Format website status result
   */
  formatWebsiteStatus(result: WebsiteStatusResult): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Website Status');
      
      const icon = result.success ? '✅' : '❌';
      builder.addSection(`${icon} ${result.message}`);
      
      if (result.success && result.data) {
        const { environment, buildStatus, fileCount, serverStatus, domain, accessStatus, url } = result.data;
        
        builder.addSection(`**Environment**: ${environment}`);
        builder.addSection(`**Build Status**: ${buildStatus}`);
        builder.addSection(`**Files**: ${fileCount}`);
        builder.addSection(`**Server Status**: ${serverStatus}`);
        builder.addSection(`**Domain**: ${domain}`);
        builder.addSection(`**Access Status**: ${accessStatus}`);
        
        if (url) {
          builder.addSection(`**Website URL**: ${url}`);
        }
      }
      
      return builder.build() as string;
    } else {
      const icon = result.success ? '✅' : '❌';
      const message = [
        '### Website Status',
        '',
        `${icon} ${result.message}`,
      ];
      
      if (result.success && result.data) {
        const { environment, buildStatus, fileCount, serverStatus, domain, accessStatus, url } = result.data;
        
        message.push(
          '',
          `**Environment**: ${environment}`,
          `**Build Status**: ${buildStatus}`,
          `**Files**: ${fileCount}`,
          `**Server Status**: ${serverStatus}`,
          `**Domain**: ${domain}`,
          `**Access Status**: ${accessStatus}`,
        );
        
        if (url) {
          message.push('', `**Website URL**: ${url}`);
        }
      }
      
      return this.markdown.format(message.join('\n'));
    }
  }
  
  /**
   * Format website build result
   */
  formatWebsiteBuild(result: WebsiteBuildResult): string {
    if (this.useBlocks) {
      const builder = new MatrixBlockBuilder();
      
      builder.addHeader('Website Build');
      
      const icon = result.success ? '✅' : '❌';
      builder.addSection(`${icon} ${result.message}`);
      
      if (result.success && result.url) {
        builder.addSection(`Preview available at: ${result.url}`);
        builder.addSection(`To promote to production, use: \`${this.commandPrefix} website-promote\``);
      }
      
      return builder.build() as string;
    } else {
      const icon = result.success ? '✅' : '❌';
      const message = [
        '### Website Build',
        '',
        `${icon} ${result.message}`,
      ];
      
      if (result.success && result.url) {
        message.push('', `Preview available at: ${result.url}`);
        message.push('', `To promote to production, use: \`${this.commandPrefix} website-promote\``);
      }
      
      return this.markdown.format(message.join('\n'));
    }
  }
  
  /**
   * Build profile message lines
   * 
   * @param profile Profile object
   * @returns Array of message lines
   */
  private buildProfileMessage(profile: Record<string, unknown>): string[] {
    const infoLines = [];
    infoLines.push('### Profile Information');
    infoLines.push('');
    infoLines.push(`**Name**: ${profile['fullName']}`);
    if (profile['headline']) infoLines.push(`**Headline**: ${profile['headline']}`);
    if (profile['occupation']) infoLines.push(`**Occupation**: ${profile['occupation']}`);
    
    // Display location
    const location = [profile['city'], profile['state'], profile['countryFullName']].filter(Boolean).join(', ');
    if (location) infoLines.push(`**Location**: ${location}`);
    
    // Display summary
    if (profile['summary']) {
      infoLines.push('');
      infoLines.push('**Summary**:');
      infoLines.push(profile['summary'] as string);
    }
    
    // Display current experience
    if (profile['experiences'] && Array.isArray(profile['experiences']) && profile['experiences'].length > 0) {
      infoLines.push('');
      infoLines.push('**Current Work**:');
      // Define experience interface for type safety
      interface Experience {
        title: string;
        company: string;
        description?: string;
        ends_at?: unknown;
      }
      
      const currentExperiences = (profile['experiences'] as Array<Experience>).filter(exp => !exp.ends_at);
      if (currentExperiences.length > 0) {
        currentExperiences.forEach(exp => {
          infoLines.push(`- ${exp.title} at ${exp.company}`);
          if (exp.description) {
            // Trim long descriptions
            const desc = exp.description.length > 100
              ? exp.description.substring(0, 100) + '...'
              : exp.description;
            infoLines.push(`  ${desc}`);
          }
        });
      } else {
        infoLines.push('No current work experiences found.');
      }
    }
    
    // Display skills
    if (profile['languages'] && Array.isArray(profile['languages']) && profile['languages'].length > 0) {
      infoLines.push('');
      infoLines.push('**Languages**:');
      infoLines.push((profile['languages'] as string[]).join(', '));
    }
    
    // Check for embedding
    infoLines.push('');
    if (profile['embedding']) {
      infoLines.push('**Profile has embeddings**: Yes');
    } else {
      infoLines.push('**Profile has embeddings**: No');
      infoLines.push('Run "bun run embed:profile" to generate embeddings.');
    }
    
    // Display tags if available
    if (profile['tags'] && Array.isArray(profile['tags']) && profile['tags'].length > 0) {
      infoLines.push('');
      infoLines.push('**Profile Tags**:');
      infoLines.push((profile['tags'] as string[]).join(', '));
    } else {
      infoLines.push('');
      infoLines.push('**Profile Tags**: None');
      infoLines.push('Run "bun run tag:profile" to generate tags.');
    }
    
    return infoLines;
  }
}

// Singleton instance
let formatter: MatrixResponseFormatter | null = null;

/**
 * Get the singleton instance of the response formatter
 */
export function getResponseFormatter(options?: ResponseFormatterOptions): MatrixResponseFormatter {
  if (!formatter) {
    formatter = new MatrixResponseFormatter(options);
  }
  return formatter;
}