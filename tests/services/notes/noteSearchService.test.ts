import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Note } from '@/models/note';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { NoteRepository } from '@/services/notes/noteRepository';
import { NoteSearchService } from '@/services/notes/noteSearchService';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';
import { MockNoteEmbeddingService } from '@test/__mocks__/services/notes/noteEmbeddingService';
import { MockTextUtils } from '@test/__mocks__/utils/textUtils';


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

// Create sample notes with embeddings
const createSampleNotes = async (): Promise<Note[]> => {
  const mockService = MockEmbeddingService.createFresh();
  
  const note1 = createTestNote({
    id: 'note-1',
    title: 'Test Note 1',
    content: 'This is a test note about artificial intelligence and machine learning',
    tags: ['ai', 'ml', 'technology'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    source: 'import',
  });
  note1.embedding = await mockService.getEmbedding('AI note');
  
  const note2 = createTestNote({
    id: 'note-2',
    title: 'Test Note 2',
    content: 'This note is about programming languages like JavaScript and TypeScript',
    tags: ['programming', 'javascript', 'typescript'],
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-02'),
    source: 'import',
  });
  note2.embedding = await mockService.getEmbedding('programming note');
  
  const note3 = createTestNote({
    id: 'note-3',
    title: 'Test Note 3',
    content: 'Notes about web development with frameworks like React and Vue',
    tags: ['web', 'frontend', 'javascript'],
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-02'),
    source: 'import',
  });
  note3.embedding = await mockService.getEmbedding('web dev note');
  
  return [note1, note2, note3];
};

// Will be initialized in beforeEach
let mockNotes: Note[];


// Create instances of the mocks for tests
let repository: NoteRepository;
let embeddingService: NoteEmbeddingService;
let searchService: NoteSearchService;

describe('NoteSearchService', () => {
  // Set up the test instances
  beforeEach(async () => {
    // Reset singleton instances
    NoteRepository.resetInstance();
    NoteEmbeddingService.resetInstance();
    NoteSearchService.resetInstance();
    MockNoteEmbeddingService.resetInstance();
    
    // Initialize mock notes
    mockNotes = await createSampleNotes();
    
    // Initialize repository and embedding service
    repository = MockNoteRepository.createFresh(mockNotes);
    embeddingService = MockNoteEmbeddingService.createFresh();
    
    // Use the createFresh method with the updated interface
    searchService = NoteSearchService.createFresh(
      { entityName: 'note' },
      { 
        repository,
        embeddingService,
        logger: MockLogger.createFresh(),
        textUtils: MockTextUtils.createFresh(),
      },
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
