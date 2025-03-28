/**
 * Shared command handlers for the CLI and Matrix interfaces
 * This module defines the core command logic that can be reused across interfaces
 */

import type { Note } from '../models/note';
import type { Profile } from '../models/profile';
import type { BrainProtocol } from '../mcp/protocol/brainProtocol';
import type { NoteContext } from '../mcp/context/noteContext';
import type { ProfileContext } from '../mcp/context/profileContext';

/**
 * Interface for command descriptions
 */
export interface CommandInfo {
  command: string;
  description: string;
  usage: string;
  examples?: string[];
}

/**
 * Command result types to make interfaces easier to manage
 */
export type CommandResult = 
  | { type: 'error'; message: string }
  | { type: 'profile'; profile: Profile; keywords: string[] }
  | { type: 'profile-related'; profile: Profile; relatedNotes: Note[]; matchType: 'tags' | 'semantic' | 'keyword'; keywords: string[] }
  | { type: 'notes'; notes: Note[]; title?: string }
  | { type: 'note'; note: Note }
  | { type: 'tags'; tags: Array<{ tag: string; count: number }> }
  | { type: 'search'; query: string; notes: Note[] }
  | { type: 'ask'; answer: string; citations: any[]; relatedNotes: Note[]; profile?: Profile };

/**
 * Command handler for processing commands and returning structured results
 */
export class CommandHandler {
  private brainProtocol: BrainProtocol;
  private noteContext: NoteContext;
  private profileContext: ProfileContext;

  constructor(brainProtocol: BrainProtocol) {
    this.brainProtocol = brainProtocol;
    this.noteContext = brainProtocol.getNoteContext();
    this.profileContext = brainProtocol.getProfileContext();
  }

  /**
   * Get all available commands with their descriptions
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'help',
        description: 'Show available commands',
        usage: 'help'
      },
      {
        command: 'search',
        description: 'Search for notes',
        usage: 'search <query>',
        examples: ['search ecosystem', 'search "personal knowledge"']
      },
      {
        command: 'tags',
        description: 'List all tags in the system',
        usage: 'tags'
      },
      {
        command: 'list',
        description: 'List all notes or notes with a specific tag',
        usage: 'list [tag]',
        examples: ['list', 'list ecosystem']
      },
      {
        command: 'note',
        description: 'Show a specific note by ID',
        usage: 'note <id>',
        examples: ['note abc123']
      },
      {
        command: 'profile',
        description: 'View your profile information',
        usage: 'profile [related]',
        examples: ['profile', 'profile related']
      },
      {
        command: 'ask',
        description: 'Ask a question to your brain',
        usage: 'ask <question>',
        examples: ['ask "What are the principles of ecosystem architecture?"']
      }
    ];
  }

  /**
   * Process a command and return a structured result
   */
  async processCommand(command: string, args: string): Promise<CommandResult> {
    try {
      switch (command) {
        case 'search':
          return await this.handleSearch(args);
        case 'list':
          return await this.handleList(args);
        case 'tags':
          return await this.handleTags();
        case 'note':
          return await this.handleNote(args);
        case 'profile':
          return await this.handleProfile(args);
        case 'ask':
          return await this.handleAsk(args);
        default:
          return { type: 'error', message: `Unknown command: ${command}` };
      }
    } catch (error: unknown) {
      return {
        type: 'error',
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Handle search command
   */
  private async handleSearch(query: string): Promise<CommandResult> {
    if (!query) {
      return { type: 'error', message: 'Please provide a search query' };
    }

    const notes = await this.noteContext.searchNotes({ query, limit: 10 });
    return { type: 'search', query, notes };
  }

  /**
   * Handle list command
   */
  private async handleList(tagFilter?: string): Promise<CommandResult> {
    let notes: Note[];
    let title: string;

    if (tagFilter) {
      notes = await this.noteContext.searchNotes({ tags: [tagFilter], limit: 10 });
      title = `Notes with tag: ${tagFilter}`;
      
      if (notes.length === 0) {
        return { type: 'error', message: `No notes found with tag: ${tagFilter}` };
      }
    } else {
      notes = await this.noteContext.searchNotes({ limit: 10 });
      title = 'Recent Notes';
      
      if (notes.length === 0) {
        return { type: 'error', message: 'No notes found in the system' };
      }
    }

    return { type: 'notes', notes, title };
  }

  /**
   * Handle tags command
   */
  private async handleTags(): Promise<CommandResult> {
    // Get all notes
    const allNotes = await this.noteContext.searchNotes({ limit: 1000 });
    
    // Extract and count all tags
    const tagCounts: { [tag: string]: number } = {};
    
    allNotes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          if (typeof tag === 'string') {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });
    
    // Sort tags by count
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
    
    if (sortedTags.length === 0) {
      return { type: 'error', message: 'No tags found in the system' };
    }
    
    return { type: 'tags', tags: sortedTags };
  }

  /**
   * Handle note command
   */
  private async handleNote(noteId: string): Promise<CommandResult> {
    if (!noteId) {
      return { type: 'error', message: 'Please provide a note ID' };
    }
    
    const note = await this.noteContext.getNoteById(noteId);
    
    if (!note) {
      return { type: 'error', message: `Note with ID ${noteId} not found` };
    }
    
    return { type: 'note', note };
  }

  /**
   * Handle profile command
   */
  private async handleProfile(args: string): Promise<CommandResult> {
    const profile = await this.profileContext.getProfile();
    
    if (!profile) {
      return { type: 'error', message: 'No profile found. Use "bun run src/import.ts profile <path/to/profile.yaml>" to import a profile.' };
    }
    
    // Extract profile keywords
    const keywords = this.profileContext.extractProfileKeywords(profile);
    
    // Check if we want related notes
    if (args && args.toLowerCase() === 'related') {
      const noteContext = this.brainProtocol.getNoteContext();
      const relatedNotes = await this.profileContext.findRelatedNotes(noteContext, 5);
      
      // Determine match type
      let matchType: 'tags' | 'semantic' | 'keyword' = 'keyword';
      if (profile.tags && profile.tags.length > 0) {
        matchType = 'tags';
      } else if (profile.embedding) {
        matchType = 'semantic';
      }
      
      return { 
        type: 'profile-related', 
        profile, 
        relatedNotes, 
        matchType,
        keywords: keywords.slice(0, 15)
      };
    }
    
    return { 
      type: 'profile', 
      profile,
      keywords: keywords.slice(0, 15)
    };
  }

  /**
   * Handle ask command
   */
  private async handleAsk(question: string): Promise<CommandResult> {
    if (!question) {
      return { type: 'error', message: 'Please provide a question' };
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return { type: 'error', message: 'No Anthropic API key found. Set the ANTHROPIC_API_KEY environment variable to use this feature.' };
    }
    
    try {
      const result = await this.brainProtocol.processQuery(question);
      
      return {
        type: 'ask',
        answer: result.answer,
        citations: result.citations,
        relatedNotes: result.relatedNotes,
        profile: result.profile
      };
    } catch (error: unknown) {
      return { type: 'error', message: `Error processing question: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}