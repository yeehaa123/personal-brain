/**
 * Shared command handlers for the CLI and Matrix interfaces
 * This module defines the core command logic that can be reused across interfaces
 */

import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { BrainProtocol } from '@/mcp/protocol/brainProtocol';
import logger from '@/utils/logger';

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
import type { ExternalCitation, NoteContext, ProfileContext, ExternalSourceContext } from '@/mcp';

export type CommandResult =
  | { type: 'error'; message: string }
  | { type: 'help'; commands: CommandInfo[] }
  | { type: 'profile'; profile: Profile }
  | { type: 'profile-related'; profile: Profile; relatedNotes: Note[]; matchType: 'tags' | 'semantic' | 'keyword' }
  | { type: 'notes'; notes: Note[]; title?: string }
  | { type: 'note'; note: Note }
  | { type: 'tags'; tags: Array<{ tag: string; count: number }> }
  | { type: 'search'; query: string; notes: Note[] }
  | { type: 'ask'; answer: string; citations: Array<{ noteId: string; noteTitle: string; excerpt: string }>; relatedNotes: Note[]; profile: Profile | undefined; externalSources: ExternalCitation[] | undefined }
  | { type: 'external'; enabled: boolean; message: string }
  | {
    type: 'status'; status: {
      apiConnected: boolean;
      dbConnected: boolean;
      noteCount: number;
      externalSources: Record<string, boolean>;
      externalSourcesEnabled: boolean;
    }
  };

/**
 * Command handler for processing commands and returning structured results
 */
export class CommandHandler {
  private brainProtocol: BrainProtocol;
  private noteContext: NoteContext;
  private profileContext: ProfileContext;
  private externalContext: ExternalSourceContext;

  constructor(brainProtocol: BrainProtocol) {
    this.brainProtocol = brainProtocol;
    this.noteContext = brainProtocol.getNoteContext();
    this.profileContext = brainProtocol.getProfileContext();
    this.externalContext = brainProtocol.getExternalSourceContext();
  }

  /**
   * Get all available commands with their descriptions
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'help',
        description: 'Show available commands',
        usage: 'help',
      },
      {
        command: 'search',
        description: 'Search for notes',
        usage: 'search <query>',
        examples: ['search ecosystem', 'search "personal knowledge"'],
      },
      {
        command: 'tags',
        description: 'List all tags in the system',
        usage: 'tags',
      },
      {
        command: 'list',
        description: 'List all notes or notes with a specific tag',
        usage: 'list [tag]',
        examples: ['list', 'list ecosystem'],
      },
      {
        command: 'note',
        description: 'Show a specific note by ID',
        usage: 'note <id>',
        examples: ['note abc123'],
      },
      {
        command: 'profile',
        description: 'View your profile information',
        usage: 'profile [related]',
        examples: ['profile', 'profile related'],
      },
      {
        command: 'ask',
        description: 'Ask a question to your brain',
        usage: 'ask <question>',
        examples: ['ask "What are the principles of ecosystem architecture?"'],
      },
      {
        command: 'external',
        description: 'Enable or disable external knowledge sources',
        usage: 'external <on|off>',
        examples: ['external on', 'external off'],
      },
      {
        command: 'status',
        description: 'Check system status including external sources',
        usage: 'status',
        examples: ['status'],
      },
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
      case 'external':
        return await this.handleExternal(args);
      case 'status':
        return await this.handleStatus();
      default:
        return { type: 'error', message: `Unknown command: ${command}` };
      }
    } catch (error: unknown) {
      return {
        type: 'error',
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
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

      // Type assertion to resolve compatibility issue between NoteWithSimilarity and Note types
      return {
        type: 'profile-related',
        profile,
        // Ensure type compatibility by using a properly typed mapping function
        relatedNotes: relatedNotes.map(note => ({
          id: note.id,
          title: note.title, 
          content: note.content,
          embedding: note.embedding || null,
          tags: note.tags || null,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
        matchType,
      };
    }

    return {
      type: 'profile',
      profile,
    };
  }

  /**
   * Handle ask command
   */
  private async handleAsk(question: string): Promise<CommandResult> {
    if (!question) {
      return { type: 'error', message: 'Please provide a question' };
    }

    // Use aiConfig to check for API key instead of direct process.env access
    if (!this.brainProtocol.hasAnthropicApiKey()) {
      return { type: 'error', message: 'No Anthropic API key found. Set the ANTHROPIC_API_KEY environment variable to use this feature.' };
    }

    try {
      const result = await this.brainProtocol.processQuery(question);

      return {
        type: 'ask',
        answer: result.answer,
        citations: result.citations,
        relatedNotes: result.relatedNotes,
        profile: result.profile,
        externalSources: result.externalSources,
      };
    } catch (error: unknown) {
      return { type: 'error', message: `Error processing question: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Handle external command - toggle external sources
   */
  private async handleExternal(args: string): Promise<CommandResult> {
    const arg = args.trim().toLowerCase();

    if (arg === 'on' || arg === 'enable') {
      this.brainProtocol.setUseExternalSources(true);
      return {
        type: 'external',
        enabled: true,
        message: 'External knowledge sources have been enabled.',
      };
    } else if (arg === 'off' || arg === 'disable') {
      this.brainProtocol.setUseExternalSources(false);
      return {
        type: 'external',
        enabled: false,
        message: 'External knowledge sources have been disabled.',
      };
    } else {
      return {
        type: 'error',
        message: 'Usage: external <on|off> - Enable or disable external knowledge sources',
      };
    }
  }

  /**
   * Handle status command - check system status
   */
  private async handleStatus(): Promise<CommandResult> {
    // Check API connection using BrainProtocol methods
    const apiConnected = this.brainProtocol.hasAnthropicApiKey() || this.brainProtocol.hasOpenAIApiKey();

    // Check database connection with a single operation
    let dbConnected = false;
    let noteCount = 0;

    try {
      // Get recent notes - this operation will tell us both if DB is connected
      // and how many notes exist (length of returned array)
      const notes = await this.noteContext.searchNotes({ limit: 1 });
      dbConnected = true;

      // If we were able to get notes, we can also get the total count
      try {
        noteCount = await this.noteContext.getNoteCount();
      } catch (countError) {
        // If count fails but we got notes, use the notes array length as fallback
        noteCount = notes.length;
        logger.error(`Error getting note count, using fallback: ${countError}`);
      }
    } catch (error) {
      logger.error(`Error checking database connection: ${error}`);
      dbConnected = false;
    }

    // Check external sources with error handling
    let externalSources = {};
    try {
      externalSources = await this.externalContext.checkSourcesAvailability();
    } catch (error) {
      logger.error(`Error checking external sources: ${error}`);
      // Failed to check external sources, continue with empty object
    }

    const externalSourcesEnabled = this.brainProtocol.getUseExternalSources();

    return {
      type: 'status',
      status: {
        apiConnected,
        dbConnected,
        noteCount,
        externalSources,
        externalSourcesEnabled,
      },
    };
  }
}
