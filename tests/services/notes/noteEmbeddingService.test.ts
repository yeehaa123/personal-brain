import { beforeEach, describe, expect, test } from 'bun:test';

import type { Note } from '@/models/note';
import type { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

// Create sample notes with embeddings
const createSampleNotes = async (): Promise<Note[]> => {
  const mockService = MockEmbeddingService.createFresh();
  
  const note1 = createTestNote({ 
    id: 'note-1', 
    title: 'Test Note 1', 
    content: 'This is a test note about artificial intelligence.',
    tags: ['ai', 'ml', 'technology'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    source: 'import',
    confidence: null,
    conversationMetadata: null,
    verified: false,
  });
  note1.embedding = await mockService.getEmbedding('AI note');
  
  const note2 = createTestNote({ 
    id: 'note-2', 
    title: 'Test Note 2', 
    content: 'This note is about programming languages.',
    tags: ['programming', 'javascript', 'typescript'],
    embedding: undefined, // Use undefined instead of null for type compatibility
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-02'),
    source: 'import',
    confidence: null,
    conversationMetadata: null,
    verified: false,
  });
  
  return [note1, note2];
};

// Will be initialized in beforeEach
let mockNotes: Note[];
let mockRepository: NoteRepository;

// Define a class to override the factory methods with mocks
class TestNoteEmbeddingService extends NoteEmbeddingService {
  private static testInstance: TestNoteEmbeddingService | null = null;
  
  // Override the getInstance method to return our test instance
  public static override getInstance(): TestNoteEmbeddingService {
    if (!TestNoteEmbeddingService.testInstance) {
      const mockEmbedding = MockEmbeddingService.createFresh();
      TestNoteEmbeddingService.testInstance = new TestNoteEmbeddingService(
        mockEmbedding as unknown as EmbeddingService,
        mockRepository,
      );
    }
    return TestNoteEmbeddingService.testInstance;
  }
  
  // Override resetInstance to reset our test instance
  public static override resetInstance(): void {
    TestNoteEmbeddingService.testInstance = null;
    // Also call the parent class's resetInstance method
    NoteEmbeddingService.resetInstance();
  }
  
  // Override createFresh to create a fresh test instance with all mocks injected
  public static override createFresh(): TestNoteEmbeddingService {
    const mockEmbedding = MockEmbeddingService.createFresh();
    return new TestNoteEmbeddingService(
      mockEmbedding as unknown as EmbeddingService,
      mockRepository,
    );
  }
  
  // Private constructor that lets us pass all dependencies
  private constructor(
    embeddingService: EmbeddingService,
    repository: NoteEmbeddingService['repository'],
  ) {
    super(embeddingService, repository);
  }
}

describe('NoteEmbeddingService', () => {
  let embeddingService: TestNoteEmbeddingService;
  
  beforeEach(async () => {
    // Reset singleton instances
    NoteEmbeddingService.resetInstance();
    MockNoteRepository.resetInstance();
    
    // Initialize mock notes
    mockNotes = await createSampleNotes();
    
    // Create a mock repository with our test notes
    mockRepository = MockNoteRepository.createFresh(mockNotes);
    
    // Setup mock methods that we'll need for testing
    // We need to cast to access the internal methods
    const mockRepoInstance = mockRepository as unknown as MockNoteRepository;
    mockRepoInstance.setNotes(mockNotes);
    
    // Make sure the search method is configured properly
    mockRepoInstance.search = async (): Promise<Note[]> => {
      return mockNotes;
    };
    
    // Create a fresh service instance for testing
    embeddingService = TestNoteEmbeddingService.createFresh();
  });
  
  test('should properly initialize', () => {
    expect(embeddingService).toBeDefined();
  });
  
  test('should generate embedding for note text', async () => {
    const title = 'Test Note';
    const content = 'This is a test note for embedding generation';
    const embedding = await embeddingService.generateNoteEmbedding(title, content);
    
    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
  });
  
  // Test removed - embeddings are now required for all notes
  
  test('should create note chunks', async () => {
    // Create a tracking variable to check if our mock was called
    let insertChunkCalled = false;
    
    // Get the mock repository instance to modify its behavior
    const mockRepoInstance = mockRepository as unknown as {
      insertNoteChunk: (chunk: { noteId: string; content: string; embedding: number[]; chunkIndex: number }) => Promise<string>
    };
    const originalInsertNoteChunk = mockRepoInstance.insertNoteChunk;
    
    // Replace with our tracking version
    mockRepoInstance.insertNoteChunk = async (chunk: { noteId: string; content: string; embedding: number[]; chunkIndex: number }) => {
      insertChunkCalled = true;
      return `chunk-${chunk.noteId}-${chunk.chunkIndex}`;
    };
    
    // Also add a mock embeddingService to ensure our chunks are properly handled
    // Use type assertion to access private properties
    const testService = embeddingService as unknown as { 
      embeddingService: Record<string, unknown>; 
    };
    const originalEmbeddingService = testService.embeddingService;
    testService.embeddingService = {
      // Add the chunkText method that will return consistent chunks for testing
      chunkText: (text: string) => {
        // Just split by periods for test simplicity
        return text.split('.').filter(s => s.trim().length > 0);
      },
      // Make sure getBatchEmbeddings returns the correct number of mock embeddings
      getBatchEmbeddings: async (texts: string[]) => {
        const mockService = MockEmbeddingService.createFresh();
        return mockService.getBatchEmbeddings(texts);
      },
    };
    
    const noteId = 'note-1';
    const content = 'This is the first sentence. This is the second sentence. This is the third sentence.';
    
    try {
      // Call the method
      await embeddingService.createNoteChunks(noteId, content);
      
      // We just verify the mock was called
      expect(insertChunkCalled).toBe(true);
      
      // Restore the original embedding service
      testService.embeddingService = originalEmbeddingService;
      // Restore the original repository method
      mockRepoInstance.insertNoteChunk = originalInsertNoteChunk;
    } catch (err) {
      // Restore the original embedding service and repository method even if the test fails
      testService.embeddingService = originalEmbeddingService;
      mockRepoInstance.insertNoteChunk = originalInsertNoteChunk;
      throw err;
    }
  });
  
  test('should search similar notes', async () => {
    // Setup mock repository to return notes with embeddings for search
    const mockRepoInstance = mockRepository as unknown as MockNoteRepository;
    const originalSearch = mockRepoInstance.search;
    
    try {
      // Ensure the mock notes have valid embeddings
      mockNotes.forEach(note => {
        if (!note.embedding || note.embedding.length === 0) {
          note.embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
        }
      });
      
      // Make sure the mock repository returns these notes
      mockRepoInstance.search = async () => {
        return mockNotes;
      };
      
      const mockService = MockEmbeddingService.createFresh();
      const embedding = await mockService.getEmbedding('search embedding');
      
      // Create a fresh service with our updated repository
      embeddingService = TestNoteEmbeddingService.createFresh();
      
      const results = await embeddingService.searchSimilarNotes(embedding, 5);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Ensure results have similarity scores
      if (results.length > 0) {
        expect(typeof results[0].score).toBe('number');
      }
    } finally {
      // Restore original search method
      mockRepoInstance.search = originalSearch;
    }
  });
  
  test('should find related notes', async () => {
    // Setup mock repository for related notes search
    const mockRepoInstance = mockRepository as unknown as MockNoteRepository;
    const originalGetById = mockRepoInstance.getById;
    const originalSearch = mockRepoInstance.search;
    
    try {
      // Make sure each note has a valid embedding for similarity calculation
      mockNotes.forEach(note => {
        if (!note.embedding || note.embedding.length === 0) {
          note.embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
        }
      });
      
      // Mock getById to return a note with embedding
      mockRepoInstance.getById = async (id: string) => {
        const note = mockNotes.find(n => n.id === id);
        if (!note) {
          throw new Error(`Note with ID ${id} not found`);
        }
        return note;
      };
      
      // Mock search to return all notes for similarity calculation
      mockRepoInstance.search = async () => {
        return mockNotes;
      };
      
      // Create a fresh service with our updated repository
      embeddingService = TestNoteEmbeddingService.createFresh();
      
      const results = await embeddingService.findRelatedNotes('note-1', 5);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    } finally {
      // Restore original methods
      mockRepoInstance.getById = originalGetById;
      mockRepoInstance.search = originalSearch;
    }
  });
});