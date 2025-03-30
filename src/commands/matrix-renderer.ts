/**
 * Matrix Renderer for command results
 * This module handles formatting and displaying command results in Matrix
 */

import type { CommandResult, CommandInfo } from './index';
import { formatNotePreview } from '../utils/noteUtils';
import type { Note } from '../models/note';
import type { EnhancedProfile } from '../models/profile';

/**
 * Render command results for Matrix
 */
export class MatrixRenderer {
  private commandPrefix: string;
  private sendMessageFn: (roomId: string, message: string) => void;

  constructor(commandPrefix: string, sendMessageFn: (roomId: string, message: string) => void) {
    this.commandPrefix = commandPrefix;
    this.sendMessageFn = sendMessageFn;
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
      this.renderProfile(roomId, result.profile);
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
      let askMessage = [
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
    }
  }

  /**
   * Render a note
   */
  private renderNote(roomId: string, note: Note & { tags?: string[] | null }): void {
    // Format the note content
    const formattedContent = note.content
      // Remove source comment if present
      .replace(/<!--\s*source:[^>]+-->\n?/, '')
      // Ensure the content has proper newlines
      .trim();
    
    const tags = note.tags && note.tags.length > 0
      ? `Tags: ${note.tags.map((tag: string) => `\`${tag}\``).join(', ')}`
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
  private buildProfileMessage(profile: EnhancedProfile & { 
    experiences?: { title: string; company: string; description?: string | null }[] 
  }): string[] {
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
      const currentExperiences = profile.experiences.filter((exp: any) => !exp.endDate);
      if (currentExperiences.length > 0) {
        currentExperiences.forEach((exp: any) => {
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
}