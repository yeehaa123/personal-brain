/**
 * Matrix Renderer for command results
 * This module handles formatting and displaying command results in Matrix
 */

import type { Note } from '../models/note';
import type { EnhancedProfile, Profile, ProfileExperience } from '../models/profile';
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
        // Format with consistent spacing
        const usage = `\`${this.commandPrefix} ${cmd.usage}\``;
        return `- ${usage.padEnd(30)} - ${cmd.description}`;
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

      this.sendMessageFn(roomId, askMessage.join('\n'));
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
      ? `Tags: ${(note.tags as string[]).map((tag: string) => `\`${tag}\``).join(', ')}`
      : 'No tags';

    const message = [
      `## ${note.title}`,
      '',
      tags,
      `ID: \`${note.id}\``,
      `Created: ${new Date(note.createdAt).toLocaleString()}`,
      `Updated: ${new Date(note.updatedAt).toLocaleString()}`,
      '',
      '---',
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
    
    // Markdown formatted message with enhanced styling
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
      '<hr style="border: 1px solid #ccc; margin: 1em 0;">',
      '',
      '_This is a preview of the note that will be created from your conversation._',
      '',
      '<div style="background-color: #f0f8ff; padding: 10px; border-left: 4px solid #0066cc; margin: 10px 0;">',
      `To save this note: \`${this.commandPrefix} confirm\` or \`${this.commandPrefix} confirm "New Title"\`<br>`,
      `To cancel: \`${this.commandPrefix} cancel\``,
      '</div>',
      '',
      `<small><i>Conversation ID: ${result.conversationId}</i></small>`, // Include this for the Matrix interface to parse
    ].join('\n');
    
    this.sendMessageFn(roomId, message);
  }
  
  /**
   * Render save-note confirmation
   */
  private renderSaveNoteConfirm(roomId: string, result: { noteId: string; title: string }): void {
    const message = [
      '<div style="background-color: #e6ffe6; padding: 12px; border-radius: 4px; border-left: 4px solid #33cc33; margin: 10px 0;">',
      `<h3>✅ Note "${result.title}" saved successfully!</h3>`,
      '</div>',
      '',
      `<strong>Note ID</strong>: \`${result.noteId}\``,
      '',
      '<div style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; margin: 10px 0;">',
      `To view the note, use: \`${this.commandPrefix} note ${result.noteId}\``,
      '</div>',
    ].join('\n');
    
    this.sendMessageFn(roomId, message);
  }
  
  /**
   * Render conversation notes list
   */
  private renderConversationNotes(roomId: string, result: { notes: Note[] }): void {
    if (result.notes.length === 0) {
      this.sendMessageFn(roomId, '<div style="background-color: #fff8e6; padding: 12px; border-radius: 4px; border-left: 4px solid #ffcc00; margin: 10px 0;"><h3>⚠️ No conversation notes found.</h3></div>');
      return;
    }
    
    // Create an enhanced presentation for notes
    const messageParts = [
      '<h3>📚 Notes Created from Conversations</h3>',
      '<hr style="border: 0; border-top: 1px solid #ccc; margin: 1em 0;">',
    ];
    
    // Add each note as a card
    result.notes.forEach((note, index) => {
      // Extract tags and format them
      const tags = note.tags && note.tags.length > 0
        ? note.tags.map(tag => `<code>${tag}</code>`).join(' ')
        : '<em>No tags</em>';
      
      // Format content preview
      const preview = getExcerpt(note.content, 120);
      
      // Format date
      const created = new Date(note.createdAt).toLocaleDateString();
      
      // Create a card for each note
      messageParts.push(
        '<div style="background-color: #f9f9f9; border-left: 4px solid #3f51b5; padding: 10px; margin: 12px 0; border-radius: 0 4px 4px 0;">',
        `<h4>${index + 1}. ${note.title}</h4>`,
        `<div><strong>ID:</strong> <code>${note.id}</code> • <strong>Created:</strong> ${created}</div>`,
        `<div><strong>Tags:</strong> ${tags}</div>`,
        '<div style="margin-top: 8px; font-style: italic;">',
        preview,
        '</div>',
        `<div style="margin-top: 8px;"><small>View with: <code>${this.commandPrefix} note ${note.id}</code></small></div>`,
        '</div>',
      );
    });
    
    this.sendMessageFn(roomId, messageParts.join('\n'));
  }
}
