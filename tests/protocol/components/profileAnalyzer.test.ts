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

  test('correctly identifies profile and non-profile queries', async () => {
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
    // Test various query types
    const results = {
      profileQueries: [
        'Tell me about my profile',
        'What is my background?',
        'Show my resume',
        'What are my skills?',
      ].map(query => profileAnalyzer.isProfileQuery(query)),
      
      nonProfileQueries: [
        'What is the weather today?',
        'Tell me about quantum computing',
        'How does MCP work?',
      ].map(query => profileAnalyzer.isProfileQuery(query)),
    };
    
    // Verify all results in a single assertion
    expect({
      allProfileQueriesDetected: results.profileQueries.every(result => result === true),
      allNonProfileQueriesRejected: results.nonProfileQueries.every(result => result === false),
    }).toMatchObject({
      allProfileQueriesDetected: true,
      allNonProfileQueriesRejected: true,
    });
  });

  test('calculates profile relevance using embeddings within expected range', async () => {
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
    // Test relevance calculation
    const relevance = await profileAnalyzer.getProfileRelevance('What are my skills?', sampleProfile);
    
    // Verify relevance is within expected range
    expect({
      relevanceIsNumeric: typeof relevance === 'number',
      relevanceInValidRange: relevance > 0 && relevance <= 1,
    }).toMatchObject({
      relevanceIsNumeric: true,
      relevanceInValidRange: true,
    });
  });

  test('handles missing profile embeddings with appropriate fallback behavior', async () => {
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
    // Create profile without embedding
    const profileWithoutEmbedding: Profile = { 
      ...sampleProfile, 
      embedding: null,
    };
    
    // Test both query types with a profile missing embeddings
    const results = {
      profileQuery: await profileAnalyzer.getProfileRelevance(
        'Tell me about my background', 
        profileWithoutEmbedding,
      ),
      nonProfileQuery: await profileAnalyzer.getProfileRelevance(
        'What is quantum computing?', 
        profileWithoutEmbedding,
      ),
    };
    
    // Verify appropriate fallback behavior in a single assertion
    expect({
      profileQueryHasHighRelevance: results.profileQuery > 0.8,
      nonProfileQueryHasLowRelevance: results.nonProfileQuery < 0.3,
    }).toMatchObject({
      profileQueryHasHighRelevance: true,
      nonProfileQueryHasLowRelevance: true,
    });
  });

  test('gracefully handles embedding service errors with fallback mechanism', async () => {
    // Create a service that throws an error
    const failingEmbeddingService = MockEmbeddingService.createFresh() as unknown as EmbeddingService;
    failingEmbeddingService.getEmbedding = mock(() => {
      throw new Error('Embedding service failed');
    });
    
    // Create analyzer with failing service
    const analyzer = ProfileAnalyzer.createFresh({
      embeddingService: failingEmbeddingService,
    });
    
    // Test error handling with fallback
    const relevance = await analyzer.getProfileRelevance('Tell me about my skills', sampleProfile);
    
    // Verify that error handling worked correctly
    expect({
      fallbackProvided: relevance !== undefined,
      valueInValidRange: relevance > 0 && relevance <= 1,
    }).toMatchObject({
      fallbackProvided: true,
      valueInValidRange: true,
    });
  });
});