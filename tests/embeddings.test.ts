import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { EmbeddingService } from '../src/mcp/model/embeddings';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    // Create a new service instance for each test
    service = new EmbeddingService('fake-api-key');
  });

  test('should create a deterministic embedding', async () => {
    const text = 'This is a test text';
    const result = await service.getEmbedding(text);

    // Verify the embedding result shape
    expect(result).toBeDefined();
    expect(result.embedding).toBeDefined();
    expect(Array.isArray(result.embedding)).toBe(true);
    expect(result.embedding.length).toBe(1536);
    expect(result.truncated).toBe(false);
  });

  test('should create embeddings with consistent output for the same input', async () => {
    const text = 'Consistent text input';
    
    // Generate embedding twice for the same text
    const result1 = await service.getEmbedding(text);
    const result2 = await service.getEmbedding(text);
    
    // Embeddings should be the same for the same input
    expect(result1.embedding).toEqual(result2.embedding);
  });

  test('should chunk text correctly', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.';
    const chunks = service.chunkText(text, 100, 20);
    
    // Should chunk the text into pieces
    expect(chunks.length).toBeGreaterThan(0);
    
    // All text content should be preserved across chunks
    const allContent = chunks.join(' ');
    expect(allContent).toContain('First sentence');
    expect(allContent).toContain('Sixth sentence');
  });

  test('should calculate cosine similarity correctly', () => {
    // Identical vectors have similarity of 1
    const vec1 = [1, 0, 0];
    const similarity1 = service.cosineSimilarity(vec1, vec1);
    expect(similarity1).toBe(1);
    
    // Orthogonal vectors have similarity of 0
    const vec2 = [0, 1, 0];
    const similarity2 = service.cosineSimilarity(vec1, vec2);
    expect(similarity2).toBe(0);
    
    // Opposite vectors have similarity of -1
    const vec3 = [-1, 0, 0];
    const similarity3 = service.cosineSimilarity(vec1, vec3);
    expect(similarity3).toBe(-1);
  });

  test('should handle batch embedding requests', async () => {
    const texts = ['Text 1', 'Text 2', 'Text 3'];
    const results = await service.getBatchEmbeddings(texts);
    
    // Should return the same number of embeddings as input texts
    expect(results.length).toBe(texts.length);
    
    // Each result should have the expected shape
    for (const result of results) {
      expect(result.embedding.length).toBe(1536);
      expect(result.truncated).toBe(false);
    }
  });
});