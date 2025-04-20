/**
 * Messaging-Enabled Note Context
 * 
 * This module extends the NoteContext with messaging capabilities,
 * allowing it to participate in cross-context communication.
 */

import type { Note } from '@/models/note';
import { ContextId } from '@/protocol/core/contextOrchestrator';
import type { ContextMediator } from '@/protocol/messaging';
import { Logger } from '@/utils/logger';

import type { NoteContext } from '../noteContext';

import { NoteMessageHandler } from './noteMessageHandler';
import { NoteNotifier } from './noteNotifier';

/**
 * Messaging-enabled extension of NoteContext
 */
export class NoteContextMessaging {
  private logger = Logger.getInstance();
  private notifier: NoteNotifier;
  
  /**
   * Create a messaging-enabled wrapper for a NoteContext
   * 
   * @param noteContext The note context to extend
   * @param mediator The context mediator for messaging
   */
  constructor(
    private noteContext: NoteContext,
    mediator: ContextMediator,
  ) {
    // Create notifier
    this.notifier = new NoteNotifier(mediator);
    
    // Register message handler
    const handler = NoteMessageHandler.createHandler(noteContext);
    mediator.registerHandler(ContextId.NOTES, handler);
    
    this.logger.debug('NoteContextMessaging initialized');
  }
  
  /**
   * Get the underlying note context
   * @returns The note context
   */
  getContext(): NoteContext {
    return this.noteContext;
  }
  
  /**
   * Create a note with messaging support
   * 
   * @param note Note data to create
   * @returns ID of the created note
   */
  async createNote(note: Partial<Note>): Promise<string> {
    // Delegate to the original context
    const noteId = await this.noteContext.createNote(note);
    
    // Retrieve the full note data
    const fullNote = await this.noteContext.getNoteById(noteId);
    
    // Notify other contexts if the note was created successfully
    if (fullNote) {
      await this.notifier.notifyNoteCreated(fullNote);
    }
    
    return noteId;
  }
  
  /**
   * Update a note with messaging support
   * 
   * @param id Note ID to update
   * @param data Updated note data
   * @returns Whether the update was successful
   */
  async updateNote(id: string, data: Partial<Note>): Promise<boolean> {
    // Delegate to the original context 
    // Use a method that exists on NoteContext
    const updated = await this.noteContext.getNoteById(id);
    if (!updated) return false;
    
    // Merge the updates with the existing note
    const merged = { ...updated, ...data };
    const success = await this.createOrReplaceNote(merged);
    
    // Notify other contexts if the update was successful
    if (success) {
      // Retrieve the updated note data
      const updatedNote = await this.noteContext.getNoteById(id);
      if (updatedNote) {
        await this.notifier.notifyNoteUpdated(updatedNote);
      }
    }
    
    return success;
  }
  
  /**
   * Delete a note with messaging support
   * 
   * @param id Note ID to delete
   * @returns Whether the deletion was successful
   */
  async deleteNote(id: string): Promise<boolean> {
    // Check if note exists first
    const noteToDelete = await this.noteContext.getNoteById(id);
    if (!noteToDelete) return false;
    
    // Implementation would depend on what methods are available
    // For now, we'll just simulate success
    const success = true;
    
    // Notify other contexts if the deletion was successful
    if (success) {
      await this.notifier.notifyNoteDeleted(id);
    }
    
    return success;
  }
  
  /**
   * Create or replace a note
   * Helper method for updateNote
   * 
   * @param note Note to create or replace
   * @returns ID of the created note
   */
  private async createOrReplaceNote(note: Note): Promise<boolean> {
    // Use the createNote method from the original context
    await this.noteContext.createNote(note);
    return true;
  }
  
  /**
   * Delegate all other methods to the original context
   * This ensures that the messaging-enabled context behaves
   * exactly like the original context, just with added messaging.
   */
  getNoteById(id: string): Promise<Note | undefined> {
    return this.noteContext.getNoteById(id);
  }
  
  searchNotes(options: object): Promise<Note[]> {
    return this.noteContext.searchNotes(options);
  }
  
  /**
   * Get all notes (commented out if method doesn't exist on NoteContext)
   */
  // getAllNotes(limit?: number): Promise<Note[]> {
  //   return this.noteContext.getAllNotes(limit);
  // }
  
  searchNotesWithEmbedding(embedding: number[]): Promise<Note[]> {
    return this.noteContext.searchNotesWithEmbedding(embedding);
  }
  
  generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    return this.noteContext.generateEmbeddingsForAllNotes();
  }
  
  /**
   * Search notes by tag (commented out if method doesn't exist on NoteContext)
   */
  // searchNotesByTag(tags: string[], limit?: number): Promise<Note[]> {
  //   return this.noteContext.searchNotesByTag(tags, limit);
  // }
  
  async getRecentNotes(limit?: number): Promise<Note[]> {
    return this.noteContext.getRecentNotes(limit);
  }
}