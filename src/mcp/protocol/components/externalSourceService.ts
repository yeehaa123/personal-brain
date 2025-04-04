/**
 * Service for handling external source interactions
 */

import { relevanceConfig } from '@/config';
import { ExternalSourceContext } from '@/mcp';
import type { ExternalSourceResult } from '@/mcp/contexts/externalSources/sources';
import type { Note } from '@models/note';
import logger from '@utils/logger';

import { ProfileAnalyzer } from './profileAnalyzer';
import { PromptFormatter } from './promptFormatter';



/**
 * Handles fetching and processing of external information
 */
export class ExternalSourceService {
  private externalContext: ExternalSourceContext;
  private profileAnalyzer: ProfileAnalyzer;
  private promptFormatter: PromptFormatter;

  constructor(
    externalContext: ExternalSourceContext, 
    profileAnalyzer: ProfileAnalyzer,
    promptFormatter: PromptFormatter,
  ) {
    this.externalContext = externalContext;
    this.profileAnalyzer = profileAnalyzer;
    this.promptFormatter = promptFormatter;
  }

  /**
   * Fetch relevant context from external sources
   * @param query The user query
   * @param limit Maximum number of results to return
   * @returns Array of external source results
   */
  async fetchExternalContext(query: string, limit: number = 3): Promise<ExternalSourceResult[]> {
    try {
      // Use semantic search for better results when comparing with internal notes
      const results = await this.externalContext.semanticSearch(query, limit);
      return results;
    } catch (error) {
      logger.error('Error fetching external context:', error);
      return [];
    }
  }

  /**
   * Determine if we should query external sources
   * @param query The user query
   * @param relevantNotes Notes from internal knowledge base
   * @returns Boolean indicating whether to query external sources
   */
  shouldQueryExternalSources(query: string, relevantNotes: Note[]): boolean {
    // Skip external sources for profile queries
    if (this.profileAnalyzer.isProfileQuery(query)) {
      return false;
    }

    // Always use external sources if no relevant notes found
    if (relevantNotes.length === 0) {
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
    // This is a heuristic and could be improved with semantic relevance
    let highestCoverage = 0;
    for (const note of relevantNotes) {
      const coverage = this.promptFormatter.calculateCoverage(query, note);
      highestCoverage = Math.max(highestCoverage, coverage);
    }

    // If internal notes have low coverage, use external sources
    return highestCoverage < relevanceConfig.externalSourcesThreshold;
  }
}