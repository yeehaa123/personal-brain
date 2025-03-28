/**
 * MatrixRenderer handles formatting responses for Matrix chat
 */
import type { ProtocolResponse } from '../mcp/protocol/brainProtocol';
import type { Note } from '../models/note';
import type { Profile } from '../models/profile';
import type { ExternalCitation } from '../mcp/protocol/brainProtocol';

/**
 * Convert simple markdown to HTML for Matrix messages
 */
function markdownToHtml(markdown: string): string {
  // This is a simplified conversion - In a production app, you would use a proper markdown parser
  let html = markdown
    // Convert headers
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    
    // Convert bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    
    // Convert code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    
    // Convert links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    
    // Convert lists (basic)
    .replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li>$1</li>')
    
    // Convert paragraphs (two newlines)
    .replace(/\n\n/g, '</p><p>')
    
    // Preserve line breaks
    .replace(/\n/g, '<br/>');
    
  // Wrap in paragraph tags if not already
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
}

/**
 * MatrixRenderer handles formatting responses for Matrix chat
 */
export class MatrixRenderer {
  /**
   * Format the commands help as markdown
   */
  formatCommandHelp(): string {
    return `### Personal Brain Commands

**Note Commands:**
- \`!list\` - List your recent notes
- \`!search <query>\` - Search your notes
- \`!ask <question>\` - Ask a question about your notes
- \`!tags\` - List all tags in your notes
- \`!tag <tag>\` - List notes with specific tag

**Profile Commands:**
- \`!profile\` - View your profile
- \`!whoami\` - View a summary of your profile

**External Knowledge Commands:**
- \`!external on\` - Enable external knowledge sources
- \`!external off\` - Disable external knowledge sources

**System Commands:**
- \`!help\` - Show this help message
- \`!status\` - Check system status
- \`!settings\` - View current settings

Type any of these commands to get started!`;
  }

  /**
   * Format error message
   */
  formatError(message: string): string {
    return `**Error:** ${message}`;
  }

  /**
   * Format note listing
   */
  formatNotes(notes: Note[]): string {
    if (notes.length === 0) {
      return "You don't have any notes yet.";
    }
    
    let result = "### Your Notes\n\n";
    
    notes.forEach((note, index) => {
      result += `**${index + 1}.** ${note.title}`;
      
      if (note.tags && note.tags.length > 0) {
        result += ` (${note.tags.join(', ')})`;
      }
      
      result += '\n';
    });
    
    return result;
  }

  /**
   * Format a single note
   */
  formatNote(note: Note): string {
    let result = `## ${note.title}\n\n`;
    
    if (note.tags && note.tags.length > 0) {
      result += `**Tags:** ${note.tags.join(', ')}\n\n`;
    }
    
    result += note.content;
    
    return result;
  }

  /**
   * Format search results
   */
  formatSearchResults(notes: Note[], query: string): string {
    if (notes.length === 0) {
      return `No notes found matching "${query}".`;
    }
    
    let result = `### Search Results for "${query}"\n\n`;
    
    notes.forEach((note, index) => {
      result += `**${index + 1}.** ${note.title}`;
      
      if (note.tags && note.tags.length > 0) {
        result += ` (${note.tags.join(', ')})`;
      }
      
      result += '\n';
    });
    
    return result;
  }

  /**
   * Format a list of tags
   */
  formatTags(tags: string[]): string {
    if (tags.length === 0) {
      return "No tags found in your notes.";
    }
    
    let result = "### Your Tags\n\n";
    result += tags.join(', ');
    
    return result;
  }

  /**
   * Format a profile view
   */
  formatProfile(profile: Profile): string {
    if (!profile) {
      return "No profile found.";
    }
    
    let result = `## ${profile.fullName}`;
    
    if (profile.headline) {
      result += `\n\n${profile.headline}`;
    }
    
    result += '\n\n';
    
    if (profile.summary) {
      result += `### Summary\n\n${profile.summary}\n\n`;
    }
    
    if (profile.occupation) {
      result += `**Occupation:** ${profile.occupation}\n`;
    }
    
    if (profile.city || profile.country) {
      result += `**Location:** ${[profile.city, profile.state, profile.countryFullName].filter(Boolean).join(', ')}\n\n`;
    }
    
    // Show current experiences
    if (profile.experiences && profile.experiences.length > 0) {
      const currentExperiences = profile.experiences.filter(exp => !exp.endDate);
      
      if (currentExperiences.length > 0) {
        result += '### Current Work\n\n';
        
        currentExperiences.forEach(exp => {
          result += `**${exp.title}** at ${exp.company}\n`;
          
          if (exp.description) {
            result += `${exp.description}\n`;
          }
          
          result += '\n';
        });
      }
    }
    
    // Show skills/languages if available
    if (profile.languages && profile.languages.length > 0) {
      result += '### Skills & Languages\n\n';
      result += profile.languages.join(', ') + '\n';
    }
    
    return result;
  }

  /**
   * Format a protocol response (from BrainProtocol)
   */
  formatProtocolResponse(response: ProtocolResponse): string {
    let result = response.answer;
    
    // Add citations if available
    if (response.citations && response.citations.length > 0) {
      result += '\n\n### Sources\n\n';
      
      response.citations.forEach((citation, index) => {
        result += `**${index + 1}.** ${citation.noteTitle}\n`;
      });
    }
    
    // Add external sources if available
    if (response.externalSources && response.externalSources.length > 0) {
      result += '\n\n### External Sources\n\n';
      
      response.externalSources.forEach((source, index) => {
        result += `**${index + 1}.** [${source.title}](${source.url}) - ${source.source}\n`;
      });
    }
    
    // Add related notes if available
    if (response.relatedNotes && response.relatedNotes.length > 0) {
      result += '\n\n### Related Notes\n\n';
      
      response.relatedNotes.forEach((note, index) => {
        result += `**${index + 1}.** ${note.title}`;
        
        if (note.tags && note.tags.length > 0) {
          result += ` (${note.tags.join(', ')})`;
        }
        
        result += '\n';
      });
    }
    
    return result;
  }

  /**
   * Format system status
   */
  formatStatus(apiConnected: boolean, dbConnected: boolean, noteCount: number, externalSources: Record<string, boolean>): string {
    let result = '### System Status\n\n';
    
    result += `**API Connection:** ${apiConnected ? '✅ Connected' : '❌ Disconnected'}\n`;
    result += `**Database:** ${dbConnected ? '✅ Connected' : '❌ Disconnected'}\n`;
    result += `**Notes:** ${noteCount}\n\n`;
    
    // Format external source status
    result += '**External Sources:**\n\n';
    
    Object.entries(externalSources).forEach(([name, available]) => {
      result += `- ${name}: ${available ? '✅ Available' : '❌ Unavailable'}\n`;
    });
    
    return result;
  }

  /**
   * Format settings
   */
  formatSettings(settings: Record<string, any>): string {
    let result = '### Current Settings\n\n';
    
    Object.entries(settings).forEach(([key, value]) => {
      result += `**${key}:** ${value}\n`;
    });
    
    return result;
  }
}