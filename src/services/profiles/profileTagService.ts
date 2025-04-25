/**
 * Service for profile tag generation and management
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import type {
  ProfileEducation,
  ProfileExperience,
} from '@/models/profile';
import type { Profile } from '@/models/profile';
import { Logger } from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';
import { extractTags } from '@/utils/tagExtractor';

import { ProfileRepository } from './profileRepository';


/**
 * Service for generating and managing profile tags
 */
export class ProfileTagService {
  private repository: ProfileRepository;
  
  /**
   * Singleton instance of ProfileTagService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ProfileTagService | null = null;
  
  /**
   * Logger instance for this class
   */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @returns The shared ProfileTagService instance
   */
  public static getInstance(): ProfileTagService {
    if (!ProfileTagService.instance) {
      const repository = ProfileRepository.getInstance();
      ProfileTagService.instance = new ProfileTagService(repository);
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileTagService singleton instance created');
    }
    
    return ProfileTagService.instance;
  }
  
  /**
   * Reset the singleton instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Primarily used for testing to ensure a clean state.
   */
  public static resetInstance(): void {
    try {
      // Clean up resources if needed
      if (ProfileTagService.instance) {
        // No specific cleanup needed for this service
      }
    } catch (error) {
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.error('Error during ProfileTagService instance reset:', error);
    } finally {
      ProfileTagService.instance = null;
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileTagService singleton instance reset');
    }
  }
  
  /**
   * Create a fresh service instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @returns A new ProfileTagService instance
   */
  public static createFresh(): ProfileTagService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ProfileTagService instance');
    
    const repository = ProfileRepository.getInstance();
    return new ProfileTagService(repository);
  }

  /**
   * Create a new service instance with explicit dependencies
   * 
   * Part of the Component Interface Standardization pattern.
   * Uses the configOrDependencies pattern for flexible dependency injection.
   * 
   * @param configOrDependencies Configuration or explicit dependencies
   * @returns A new ProfileTagService instance with the provided dependencies
   */
  public static createWithDependencies(
    configOrDependencies: Record<string, unknown> = {},
  ): ProfileTagService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating ProfileTagService with dependencies');
    
    // Handle the case where dependencies are explicitly provided
    if ('repository' in configOrDependencies) {
      const repository = configOrDependencies['repository'] as ProfileRepository;
      return new ProfileTagService(repository);
    }
    
    // Handle the case where this is called with a config object or empty object
    // Use the default repository
    const repository = ProfileRepository.getInstance();
    return new ProfileTagService(repository);
  }
  
  /**
   * Create a new ProfileTagService
   * 
   * Private constructor to enforce use of factory methods:
   * - getInstance()
   * - createFresh()
   * - createWithDependencies()
   * 
   * @param repository The profile repository to use
   */
  private constructor(repository?: ProfileRepository) {
    this.repository = repository || ProfileRepository.getInstance();
    this.logger.debug('ProfileTagService instance created');
  }

  /**
   * Generate tags for a profile text using AI or fallback methods
   * @param profileText The profile text to generate tags for
   * @returns Array of generated tags
   */
  async generateProfileTags(profileText: string): Promise<string[]> {
    try {
      if (!profileText || typeof profileText !== 'string' || profileText.trim().length === 0) {
        this.logger.warn('Empty profile text provided for tag generation');
        return [];
      }

      const tags = await extractTags(profileText, [], 10);

      if (!tags?.length) {
        const profile = await this.repository.getProfile();
        return this.extractProfileKeywords(profile || {});
      }

      return tags;
    } catch (error) {
      this.logger.error(`Error generating profile tags: ${error instanceof Error ? error.message : String(error)}`);
      const profile = await this.repository.getProfile();
      return this.extractProfileKeywords(profile || {});
    }
  }

  /**
   * Update or generate tags for an existing profile
   * @param forceRegenerate Whether to force regeneration even if tags exist
   * @returns The updated tags or null if operation failed
   */
  async updateProfileTags(forceRegenerate = false): Promise<string[] | null> {
    this.logger.debug(`Updating profile tags, forceRegenerate=${forceRegenerate}`);
    const profile = await this.repository.getProfile();

    if (!profile) {
      this.logger.warn('Cannot update tags: No profile found');
      return null;
    }

    // Check if we need to generate tags
    if (!forceRegenerate && profile.tags && profile.tags.length > 0) {
      this.logger.debug(`Using existing profile tags: ${profile.tags.join(', ')}`);
      return profile.tags as string[];
    }

    try {
      // Get profile text for tag generation
      this.logger.debug(`Generating new tags for profile ${profile.id}`);
      const profileText = this.getProfileTextForTagGeneration(profile);
      const tags = await this.generateProfileTags(profileText);

      if (!tags.length) {
        this.logger.warn('Tag generation produced no tags');
        return null;
      }

      this.logger.debug(`Generated ${tags.length} tags: ${tags.join(', ')}`);
      
      // Update profile with new tags
      this.logger.debug(`Updating profile ${profile.id} with new tags`);
      const success = await this.repository.updateProfile(profile.id, { tags });
      
      return success ? tags : null;
    } catch (error) {
      this.logger.error('Error updating profile tags', { 
        error: error instanceof Error ? error.message : String(error),
        context: 'ProfileTagService',
      });
      return null;
    }
  }

  /**
   * Extract keywords from profile to use for searching notes
   * @param profile The profile to extract keywords from
   * @returns Array of extracted keywords
   */
  extractProfileKeywords(profile: Partial<Profile>): string[] {
    const keywords: string[] = [];
    const commonWords = ['the', 'and', 'that', 'with', 'have', 'this', 'from'];

    // Add important terms from summary
    if (profile.summary) {
      const summaryTerms = profile.summary
        .toLowerCase()
        .split(/\W+/)
        .filter(term => term.length > 3 && !commonWords.includes(term));
      keywords.push(...summaryTerms);
    }

    // Add job titles
    if (profile.experiences?.length) {
      (profile.experiences as ProfileExperience[]).forEach((exp: ProfileExperience) => {
        if (exp.title) {
          const titleParts = exp.title.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...titleParts);
        }
      });
    }

    // Add languages
    if (profile.languages?.length) {
      keywords.push(...(profile.languages as string[]).map(lang => lang.toLowerCase()));
    }

    // Add education fields
    if (profile.education?.length) {
      (profile.education as ProfileEducation[]).forEach((edu: ProfileEducation) => {
        if (edu.degree_name) {
          const degreeParts = edu.degree_name.toLowerCase().split(/\W+/).filter(p => p.length > 2);
          keywords.push(...degreeParts);
        }
      });
    }

    // Remove duplicates
    return Array.from(new Set(keywords));
  }

  /**
   * Get profile text suitable for tag generation
   * @param profile The profile to extract text from
   * @returns Formatted profile text
   */
  private getProfileTextForTagGeneration(profile: Profile): string {
    const parts: string[] = [];

    // Include the most important profile information for tag generation
    if (profile.summary) parts.push(profile.summary);
    if (profile.headline) parts.push(profile.headline);
    if (profile.occupation) parts.push(profile.occupation);

    // Add experience titles and descriptions
    if (isDefined(profile.experiences) && profile.experiences.length > 0) {
      (profile.experiences as ProfileExperience[]).forEach(exp => {
        if (exp.title) parts.push(exp.title);
        if (exp.description) parts.push(exp.description);
      });
    }

    // Add education information
    if (isDefined(profile.education) && profile.education.length > 0) {
      (profile.education as ProfileEducation[]).forEach(edu => {
        if (edu.degree_name) parts.push(edu.degree_name);
        if (edu.field_of_study) parts.push(edu.field_of_study);
      });
    }

    return parts.join('\n');
  }
  
  /**
   * Prepare profile text for embedding generation
   * @param profile The profile to prepare text for
   * @returns Formatted profile text suitable for embedding
   */
  prepareProfileTextForEmbedding(profile: Partial<Profile>): string {
    const parts: string[] = [];

    // Add header information
    if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
    if (profile.headline) parts.push(`Headline: ${profile.headline}`);
    if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
    
    // Add summary
    if (profile.summary) parts.push(`Summary: ${profile.summary}`);
    
    // Add location information
    const location: string[] = [];
    if (profile.city) location.push(profile.city);
    if (profile.state) location.push(profile.state);
    if (profile.countryFullName) location.push(profile.countryFullName);
    if (location.length > 0) parts.push(`Location: ${location.join(', ')}`);

    // Add experiences
    if (isDefined(profile.experiences) && profile.experiences.length > 0) {
      parts.push('Experience:');
      (profile.experiences as ProfileExperience[]).forEach(exp => {
        const expParts: string[] = [];
        if (exp.title) expParts.push(exp.title);
        if (exp.company) expParts.push(`at ${exp.company}`);
        
        parts.push(`- ${expParts.join(' ')}`);
        if (exp.description) parts.push(`  ${exp.description}`);
      });
    }

    // Add education
    if (isDefined(profile.education) && profile.education.length > 0) {
      parts.push('Education:');
      (profile.education as ProfileEducation[]).forEach(edu => {
        const eduParts: string[] = [];
        if (edu.degree_name) eduParts.push(edu.degree_name);
        if (edu.field_of_study) eduParts.push(`in ${edu.field_of_study}`);
        if (edu.school) eduParts.push(`from ${edu.school}`);
        
        parts.push(`- ${eduParts.join(' ')}`);
      });
    }

    // Add languages
    if (isDefined(profile.languages) && profile.languages.length > 0) {
      parts.push(`Languages: ${(profile.languages as string[]).join(', ')}`);
    }

    // Add tags if available
    if (isDefined(profile.tags) && profile.tags.length > 0) {
      parts.push(`Tags: ${(profile.tags as string[]).join(', ')}`);
    }

    return parts.join('\n');
  }
}