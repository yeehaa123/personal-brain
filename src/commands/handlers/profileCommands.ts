/**
 * Profile commands handler
 * Handles profile-related commands
 */

import type { ProfileContext } from '@/mcpServer';
import type { Note } from '@/models/note';
import type { IBrainProtocol } from '@/protocol/types';

import { BaseCommandHandler } from '../core/baseCommandHandler';
import type { CommandInfo, CommandResult } from '../core/commandTypes';

// Define valid source types
type NoteSource = 'import' | 'conversation' | 'user-created';

/**
 * Handler for profile-related commands
 */
export class ProfileCommandHandler extends BaseCommandHandler {
  private profileContext: ProfileContext;

  constructor(brainProtocol: IBrainProtocol) {
    super(brainProtocol);
    this.profileContext = brainProtocol.getContextManager().getProfileContext();
  }

  /**
   * Get supported commands
   */
  getCommands(): CommandInfo[] {
    return [
      {
        command: 'profile',
        description: 'View your profile information',
        usage: 'profile [related]',
        examples: ['profile', 'profile related'],
      },
    ];
  }

  /**
   * Check if this handler can process the command
   */
  canHandle(command: string): boolean {
    return command === 'profile';
  }

  /**
   * Execute a command
   */
  async execute(command: string, args: string): Promise<CommandResult> {
    if (command === 'profile') {
      return await this.handleProfile(args);
    }
    return this.formatError(`Unknown command: ${command}`);
  }

  /**
   * Handle profile command
   */
  private async handleProfile(args: string): Promise<CommandResult> {
    const profile = await this.profileContext.getProfile();

    if (!profile) {
      return this.formatError('No profile found. Use "bun run src/import.ts profile <path/to/profile.yaml>" to import a profile.');
    }

    // Check if we want related notes
    if (args && args.toLowerCase() === 'related') {
      const noteContext = this.brainProtocol.getContextManager().getNoteContext();
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
        relatedNotes: relatedNotes.map(note => this.convertToNote(note)),
        matchType,
      };
    }

    return {
      type: 'profile',
      profile,
    };
  }

  /**
   * Convert a note with similarity to a standard note
   * Ensures type compatibility between different note representations
   */
  private convertToNote(note: { id: string; title: string; content: string; embedding?: number[] | null; tags?: string[] | null; createdAt: Date; updatedAt: Date; source?: NoteSource; confidence?: number | null; conversationMetadata?: { conversationId: string; timestamp: Date; userName?: string; promptSegment?: string } | null; verified?: boolean | null }): Note {
    return {
      id: note.id,
      title: note.title, 
      content: note.content,
      embedding: note.embedding || null,
      tags: note.tags || null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      source: note.source || 'import',
      confidence: note.confidence || null,
      conversationMetadata: note.conversationMetadata || null,
      verified: note.verified || false,
    };
  }
}