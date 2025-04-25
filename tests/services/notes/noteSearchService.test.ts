import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Note } from '@/models/note';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { NoteRepository } from '@/services/notes/noteRepository';
import { NoteSearchService } from '@/services/notes/noteSearchService';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';


// Mock the EmbeddingService directly
mock.module('@/resources/ai/embedding', () => ({
  EmbeddingService: MockEmbeddingService,
}));

// Mock the textUtils functions
mock.module('@/utils/textUtils', () => ({
  prepareText: (text: string) => text.trim(),
  chunkText: (text: string) => text.split('.').filter(Boolean),
  extractKeywords: (text: string, maxKeywords = 10) => {
    const words = text.toLowerCase().split(/\s+/);
    const filtered = words.filter(word =>
      word.length > 4 &&
      !['about', 'these', 'those', 'their', 'there'].includes(word),
    );
    return [...new Set(filtered)].slice(0, maxKeywords);
  },
  sanitizeHtml: (html: string) => html,
  calculateReadingTime: (text: string) => Math.ceil(text.length / 1000),
}));

// Create mock notes for testing
const mockNotes = [
  createTestNote({
    id: 'note-1',
    title: 'Test Note 1',
    content: 'This is a test note about artificial intelligence and machine learning',
    tags: ['ai', 'ml', 'technology'],
    embedding: MockEmbeddingService.createMockEmbedding('AI note'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    source: 'import',
  }),
  createTestNote({
    id: 'note-2',
    title: 'Test Note 2',
    content: 'This note is about programming languages like JavaScript and TypeScript',
    tags: ['programming', 'javascript', 'typescript'],
    embedding: MockEmbeddingService.createMockEmbedding('programming note'),
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-02'),
    source: 'import',
  }),
  createTestNote({
    id: 'note-3',
    title: 'Test Note 3',
    content: 'Notes about web development with frameworks like React and Vue',
    tags: ['web', 'frontend', 'javascript'],
    embedding: MockEmbeddingService.createMockEmbedding('web dev note'),
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-02'),
    source: 'import',
  }),
];

// Create a mock repository using our standardized implementation
const mockRepository = MockNoteRepository.createFresh(mockNotes);

// Mock the repository's search methods using Bun's mock functionality
mockRepository.searchNotesByKeywords = mock((query: string | undefined, tags: string[] | undefined, limit = 10, offset = 0) => {
  let results = [...mockNotes];
  
  // Filter by query if provided
  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(note => 
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Filter by tags if provided
  if (tags && tags.length > 0) {
    results = results.filter(note => 
      note.tags && tags.some(tag => note.tags?.includes(tag))
    );
  }
  
  // Apply pagination
  return Promise.resolve(results.slice(offset, offset + limit));
});

// Mock the getRecentNotes method using Bun's mock functionality
mockRepository.getRecentNotes = mock((limit = 10, offset = 0) => {
  // Sort by createdAt in descending order and apply pagination
  return Promise.resolve(
    [...mockNotes]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
  );
});

// Create a mock embedding service
class MockNoteEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    return MockEmbeddingService.createMockEmbedding(text);
  }

  async searchSimilarNotes(_embedding: number[], limit: number = 5): Promise<Note[]> {
    // Return notes with a mock similarity score
    const result = mockNotes.map(note => ({
      ...note,
      score: 0.85 - Math.random() * 0.2, // Random similarity between 0.65 and 0.85
    })).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);

    // Make sure we return valid Note objects
    return result.map(({ score: _score, ...rest }) => createTestNote({
      ...rest,
      // Extract only the Note fields we need
      id: rest.id,
      title: rest.title,
      content: rest.content,
      tags: rest.tags || [],
      embedding: rest.embedding || undefined,
      createdAt: rest.createdAt,
      updatedAt: rest.updatedAt,
    }));
  }

  async findRelatedNotes(noteId: string, maxResults: number = 5): Promise<Note[]> {
    // Check if the note exists first
    const noteExists = mockNotes.some(note => note.id === noteId);
    if (!noteExists) {
      // Since we changed the implementation to fall back to recent notes,
      // we need to match that behavior in the mock
      return [];
    }

    // Return other notes, excluding the target note
    return mockNotes
      .filter(note => note.id !== noteId)
      .slice(0, maxResults);
  }
}

// Create instances of the mocks for tests
let repository: NoteRepository;
let embeddingService: NoteEmbeddingService;
let searchService: NoteSearchService;

describe('NoteSearchService', () => {
  // Set up the test instances
  beforeEach(() => {
    // Reset singleton instances
    NoteRepository.resetInstance();
    NoteEmbeddingService.resetInstance();
    NoteSearchService.resetInstance();
    
    repository = mockRepository as unknown as NoteRepository;
    embeddingService = new MockNoteEmbeddingService() as unknown as NoteEmbeddingService;
    
    // Use the new createWithDependencies method with the updated interface
    searchService = NoteSearchService.createWithDependencies(
      { entityName: 'note' },
      { 
        repository: repository,
        embeddingService: embeddingService
      }
    );
  });

  describe('search', () => {
    test('should search notes by query', async () => {
      const results = await searchService.search({ query: 'javascript' });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(note => note.id === 'note-2')).toBe(true);
    });

    test('should search notes by tags', async () => {
      const results = await searchService.search({ tags: ['ai'] });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(note => note.id === 'note-1')).toBe(true);
    });

    test('should apply limit and offset', async () => {
      const results = await searchService.search({ limit: 1, offset: 1 });

      expect(results).toBeDefined();
      expect(results.length).toBe(1);
    });
  });

  describe('findRelated', () => {
    test('should find related notes', async () => {
      const results = await searchService.findRelated('note-1');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(note => note.id !== 'note-1')).toBe(true);
    });

    test('should fall back to recent notes for non-existent note ID', async () => {
      const results = await searchService.findRelated('non-existent-id');

      expect(results).toBeDefined();
      // With the updated implementation, it falls back to recent notes instead of returning empty array
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
