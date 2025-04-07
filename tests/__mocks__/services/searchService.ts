/**
 * Standardized search service mocks
 * 
 * This file provides mock implementations for the search services following
 * the standardized singleton pattern with getInstance(), resetInstance(), and createFresh().
 */

import { mock } from 'bun:test';

import type { Note } from '@models/note';
import type { Profile } from '@models/profile';
import { createMockNotes } from '@test/__mocks__/models/note';
import { createMockProfile } from '@test/__mocks__/models/profile';

/**
 * Mock Note Search Service
 */
export class MockNoteSearchService {
  private static instance: MockNoteSearchService | null = null;
  private notes: Note[] = [];

  /**
   * Get singleton instance
   */
  public static getInstance(): MockNoteSearchService {
    if (!MockNoteSearchService.instance) {
      MockNoteSearchService.instance = new MockNoteSearchService();
    }
    return MockNoteSearchService.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockNoteSearchService.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(initialNotes: Note[] = createMockNotes()): MockNoteSearchService {
    return new MockNoteSearchService(initialNotes);
  }

  constructor(initialNotes: Note[] = createMockNotes()) {
    this.notes = [...initialNotes];
  }

  /**
   * Search by embedding
   */
  searchByEmbedding = mock<
    (embedding: number[], limit?: number, threshold?: number) => Promise<Array<Note & { _score: number }>>
      >(async (_embedding: number[], limit?: number, _threshold?: number) => {
        return this.notes.slice(0, limit || this.notes.length).map(note => ({
          ...note,
          _score: 0.85,
        }));
      });

  /**
   * Search by keywords
   */
  searchByKeywords = mock<
    (query: string, tags?: string[], limit?: number) => Promise<Note[]>
      >(async (_query: string, _tags?: string[], limit?: number) => {
        return this.notes.slice(0, limit || this.notes.length);
      });

  /**
   * Search notes with combined approach
   */
  search = mock<
    (options: {
      query?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
      semanticSearch?: boolean;
    }) => Promise<Note[]>
      >(async (options) => {
        const limit = options.limit || 10;
        const offset = options.offset || 0;
        return this.notes.slice(offset, offset + limit);
      });

  /**
   * Find related notes
   */
  findRelated = mock<
    (noteId: string, limit?: number) => Promise<Note[]>
      >(async (noteId: string, limit: number = 5) => {
        return this.notes
          .filter(note => note.id !== noteId)
          .slice(0, limit);
      });

  /**
   * Set notes for testing
   */
  setNotes(notes: Note[]): void {
    this.notes = [...notes];
  }

  /**
   * Add notes for testing
   */
  addNotes(notes: Note[]): void {
    this.notes.push(...notes);
  }

  /**
   * Clear notes
   */
  clearNotes(): void {
    this.notes = [];
  }
}

/**
 * Mock Profile Search Service
 */
export class MockProfileSearchService {
  private static instance: MockProfileSearchService | null = null;
  private profiles: Profile[] = [];

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
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockProfileSearchService.instance = null;
  }

  /**
   * Create a fresh instance for testing
   */
  public static createFresh(initialProfiles: Profile[] = [createMockProfile()]): MockProfileSearchService {
    return new MockProfileSearchService(initialProfiles);
  }

  constructor(initialProfiles: Profile[] = [createMockProfile()]) {
    this.profiles = [...initialProfiles];
  }

  /**
   * Search by embedding
   */
  searchByEmbedding = mock<
    (embedding: number[], limit?: number, threshold?: number) => Promise<Array<Profile & { _score: number }>>
      >(async (_embedding: number[], limit?: number, _threshold?: number) => {
        return this.profiles.slice(0, limit || this.profiles.length).map(profile => ({
          ...profile,
          _score: 0.85,
        }));
      });

  /**
   * Search by keywords
   */
  searchByKeywords = mock<
    (query: string, tags?: string[], limit?: number) => Promise<Profile[]>
      >(async (_query: string, _tags?: string[], limit?: number) => {
        return this.profiles.slice(0, limit || this.profiles.length);
      });

  /**
   * Search profiles with combined approach
   */
  search = mock<
    (options: {
      query?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
      semanticSearch?: boolean;
    }) => Promise<Profile[]>
      >(async (options) => {
        const limit = options.limit || 10;
        const offset = options.offset || 0;
        return this.profiles.slice(offset, offset + limit);
      });

  /**
   * Set profiles for testing
   */
  setProfiles(profiles: Profile[]): void {
    this.profiles = [...profiles];
  }

  /**
   * Add profiles for testing
   */
  addProfiles(profiles: Profile[]): void {
    this.profiles.push(...profiles);
  }

  /**
   * Clear profiles
   */
  clearProfiles(): void {
    this.profiles = [];
  }
}