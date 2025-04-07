/**
 * Service for managing profile embeddings
 */
import type {
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  ProfilePublication,
} from '@/models/profile';
import type { Profile } from '@/models/profile';
import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import logger from '@/utils/logger';


import { ProfileRepository } from './profileRepository';


/**
 * Service for generating and managing profile embeddings
 */
export class ProfileEmbeddingService extends BaseEmbeddingService {
  private repository: ProfileRepository;
  
  // Singleton instance
  private static instance: ProfileEmbeddingService | null = null;
  
  /**
   * Get the singleton instance of the service
   * @param apiKey Optional API key for the embedding service
   * @returns The shared ProfileEmbeddingService instance
   */
  public static getInstance(apiKey?: string): ProfileEmbeddingService {
    if (!ProfileEmbeddingService.instance) {
      ProfileEmbeddingService.instance = new ProfileEmbeddingService(apiKey);
    }
    return ProfileEmbeddingService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    ProfileEmbeddingService.instance = null;
  }
  
  /**
   * Create a fresh service instance (primarily for testing)
   * @param apiKey Optional API key for the embedding service
   * @returns A new ProfileEmbeddingService instance
   */
  public static createFresh(apiKey?: string): ProfileEmbeddingService {
    return new ProfileEmbeddingService(apiKey);
  }

  /**
   * Create a new ProfileEmbeddingService
   * @param apiKey Optional API key for the embeddings service
   */
  constructor(apiKey?: string) {
    super(apiKey);
    this.repository = ProfileRepository.getInstance();
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