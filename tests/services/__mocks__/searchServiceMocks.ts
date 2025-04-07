/**
 * Mocks for search service tests
 */
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';
import { createMockEmbedding } from '@test/__mocks__';

import { createMockNotes, createMockProfile } from './repositoryMocks';




// Mock search services
export class MockNoteSearchService {
  notes: Note[] = [];

  constructor(initialNotes: Note[] = createMockNotes()) {
    this.notes = [...initialNotes];
  }

  searchByEmbedding = async (_embedding: number[], limit?: number, _threshold?: number): Promise<Array<Note & { _score: number }>> => {
    return this.notes.slice(0, limit || this.notes.length).map(note => ({
      ...note,
      _score: 0.85,
    }));
  };

  searchByKeywords = async (_query: string, _tags?: string[], limit?: number): Promise<Note[]> => {
    return this.notes.slice(0, limit || this.notes.length);
  };
}

export class MockProfileSearchService {
  profiles: Profile[] = [];

  constructor(initialProfiles: Profile[] = [createMockProfile()]) {
    this.profiles = [...initialProfiles];
  }

  searchByEmbedding = async (_embedding: number[], limit?: number, _threshold?: number): Promise<Array<Profile & { _score: number }>> => {
    return this.profiles.slice(0, limit || this.profiles.length).map(profile => ({
      ...profile,
      _score: 0.85,
    }));
  };

  searchByKeywords = async (_query: string, _tags?: string[], limit?: number): Promise<Profile[]> => {
    return this.profiles.slice(0, limit || this.profiles.length);
  };
}

// Mock embedding services
export class MockNoteEmbeddingService {
  createEmbedding = async (text: string): Promise<number[]> => {
    return createMockEmbedding(text);
  };

  getEmbedding = async (_noteId: string): Promise<number[] | null> => {
    return createMockEmbedding('mock-note');
  };

  updateEmbedding = async (_noteId: string, _content: string): Promise<number[]> => {
    return createMockEmbedding('updated-mock-note');
  };

  cosineSimilarity = (_vec1: number[], _vec2: number[]): number => {
    return 0.85;
  };
}

export class MockProfileEmbeddingService {
  createEmbedding = async (text: string): Promise<number[]> => {
    return createMockEmbedding(text);
  };

  getEmbedding = async (_profileId: string): Promise<number[] | null> => {
    return createMockEmbedding('mock-profile');
  };

  updateEmbedding = async (_profileId: string, _content: string): Promise<number[]> => {
    return createMockEmbedding('updated-mock-profile');
  };

  cosineSimilarity = (_vec1: number[], _vec2: number[]): number => {
    return 0.85;
  };
}
