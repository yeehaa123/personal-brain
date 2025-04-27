
import type { Profile } from '@/models/profile';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import { LandingPageSchema } from '@website/schemas';
import type { LandingPageData } from '@website/schemas';

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
      
      // Create a query prompt that provides clear instructions
      const query = `Create a complete professional landing page for me based on my profile data.
      
The landing page should include the following sections:
- Hero section with headline and call-to-action
- Services section with 3-5 key services
- About section with professional background
- Call-to-action section
- Footer section

Make the content professional, concise, and tailored to my expertise and background.
Include my key skills, experience, and professional focus areas.
Use a modern, clean style with professional language.`;
      
      // Use BrainProtocol with schema support - need to cast schema type since we're using a direct import
      const result = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
        schema: LandingPageSchema, // Pass the LandingPageSchema to ensure properly structured response
      });
      
      // Check if we received a structured object
      if (!result.object) {
        throw new Error('Failed to generate structured landing page data');
      }
      
      this.logger.debug('Generated landing page data structure', {
        context: 'LandingPageGenerationService',
        sections: result.object?.sectionOrder,
        hasHeroSection: !!result.object?.hero,
        hasServicesSection: !!result.object?.services,
      });

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
        ...result.object,
        title: result.object.title || 'Professional Services',
        description: result.object.description || 'Professional services and expertise',
        name: result.object.name || 'Professional',
        tagline: result.object.tagline || 'Expert Professional Services',
        hero: {
          ...defaultHero,
          ...result.object.hero,
        },
        services: {
          ...defaultServices,
          ...result.object.services,
          // Ensure services.title is always defined
          title: result.object.services?.title || defaultServices.title,
        },
        sectionOrder: result.object.sectionOrder || ['hero', 'services', 'about', 'cta', 'footer'],
      };
      
      // Apply any overrides - using type assertion to handle conversion between similar types
      const landingPageData = {
        ...resultWithDefaults,
        ...overrides,
      } as unknown as LandingPageData;
      
      this.logger.info('Successfully generated landing page with sections', {
        sections: landingPageData.sectionOrder,
        context: 'LandingPageGenerationService',
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