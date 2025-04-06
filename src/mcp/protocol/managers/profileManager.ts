/**
 * Profile Manager for BrainProtocol
 * Manages profile information and relevance analysis
 */
import { relevanceConfig } from '@/config';
import type { ProfileContext } from '@/mcp';
import { EmbeddingService } from '@/mcp/model';
import { ProfileAnalyzer } from '@/mcp/protocol/components/profileAnalyzer';
import type { Profile } from '@/models/profile';
import logger from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';

import type { IProfileManager, ProfileAnalysisResult } from '../types';

/**
 * Manages profile information and relevance
 */
export class ProfileManager implements IProfileManager {
  private profileContext: ProfileContext;
  private profileAnalyzer: ProfileAnalyzer;
  private profile: Profile | undefined;

  /**
   * Create a new profile manager
   * @param profileContext Profile context
   * @param apiKey API key for embedding service
   */
  constructor(profileContext: ProfileContext, apiKey?: string) {
    this.profileContext = profileContext;
    
    // Initialize the profile analyzer
    const embeddingService = EmbeddingService.getInstance(apiKey ? { apiKey } : undefined);
    this.profileAnalyzer = new ProfileAnalyzer(embeddingService);
    
    // Load profile asynchronously
    this.loadProfile();
    
    logger.debug('Profile manager initialized');
  }

  /**
   * Load the user profile
   */
  private async loadProfile(): Promise<void> {
    try {
      const profileResult = await this.profileContext.getProfile();

      if (isDefined(profileResult)) {
        // Set profile only if we got a valid result
        this.profile = profileResult;
        logger.info('Profile loaded successfully');
      } else {
        logger.info('No profile found');
      }
    } catch (error) {
      logger.error('Error loading profile:', error);
      // Explicitly set profile to undefined in case of error
      this.profile = undefined;
    }
  }

  /**
   * Get the user profile
   * @returns The user profile or undefined
   */
  async getProfile(): Promise<Profile | undefined> {
    // If profile is not loaded yet, try loading it
    if (!isDefined(this.profile)) {
      await this.loadProfile();
    }
    return this.profile;
  }

  /**
   * Get formatted profile text for use in prompts
   * @returns Formatted profile text or null
   */
  async getProfileText(): Promise<string | null> {
    const profile = await this.getProfile();
    if (!profile) {
      return null;
    }
    
    return this.profileContext.getProfileTextForEmbedding(profile);
  }

  /**
   * Analyze profile relevance for a query
   * @param query Query to analyze
   * @returns Analysis result with relevance score
   */
  async analyzeProfileRelevance(query: string): Promise<ProfileAnalysisResult> {
    // First check if this is explicitly a profile query
    const isProfileQuery = this.profileAnalyzer.isProfileQuery(query);
    
    // Initialize with default relevance
    let relevance = isProfileQuery ? 
      relevanceConfig.fallback.highRelevance : 
      relevanceConfig.fallback.lowRelevance;
    
    // Get the profile
    const profile = await this.getProfile();
    
    // Calculate relevance if we have a profile with embeddings
    if (isDefined(profile) && isDefined(profile.embedding)) {
      relevance = await this.profileAnalyzer.getProfileRelevance(query, profile);
      logger.debug(`Profile semantic relevance: ${relevance.toFixed(2)}`);
      
      // If relevance is high enough, consider it a profile query
      if (relevance > relevanceConfig.profileQueryThreshold && !isProfileQuery) {
        logger.info('Query is semantically relevant to profile');
        // Update isProfileQuery based on relevance
        return { isProfileQuery: true, relevance };
      }
    }
    
    return { isProfileQuery, relevance };
  }
}