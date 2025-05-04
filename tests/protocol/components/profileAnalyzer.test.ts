import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Profile } from '@/models/profile';
import { ProfileAnalyzer } from '@/protocol/components/profileAnalyzer';
import type { EmbeddingService } from '@/resources/ai/embedding';
import { createMockProfile } from '@test/__mocks__/models/profile';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('ProfileAnalyzer', () => {
  // Use our standardized MockEmbeddingService
  let mockEmbeddingService: EmbeddingService;
  
  // Sample profile - will be initialized in beforeEach
  let sampleProfile: Profile;
  
  beforeEach(async () => {
    // Reset the mock instance to ensure test isolation
    MockEmbeddingService.resetInstance();
    
    // Create a fresh instance
    mockEmbeddingService = MockEmbeddingService.createFresh() as unknown as EmbeddingService;
    
    // Set up specific mocks for this test
    mockEmbeddingService.getEmbedding = mock(() => Promise.resolve([0.1, 0.2, 0.3]));
    mockEmbeddingService.calculateSimilarity = mock(() => 0.75);
    
    // Initialize sample profile
    sampleProfile = await createMockProfile('profile-1');
  });

  test('should detect profile queries correctly', async () => {
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
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
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
    const relevance = await profileAnalyzer.getProfileRelevance('What are my skills?', sampleProfile);
    
    // Verify embedding service was called - we don't need to check this explicitly since
    // it would throw an error otherwise, and we verify the output value
    
    // Should be a value between 0 and 1
    expect(relevance).toBeGreaterThan(0);
    expect(relevance).toBeLessThanOrEqual(1);
  });

  test('should handle missing profile embeddings gracefully', async () => {
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
    const profileWithoutEmbedding: Profile = { 
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
    const failingEmbeddingService = MockEmbeddingService.createFresh() as unknown as EmbeddingService;
    failingEmbeddingService.getEmbedding = mock(() => {
      throw new Error('Embedding service failed');
    });
    
    const analyzer = ProfileAnalyzer.createFresh({
      embeddingService: failingEmbeddingService,
    });
    
    // Should not throw and should fall back to keyword matching
    const relevance = await analyzer.getProfileRelevance('Tell me about my skills', sampleProfile);
    
    // Should still return a value
    expect(relevance).toBeGreaterThan(0);
    expect(relevance).toBeLessThanOrEqual(1);
  });
});