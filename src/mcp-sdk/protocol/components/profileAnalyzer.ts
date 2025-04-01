/**
 * Analyzes the relevance of a profile to a user query
 */
import { EmbeddingService } from '@/mcp-sdk/model/embeddings';
import type { Profile } from '@models/profile';
import logger from '@utils/logger';
import { relevanceConfig } from '@/config';

/**
 * Handles profile-related query analysis
 */
export class ProfileAnalyzer {
  private embeddingService: EmbeddingService;

  /**
   * Create a new profile analyzer
   * @param embeddingService The embedding service to use for semantic similarity
   */
  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Determine if the query is explicitly profile-related based on keywords
   * @param query The user's query
   * @returns Whether the query is directly about the profile
   */
  isProfileQuery(query: string): boolean {
    const profileKeywords = [
      'profile', 'about me', 'who am i', 'my background', 'my experience',
      'my education', 'my skills', 'my work', 'my job', 'my history',
      'my information', 'tell me about myself', 'my professional', 'resume',
      'cv', 'curriculum vitae', 'career', 'expertise', 'professional identity',
    ];

    const lowercaseQuery = query.toLowerCase();

    // Check if the query contains explicit profile-related keywords
    return profileKeywords.some(keyword => lowercaseQuery.includes(keyword));
  }

  /**
   * Get profile similarity score to the query using semantic search
   * @param query The user's query
   * @param profile The user profile
   * @returns Semantic relevance score (0-1)
   */
  async getProfileRelevance(query: string, profile?: Profile): Promise<number> {
    try {
      if (!profile || !profile.embedding) {
        return this.isProfileQuery(query) ? 
          relevanceConfig.fallback.highRelevance : 
          relevanceConfig.fallback.lowRelevance;
      }

      // Get embedding for the query
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // Calculate similarity score between query and profile
      const similarity = this.embeddingService.cosineSimilarity(
        queryEmbedding.embedding,
        profile.embedding as number[],
      );

      // Scale the similarity to be more decisive
      // (values closer to 0 or 1 rather than middle range)
      return Math.pow(similarity * relevanceConfig.fallback.similarityScaleFactor + 0.5, 2);
    } catch (error) {
      logger.error('Error calculating profile relevance:', { error, context: 'ProfileAnalyzer' });
      // Fall back to keyword matching
      return this.isProfileQuery(query) ? 
        relevanceConfig.fallback.highRelevance : 
        relevanceConfig.fallback.lowRelevance;
    }
  }
}