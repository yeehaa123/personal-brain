import { describe, test, expect, mock } from 'bun:test';
import { ProfileAnalyzer } from '@/mcp/protocol/components';
import { EmbeddingService } from '@/mcp/model';
import { createMockProfile } from '@test/mocks';

describe('ProfileAnalyzer', () => {
  // Mock embedding service with properly typed mock functions
  const mockGetEmbedding = mock<(text: string) => Promise<{id: string, embedding: number[], text: string}>>((text) => {
    return Promise.resolve({
      id: 'test-embedding',
      embedding: [0.1, 0.2, 0.3], 
      text,
    });
  });
  
  const mockCosineSimilarity = mock<(embedding1: number[], embedding2: number[]) => number>(() => 0.75);
  
  const mockEmbeddingService = {
    getEmbedding: mockGetEmbedding,
    cosineSimilarity: mockCosineSimilarity,
  } as unknown as EmbeddingService;

  const profileAnalyzer = new ProfileAnalyzer(mockEmbeddingService);

  // Sample profile
  const sampleProfile = createMockProfile('profile-1');

  test('should detect profile queries correctly', () => {
    // Profile-related queries
    expect(profileAnalyzer.isProfileQuery('Tell me about my profile')).toBe(true);
    expect(profileAnalyzer.isProfileQuery('What is my background?')).toBe(true);
    expect(profileAnalyzer.isProfileQuery('Show my resume')).toBe(true);
    expect(profileAnalyzer.isProfileQuery('What are my skills?')).toBe(true);
    
    // Non-profile queries
    expect(profileAnalyzer.isProfileQuery('What is the weather today?')).toBe(false);
    expect(profileAnalyzer.isProfileQuery('Tell me about quantum computing')).toBe(false);
    expect(profileAnalyzer.isProfileQuery('How does MCP work?')).toBe(false);
  });

  test('should calculate profile relevance using embeddings', async () => {
    const relevance = await profileAnalyzer.getProfileRelevance('What are my skills?', sampleProfile);
    
    // Verify embedding service was called
    expect(mockGetEmbedding).toHaveBeenCalled();
    expect(mockCosineSimilarity).toHaveBeenCalled();
    
    // Should be a value between 0 and 1
    expect(relevance).toBeGreaterThan(0);
    expect(relevance).toBeLessThanOrEqual(1);
  });

  test('should handle missing profile embeddings gracefully', async () => {
    const profileWithoutEmbedding = { 
      ...sampleProfile, 
      embedding: null,
    };
    
    // Profile query with no embedding
    const relevanceForProfileQuery = await profileAnalyzer.getProfileRelevance(
      'Tell me about my background', 
      profileWithoutEmbedding,
    );
    
    // Should return high relevance for profile query even without embedding
    expect(relevanceForProfileQuery).toBeGreaterThan(0.8);
    
    // Non-profile query with no embedding
    const relevanceForRegularQuery = await profileAnalyzer.getProfileRelevance(
      'What is quantum computing?', 
      profileWithoutEmbedding,
    );
    
    // Should return low relevance for non-profile query
    expect(relevanceForRegularQuery).toBeLessThan(0.3);
  });

  test('should handle errors in embedding calculation', async () => {
    // Create a service that throws an error
    const mockFailingGetEmbedding = mock<(text: string) => Promise<{id: string, embedding: number[], text: string}>>(() => {
      throw new Error('Embedding service failed');
    });
    
    const failingEmbeddingService = {
      getEmbedding: mockFailingGetEmbedding,
      cosineSimilarity: mockCosineSimilarity,
    } as unknown as EmbeddingService;
    
    const analyzer = new ProfileAnalyzer(failingEmbeddingService);
    
    // Should not throw and should fall back to keyword matching
    const relevance = await analyzer.getProfileRelevance('Tell me about my skills', sampleProfile);
    
    // Should still return a value
    expect(relevance).toBeGreaterThan(0);
    expect(relevance).toBeLessThanOrEqual(1);
  });
});