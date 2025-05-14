import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { ProfileAnalyzer } from '@/protocol/components/profileAnalyzer';
import type { EmbeddingService } from '@/resources/ai/embedding';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('ProfileAnalyzer', () => {
  // Use our standardized MockEmbeddingService
  let mockEmbeddingService: EmbeddingService;
  
  beforeEach(async () => {
    // Reset the mock instance to ensure test isolation
    MockEmbeddingService.resetInstance();
    
    // Create a fresh instance
    mockEmbeddingService = MockEmbeddingService.createFresh() as unknown as EmbeddingService;
    
    // Set up specific mocks for this test
    mockEmbeddingService.getEmbedding = mock(() => Promise.resolve([0.1, 0.2, 0.3]));
    mockEmbeddingService.calculateSimilarity = mock(() => 0.75);
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
    
    // Mock profile embedding
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    
    // Test relevance calculation with embedding
    const relevance = await profileAnalyzer.getProfileRelevance('What are my skills?', mockEmbedding);
    
    // Verify relevance is within expected range
    expect({
      relevanceIsNumeric: typeof relevance === 'number',
      relevanceInValidRange: relevance > 0 && relevance <= 1,
    }).toMatchObject({
      relevanceIsNumeric: true,
      relevanceInValidRange: true,
    });
  });

  test('handles profile query detection without embeddings', async () => {
    // Create profile analyzer for this test
    const profileAnalyzer = ProfileAnalyzer.createFresh({ embeddingService: mockEmbeddingService });
    
    // Test detection of profile queries via keyword matching
    const results = {
      isProfileQuery: profileAnalyzer.isProfileQuery('Tell me about my background'),
      isNotProfileQuery: profileAnalyzer.isProfileQuery('What is quantum computing?'),
    };
    
    // Verify keyword-based detection works correctly
    expect({
      profileQueryDetected: results.isProfileQuery,
      nonProfileQueryRejected: !results.isNotProfileQuery,
    }).toMatchObject({
      profileQueryDetected: true,
      nonProfileQueryRejected: true,
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
    
    // Mock profile embedding
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    
    // Test error handling with fallback
    const relevance = await analyzer.getProfileRelevance('Tell me about my skills', mockEmbedding);
    
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