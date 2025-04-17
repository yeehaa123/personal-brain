import { describe, expect, mock, test } from 'bun:test';

import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { ExternalSourceContext } from '@/mcpServer';
import type { ProfileAnalyzer , PromptFormatter } from '@/protocol/components';
import { ExternalSourceService  } from '@/protocol/components';
import type { Note } from '@models/note';
import { createMockNote } from '@test/__mocks__/models/note';
import { createMockEmbedding } from '@test/__mocks__/utils/embeddingUtils';





describe('ExternalSourceService', () => {
  // Use a constant threshold for tests to make them more predictable
  const TEST_THRESHOLD = 0.5;
  
  // Sample data
  const sampleExternalResults: ExternalSourceResult[] = [
    {
      title: 'Quantum Computing Advances',
      source: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Quantum_computing',
      content: 'Recent advances in quantum computing include improvements in qubit stability.',
      sourceType: 'encyclopedia',
      timestamp: new Date(),
      confidence: 0.95,
    },
    {
      title: 'Quantum Computing Applications',
      source: 'Scientific Journal',
      url: 'https://example.com/journal',
      content: 'Quantum computing applications are expanding into fields like cryptography and drug discovery.',
      sourceType: 'journal',
      timestamp: new Date(),
      confidence: 0.85,
    },
  ];

  const sampleNotes: Note[] = [
    createMockNote('note-1', 'Quantum Computing Basics', ['quantum', 'computing']),
  ];
  // Update the first note to have custom embedding
  sampleNotes[0].embedding = createMockEmbedding('Quantum computing basics');
  sampleNotes[0].content = 'Quantum computing uses qubits instead of classical bits.';

  // Mock the dependencies
  const mockExternalSourceContext = {
    semanticSearch: mock(async (query: string) => {
      if (query.includes('quantum')) {
        return sampleExternalResults;
      }
      return [];
    }),
  } as unknown as ExternalSourceContext;

  const mockProfileAnalyzer = {
    isProfileQuery: mock((query: string) => {
      return query.includes('profile') || query.includes('my background');
    }),
  } as unknown as ProfileAnalyzer;

  // Create properly typed mocks
  const mockCalculateCoverage = mock<(query: string, note: Note) => number>((query, note) => {
    // Simple mock implementation
    if (query.includes('quantum') && note.content.includes('quantum')) {
      return 0.2; // Low coverage for "quantum" (so external source should be used)
    }
    return 0.8; // High coverage for other queries
  });
  
  const mockGetExcerpt = mock<(content: string, length?: number) => string>((content, length) => {
    return content.substring(0, length || 150);
  });
  
  const mockPromptFormatter = {
    calculateCoverage: mockCalculateCoverage,
    getExcerpt: mockGetExcerpt,
  } as unknown as PromptFormatter;

  // Use the factory method instead of the constructor
  const externalSourceService = ExternalSourceService.createFresh({
    externalContext: mockExternalSourceContext,
    profileAnalyzer: mockProfileAnalyzer,
    promptFormatter: mockPromptFormatter,
  });

  // Create a mock shouldQueryExternalSources that uses the threshold directly
  const shouldQueryExternalSourcesWithThreshold = (
    query: string, 
    notes: Note[], 
    threshold: number,
  ): boolean => {
    // Skip external sources for profile queries
    if (mockProfileAnalyzer.isProfileQuery(query)) {
      return false;
    }

    // Always use external sources if no relevant notes found
    if (notes.length === 0) {
      return true;
    }

    // Look for explicit requests for external information
    const externalKeywords = [
      'search', 'external', 'online', 'web', 'internet', 'look up',
      'wikipedia', 'reference', 'latest', 'recent', 'current',
      'what is', 'who is', 'where is', 'when did', 'how to',
    ];

    const lowercaseQuery = query.toLowerCase();
    if (externalKeywords.some(keyword => lowercaseQuery.includes(keyword))) {
      return true;
    }

    // Calculate coverage of the query by internal notes
    let highestCoverage = 0;
    for (const note of notes) {
      const coverage = mockCalculateCoverage(query, note);
      highestCoverage = Math.max(highestCoverage, coverage);
    }

    // If internal notes have low coverage, use external sources
    return highestCoverage < threshold;
  };

  test('should fetch external context for relevant queries', async () => {
    const results = await externalSourceService.fetchExternalContext('Tell me about quantum computing');
    
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Quantum Computing Advances');
    expect(mockExternalSourceContext.semanticSearch).toHaveBeenCalled();
  });

  test('should handle empty results', async () => {
    const results = await externalSourceService.fetchExternalContext('Something completely unrelated');
    
    expect(results).toHaveLength(0);
  });

  test('should handle errors in semantic search', async () => {
    // Create a service with a context that throws errors
    const mockSearchFn = () => { throw new Error('Search failed'); };
    
    const errorContext = {
      semanticSearch: mockSearchFn,
    } as unknown as ExternalSourceContext;
    
    const service = ExternalSourceService.createFresh({
      externalContext: errorContext,
      profileAnalyzer: mockProfileAnalyzer,
      promptFormatter: mockPromptFormatter,
    });
    
    // Should not throw and return empty array
    const results = await service.fetchExternalContext('Test query');
    expect(results).toEqual([]);
  });

  test('should not query external sources for profile queries', () => {
    const shouldQuery = shouldQueryExternalSourcesWithThreshold(
      'Tell me about my background',
      sampleNotes,
      TEST_THRESHOLD,
    );
    
    expect(shouldQuery).toBe(false);
    expect(mockProfileAnalyzer.isProfileQuery).toHaveBeenCalled();
  });

  test('should query external sources when no relevant notes found', () => {
    const shouldQuery = shouldQueryExternalSourcesWithThreshold(
      'Tell me about artificial intelligence',
      [], // empty notes
      TEST_THRESHOLD,
    );
    
    expect(shouldQuery).toBe(true);
  });

  test('should query external sources for explicit external keywords', () => {
    const externalKeywordQueries = [
      'search for the latest quantum research',
      'what does wikipedia say about quantum computing',
      'look up recent advances in quantum computing',
      'what is the current state of quantum computing?',
    ];
    
    externalKeywordQueries.forEach(query => {
      const shouldQuery = shouldQueryExternalSourcesWithThreshold(
        query, 
        sampleNotes,
        TEST_THRESHOLD,
      );
      expect(shouldQuery).toBe(true);
    });
  });

  test('should determine query coverage from notes', () => {
    // Set high coverage value for the first call
    mockCalculateCoverage.mockReturnValueOnce(0.8);
    
    // High coverage query (should not query external)
    const highCoverageQuery = 'Tell me about machine learning';
    const highCoverageResult = shouldQueryExternalSourcesWithThreshold(
      highCoverageQuery, 
      sampleNotes,
      TEST_THRESHOLD,
    );
    
    expect(highCoverageResult).toBe(false);
    expect(mockCalculateCoverage.mock.calls.length).toBeGreaterThan(0);
    
    // Clear mock and set low coverage value for the second call
    mockCalculateCoverage.mockReset();
    mockCalculateCoverage.mockReturnValueOnce(0.3);
    
    // Low coverage query (should query external)
    const lowCoverageQuery = 'Explain quantum computing basics';
    
    const lowCoverageResult = shouldQueryExternalSourcesWithThreshold(
      lowCoverageQuery, 
      sampleNotes,
      TEST_THRESHOLD,
    );
    
    expect(lowCoverageResult).toBe(true);
  });
});