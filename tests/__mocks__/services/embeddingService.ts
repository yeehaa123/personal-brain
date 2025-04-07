/**
 * Standardized embedding service mocks
 * 
 * This file provides mock implementations for the embedding services following
 * the standardized singleton pattern with getInstance(), resetInstance(), and createFresh().
 */

import { mock } from 'bun:test';

import type { Note } from '@models/note';
import type { Profile } from '@models/profile';
import { createMockEmbedding } from '@test/__mocks__/utils/embeddingUtils';

/**
 * Mock Note Embedding Service
 */
export class MockNoteEmbeddingService {
  private static instance: MockNoteEmbeddingService | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): MockNoteEmbeddingService {
    if (!MockNoteEmbeddingService.instance) {
      MockNoteEmbeddingService.instance = new MockNoteEmbeddingService();
    }
    return MockNoteEmbeddingService.instance;
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
  public static createFresh(): MockNoteEmbeddingService {
    return new MockNoteEmbeddingService();
  }

  /**
   * Create embedding from text
   */
  createEmbedding = mock<(text: string) => Promise<number[]>>(
    async (text: string) => createMockEmbedding(text),
  );

  /**
   * Get embedding for a note
   */
  getEmbedding = mock<(noteId: string) => Promise<number[] | null>>(
    async (_noteId: string) => createMockEmbedding('mock-note'),
  );

  /**
   * Update embedding for a note
   */
  updateEmbedding = mock<(noteId: string, content: string) => Promise<number[]>>(
    async (_noteId: string, _content: string) => createMockEmbedding('updated-mock-note'),
  );

  /**
   * Calculate cosine similarity between vectors
   */
  cosineSimilarity = mock<(vec1: number[], vec2: number[]) => number>(
    (_vec1: number[], _vec2: number[]) => 0.85,
  );

  /**
   * Find related notes based on embedding similarity
   */
  findRelatedNotes = mock<(noteId: string, limit?: number) => Promise<Array<Note & { score: number }>>>(
    async (_noteId: string, limit: number = 5) => {
      return Array.from({ length: limit }, (_, i) => ({
        id: `related-note-${i + 1}`,
        title: `Related Note ${i + 1}`,
        content: `This is the content of Related Note ${i + 1}`,
        tags: [`tag${i + 1}`],
        embedding: createMockEmbedding(`related-note-${i + 1}`),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        source: 'import',
        confidence: null,
        conversationMetadata: null,
        verified: null,
        score: 0.85 - (i * 0.05),
      }));
    },
  );
}

/**
 * Mock Profile Embedding Service
 */
export class MockProfileEmbeddingService {
  private static instance: MockProfileEmbeddingService | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): MockProfileEmbeddingService {
    if (!MockProfileEmbeddingService.instance) {
      MockProfileEmbeddingService.instance = new MockProfileEmbeddingService();
    }
    return MockProfileEmbeddingService.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockProfileEmbeddingService.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(): MockProfileEmbeddingService {
    return new MockProfileEmbeddingService();
  }

  /**
   * Create embedding from text
   */
  createEmbedding = mock<(text: string) => Promise<number[]>>(
    async (text: string) => createMockEmbedding(text),
  );

  /**
   * Get embedding for a profile
   */
  getEmbedding = mock<(profileId: string) => Promise<number[] | null>>(
    async (_profileId: string) => createMockEmbedding('mock-profile'),
  );

  /**
   * Update embedding for a profile
   */
  updateEmbedding = mock<(profileId: string, content: string) => Promise<number[]>>(
    async (_profileId: string, _content: string) => createMockEmbedding('updated-mock-profile'),
  );

  /**
   * Calculate cosine similarity between vectors
   */
  cosineSimilarity = mock<(vec1: number[], vec2: number[]) => number>(
    (_vec1: number[], _vec2: number[]) => 0.85,
  );

  /**
   * Find related profiles
   */
  findRelatedProfiles = mock<(profileId: string, limit?: number) => Promise<Array<Profile & { score: number }>>>(
    async (_profileId: string, limit: number = 2) => {
      return Array.from({ length: limit }, (_, i) => ({
        id: `related-profile-${i + 1}`,
        publicIdentifier: null,
        profilePicUrl: null,
        backgroundCoverImageUrl: null,
        firstName: `Related${i + 1}`,
        lastName: 'User',
        fullName: `Related${i + 1} User`,
        followerCount: null,
        headline: 'Test User',
        summary: 'This is a related test profile',
        occupation: 'Tester',
        country: null,
        countryFullName: null,
        city: null,
        state: null,
        experiences: [],
        education: [],
        languages: [],
        languagesAndProficiencies: [],
        accomplishmentPublications: null,
        accomplishmentHonorsAwards: null,
        accomplishmentProjects: null,
        volunteerWork: null,
        embedding: createMockEmbedding(`related-profile-${i + 1}`),
        tags: [`tag${i + 1}`],
        createdAt: new Date(),
        updatedAt: new Date(),
        score: 0.85 - (i * 0.05),
      }));
    },
  );
}