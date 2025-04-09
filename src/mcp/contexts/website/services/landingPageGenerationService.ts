import type { ProfileContext } from '@/mcp/contexts/profiles';
import type { Profile } from '@/models/profile';
import { Logger } from '@/utils/logger';
import type { LandingPageData } from '@website/schemas';

/**
 * Service for generating landing page data from profile information
 * 
 * Implements the Component Interface Standardization pattern
 */
export class LandingPageGenerationService {
  private static instance: LandingPageGenerationService | null = null;
  private profileContext: ProfileContext | null = null;
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get singleton instance of LandingPageGenerationService
   */
  static getInstance(): LandingPageGenerationService {
    if (!LandingPageGenerationService.instance) {
      LandingPageGenerationService.instance = new LandingPageGenerationService();
    }
    return LandingPageGenerationService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    LandingPageGenerationService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   */
  static createFresh(): LandingPageGenerationService {
    return new LandingPageGenerationService();
  }
  
  /**
   * Set the profile context to use for getting profile information
   */
  setProfileContext(context: ProfileContext): void {
    this.profileContext = context;
  }
  
  /**
   * Get the current profile context
   */
  getProfileContext(): ProfileContext | null {
    return this.profileContext;
  }
  
  /**
   * Generate landing page data from the profile
   * @param overrides Optional overrides to customize the data
   * @returns Generated landing page data
   */
  async generateLandingPageData(overrides?: Partial<LandingPageData>): Promise<LandingPageData> {
    if (!this.profileContext) {
      throw new Error('Profile context not set');
    }
    
    try {
      // Get profile from the profile context
      const profile = await this.profileContext.getProfile();
      
      if (!profile) {
        throw new Error('No profile found');
      }
      
      // Map profile to landing page data
      const baseData = this.mapProfileToLandingPage(profile);
      
      // Apply any custom overrides
      return {
        ...baseData,
        ...overrides,
      };
      
    } catch (error) {
      this.logger.error('Error generating landing page data', { 
        error, 
        context: 'LandingPageGenerationService', 
      });
      throw error;
    }
  }
  
  /**
   * Map profile data to landing page schema
   * @param profile The profile to map
   * @returns Landing page data based on profile
   */
  protected mapProfileToLandingPage(profile: Profile): LandingPageData {
    return {
      name: profile.fullName,
      title: `${profile.fullName} - ${profile.occupation || 'Personal Website'}`,
      tagline: profile.headline || 'Welcome to my personal website',
    };
  }
}

export default LandingPageGenerationService;