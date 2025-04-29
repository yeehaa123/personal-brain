
import type { Profile } from '@/models/profile';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import { LandingPageSchema } from '@website/schemas';
import type { LandingPageData } from '@website/schemas';
import type { 
  ConversionSegment, 
  CredibilitySegment, 
  IdentitySegment, 
  SegmentGenerationStatus,
  SegmentStore,
  ServiceOfferingSegment,
} from '@website/schemas/landingPageSegmentSchemas';
import { 
  ConversionSegmentSchema, 
  CredibilitySegmentSchema,
  IdentitySegmentSchema,
  ServiceOfferingSegmentSchema,
} from '@website/schemas/landingPageSegmentSchemas';

import { SegmentCacheService } from './landingPage/segmentCacheService';
import contentReviewPrompt from './prompts/content-review.txt';
import conversionSegmentPrompt from './prompts/segments/conversion-segment.txt';
import credibilitySegmentPrompt from './prompts/segments/credibility-segment.txt';
import identitySegmentPrompt from './prompts/segments/identity-segment.txt';
import serviceOfferingSegmentPrompt from './prompts/segments/service-offering-segment.txt';

// Keep the original prompt for backward compatibility

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
  private segmentCache: SegmentCacheService;
  private segmentGenerationStatus: SegmentGenerationStatus = {
    identity: false,
    serviceOffering: false,
    credibility: false,
    conversion: false,
    combined: false,
    reviewed: false,
  };
  
  /**
   * Private constructor initializes dependencies
   */
  private constructor() {
    // Initialize segment cache service
    this.segmentCache = SegmentCacheService.getInstance();
  }
  
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
   * Get current segment generation status
   * @returns The current status of segment generation
   */
  getSegmentGenerationStatus(): SegmentGenerationStatus {
    return { ...this.segmentGenerationStatus };
  }
  
  /**
   * Get loaded segments from cache
   * @returns The cached segments
   */
  getCachedSegments(): SegmentStore {
    return this.segmentCache.getAllSegments();
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
   * Generate the identity segment (core brand elements)
   * @returns The generated identity segment
   */
  async generateIdentitySegment(): Promise<IdentitySegment> {
    try {
      this.logger.info('Generating identity segment', {
        context: 'LandingPageGenerationService',
      });
      
      // Check if we have a cached segment
      if (this.segmentCache.hasSegment('identity')) {
        this.logger.info('Using cached identity segment', {
          context: 'LandingPageGenerationService',
        });
        
        // Get the cached segment (we know it exists from the check above)
        const cachedSegment = this.segmentCache.getSegment('identity');
        if (cachedSegment) {
          this.segmentGenerationStatus.identity = true;
          return cachedSegment;
        }
      }
      
      // Get BrainProtocol instance
      const brainProtocol = this.getBrainProtocol();
      
      // Generate the identity segment using the dedicated prompt
      const result = await brainProtocol.processQuery(identitySegmentPrompt, {
        userId: 'system',
        userName: 'System',
        schema: IdentitySegmentSchema,
      });
      
      // Check if we received a structured object
      if (!result.object) {
        throw new Error('Failed to generate structured identity segment');
      }
      
      // Prepare base segment with required fields
      const baseSegment = {
        ...result.object,
        segmentType: 'identity' as const,
        version: 1,
        generatedAt: new Date().toISOString(),
        // Ensure hero has required ctaLink field
        hero: {
          ...result.object.hero,
          ctaLink: result.object.hero?.ctaLink || '#contact',
        },
      };
      
      // Prepare problemStatement with required fields if it exists
      let problemStatement = undefined;
      if (result.object.problemStatement) {
        problemStatement = {
          ...result.object.problemStatement,
          // enabled is required to be a boolean, not optional
          enabled: result.object.problemStatement.enabled !== undefined 
            ? result.object.problemStatement.enabled 
            : true,
        };
      }
      
      // Create the final segment with proper typing
      const identitySegment = {
        ...baseSegment,
        ...(problemStatement ? { problemStatement } : {}),
      } as IdentitySegment;
      
      // Store in cache
      this.segmentCache.saveSegment('identity', identitySegment);
      
      // Update status
      this.segmentGenerationStatus.identity = true;
      
      this.logger.debug('Generated identity segment', {
        context: 'LandingPageGenerationService',
        hasHero: !!identitySegment.hero,
        hasProblemStatement: !!identitySegment.problemStatement,
      });
      
      return identitySegment;
    } catch (error) {
      this.logger.error('Error generating identity segment', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }
  
  /**
   * Generate the service offering segment (services, process, pricing)
   * @returns The generated service offering segment
   */
  async generateServiceOfferingSegment(): Promise<ServiceOfferingSegment> {
    try {
      this.logger.info('Generating service offering segment', {
        context: 'LandingPageGenerationService',
      });
      
      // Check if we have a cached segment
      if (this.segmentCache.hasSegment('serviceOffering')) {
        this.logger.info('Using cached service offering segment', {
          context: 'LandingPageGenerationService',
        });
        
        // Get the cached segment (we know it exists from the check above)
        const cachedSegment = this.segmentCache.getSegment('serviceOffering');
        if (cachedSegment) {
          this.segmentGenerationStatus.serviceOffering = true;
          return cachedSegment;
        }
      }
      
      // Get BrainProtocol instance
      const brainProtocol = this.getBrainProtocol();
      
      // Generate the service offering segment using the dedicated prompt
      const result = await brainProtocol.processQuery(serviceOfferingSegmentPrompt, {
        userId: 'system',
        userName: 'System',
        schema: ServiceOfferingSegmentSchema,
      });
      
      // Check if we received a structured object
      if (!result.object) {
        throw new Error('Failed to generate structured service offering segment');
      }
      
      // Prepare base segment with required fields
      const baseSegment = {
        ...result.object,
        segmentType: 'serviceOffering' as const,
        version: 1,
        generatedAt: new Date().toISOString(),
        // Ensure services has required title field
        services: {
          ...result.object.services,
          title: result.object.services?.title || 'Services',
        },
      };

      // Prepare process with required fields if it exists
      let process = undefined;
      if (result.object.process) {
        process = {
          ...result.object.process,
          // Ensure title is a non-optional string
          title: result.object.process.title !== undefined 
            ? result.object.process.title 
            : 'How I Work',
          // Ensure enabled is a non-optional boolean
          enabled: result.object.process.enabled !== undefined 
            ? result.object.process.enabled 
            : true,
        };
      }

      // Prepare pricing with required fields if it exists
      let pricing = undefined;
      if (result.object.pricing) {
        // Process pricing tiers to ensure required fields in each tier
        const processedTiers = (result.object.pricing.tiers || []).map(tier => ({
          ...tier,
          ctaText: tier.ctaText || 'Contact Me',
          ctaLink: tier.ctaLink || '#contact',
          isFeatured: tier.isFeatured !== undefined ? tier.isFeatured : false,
        }));
        
        // Create pricing object with all required fields
        pricing = {
          ...result.object.pricing,
          title: result.object.pricing.title || 'Packages & Pricing',
          enabled: result.object.pricing.enabled !== undefined 
            ? result.object.pricing.enabled 
            : false,
          tiers: processedTiers,
        };
      }
      
      // Create the final segment with proper typing
      const serviceOfferingSegment = {
        ...baseSegment,
        ...(process ? { process } : {}),
        ...(pricing ? { pricing } : {}),
      } as ServiceOfferingSegment;
      
      // Store in cache
      this.segmentCache.saveSegment('serviceOffering', serviceOfferingSegment);
      
      // Update status
      this.segmentGenerationStatus.serviceOffering = true;
      
      this.logger.debug('Generated service offering segment', {
        context: 'LandingPageGenerationService',
        hasServices: !!serviceOfferingSegment.services,
        hasProcess: !!serviceOfferingSegment.process,
        hasPricing: !!serviceOfferingSegment.pricing,
      });
      
      return serviceOfferingSegment;
    } catch (error) {
      this.logger.error('Error generating service offering segment', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }
  
  /**
   * Generate the credibility segment (case studies, expertise, about)
   * @returns The generated credibility segment
   */
  async generateCredibilitySegment(): Promise<CredibilitySegment> {
    try {
      this.logger.info('Generating credibility segment', {
        context: 'LandingPageGenerationService',
      });
      
      // Check if we have a cached segment
      if (this.segmentCache.hasSegment('credibility')) {
        this.logger.info('Using cached credibility segment', {
          context: 'LandingPageGenerationService',
        });
        
        // Get the cached segment (we know it exists from the check above)
        const cachedSegment = this.segmentCache.getSegment('credibility');
        if (cachedSegment) {
          this.segmentGenerationStatus.credibility = true;
          return cachedSegment;
        }
      }
      
      // Get BrainProtocol instance
      const brainProtocol = this.getBrainProtocol();
      
      // Generate the credibility segment using the dedicated prompt
      const result = await brainProtocol.processQuery(credibilitySegmentPrompt, {
        userId: 'system',
        userName: 'System',
        schema: CredibilitySegmentSchema,
      });
      
      // Check if we received a structured object
      if (!result.object) {
        throw new Error('Failed to generate structured credibility segment');
      }
      
      // Prepare base segment with required fields
      const baseSegment = {
        ...result.object,
        segmentType: 'credibility' as const,
        version: 1,
        generatedAt: new Date().toISOString(),
      };
      
      // Prepare caseStudies with required fields if it exists
      let caseStudies = undefined;
      if (result.object.caseStudies) {
        caseStudies = {
          ...result.object.caseStudies,
          // Ensure title is a non-optional string
          title: result.object.caseStudies.title !== undefined 
            ? result.object.caseStudies.title 
            : 'Case Studies',
          // Ensure enabled is a non-optional boolean
          enabled: result.object.caseStudies.enabled !== undefined 
            ? result.object.caseStudies.enabled 
            : true,
        };
      }
      
      // Prepare expertise with required fields if it exists
      let expertise = undefined;
      if (result.object.expertise) {
        expertise = {
          ...result.object.expertise,
          // Ensure title is a non-optional string
          title: result.object.expertise.title !== undefined 
            ? result.object.expertise.title 
            : 'Expertise',
          // Ensure enabled is a non-optional boolean
          enabled: result.object.expertise.enabled !== undefined 
            ? result.object.expertise.enabled 
            : true,
        };
      }
      
      // Prepare about with required fields if it exists
      let about = undefined;
      if (result.object.about) {
        about = {
          ...result.object.about,
          // Ensure title is a non-optional string
          title: result.object.about.title !== undefined 
            ? result.object.about.title 
            : 'About Me',
          // Ensure enabled is a non-optional boolean
          enabled: result.object.about.enabled !== undefined 
            ? result.object.about.enabled 
            : true,
        };
      }
      
      // Create the final segment with proper typing
      const credibilitySegment = {
        ...baseSegment,
        ...(caseStudies ? { caseStudies } : {}),
        ...(expertise ? { expertise } : {}),
        ...(about ? { about } : {}),
      } as CredibilitySegment;
      
      // Store in cache
      this.segmentCache.saveSegment('credibility', credibilitySegment);
      
      // Update status
      this.segmentGenerationStatus.credibility = true;
      
      this.logger.debug('Generated credibility segment', {
        context: 'LandingPageGenerationService',
        hasCaseStudies: !!credibilitySegment.caseStudies,
        hasExpertise: !!credibilitySegment.expertise,
        hasAbout: !!credibilitySegment.about,
      });
      
      return credibilitySegment;
    } catch (error) {
      this.logger.error('Error generating credibility segment', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }
  
  /**
   * Generate the conversion segment (FAQ, CTA, footer)
   * @returns The generated conversion segment
   */
  async generateConversionSegment(): Promise<ConversionSegment> {
    try {
      this.logger.info('Generating conversion segment', {
        context: 'LandingPageGenerationService',
      });
      
      // Check if we have a cached segment
      if (this.segmentCache.hasSegment('conversion')) {
        this.logger.info('Using cached conversion segment', {
          context: 'LandingPageGenerationService',
        });
        
        // Get the cached segment (we know it exists from the check above)
        const cachedSegment = this.segmentCache.getSegment('conversion');
        if (cachedSegment) {
          this.segmentGenerationStatus.conversion = true;
          return cachedSegment;
        }
      }
      
      // Get BrainProtocol instance
      const brainProtocol = this.getBrainProtocol();
      
      // Generate the conversion segment using the dedicated prompt
      const result = await brainProtocol.processQuery(conversionSegmentPrompt, {
        userId: 'system',
        userName: 'System',
        schema: ConversionSegmentSchema,
      });
      
      // Check if we received a structured object
      if (!result.object) {
        throw new Error('Failed to generate structured conversion segment');
      }
      
      // Prepare base segment with required fields
      const baseSegment = {
        ...result.object,
        segmentType: 'conversion' as const,
        version: 1,
        generatedAt: new Date().toISOString(),
      };
      
      // Prepare faq with required fields if it exists
      let faq = undefined;
      if (result.object.faq) {
        faq = {
          ...result.object.faq,
          // Ensure title is a non-optional string
          title: result.object.faq.title !== undefined 
            ? result.object.faq.title 
            : 'Frequently Asked Questions',
          // Ensure enabled is a non-optional boolean
          enabled: result.object.faq.enabled !== undefined 
            ? result.object.faq.enabled 
            : true,
        };
      }
      
      // Prepare cta with required fields if it exists
      let cta = undefined;
      if (result.object.cta) {
        cta = {
          ...result.object.cta,
          // Ensure title is a non-optional string
          title: result.object.cta.title !== undefined 
            ? result.object.cta.title 
            : 'Ready to Get Started?',
          // Ensure enabled is a non-optional boolean
          enabled: result.object.cta.enabled !== undefined 
            ? result.object.cta.enabled 
            : true,
          // Ensure buttonText is a non-optional string
          buttonText: result.object.cta.buttonText !== undefined
            ? result.object.cta.buttonText
            : 'Contact Me',
          // Ensure buttonLink is a non-optional string
          buttonLink: result.object.cta.buttonLink !== undefined
            ? result.object.cta.buttonLink
            : '#contact',
        };
      }
      
      // Prepare footer with required fields if it exists
      let footer = undefined;
      if (result.object.footer) {
        footer = {
          ...result.object.footer,
          // Ensure enabled is a non-optional boolean
          enabled: result.object.footer.enabled !== undefined 
            ? result.object.footer.enabled 
            : true,
        };
      }
      
      // Create the final segment with proper typing
      const conversionSegment = {
        ...baseSegment,
        ...(faq ? { faq } : {}),
        ...(cta ? { cta } : {}),
        ...(footer ? { footer } : {}),
      } as ConversionSegment;
      
      // Store in cache
      this.segmentCache.saveSegment('conversion', conversionSegment);
      
      // Update status
      this.segmentGenerationStatus.conversion = true;
      
      this.logger.debug('Generated conversion segment', {
        context: 'LandingPageGenerationService',
        hasFaq: !!conversionSegment.faq,
        hasCta: !!conversionSegment.cta,
        hasFooter: !!conversionSegment.footer,
      });
      
      return conversionSegment;
    } catch (error) {
      this.logger.error('Error generating conversion segment', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }
  
  /**
   * Combine all segments into a complete landing page
   * @param segments The segments to combine
   * @returns The combined landing page data
   */
  combineLandingPage(segments: SegmentStore): LandingPageData {
    try {
      this.logger.info('Combining segments into complete landing page', {
        context: 'LandingPageGenerationService',
        segments: Object.keys(segments),
      });
      
      // Check if we have the required segments (identity and services at minimum)
      if (!segments.identity || !segments.serviceOffering) {
        throw new Error('Missing required segments (identity and serviceOffering are required)');
      }
      
      // Create object with basic metadata from identity segment
      const landingPage: Partial<LandingPageData> = {
        title: segments.identity.title,
        description: segments.identity.description,
        name: segments.identity.name,
        tagline: segments.identity.tagline,
        sectionOrder: [],
        hero: segments.identity.hero,
      };
      
      // Add problem statement if available
      if (segments.identity.problemStatement) {
        landingPage.problemStatement = segments.identity.problemStatement;
      }
      
      // Add service offerings
      landingPage.services = segments.serviceOffering.services;
      
      // Add process if available
      if (segments.serviceOffering.process) {
        landingPage.process = segments.serviceOffering.process;
      }
      
      // Add pricing if available
      if (segments.serviceOffering.pricing) {
        landingPage.pricing = segments.serviceOffering.pricing;
      }
      
      // Add credibility sections if available
      if (segments.credibility) {
        if (segments.credibility.caseStudies) {
          landingPage.caseStudies = segments.credibility.caseStudies;
        }
        
        if (segments.credibility.expertise) {
          landingPage.expertise = segments.credibility.expertise;
        }
        
        if (segments.credibility.about) {
          landingPage.about = segments.credibility.about;
        }
      }
      
      // Add conversion sections if available
      if (segments.conversion) {
        if (segments.conversion.faq) {
          landingPage.faq = segments.conversion.faq;
        }
        
        if (segments.conversion.cta) {
          landingPage.cta = segments.conversion.cta;
        }
        
        if (segments.conversion.footer) {
          landingPage.footer = segments.conversion.footer;
        }
      }
      
      // Build section order based on what sections are available
      const sectionOrder: string[] = [];
      
      // Core sections (always present)
      sectionOrder.push('hero');
      
      // Problem statement (if available)
      if (landingPage.problemStatement) {
        sectionOrder.push('problemStatement');
      }
      
      // Service-related sections
      sectionOrder.push('services');
      
      // Process (if available)
      if (landingPage.process) {
        sectionOrder.push('process');
      }
      
      // Case studies (if available)
      if (landingPage.caseStudies) {
        sectionOrder.push('caseStudies');
      }
      
      // Expertise (if available)
      if (landingPage.expertise) {
        sectionOrder.push('expertise');
      }
      
      // About (if available)
      if (landingPage.about) {
        sectionOrder.push('about');
      }
      
      // Pricing (if available)
      if (landingPage.pricing) {
        sectionOrder.push('pricing');
      }
      
      // FAQ (if available)
      if (landingPage.faq) {
        sectionOrder.push('faq');
      }
      
      // CTA (if available)
      if (landingPage.cta) {
        sectionOrder.push('cta');
      }
      
      // Footer (if available)
      if (landingPage.footer) {
        sectionOrder.push('footer');
      }
      
      // Set the section order
      landingPage.sectionOrder = sectionOrder;
      
      // Update status
      this.segmentGenerationStatus.combined = true;
      
      this.logger.info('Successfully combined segments into landing page', {
        context: 'LandingPageGenerationService',
        sectionCount: sectionOrder.length,
        sections: sectionOrder,
      });
      
      return landingPage as LandingPageData;
    } catch (error) {
      this.logger.error('Error combining segments into landing page', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }
  
  /**
   * Generate comprehensive landing page data with all sections using a segmented approach
   * @param options Configuration options for generation
   * @param options.regenerateSegments Whether to regenerate segments that are already cached
   * @param options.segmentsToGenerate Which segments to generate (all by default)
   * @param options.skipReview Whether to skip the final review phase
   * @param overrides Optional overrides to customize the data
   * @returns Generated landing page data with all sections
   */
  async generateLandingPageData(
    options?: {
      regenerateSegments?: boolean;
      segmentsToGenerate?: ('identity' | 'serviceOffering' | 'credibility' | 'conversion')[];
      skipReview?: boolean;
    },
    overrides?: Partial<LandingPageData>,
  ): Promise<LandingPageData> {
    try {
      // Get profile data using the messaging system
      const profile = await this.getProfileData();
      
      if (!profile) {
        throw new Error('No profile found');
      }
      
      this.logger.info('Generating landing page data with segmented approach', {
        context: 'LandingPageGenerationService',
        profileName: profile.fullName,
        regenerateSegments: options?.regenerateSegments,
        segmentsToGenerate: options?.segmentsToGenerate,
      });
      
      // Reset segment status if regenerating all
      if (options?.regenerateSegments) {
        this.segmentGenerationStatus = {
          identity: false,
          serviceOffering: false,
          credibility: false,
          conversion: false,
          combined: false,
          reviewed: false,
        };
        
        // Clear cache if regenerating
        this.segmentCache.clearAllSegments();
      }
      
      // Determine which segments to generate
      const segmentsToGenerate = options?.segmentsToGenerate || [
        'identity',
        'serviceOffering',
        'credibility',
        'conversion',
      ];
      
      // Generate selected segments
      const segments: SegmentStore = {};
      
      // Generate each segment in sequence (this could be parallelized in future)
      if (segmentsToGenerate.includes('identity') || !this.segmentCache.hasSegment('identity')) {
        segments.identity = await this.generateIdentitySegment();
      } else {
        // Get cached segment
        const cachedSegment = this.segmentCache.getSegment('identity');
        if (cachedSegment) {
          segments.identity = cachedSegment;
          this.segmentGenerationStatus.identity = true;
        }
      }
      
      if (segmentsToGenerate.includes('serviceOffering') || !this.segmentCache.hasSegment('serviceOffering')) {
        segments.serviceOffering = await this.generateServiceOfferingSegment();
      } else {
        // Get cached segment
        const cachedSegment = this.segmentCache.getSegment('serviceOffering');
        if (cachedSegment) {
          segments.serviceOffering = cachedSegment;
          this.segmentGenerationStatus.serviceOffering = true;
        }
      }
      
      if (segmentsToGenerate.includes('credibility') || !this.segmentCache.hasSegment('credibility')) {
        segments.credibility = await this.generateCredibilitySegment();
      } else {
        // Get cached segment
        const cachedSegment = this.segmentCache.getSegment('credibility');
        if (cachedSegment) {
          segments.credibility = cachedSegment;
          this.segmentGenerationStatus.credibility = true;
        }
      }
      
      if (segmentsToGenerate.includes('conversion') || !this.segmentCache.hasSegment('conversion')) {
        segments.conversion = await this.generateConversionSegment();
      } else {
        // Get cached segment
        const cachedSegment = this.segmentCache.getSegment('conversion');
        if (cachedSegment) {
          segments.conversion = cachedSegment;
          this.segmentGenerationStatus.conversion = true;
        }
      }
      
      // Combine segments
      let landingPage = this.combineLandingPage(segments);
      
      // Optionally perform a final review phase
      if (!options?.skipReview) {
        landingPage = await this.reviewLandingPage(landingPage);
        this.segmentGenerationStatus.reviewed = true;
      }
      
      // Apply any overrides
      if (overrides) {
        landingPage = {
          ...landingPage,
          ...overrides,
        };
      }
      
      this.logger.info('Successfully generated landing page with segmented approach', {
        sections: landingPage.sectionOrder,
        context: 'LandingPageGenerationService',
      });
      
      return landingPage;
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
   * Perform a final review of the combined landing page
   * @param landingPage The landing page to review
   * @returns The reviewed landing page
   */
  private async reviewLandingPage(landingPage: LandingPageData): Promise<LandingPageData> {
    try {
      this.logger.info('Performing final review of combined landing page', {
        context: 'LandingPageGenerationService',
      });
      
      // Get BrainProtocol instance
      const brainProtocol = this.getBrainProtocol();
      
      // Create a review query that includes the combined data
      const reviewQuery = `${contentReviewPrompt}\n\nCONTENT TO REVIEW:\n${JSON.stringify(landingPage, null, 2)}`;
      
      // Use LandingPageSchema for the review
      const reviewResult = await brainProtocol.processQuery(reviewQuery, {
        userId: 'system',
        userName: 'System',
        schema: LandingPageSchema,
      });
      
      // Check if we received a structured object from the review
      if (!reviewResult.object) {
        this.logger.warn('Final review failed to return structured data, using unreviewed version', {
          context: 'LandingPageGenerationService',
        });
        return landingPage;
      }
      
      this.logger.info('Successfully completed final review of landing page', {
        context: 'LandingPageGenerationService',
      });
      
      return reviewResult.object as LandingPageData;
    } catch (error) {
      this.logger.error('Error reviewing landing page', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      
      // If review fails, return the original unreviewed landing page
      return landingPage;
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