/**
 * Mock implementation for NoteEmbeddingService
 * 
 * A simple mock that follows the Component Interface Standardization pattern
 * and returns realistic test data.
 */

import type { Note } from '@/models/note';
import type { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { createTestNote } from '@test/__mocks__/models/note';
import { EmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

/**
 * Standardized mock implementation for NoteEmbeddingService
 */
export class MockNoteEmbeddingService {
  private static instance: MockNoteEmbeddingService | null = null;

  /**
   * Get the singleton instance
   */
  public static getInstance(): NoteEmbeddingService {
    if (!MockNoteEmbeddingService.instance) {
      MockNoteEmbeddingService.instance = new MockNoteEmbeddingService();
    }
    return MockNoteEmbeddingService.instance as unknown as NoteEmbeddingService;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockNoteEmbeddingService.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(): NoteEmbeddingService {
    return new MockNoteEmbeddingService() as unknown as NoteEmbeddingService;
  }

  /**
   * Generate an embedding for a note
   */
  async generateNoteEmbedding(_title: string, _content: string): Promise<number[]> {
    // Just return a mock embedding with random values
    return Array.from({ length: 5 }, () => Math.random());
  }

  /**
   * Create chunks for a note and generate embeddings for each chunk
   */
  async createNoteChunks(_noteId: string, _content: string): Promise<string[]> {
    return ['chunk-1', 'chunk-2', 'chunk-3'];
  }

  /**
   * Generate or update embeddings for all notes that don't have them
   */
  async generateEmbeddingsForAllNotes(): Promise<{ updated: number, failed: number }> {
    return { updated: 3, failed: 0 };
  }

  /**
   * Generate embedding
   */
  async generateEmbedding(_text: string): Promise<number[]> {
    // Use the MockEmbeddingService for consistency
    const mockService = EmbeddingService.createFresh();
    return mockService.getEmbedding(_text);
  }

  /**
   * Search notes by embedding similarity
   */
  async searchSimilarNotes(_embedding: number[], maxResults = 5): Promise<Note[]> {
    // Just create and return some test notes
    return Array.from({ length: maxResults }, (_, i) => 
      createTestNote({
        id: `note-${i + 1}`,
        title: `Test Note ${i + 1}`,
        content: `This is test note ${i + 1}`,
        tags: ['test'],
      }),
    );
  }

  /**
   * Find related notes for a given note ID based on embedding similarity
   */
  async findRelatedNotes(_noteId: string, maxResults = 5): Promise<Note[]> {
    // Just create and return some test notes
    return Array.from({ length: maxResults }, (_, i) => 
      createTestNote({
        id: `related-${i + 1}`,
        title: `Related Note ${i + 1}`,
        content: `This is related note ${i + 1}`,
        tags: ['test'],
      }),
    );
  }
}