/**
 * Service for managing profile embeddings
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import type {
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  ProfilePublication,
} from '@/models/profile';
import type { Profile } from '@/models/profile';
import { BaseEmbeddingService } from '@/services/common/baseEmbeddingService';
import { Logger } from '@/utils/logger';


import { ProfileRepository } from './profileRepository';


/**
 * Service for generating and managing profile embeddings
 */
export class ProfileEmbeddingService extends BaseEmbeddingService {
  private repository: ProfileRepository;
  
  /**
   * Singleton instance of ProfileEmbeddingService
   * This property should be accessed only by getInstance(), resetInstance(), and createFresh()
   */
  private static instance: ProfileEmbeddingService | null = null;
  
  /**
   * Override the logger from the base class with protected visibility
   * This allows the derived class to use the logger directly
   */
  protected override logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of the service
   * 
   * Part of the Component Interface Standardization pattern.
   * 
   * @param apiKey Optional API key for the embedding service
   * @returns The shared ProfileEmbeddingService instance
   */
  public static getInstance(apiKey?: string): ProfileEmbeddingService {
    if (!ProfileEmbeddingService.instance) {
      ProfileEmbeddingService.instance = new ProfileEmbeddingService(apiKey);
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileEmbeddingService singleton instance created');
    } else if (apiKey) {
      // Log a warning if trying to get instance with different API key
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.warn('getInstance called with apiKey but instance already exists. API key ignored.');
    }
    
    return ProfileEmbeddingService.instance;
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
      if (ProfileEmbeddingService.instance) {
        // No specific cleanup needed for this service
      }
    } catch (error) {
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.error('Error during ProfileEmbeddingService instance reset:', error);
    } finally {
      ProfileEmbeddingService.instance = null;
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ProfileEmbeddingService singleton instance reset');
    }
  }
  
  /**
   * Create a fresh service instance
   * 
   * Part of the Component Interface Standardization pattern.
   * Creates a new instance without affecting the singleton instance.
   * Primarily used for testing.
   * 
   * @param apiKey Optional API key for the embedding service
   * @returns A new ProfileEmbeddingService instance
   */
  public static createFresh(apiKey?: string): ProfileEmbeddingService {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ProfileEmbeddingService instance');
    
    return new ProfileEmbeddingService(apiKey);
  }

  /**
   * Create a new ProfileEmbeddingService
   * 
   * While this constructor is public, it is recommended to use the factory methods
   * getInstance() or createFresh() instead to ensure consistent instance management.
   * 
   * @param apiKey Optional API key for the embeddings service
   */
  constructor(apiKey?: string) {
    super(apiKey);
    this.repository = ProfileRepository.getInstance();
    this.logger.debug('ProfileEmbeddingService instance created');
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
      this.logger.debug(`Generating embedding for profile ${profile.id}`);
      const profileText = this.getProfileTextForEmbedding(profile);
      const embedding = await this.generateEmbedding(profileText);

      if (!embedding || embedding.length === 0) {
        this.logger.warn(`Failed to generate embedding for profile ${profile.id}: empty embedding`);
        return { updated: false };
      }

      this.logger.debug(`Updating profile ${profile.id} with new embedding`);
      const success = await this.repository.updateProfile(profile.id, { embedding });
      return { updated: success };
    } catch (error) {
      this.logger.error(`Failed to update embedding for profile ${profile.id}`, { 
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