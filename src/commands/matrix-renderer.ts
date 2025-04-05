/**
 * Matrix Renderer for command results
 * This module handles formatting and displaying command results in Matrix
 */

import type { Note } from '../models/note';
import type { EnhancedProfile, Profile, ProfileExperience } from '../models/profile';
import logger from '../utils/logger';
import { formatNotePreview, getExcerpt } from '../utils/noteUtils';

import type { CommandHandler } from '.';
import type { CommandInfo, CommandResult } from './index';


/**
 * Render command results for Matrix
 */
export class MatrixRenderer {
  private commandPrefix: string;
  private sendMessageFn: (roomId: string, message: string) => void;
  // private member used in methods called by tests
  private commandHandler?: CommandHandler;

  constructor(commandPrefix: string, sendMessageFn: (roomId: string, message: string) => void) {
    this.commandPrefix = commandPrefix;
    this.sendMessageFn = sendMessageFn;
  }
  
  /**
   * Set the command handler for interactive confirmation
   */
  setCommandHandler(handler: CommandHandler): void {
    this.commandHandler = handler;
    // Validate the command handler has the required methods
    if (!this.commandHandler || typeof this.commandHandler.confirmSaveNote !== 'function') {
      throw new Error('Command handler must implement confirmSaveNote');
    }
  }

  /**
   * Render help command
   */
  renderHelp(roomId: string, commands: CommandInfo[]): void {
    const helpText = [
      '### Personal Brain Commands',
      '',
      ...commands.map(cmd => {
        // Format with markdown for better rendering
        const usage = `\`${this.commandPrefix} ${cmd.usage}\``;
        return `- ${usage} - ${cmd.description}`;
      }),
    ].join('\n');

    this.sendMessageFn(roomId, helpText);
  }

  /**
   * Render a command result
   */
  render(roomId: string, result: CommandResult): void {
    switch (result.type) {
    case 'error': {
      this.sendMessageFn(roomId, `❌ ${result.message}`);
      break;
    }

    case 'search': {
      if (result.notes.length === 0) {
        this.sendMessageFn(roomId, 'No results found.');
        return;
      }

      const searchResults = [
        `### Search Results for "${result.query}"`,
        '',
        ...result.notes.map((note, index) => formatNotePreview(note, index + 1)),
      ].join('\n');

      this.sendMessageFn(roomId, searchResults);
      break;
    }

    case 'notes': {
      if (result.notes.length === 0) {
        this.sendMessageFn(roomId, 'No notes found.');
        return;
      }

      const notesResults = [
        `### ${result.title || 'Notes'}`,
        '',
        ...result.notes.map((note, index) => formatNotePreview(note, index + 1)),
      ].join('\n');

      this.sendMessageFn(roomId, notesResults);
      break;
    }

    case 'note': {
      this.renderNote(roomId, result.note);
      break;
    }

    case 'tags': {
      const tagsMessage = [
        '### Available Tags',
        '',
        ...result.tags.map(({ tag, count }) => `- \`${tag}\` (${count})`),
      ].join('\n');

      this.sendMessageFn(roomId, tagsMessage);
      break;
    }

    case 'profile': {
      this.renderProfile(roomId, result.profile as EnhancedProfile);
      break;
    }

    case 'profile-related': {
      const profileRelatedMsg = this.buildProfileMessage(result.profile);

      // Add related notes section
      profileRelatedMsg.push('');
      profileRelatedMsg.push('### Notes related to your profile:');

      if (result.relatedNotes.length > 0) {
        // Explain how we found the notes
        switch (result.matchType) {
        case 'tags': {
          profileRelatedMsg.push('(Matched by profile tags and semantic similarity)');
          break;
        }
        case 'semantic': {
          profileRelatedMsg.push('(Matched by semantic similarity)');
          break;
        }
        case 'keyword': {
          profileRelatedMsg.push('(Matched by keyword similarity)');
          break;
        }
        }

        profileRelatedMsg.push('');
        result.relatedNotes.forEach((note, index) => {
          profileRelatedMsg.push(formatNotePreview(note, index + 1));
        });
      } else {
        profileRelatedMsg.push('No related notes found. Try generating embeddings and tags for your notes and profile.');
        profileRelatedMsg.push('You can run "bun run tag:profile" to generate profile tags.');
      }

      this.sendMessageFn(roomId, profileRelatedMsg.join('\n'));
      break;
    }

    case 'ask': {
      // DEBUG: Log the raw answer from the command handler
      logger.debug(`[DEBUG RENDERER] Received answer in renderer: ${result.answer.substring(0, 100)}...`);
      if (result.answer.includes('<') && result.answer.includes('>')) {
        logger.warn(`[DEBUG RENDERER] Found HTML in result.answer: ${result.answer.substring(0, 200)}...`);
      }
      
      const askMessage = [
        '### Answer',
        '',
        result.answer,
      ];

      if (result.citations.length > 0) {
        askMessage.push('', '#### Sources');
        result.citations.forEach(citation => {
          askMessage.push(`- ${citation.noteTitle} (\`${citation.noteId}\`)`);
        });
      }

      if (result.relatedNotes.length > 0) {
        askMessage.push('', '#### Related Notes');
        result.relatedNotes.forEach((note, index) => {
          askMessage.push(formatNotePreview(note, index + 1, false));
        });
      }

      // DEBUG: Log the formatted message
      const formattedMessage = askMessage.join('\n');
      logger.debug(`[DEBUG RENDERER] Formatted askMessage: ${formattedMessage.substring(0, 100)}...`);
      
      this.sendMessageFn(roomId, formattedMessage);
      break;
    }

    case 'status': {
      const statusMsg = [
        '### System Status',
        '',
        `**API Connection**: ${result.status.apiConnected ? '✅ Connected' : '❌ Disconnected'}`,
        `**Database**: ${result.status.dbConnected ? '✅ Connected' : '❌ Disconnected'}`,
        `**Notes**: ${result.status.noteCount}`,
        `**External Sources**: ${result.status.externalSourcesEnabled ? '✅ Enabled' : '⚠️ Disabled'}`,
        '',
      ];

      // Add external sources availability
      if (Object.keys(result.status.externalSources).length > 0) {
        statusMsg.push('#### Available External Sources');

        Object.entries(result.status.externalSources).forEach(([name, available]) => {
          statusMsg.push(`- **${name}**: ${available ? '✅ Available' : '❌ Unavailable'}`);
        });
      } else {
        statusMsg.push('⚠️ No external sources configured');
      }

      this.sendMessageFn(roomId, statusMsg.join('\n'));
      break;
    }

    case 'external': {
      const externalStatusIcon = result.enabled ? '✅' : '⚠️';
      const externalMsg = `${externalStatusIcon} ${result.message}`;
      this.sendMessageFn(roomId, externalMsg);
      break;
    }
    
    case 'save-note-preview': {
      this.renderSaveNotePreview(roomId, result);
      break;
    }
    
    case 'save-note-confirm': {
      this.renderSaveNoteConfirm(roomId, result);
      break;
    }
    
    case 'conversation-notes': {
      this.renderConversationNotes(roomId, result);
      break;
    }
    }
  }

  /**
   * Render a note
   */
  private renderNote(roomId: string, note: Note): void {
    // Format the note content
    const formattedContent = note.content
      // Remove source comment if present
      .replace(/<!--\s*source:[^>]+-->\n?/, '')
      // Ensure the content has proper newlines
      .trim();

    const tags = note.tags && note.tags.length > 0
      ? `Tags: ${(note.tags as string[]).map((tag: string) => `<code>${tag}</code>`).join(', ')}`
      : 'No tags';

    const message = [
      `<h2>${note.title}</h2>`,
      '',
      `<p>${tags}</p>`,
      `<p>ID: <code>${note.id}</code></p>`,
      `<p>Created: ${new Date(note.createdAt).toLocaleString()}</p>`,
      `<p>Updated: ${new Date(note.updatedAt).toLocaleString()}</p>`,
      '',
      '<hr/>',
      '',
      formattedContent,
    ].join('\n');

    this.sendMessageFn(roomId, message);
  }

  /**
   * Render profile information
   */
  private renderProfile(roomId: string, profile: EnhancedProfile): void {
    const message = this.buildProfileMessage(profile);
    this.sendMessageFn(roomId, message.join('\n'));
  }

  /**
   * Build profile message lines
   */
  private buildProfileMessage(profile: Profile) {
    const infoLines = [];
    infoLines.push('### Profile Information');
    infoLines.push('');
    infoLines.push(`**Name**: ${profile.fullName}`);
    if (profile.headline) infoLines.push(`**Headline**: ${profile.headline}`);
    if (profile.occupation) infoLines.push(`**Occupation**: ${profile.occupation}`);

    // Display location
    const location = [profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ');
    if (location) infoLines.push(`**Location**: ${location}`);

    // Display summary
    if (profile.summary) {
      infoLines.push('');
      infoLines.push('**Summary**:');
      infoLines.push(profile.summary);
    }

    // Display current experience
    if (profile.experiences && profile.experiences.length > 0) {
      infoLines.push('');
      infoLines.push('**Current Work**:');
      const experiences = profile.experiences as ProfileExperience[];
      const currentExperiences = experiences.filter((exp: ProfileExperience) => !exp.ends_at);
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
    if (profile.languages && profile.languages.length > 0) {
      infoLines.push('');
      infoLines.push('**Languages**:');
      infoLines.push(profile.languages.join(', '));
    }

    // Check for embedding
    infoLines.push('');
    if (profile.embedding) {
      infoLines.push('**Profile has embeddings**: Yes');
    } else {
      infoLines.push('**Profile has embeddings**: No');
      infoLines.push('Run "bun run embed:profile" to generate embeddings.');
    }

    // Display tags if available
    if (profile.tags && profile.tags.length > 0) {
      infoLines.push('');
      infoLines.push('**Profile Tags**:');
      infoLines.push(profile.tags.join(', '));
    } else {
      infoLines.push('');
      infoLines.push('**Profile Tags**: None');
      infoLines.push('Run "bun run tag:profile" to generate tags.');
    }

    return infoLines;
  }
  
  /**
   * Render save-note-preview with options to edit or confirm
   */
  private renderSaveNotePreview(roomId: string, result: { noteContent: string; title: string; conversationId: string }): void {
    // Format preview message
    const previewContent = result.noteContent.length > 300
      ? result.noteContent.substring(0, 297) + '...'
      : result.noteContent;
    
    // Add debug logging to track conversation IDs
    logger.debug(`Creating save-note preview for conversation: ${result.conversationId}`);
    
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
      // Include conversation ID in a visible format (the map approach means this is now just for display)
      `*Note ID: ${result.conversationId}*`,
    ].join('\n');
    
    this.sendMessageFn(roomId, message);
  }
  
  /**
   * Render save-note confirmation
   */
  private renderSaveNoteConfirm(roomId: string, result: { noteId: string; title: string }): void {
    const message = [
      '### ✅ Note Saved Successfully!',
      '',
      `**Title**: "${result.title}"`,
      `**Note ID**: \`${result.noteId}\``,
      '',
      '> **💡 Tip**: To view the complete note, use:',
      `> \`${this.commandPrefix} note ${result.noteId}\``,
    ].join('\n');
    
    this.sendMessageFn(roomId, message);
  }
  
  /**
   * Render conversation notes list
   */
  private renderConversationNotes(roomId: string, result: { notes: Note[] }): void {
    if (result.notes.length === 0) {
      this.sendMessageFn(roomId, '### ⚠️ No conversation notes found.');
      return;
    }
    
    // Create a presentation for notes using Markdown formatting
    const messageParts = [
      '### 📚 Notes Created from Conversations',
      '---',
    ];
    
    // Add each note with Markdown formatting
    result.notes.forEach((note, index) => {
      // Extract tags and format them
      const tags = note.tags && note.tags.length > 0
        ? note.tags.map(tag => `\`${tag}\``).join(' ')
        : '*No tags*';
      
      // Format content preview
      const preview = getExcerpt(note.content, 120);
      
      // Format date
      const created = new Date(note.createdAt).toLocaleDateString();
      
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
    
    this.sendMessageFn(roomId, messageParts.join('\n'));
  }
}