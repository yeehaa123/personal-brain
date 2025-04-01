/**
 * Service for managing profile embeddings
 */
import { EmbeddingService } from '@/mcp/model/embeddings';
import { ProfileRepository } from './profileRepository';
import type { Profile } from '@/models/profile';
import { isDefined, isNonEmptyString } from '@/utils/safeAccessUtils';
import logger from '@/utils/logger';
import { ApiError } from '@/utils/errorUtils';

import type {
  ProfileEducation,
  ProfileExperience,
  ProfilePublication,
  ProfileProject,
} from '@/models/profile';

/**
 * Service for generating and managing profile embeddings
 */
export class ProfileEmbeddingService {
  private embeddingService: EmbeddingService;
  private repository: ProfileRepository;

  /**
   * Create a new ProfileEmbeddingService
   * @param apiKey Optional API key for the embeddings service
   */
  constructor(apiKey?: string) {
    this.embeddingService = EmbeddingService.getInstance(apiKey ? { apiKey } : undefined);
    this.repository = new ProfileRepository();
  }

  /**
   * Generate embedding for profile text
   * @param text The text to generate embedding for
   * @returns The embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!isNonEmptyString(text)) {
        logger.warn('Empty text provided for profile embedding generation');
        return [];
      }

      const result = await this.embeddingService.getEmbedding(text);
      
      if (!isDefined(result) || !Array.isArray(result.embedding) || result.embedding.length === 0) {
        throw new ApiError('Failed to generate valid profile embedding', undefined, {
          textLength: text.length,
        });
      }
      
      return result.embedding;
    } catch (error) {
      logger.error(`Error generating profile embedding: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Generate or update embeddings for the profile
   * @returns Status of the update operation
   */
  async generateEmbeddingForProfile(): Promise<{ updated: boolean }> {
    const profile = await this.repository.getProfile();
    if (!profile) {
      return { updated: false };
    }

    try {
      const profileText = this.getProfileTextForEmbedding(profile);
      const embedding = await this.generateEmbedding(profileText);

      if (!embedding || embedding.length === 0) {
        return { updated: false };
      }

      const success = await this.repository.updateProfile(profile.id, { embedding });
      return { updated: success };
    } catch (error) {
      logger.error(`Failed to update embedding for profile ${profile.id}`, { 
        error: error instanceof Error ? error.message : String(error),
        context: 'ProfileEmbeddingService',
      });
      return { updated: false };
    }
  }

  /**
   * Check if the profile changes require regenerating the embedding
   * @param profileData The profile data being updated
   * @returns Whether embedding should be regenerated
   */
  shouldRegenerateEmbedding(profileData: Partial<Profile>): boolean {
    // Fields that affect the semantic meaning of the profile
    const semanticFields: (keyof Profile)[] = [
      'fullName', 'occupation', 'headline', 'summary',
      'experiences', 'education', 'accomplishmentProjects',
      'accomplishmentPublications', 'accomplishmentHonorsAwards',
      'volunteerWork',
    ];

    return semanticFields.some(field => field in profileData);
  }

  /**
   * Prepare profile text for embedding
   * @param profile The profile data
   * @returns Formatted text for embedding generation
   */
  getProfileTextForEmbedding(profile: Partial<Profile>): string {
    const parts: string[] = [];

    // Add basic profile information
    if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
    if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
    if (profile.headline) parts.push(`Headline: ${profile.headline}`);
    if (profile.summary) parts.push(`Summary: ${profile.summary}`);

    // Add location information
    const location = [profile.city, profile.state, profile.countryFullName]
      .filter(Boolean)
      .join(', ');
    if (location) parts.push(`Location: ${location}`);

    // Add experiences
    if (profile.experiences?.length) {
      parts.push('Experience:');
      (profile.experiences as ProfileExperience[]).forEach((exp: ProfileExperience) => {
        const duration = [exp.starts_at, exp.ends_at].filter(Boolean).join(' - ');
        parts.push(`- ${exp.title} at ${exp.company} (${duration})`);
        if (exp.description) parts.push(`  ${exp.description}`);
      });
    }

    // Add education
    if (profile.education?.length) {
      parts.push('Education:');
      (profile.education as ProfileEducation[]).forEach((edu: ProfileEducation) => {
        parts.push(`- ${edu.degree_name} at ${edu.school}`);
      });
    }

    // Add publications
    if (profile.accomplishmentPublications?.length) {
      parts.push('Publications:');
      (profile.accomplishmentPublications as ProfilePublication[]).forEach((pub: ProfilePublication) => {
        parts.push(`- ${pub.name}`);
        if (pub.description) parts.push(`  ${pub.description}`);
      });
    }

    // Add projects
    if (profile.accomplishmentProjects?.length) {
      parts.push('Projects:');
      (profile.accomplishmentProjects as ProfileProject[]).forEach((proj: ProfileProject) => {
        parts.push(`- ${proj.title}`);
        if (proj.description) parts.push(`  ${proj.description}`);
      });
    }

    return parts.join('\n');
  }
}