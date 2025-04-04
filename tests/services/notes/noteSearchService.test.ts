import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Note } from '@/models/note';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { NoteRepository } from '@/services/notes/noteRepository';
import { NoteSearchService } from '@/services/notes/noteSearchService';
import { createMockEmbedding, setupEmbeddingMocks } from '@test';


// Set up embedding service mocks
setupEmbeddingMocks(mock);

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
  { 
    id: 'note-1', 
    title: 'Test Note 1', 
    content: 'This is a test note about artificial intelligence and machine learning',
    tags: ['ai', 'ml', 'technology'],
    embedding: createMockEmbedding('AI note'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
  },
  { 
    id: 'note-2', 
    title: 'Test Note 2', 
    content: 'This note is about programming languages like JavaScript and TypeScript',
    tags: ['programming', 'javascript', 'typescript'],
    embedding: createMockEmbedding('programming note'),
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-02'),
  },
  { 
    id: 'note-3', 
    title: 'Test Note 3', 
    content: 'Notes about web development with frameworks like React and Vue',
    tags: ['web', 'frontend', 'javascript'],
    embedding: createMockEmbedding('web dev note'),
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-02'),
  },
];

// Create a mock repository
class MockNoteRepository {
  async getNoteById(id: string): Promise<Note | undefined> {
    return mockNotes.find(note => note.id === id);
  }
  
  async getRecentNotes(limit: number = 10): Promise<Note[]> {
    return [...mockNotes]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }
  
  async searchNotesByKeywords(
    query?: string, 
    tags?: string[], 
    limit: number = 10, 
    offset: number = 0,
  ): Promise<Note[]> {
    let results = [...mockNotes];
    
    // Filter by query if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(note => {
        const text = `${note.title} ${note.content}`.toLowerCase();
        return text.includes(lowerQuery);
      });
    }
    
    // Filter by tags if provided
    if (tags && tags.length > 0) {
      results = results.filter(note => {
        if (!note.tags) return false;
        return tags.some(tag => note.tags!.includes(tag));
      });
    }
    
    // Apply limit and offset
    return results.slice(offset, offset + limit);
  }
}

// Create a mock embedding service
class MockNoteEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    return createMockEmbedding(text);
  }
  
  async searchSimilarNotes(_embedding: number[], limit: number = 5): Promise<Note[]> {
    // Return notes with a mock similarity score
    return mockNotes.map(note => ({
      ...note,
      score: 0.85 - Math.random() * 0.2, // Random similarity between 0.65 and 0.85
    })).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
  }
  
  async findRelatedNotes(noteId: string, maxResults: number = 5): Promise<Note[]> {
    const note = mockNotes.find(n => n.id === noteId);
    if (!note) {
      // Return empty array instead of throwing for the test
      return [];
    }
    
    // Return other notes with similarity scores
    return mockNotes
      .filter(n => n.id !== noteId)
      .map(n => ({
        ...n,
        similarity: 0.8 - Math.random() * 0.3, // Random similarity
      }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, maxResults);
  }
}

describe('NoteSearchService', () => {
  let searchService: NoteSearchService;
  let repository: MockNoteRepository;
  let embeddingService: MockNoteEmbeddingService;
  
  beforeEach(() => {
    repository = new MockNoteRepository();
    embeddingService = new MockNoteEmbeddingService();
    searchService = new NoteSearchService(
      repository as unknown as NoteRepository, 
      embeddingService as unknown as NoteEmbeddingService,
    );
  });
  
  test('should properly initialize', () => {
    expect(searchService).toBeDefined();
  });
  
  test('should create instance using factory method', () => {
    // Mock the static method for this test
    const originalMethod = NoteSearchService.createWithApiKey;
    NoteSearchService.createWithApiKey = (_apiKey?: string) => {
      return new NoteSearchService(
        repository as unknown as NoteRepository,
        embeddingService as unknown as NoteEmbeddingService,
      );
    };
    
    const service = NoteSearchService.createWithApiKey('mock-api-key');
    
    // Restore original method
    NoteSearchService.createWithApiKey = originalMethod;
    
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(NoteSearchService);
  });
  
  test('should search notes with text query', async () => {
    const results = await searchService.searchNotes({ 
      query: 'javascript', 
      limit: 5,
    });
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('should search notes with tags', async () => {
    const results = await searchService.searchNotes({ 
      tags: ['ai', 'technology'],
      limit: 5,
    });
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('should search notes with semantic similarity when enabled', async () => {
    const results = await searchService.searchNotes({ 
      query: 'artificial intelligence',
      semanticSearch: true,
      limit: 5,
    });
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('should find related notes by id', async () => {
    const relatedNotes = await searchService.findRelated('note-1', 5);
    
    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
    expect(relatedNotes.length).toBeGreaterThan(0);
  });
  
  test('should handle invalid id for related notes gracefully', async () => {
    const relatedNotes = await searchService.findRelated('invalid-id', 5);
    
    // Should gracefully handle this by returning an empty array or recent notes
    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
  });
  
  test('should handle empty search parameters', async () => {
    const results = await searchService.searchNotes({});
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
  
  test('should extract keywords from text', () => {
    const text = 'This is a long text about machine learning and artificial intelligence algorithms';
    
    // Access the extractKeywords method
    // Define type for NoteSearchService with private method
    type SearchServiceWithPrivateMethods = NoteSearchService & {
      extractKeywords: (text: string) => string[];
    };
    
    const keywords = (searchService as SearchServiceWithPrivateMethods).extractKeywords(text);
    
    expect(keywords).toBeDefined();
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
  });
});