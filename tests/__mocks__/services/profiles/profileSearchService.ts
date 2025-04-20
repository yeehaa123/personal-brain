/**
 * Mock ProfileSearchService Implementation
 * 
 * This file provides a standardized mock implementation of the ProfileSearchService
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';
import { nanoid } from 'nanoid';

import type { NoteContext, NoteWithSimilarity } from '@/contexts/profiles/profileTypes';
import type { ProfileSearchService } from '@/services/profiles/profileSearchService';

/**
 * MockProfileSearchService class with standardized interface
 * 
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockProfileSearchService implements Partial<ProfileSearchService> {
  private static instance: MockProfileSearchService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockProfileSearchService {
    if (!MockProfileSearchService.instance) {
      MockProfileSearchService.instance = new MockProfileSearchService();
    }
    return MockProfileSearchService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockProfileSearchService.instance = null;
  }
  
  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(): MockProfileSearchService {
    return new MockProfileSearchService();
  }
  
  // Mock methods with default implementations
  findRelatedNotes = mock((_noteContext: NoteContext, _limit: number = 5): Promise<NoteWithSimilarity[]> => {
    return Promise.resolve(this.createMockRelatedNotes(_limit));
  });
  
  findNotesWithSimilarTags = mock((_noteContext: NoteContext, _tags: string[], _limit: number = 5): Promise<NoteWithSimilarity[]> => {
    return Promise.resolve(this.createMockRelatedNotes(_limit));
  });
  
  /**
   * Helper method to create mock notes with similarity scores
   */
  private createMockRelatedNotes(count: number = 3): NoteWithSimilarity[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `note-${nanoid(6)}`,
      title: `Mock Related Note ${i + 1}`,
      content: `This is a mock related note for testing the profile search service. Note number ${i + 1}.`,
      tags: ['profile-related', `tag-${i + 1}`, 'test'],
      createdAt: new Date(),
      updatedAt: new Date(),
      embedding: null,
      similarity: 0.8 - (i * 0.1),
    }));
  }
}