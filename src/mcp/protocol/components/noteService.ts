/**
 * Service for handling note-related operations
 */

import type { NoteContext } from '@/mcp';
import type { Note } from '@models/note';
import logger from '@utils/logger';



/**
 * Handles operations related to notes
 */
export class NoteService {
  private context: NoteContext;

  constructor(context: NoteContext) {
    this.context = context;
  }

  /**
   * Get related notes for suggestions
   * @param relevantNotes The notes to find related notes for
   * @param limit Maximum number of related notes to return
   * @returns Array of related notes
   */
  async getRelatedNotes(relevantNotes: Note[], limit: number = 3): Promise<Note[]> {
    if (relevantNotes.length === 0) {
      return this.context.getRecentNotes(limit);
    }

    // Use the most relevant note to find related content
    const primaryNoteId = relevantNotes[0].id;
    return this.context.getRelatedNotes(primaryNoteId, limit);
  }

  /**
   * Fetch relevant context based on user query
   * @param query The user query
   * @returns Array of relevant notes
   */
  async fetchRelevantContext(query: string): Promise<Note[]> {
    // First, try to extract any explicit tags from the query
    const tagRegex = /#(\w+)/g;
    const tagMatches = [...query.matchAll(tagRegex)];
    const tags = tagMatches.map(match => match[1]);

    // Remove the tags from the query for better text matching
    let cleanQuery = query.replace(tagRegex, '').trim();

    // Check for specific topic mentions like "MCP", "Model-Context-Protocol"
    const topicRegex = /\b(MCP|Model[-\s]Context[-\s]Protocol|AI architecture)\b/i;
    const hasMcpTopic = topicRegex.test(query);

    if (hasMcpTopic && !tags.includes('MCP')) {
      tags.push('MCP');
    }

    logger.debug(`Query: "${cleanQuery}", Tags: [${tags.join(', ')}]`);

    // Use semantic search by default for better results
    let results = await this.context.searchNotes({
      query: cleanQuery,
      tags: tags.length > 0 ? tags : undefined,
      limit: 5,
      semanticSearch: true,
    });

    // If no results and we have tags, try with just tags
    if (results.length === 0 && tags.length > 0) {
      logger.debug('No results with query and tags, trying tags only');
      results = await this.context.searchNotes({
        tags,
        limit: 5,
        semanticSearch: false, // Tags only doesn't benefit from semantic search
      });
    }

    // If still no results, fall back to keyword search
    if (results.length === 0) {
      logger.debug('No results with semantic search, trying keyword search');
      results = await this.context.searchNotes({
        query: cleanQuery,
        tags: tags.length > 0 ? tags : undefined,
        limit: 5,
        semanticSearch: false,
      });
    }

    // If no matches, return all notes as a fallback (limited to 3)
    if (results.length === 0) {
      logger.debug('No specific matches, fetching recent notes as fallback');
      results = await this.context.getRecentNotes(3);
    }

    return results;
  }
}