import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { NoteContext } from '../src/mcp/context/noteContext';
import { EmbeddingService } from '../src/mcp/model/embeddings';

describe('NoteContext', () => {
  let context: NoteContext;
  
  // Use a simple mock of the embedding service without trying to mock DB
  // This creates a real NoteContext but avoids API calls
  
  beforeEach(() => {
    // Create a new context with a fake API key for each test
    context = new NoteContext('fake-api-key');
  });

  test('extractKeywords should extract meaningful keywords', () => {
    // Access the private method using any type assertion
    const keywords = (context as any).extractKeywords(
      "This is a test document with important keywords about artificial intelligence and machine learning"
    );
    
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
    
    // Keywords should include meaningful words from the text
    const expectedKeywords = ['artificial', 'intelligence', 'machine', 'learning', 'important', 'document', 'keywords'];
    
    // At least some of our expected keywords should be present
    const foundKeywords = expectedKeywords.filter(keyword => keywords.includes(keyword));
    expect(foundKeywords.length).toBeGreaterThan(0);
  });

  test('chunkText properly segments text', () => {
    // Create an embedding service to test chunking
    const embeddingService = new EmbeddingService('fake-api-key');
    
    const longText = "First sentence. Second sentence. " + 
                    "Third sentence. Fourth sentence. " +
                    "Fifth sentence. Sixth sentence. " +
                    "Seventh sentence. Eighth sentence.";
    
    const chunks = embeddingService.chunkText(longText, 30, 10);
    
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
    
    // Each chunk should be less than chunk size + overlap
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(40);
    }
    
    // Make sure all content is preserved across chunks
    const allContent = chunks.join(' ');
    const words = longText.split(' ');
    for (const word of words) {
      expect(allContent).toContain(word);
    }
  });
  
  test('cosineSimilarity calculates similarity correctly', () => {
    const embeddingService = new EmbeddingService('fake-api-key');
    
    // Identical vectors should have similarity 1
    const vec1 = [1, 0, 0];
    expect(embeddingService.cosineSimilarity(vec1, vec1)).toBe(1);
    
    // Orthogonal vectors should have similarity 0
    const vec2 = [0, 1, 0];
    expect(embeddingService.cosineSimilarity(vec1, vec2)).toBe(0);
    
    // Opposite vectors should have similarity -1
    const vec3 = [-1, 0, 0];
    expect(embeddingService.cosineSimilarity(vec1, vec3)).toBe(-1);
    
    // Partially similar vectors should have similarity between -1 and 1
    const vec4 = [0.5, 0.5, 0];
    const similarity = embeddingService.cosineSimilarity(vec1, vec4);
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });
});