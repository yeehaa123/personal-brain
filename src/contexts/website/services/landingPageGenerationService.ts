
import type { Profile } from '@/models/profile';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import { LandingPageSchema } from '@website/schemas';
import type { LandingPageData } from '@website/schemas';

import contentReviewPrompt from './prompts/content-review.txt';
import landingPagePrompt from './prompts/landing-page-generation.txt';

/**
 * Service for generating landing page data from profile information
 * and the entire personal brain content
 * 
 * Implements the Component Interface Standardization pattern
 */
export class LandingPageGenerationService {
  private static instance: LandingPageGenerationService | null = null;
  private brainProtocol: BrainProtocol | null = null;
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
   * Get profile data using the brain protocol
   * This eliminates the direct dependency on ProfileContext
   */
  private async getProfileData(): Promise<Profile | null> {
    try {
      const brainProtocol = this.getBrainProtocol();
      const response = await brainProtocol.processQuery('Get my profile information', {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract profile data from response
      if (response.profile) {
        return response.profile;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error fetching profile data', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      return null;
    }
  }
  
  /**
   * Generate comprehensive landing page data with all sections using AI from brain content
   * with a two-phase approach: generation and editorial review
   * @param overrides Optional overrides to customize the data
   * @returns Generated landing page data with all sections
   */
  async generateLandingPageData(overrides?: Partial<LandingPageData>): Promise<LandingPageData> {
    try {
      // Get profile data using the messaging system
      const profile = await this.getProfileData();
      
      if (!profile) {
        throw new Error('No profile found');
      }
      
      this.logger.info('Generating landing page data from brain content', {
        context: 'LandingPageGenerationService',
        profileName: profile.fullName,
      });
      
      // Include profile info in log for debugging
      this.logger.debug('Using profile info for landing page generation', {
        context: 'LandingPageGenerationService',
        fullName: profile.fullName,
      });
      
      // Get BrainProtocol instance - this gives us access to brain content with schema support
      const brainProtocol = this.getBrainProtocol();
      
      // PHASE 1: Initial Content Generation
      this.logger.info('PHASE 1: Initial content generation', {
        context: 'LandingPageGenerationService',
      });
      
      // Use the imported prompt for content generation
      const generationQuery = landingPagePrompt;
      
      // Use BrainProtocol with schema support
      const initialResult = await brainProtocol.processQuery(generationQuery, {
        userId: 'system',
        userName: 'System',
        schema: LandingPageSchema, // Pass the LandingPageSchema to ensure properly structured response
      });
      
      // Check if we received a structured object
      if (!initialResult.object) {
        throw new Error('Failed to generate structured landing page data');
      }
      
      this.logger.debug('Generated initial landing page data structure', {
        context: 'LandingPageGenerationService',
        sections: initialResult.object?.sectionOrder,
        hasHeroSection: !!initialResult.object?.hero,
        hasServicesSection: !!initialResult.object?.services,
      });
      
      // PHASE 2: Editorial Review and Enhancement
      this.logger.info('PHASE 2: Editorial review and enhancement', {
        context: 'LandingPageGenerationService',
      });
      
      // Create a review query that includes the initial data
      const reviewQuery = `${contentReviewPrompt}\n\nCONTENT TO REVIEW:\n${JSON.stringify(initialResult.object, null, 2)}`;
      
      // Use the same schema for the review to ensure proper structure
      const reviewResult = await brainProtocol.processQuery(reviewQuery, {
        userId: 'system',
        userName: 'System',
        schema: LandingPageSchema, // Use the same schema for the review
      });
      
      // Check if we received a structured object from the review
      if (!reviewResult.object) {
        this.logger.warn('Editorial review failed to return structured data, using initial content', {
          context: 'LandingPageGenerationService',
        });
        // Continue with the initial result if review fails
      } else {
        this.logger.info('Successfully completed editorial review of landing page content', {
          context: 'LandingPageGenerationService',
        });
      }
      
      // Use the reviewed result if available, otherwise fall back to initial result
      const resultData = reviewResult.object ? reviewResult.object : initialResult.object;
      
      // Ensure result is defined (should be guaranteed by earlier checks, but TypeScript needs this)
      if (!resultData) {
        throw new Error('Both initial and review phases failed to return structured data');
      }

      // Create default hero and services sections to ensure they meet the schema requirements
      const defaultHero = {
        headline: 'Professional Services',
        subheading: 'Expert assistance for your needs',
        ctaText: 'Contact Me',
        ctaLink: '#contact',
      };

      const defaultServices = {
        title: 'Services',
        items: [{
          title: 'Professional Service',
          description: 'Expert assistance in this field',
        }],
      };
      
      // Merge the result object with defaults for required fields
      // This approach ensures the required string fields are always present
      const resultWithDefaults = {
        ...resultData,
        title: resultData.title || 'Professional Services',
        description: resultData.description || 'Professional services and expertise',
        name: resultData.name || 'Professional',
        tagline: resultData.tagline || 'Expert Professional Services',
        hero: {
          ...defaultHero,
          ...resultData.hero,
        },
        services: {
          ...defaultServices,
          ...resultData.services,
          // Ensure services.title is always defined
          title: resultData.services?.title || defaultServices.title,
        },
        sectionOrder: resultData.sectionOrder || ['hero', 'services', 'about', 'cta', 'footer'],
      };
      
      // Add additional strategic CTAs throughout the page if needed
      // For example, ensure the about section has a CTA if it exists
      if (resultWithDefaults.about && !resultWithDefaults.about.ctaText) {
        resultWithDefaults.about = {
          ...resultWithDefaults.about,
          ctaText: 'Learn More',
          ctaLink: '#services',
        };
      }
      
      // Apply any overrides - using type assertion to handle conversion between similar types
      const landingPageData = {
        ...resultWithDefaults,
        ...overrides,
      } as unknown as LandingPageData;
      
      // Log the two-phase process completion
      this.logger.info('Successfully generated landing page with two-phase process', {
        sections: landingPageData.sectionOrder,
        context: 'LandingPageGenerationService',
        phaseCount: reviewResult.object ? 2 : 1, // Track if both phases were completed
      });
      
      return landingPageData;
      
    } catch (error) {
      this.logger.error('Error generating landing page data', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }
  
  /**
   * Get the Brain Protocol instance used for AI operations
   * @public Exposed for testing purposes
   */
  public getBrainProtocol(): BrainProtocol {
    if (!this.brainProtocol) {
      // If not explicitly set, use the singleton instance
      this.brainProtocol = BrainProtocol.getInstance();
    }
    return this.brainProtocol;
  }
  
  /**
   * Set the Brain Protocol instance
   * @param protocol The brain protocol instance to use
   */
  public setBrainProtocol(protocol: BrainProtocol): void {
    this.brainProtocol = protocol;
  }
}

export default LandingPageGenerationService;