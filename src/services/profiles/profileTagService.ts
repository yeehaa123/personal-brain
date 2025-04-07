/**
 * Service for profile tag generation and management
 */
import type {
  ProfileEducation,
  ProfileExperience,
} from '@/models/profile';
import type { Profile } from '@/models/profile';
import logger from '@/utils/logger';
import { isDefined } from '@/utils/safeAccessUtils';
import { extractTags } from '@/utils/tagExtractor';

import { ProfileRepository } from './profileRepository';


/**
 * Service for generating and managing profile tags
 */
export class ProfileTagService {
  private repository: ProfileRepository;
  
  // Singleton instance
  private static instance: ProfileTagService | null = null;
  
  /**
   * Get the singleton instance of the service
   * @returns The shared ProfileTagService instance
   */
  public static getInstance(): ProfileTagService {
    if (!ProfileTagService.instance) {
      ProfileTagService.instance = new ProfileTagService();
    }
    return ProfileTagService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    ProfileTagService.instance = null;
  }
  
  /**
   * Create a fresh service instance (primarily for testing)
   * @returns A new ProfileTagService instance
   */
  public static createFresh(): ProfileTagService {
    return new ProfileTagService();
  }

  /**
   * Create a new ProfileTagService
   */
  constructor() {
    this.repository = ProfileRepository.getInstance();
  }

  /**
   * Generate tags for a profile text using AI or fallback methods
   * @param profileText The profile text to generate tags for
   * @returns Array of generated tags
   */
  async generateProfileTags(profileText: string): Promise<string[]> {
    try {
      if (!profileText || typeof profileText !== 'string' || profileText.trim().length === 0) {
        logger.warn('Empty profile text provided for tag generation');
        return [];
      }

      const tags = await extractTags(profileText, [], 10);

      if (!tags?.length) {
        const profile = await this.repository.getProfile();
        return this.extractProfileKeywords(profile || {});
      }

      return tags;
    } catch (error) {
      logger.error(`Error generating profile tags: ${error instanceof Error ? error.message : String(error)}`);
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
    const profile = await this.repository.getProfile();

    if (!profile) {
      return null;
    }

    // Check if we need to generate tags
    if (!forceRegenerate && profile.tags && profile.tags.length > 0) {
      return profile.tags as string[];
    }

    try {
      // Get profile text for tag generation
      const profileText = this.getProfileTextForTagGeneration(profile);
      const tags = await this.generateProfileTags(profileText);

      if (!tags.length) {
        return null;
      }

      // Update profile with new tags
      const success = await this.repository.updateProfile(profile.id, { tags });
      
      return success ? tags : null;
    } catch (error) {
      logger.error('Error updating profile tags', { 
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