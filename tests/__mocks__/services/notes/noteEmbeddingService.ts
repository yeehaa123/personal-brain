/**
 * Mock implementation for NoteEmbeddingService
 * 
 * Provides a standardized mock that follows the Component Interface Standardization pattern.
 */

import type { Note } from '@/models/note';
import type { EmbeddingService } from '@/resources/ai/embedding';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockBaseEmbeddingService } from '@test/__mocks__/services/common/baseEmbeddingService';

/**
 * Standardized mock implementation for NoteEmbeddingService
 * Implements the Component Interface Standardization pattern
 */
export class MockNoteEmbeddingService extends MockBaseEmbeddingService {
  /** Singleton instance - use a different name to avoid property shadowing from parent class */
  private static noteEmbeddingInstance: MockNoteEmbeddingService | null = null;

  /**
   * Get the singleton instance
   */
  public static override getInstance(embeddingService?: EmbeddingService): MockNoteEmbeddingService {
    if (!MockNoteEmbeddingService.noteEmbeddingInstance) {
      MockNoteEmbeddingService.noteEmbeddingInstance = new MockNoteEmbeddingService(embeddingService);
    }
    return MockNoteEmbeddingService.noteEmbeddingInstance;
  }

  /**
   * Reset the singleton instance
   */
  public static override resetInstance(): void {
    MockNoteEmbeddingService.noteEmbeddingInstance = null;
  }

  /**
   * Create a fresh instance
   */
  public static override createFresh(embeddingService?: EmbeddingService): MockNoteEmbeddingService {
    return new MockNoteEmbeddingService(embeddingService);
  }

  /**
   * Constructor
   */
  constructor(embeddingService?: EmbeddingService) {
    super(embeddingService);
  }

  /**
   * Generate an embedding for a note
   */
  async generateNoteEmbedding(_title: string, _content: string): Promise<number[]> {
    return [0.1, 0.2, 0.3, 0.4, 0.5];
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
   * Search notes by embedding similarity
   */
  async searchSimilarNotes(_embedding: number[], maxResults = 5): Promise<(Note & { score: number })[]> {
    const mockNotes = Array.from({ length: maxResults }, (_, i) => ({
      ...createMockNote(`note-${i + 1}`, `Test Note ${i + 1}`, ['test']),
      score: 0.9 - (i * 0.1),
    }));
    
    return mockNotes;
  }

  /**
   * Find related notes for a given note ID based on embedding similarity
   */
  async findRelatedNotes(_noteId: string, maxResults = 5): Promise<(Note & { score: number })[]> {
    const mockNotes = Array.from({ length: maxResults }, (_, i) => ({
      ...createMockNote(`related-${i + 1}`, `Related Note ${i + 1}`, ['test']),
      score: 0.9 - (i * 0.1),
    }));
    
    return mockNotes;
  }
}