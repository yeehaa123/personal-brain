/**
 * Mock Conversation Note Adapter
 * 
 * This file implements the standardized adapter pattern for conversation note operations.
 * It follows the Component Interface Standardization pattern with getInstance/resetInstance/createFresh.
 */

import type { Note } from '@/models/note';
import { createMockNote } from '@test/__mocks__/models/note';

/**
 * ConversationNoteAdapter for retrieving and managing conversation-related notes
 * 
 * This adapter provides methods for finding notes associated with specific conversations,
 * without extending the NoteRepository directly.
 */
export class MockConversationNoteAdapter {
  private static instance: MockConversationNoteAdapter | null = null;
  
  // Mock state
  private mockNotes: Note[] = [];

  /**
   * Private constructor to enforce the singleton pattern
   */
  private constructor(initialNotes: Note[] = []) {
    this.mockNotes = [...initialNotes];
    
    // Add default conversation note if none provided
    if (this.mockNotes.length === 0) {
      const conversationNote = createMockNote('note-conv-1', 'Conversation Note', ['conversation']);
      conversationNote.source = 'conversation';
      conversationNote.conversationMetadata = {
        conversationId: 'conv-123',
        timestamp: new Date('2025-01-01'),
      };
      this.mockNotes.push(conversationNote);
    }
  }

  /**
   * Get the singleton instance of this adapter
   */
  public static getInstance(): MockConversationNoteAdapter {
    if (!MockConversationNoteAdapter.instance) {
      MockConversationNoteAdapter.instance = new MockConversationNoteAdapter();
    }
    return MockConversationNoteAdapter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    MockConversationNoteAdapter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   */
  public static createFresh(initialNotes: Note[] = []): MockConversationNoteAdapter {
    return new MockConversationNoteAdapter(initialNotes);
  }

  /**
   * Find notes by conversation source type
   * @returns Array of notes with conversation source
   */
  async findConversationNotes(limit = 10, offset = 0): Promise<Note[]> {
    const conversationNotes = this.mockNotes.filter(note => note.source === 'conversation');
    // Sort by creation date descending
    const sorted = [...conversationNotes].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return sorted.slice(offset, offset + limit);
  }

  /**
   * Find notes by conversation ID
   * @param conversationId The conversation ID to search for
   * @returns Array of notes with matching conversation ID
   */
  async findByConversationId(conversationId: string): Promise<Note[]> {
    return this.mockNotes.filter(note => {
      if (!note.conversationMetadata) return false;
      return note.conversationMetadata.conversationId === conversationId;
    });
  }

  /**
   * Find notes by conversation metadata field value
   * @param field The field name in conversationMetadata
   * @param value The value to match
   * @returns Array of notes with matching metadata
   */
  async findByMetadataField(field: string, value: string): Promise<Note[]> {
    return this.mockNotes.filter(note => {
      if (!note.conversationMetadata) return false;
      
      // Type safe check for known fields
      if (field === 'conversationId' && note.conversationMetadata.conversationId === value) return true;
      if (field === 'userName' && note.conversationMetadata.userName === value) return true;
      if (field === 'promptSegment' && note.conversationMetadata.promptSegment === value) return true;
      
      // For other fields, use dynamic access (less type-safe)
      const metadata = note.conversationMetadata as Record<string, unknown>;
      return metadata[field] === value;
    });
  }

  /**
   * Get all conversation notes with a particular tag
   * @param tag The tag to search for
   * @returns Array of notes with the specified tag and source=conversation
   */
  async findConversationNotesByTag(tag: string): Promise<Note[]> {
    return this.mockNotes.filter(note => 
      note.source === 'conversation' && 
      note.tags?.includes(tag),
    );
  }

  /**
   * Add a test conversation note
   * @param options Optional properties to override defaults
   * @returns The created note
   */
  addConversationNote(options: Partial<Note> = {}): Note {
    const id = options.id || `note-conv-${this.mockNotes.length + 1}`;
    const conversationId = options.conversationMetadata?.conversationId || `conv-${Date.now()}`;
    
    const note = createMockNote(
      id,
      options.title || `Conversation Note ${id}`,
      options.tags || ['conversation', 'test'],
    );
    
    // Override with conversation-specific properties
    note.source = 'conversation';
    note.conversationMetadata = {
      conversationId,
      timestamp: new Date(),
      ...options.conversationMetadata,
    };
    
    // Apply any other overrides but preserve required types
    const fullNote: Note = {
      ...note,
      // Apply overrides carefully to maintain type safety
      title: options.title || note.title,
      content: options.content || note.content,
      tags: options.tags || note.tags,
      embedding: options.embedding || note.embedding,
      createdAt: options.createdAt || note.createdAt,
      updatedAt: options.updatedAt || note.updatedAt,
      confidence: options.confidence ?? note.confidence, 
      verified: options.verified ?? note.verified,
      // Ensure these critical fields are properly typed
      id,
      source: 'conversation',
      conversationMetadata: note.conversationMetadata,
    };
    
    this.mockNotes.push(fullNote);
    return fullNote;
  }

  /**
   * Set the mock notes collection (for test setup)
   */
  setMockNotes(notes: Note[]): void {
    this.mockNotes = [...notes];
  }

  /**
   * Clear all mock notes
   */
  clearNotes(): void {
    this.mockNotes = [];
  }
}