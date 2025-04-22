import { beforeEach, describe, expect, test } from 'bun:test';

import type { Note } from '@/models/note';
import type { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import { createTestNote } from '@test/__mocks__/models/note';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

// Create mock notes for testing
const mockNotes: Note[] = [
  createTestNote({ 
    id: 'note-1', 
    title: 'Test Note 1', 
    content: 'This is a test note about artificial intelligence.',
    tags: ['ai', 'ml', 'technology'],
    embedding: MockEmbeddingService.createMockEmbedding('AI note'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    source: 'import',
    confidence: null,
    conversationMetadata: null,
    verified: false,
  }),
  createTestNote({ 
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
  }),
];

// Mock the required repository methods
const mockRepositoryMethods = {
  getNoteById: (id: string) => Promise.resolve(mockNotes.find(note => note.id === id)),
  getNotesWithoutEmbeddings: () => Promise.resolve(mockNotes.filter(n => !n.embedding)),
  getNotesWithEmbeddings: () => Promise.resolve(mockNotes.filter(n => n.embedding)),
  getOtherNotesWithEmbeddings: (noteId: string) => 
    Promise.resolve(mockNotes.filter(n => n.embedding && n.id !== noteId)),
  updateNoteEmbedding: (id: string, embedding: number[]) => {
    const index = mockNotes.findIndex(note => note.id === id);
    if (index >= 0) {
      mockNotes[index].embedding = embedding;
      mockNotes[index].updatedAt = new Date();
    }
    return Promise.resolve(true);
  },
  insertNoteChunk: (chunk: { noteId: string; content: string; embedding?: number[] }) => 
    Promise.resolve(`chunk-${chunk.noteId}-${Math.floor(Math.random() * 1000)}`),
};

// Define a class to override the factory methods with mocks
class TestNoteEmbeddingService extends NoteEmbeddingService {
  private static testInstance: TestNoteEmbeddingService | null = null;
  
  // Override the getInstance method to return our test instance
  public static override getInstance(): TestNoteEmbeddingService {
    if (!TestNoteEmbeddingService.testInstance) {
      const mockEmbedding = MockEmbeddingService.createFresh();
      TestNoteEmbeddingService.testInstance = new TestNoteEmbeddingService(
        mockEmbedding as unknown as EmbeddingService,
        mockRepositoryMethods as unknown as NoteEmbeddingService['noteRepository'],
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
      mockRepositoryMethods as unknown as NoteEmbeddingService['noteRepository'],
    );
  }
  
  // Private constructor that lets us pass all dependencies
  private constructor(
    embeddingService: EmbeddingService,
    repository: NoteEmbeddingService['noteRepository'],
  ) {
    super(embeddingService, repository);
  }
}

describe('NoteEmbeddingService', () => {
  let embeddingService: TestNoteEmbeddingService;
  
  beforeEach(() => {
    // Reset singleton instances
    NoteEmbeddingService.resetInstance();
    
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
  
  test('should generate embeddings for all notes', async () => {
    const result = await embeddingService.generateEmbeddingsForAllNotes();
    
    expect(result).toBeDefined();
    expect(typeof result.updated).toBe('number');
    expect(typeof result.failed).toBe('number');
  });
  
  test('should create note chunks', async () => {
    // Create a tracking variable to check if our mock was called
    let insertChunkCalled = false;
    
    // Create a simple mock that sets our tracking variable
    const insertChunkMock = async (chunk: { noteId: string; content: string; embedding?: number[] }) => {
      insertChunkCalled = true;
      return `chunk-${chunk.noteId}-${Math.floor(Math.random() * 1000)}`;
    };
    
    // Also add a mock embeddingService to ensure our chunks are properly handled
    // Use type assertion to access private properties
    const testService = embeddingService as unknown as { 
      embeddingService: Record<string, unknown>; 
      noteRepository: Record<string, unknown>; 
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
        return texts.map(text => MockEmbeddingService.createMockEmbedding(text));
      },
    };
    
    // Replace the repository just for this test
    const originalRepo = testService.noteRepository;
    testService.noteRepository = {
      ...(originalRepo as object),
      insertNoteChunk: insertChunkMock,
    };
    
    const noteId = 'note-1';
    const content = 'This is the first sentence. This is the second sentence. This is the third sentence.';
    
    try {
      // Call the method
      await embeddingService.createNoteChunks(noteId, content);
      
      // We just verify the mock was called
      expect(insertChunkCalled).toBe(true);
      
      // Restore the original repository and embedding service
      testService.noteRepository = originalRepo;
      testService.embeddingService = originalEmbeddingService;
    } catch (err) {
      // Restore the original repository and embedding service even if the test fails
      testService.noteRepository = originalRepo;
      testService.embeddingService = originalEmbeddingService;
      throw err;
    }
  });
  
  test('should search similar notes', async () => {
    const embedding = MockEmbeddingService.createMockEmbedding('search embedding');
    const results = await embeddingService.searchSimilarNotes(embedding, 5);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    // Ensure results have similarity scores
    if (results.length > 0) {
      expect(typeof results[0].score).toBe('number');
    }
  });
  
  test('should find related notes', async () => {
    const results = await embeddingService.findRelatedNotes('note-1', 5);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
});