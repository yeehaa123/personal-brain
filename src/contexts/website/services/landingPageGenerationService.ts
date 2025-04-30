import type { z } from 'zod';

import { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import { 
  AboutSectionSchema,
  CaseStudiesSectionSchema,
  CtaSectionSchema,
  ExpertiseSectionSchema,
  FaqSectionSchema,
  FooterSectionSchema,
  HeroSectionSchema, 
  LandingPageSchema, 
  PricingSectionSchema,
  ProblemStatementSectionSchema,
  ProcessSectionSchema,
  ServicesSectionSchema,
} from '@website/schemas';
import type { LandingPageData } from '@website/schemas';
import type { AssessedSection } from '@website/schemas/sectionQualitySchema';
import { REQUIRED_SECTION_TYPES } from '@website/schemas/sectionQualitySchema';

import { SectionQualityService } from './landingPage/sectionQualityService';
import contentReviewPrompt from './prompts/content-review.txt';
import aboutPrompt from './prompts/sections/about.txt';
import caseStudiesPrompt from './prompts/sections/case-studies.txt';
import ctaPrompt from './prompts/sections/cta.txt';
import expertisePrompt from './prompts/sections/expertise.txt';
import faqPrompt from './prompts/sections/faq.txt';
import footerPrompt from './prompts/sections/footer.txt';
import heroSectionPrompt from './prompts/sections/hero-section.txt';
import pricingPrompt from './prompts/sections/pricing.txt';
import problemStatementPrompt from './prompts/sections/problem-statement.txt';
import processPrompt from './prompts/sections/process.txt';
import servicesPrompt from './prompts/sections/services.txt';

/**
 * Options for landing page quality assessment
 */
export interface LandingPageQualityAssessmentOptions {
  /** Custom thresholds for section quality assessment */
  qualityThresholds?: {
    minCombinedScore?: number;
    minQualityScore?: number;
    minConfidenceScore?: number;
  };
  /** 
   * Whether to apply the enablement recommendations immediately
   * If false, only returns the recommendations without modifying the landing page
   */
  applyRecommendations?: boolean;
}

/**
 * Service for generating landing page content
 * Implements the Component Interface Standardization pattern
 */
export class LandingPageGenerationService {
  private static instance: LandingPageGenerationService | null = null;
  private brainProtocol: BrainProtocol | null = null;
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  private sectionQualityService: SectionQualityService;
  
  // Record to store section quality assessments
  private assessedSections: Record<string, AssessedSection<unknown>> = {};
  
  // Section schemas keyed by section type
  private sectionSchemas: Record<string, z.ZodSchema> = {
    hero: HeroSectionSchema,
    problemStatement: ProblemStatementSectionSchema,
    services: ServicesSectionSchema,
    process: ProcessSectionSchema,
    caseStudies: CaseStudiesSectionSchema,
    expertise: ExpertiseSectionSchema,
    about: AboutSectionSchema,
    pricing: PricingSectionSchema,
    faq: FaqSectionSchema,
    cta: CtaSectionSchema,
    footer: FooterSectionSchema,
  };
  
  // Map of section types to their corresponding prompts
  private sectionPrompts: Record<string, string> = {
    hero: heroSectionPrompt,
    problemStatement: problemStatementPrompt,
    services: servicesPrompt,
    process: processPrompt,
    caseStudies: caseStudiesPrompt,
    expertise: expertisePrompt,
    about: aboutPrompt,
    pricing: pricingPrompt,
    faq: faqPrompt,
    cta: ctaPrompt,
    footer: footerPrompt,
  };

  /**
   * Private constructor initializes dependencies
   */
  private constructor() {
    this.sectionQualityService = SectionQualityService.getInstance();
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
   * Generate a complete landing page
   * 
   * @returns A complete landing page data structure with content
   */
  async generateLandingPageData(): Promise<LandingPageData> {
    this.logger.info('Starting landing page generation', {
      context: 'LandingPageGenerationService',
    });
    
    // Clear any previous assessment data
    this.assessedSections = {};
    
    try {
      // Create the basic structure for the landing page
      let landingPage = this.createBasicLandingPage();
      
      // Generate content for each section individually
      landingPage = await this.generateAllSections(landingPage);
      
      // Perform holistic editing to ensure consistency across sections
      landingPage = await this.performHolisticEditing(landingPage);
      
      this.logger.info('Completed landing page generation', {
        context: 'LandingPageGenerationService',
      });
      
      return landingPage;
    } catch (error) {
      this.logger.error('Error generating landing page', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }

  /**
   * Get the quality assessment results for all sections
   * @returns Record of section assessments
   */
  getSectionQualityAssessments(): Record<string, AssessedSection<unknown>> {
    return { ...this.assessedSections };
  }
  
  /**
   * Assess the quality of a landing page and return recommendations
   * This is a separate step from generation that can be run on demand
   * 
   * @param landingPage - The landing page to assess
   * @param options - Options for quality assessment
   * @returns The assessed landing page with quality data and optional enablement applied
   */
  async assessLandingPageQuality(
    landingPage: LandingPageData,
    options: LandingPageQualityAssessmentOptions = {}
  ): Promise<{ 
    landingPage: LandingPageData; 
    assessments: Record<string, AssessedSection<unknown>>;
  }> {
    this.logger.info('Starting landing page quality assessment', {
      context: 'LandingPageGenerationService',
    });
    
    // Clear any previous assessment data
    this.assessedSections = {};
    
    // Set custom quality thresholds if provided
    if (options.qualityThresholds) {
      this.sectionQualityService.setQualityThresholds(options.qualityThresholds);
    }
    
    try {
      // Create a copy of the landing page to avoid modifying the original
      let assessedLandingPage = { ...landingPage };
      
      // Process sections with quality assessment
      assessedLandingPage = await this.assessAndImproveSections(assessedLandingPage);
      
      // If requested, apply the enablement recommendations
      if (options.applyRecommendations) {
        // Update section order based on enabled sections
        assessedLandingPage.sectionOrder = this.buildSectionOrderFromEnabledSections(assessedLandingPage);
      }
      
      this.logger.info('Completed landing page quality assessment', {
        context: 'LandingPageGenerationService',
      });
      
      return {
        landingPage: assessedLandingPage,
        assessments: { ...this.assessedSections },
      };
    } catch (error) {
      this.logger.error('Error during landing page quality assessment', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      throw error;
    }
  }

  /**
   * Create the basic structure for a landing page
   */
  private createBasicLandingPage(): LandingPageData {
    // Basic landing page with empty sections
    const currentYear = new Date().getFullYear();
    
    const baseLandingPage = {
      title: 'Professional Services',
      description: 'Professional expertise and services',
      name: 'Professional Expert',
      tagline: 'Expert services for your needs',
      
      // Default section order
      sectionOrder: [
        'hero',
        'problemStatement',
        'services',
        'process',
        'caseStudies',
        'expertise',
        'about',
        'pricing',
        'faq',
        'cta',
        'footer',
      ],
      
      // Initialize sections with minimal required content
      hero: {
        headline: 'Professional Services',
        subheading: 'Expert solutions for your needs',
        ctaText: 'Get in Touch',
        ctaLink: '#contact',
      },
      problemStatement: {
        title: 'Challenges We Solve',
        description: 'Addressing common problems in the industry',
        enabled: true,
      },
      services: {
        title: 'Services',
        items: [{ title: 'Professional Service', description: 'High-quality professional service' }],
      },
      process: {
        title: 'How I Work',
        steps: [{ step: 1, title: 'Initial Consultation', description: 'Understanding your needs' }],
        enabled: true,
      },
      caseStudies: {
        title: 'Selected Projects',
        items: [],
        enabled: true,
      },
      expertise: {
        title: 'Expertise',
        items: [{ title: 'Professional Expertise', description: 'Years of industry experience' }],
        enabled: true,
      },
      about: {
        title: 'About Me',
        content: 'Professional with expertise in the field.',
        enabled: true,
      },
      pricing: {
        title: 'Packages & Pricing',
        tiers: [],
        enabled: false, // Disabled by default
      },
      faq: {
        title: 'Frequently Asked Questions',
        items: [{ question: 'What services do you offer?', answer: 'Professional services tailored to your needs.' }],
        enabled: true,
      },
      cta: {
        title: 'Ready to Get Started?',
        buttonText: 'Contact Me',
        buttonLink: '#contact',
        enabled: true,
      },
      footer: {
        copyrightText: `© ${currentYear} Professional Expert`,
        enabled: true,
      },
    };
    
    // Validate and parse using the schema to ensure correct structure with defaults
    return LandingPageSchema.parse(baseLandingPage);
  }

  /**
   * Generate content for all sections
   * @param landingPage - Basic landing page structure
   */
  private async generateAllSections(landingPage: LandingPageData): Promise<LandingPageData> {
    this.logger.info('Generating content for each section', {
      context: 'LandingPageGenerationService',
    });
    
    const updatedLandingPage = { ...landingPage };
    
    // Generate identity information first (title, description, name, tagline)
    await this.generateIdentityInfo(updatedLandingPage);
    
    // Generate each section one by one
    for (const sectionType of updatedLandingPage.sectionOrder) {
      if (this.sectionSchemas[sectionType as keyof typeof this.sectionSchemas]) {
        await this.generateSectionContent(updatedLandingPage, sectionType);
      }
    }
    
    return updatedLandingPage;
  }

  /**
   * Generate identity information for the landing page
   * @param landingPage - Landing page to update
   */
  private async generateIdentityInfo(landingPage: LandingPageData): Promise<void> {
    this.logger.debug('Generating identity information', {
      context: 'LandingPageGenerationService',
    });
    
    const prompt = `Generate basic identity information for a professional landing page.
Include:
1. Page title (for browser tab)
2. Meta description (for search engines)
3. Professional's name
4. Tagline (short phrase describing the professional's value proposition)

Return only these four fields formatted as JSON.`;
    
    try {
      const result = await this.getBrainProtocol().processQuery(prompt, {
        userId: 'system',
        userName: 'System',
      });
      
      if (result.object) {
        const identityInfo = result.object as Partial<LandingPageData>;
        
        // Update fields with type checking
        if (typeof identityInfo.title === 'string') landingPage.title = identityInfo.title;
        if (typeof identityInfo.description === 'string') landingPage.description = identityInfo.description;
        if (typeof identityInfo.name === 'string') landingPage.name = identityInfo.name;
        if (typeof identityInfo.tagline === 'string') landingPage.tagline = identityInfo.tagline;
        
        this.logger.debug('Generated identity information', {
          context: 'LandingPageGenerationService',
          name: landingPage.name,
        });
      }
    } catch (error) {
      this.logger.error('Error generating identity information', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      // Continue with default values if generation fails
    }
  }

  /**
   * Generate content for a specific section
   * @param landingPage - Landing page to update
   * @param sectionType - Type of section to generate
   */
  private async generateSectionContent(landingPage: LandingPageData, sectionType: string): Promise<void> {
    this.logger.debug(`Generating content for section: ${sectionType}`, {
      context: 'LandingPageGenerationService',
    });
    
    // Skip if no prompt template exists for this section
    if (!this.sectionPrompts[sectionType]) {
      this.logger.warn(`No prompt template found for section: ${sectionType}`, {
        context: 'LandingPageGenerationService',
      });
      return;
    }
    
    // Get the schema for this section
    const schema = this.sectionSchemas[sectionType as keyof typeof this.sectionSchemas];
    if (!schema) {
      this.logger.warn(`No schema found for section: ${sectionType}`, {
        context: 'LandingPageGenerationService',
      });
      return;
    }
    
    try {
      // Get the prompt template for this section
      const promptTemplate = this.sectionPrompts[sectionType];
      
      // Replace placeholders in the prompt
      const prompt = promptTemplate
        .replace(/\{\{name\}\}/g, landingPage.name)
        .replace(/\{\{tagline\}\}/g, landingPage.tagline);
      
      // Generate content for this section using the appropriate schema
      const result = await this.getBrainProtocol().processQuery(prompt, {
        userId: 'system',
        userName: 'System',
        schema: schema,
      });
      
      if (result.object) {
        // Get the current section
        const sectionKey = sectionType as keyof LandingPageData;
        const currentSection = landingPage[sectionKey];
        
        if (currentSection) {
          // Parse the generated content with the section schema
          // Convert to objects before spreading to satisfy TypeScript
          const currentSectionObj = typeof currentSection === 'object' && currentSection !== null ? currentSection : {};
          const resultObj = typeof result.object === 'object' && result.object !== null ? result.object : {};
          
          const validatedContent = schema.parse({
            ...currentSectionObj,
            ...resultObj,
          });
          
          // Update the landing page with the validated content
          // Use a type assertion to treat the validated content as part of the landing page
          (landingPage as Partial<LandingPageData>)[sectionKey] = validatedContent;
          
          this.logger.debug(`Generated content for section: ${sectionType}`, {
            context: 'LandingPageGenerationService',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error generating content for section: ${sectionType}`, {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      // Continue with other sections even if one fails
    }
  }

  /**
   * Perform holistic editing on the generated landing page to ensure consistency
   * @param landingPage - Generated landing page data
   */
  private async performHolisticEditing(landingPage: LandingPageData): Promise<LandingPageData> {
    this.logger.info('Performing holistic editing of landing page content', {
      context: 'LandingPageGenerationService',
    });
    
    // Just perform the content review without quality assessment
    return await this.performFinalContentReview(landingPage);
  }

  /**
   * Assess and improve all sections of the landing page
   * @param landingPage - Generated landing page data
   */
  private async assessAndImproveSections(landingPage: LandingPageData): Promise<LandingPageData> {
    this.logger.debug('Starting section quality assessment', {
      context: 'LandingPageGenerationService',
    });
    
    const assessedLandingPage = { ...landingPage };
    
    // Process each section with quality assessment
    for (const sectionType of Object.keys(landingPage)) {
      // Skip non-section properties
      if (['title', 'description', 'name', 'tagline', 'sectionOrder'].includes(sectionType)) {
        continue;
      }
      
      // Get the section content
      const sectionKey = sectionType as keyof LandingPageData;
      const section = landingPage[sectionKey];
      
      // Skip if section doesn't exist
      if (!section) {
        continue;
      }
      
      const schema = this.sectionSchemas[sectionType as keyof typeof this.sectionSchemas];
      if (!schema) {
        continue;
      }
      
      this.logger.debug(`Processing section with quality assessment: ${sectionType}`, {
        context: 'LandingPageGenerationService',
      });
      
      try {
        // Process the section with quality assessment
        const assessedSection = await this.sectionQualityService.processSectionWithQualityAssessment(
          sectionType,
          section,
        );
        
        // Store the assessed section for later use
        this.assessedSections[sectionType] = assessedSection;
        
        if (assessedSection.content) {
          // Validate the improved content with the section schema
          const validatedContent = schema.parse(assessedSection.content);
          
          // Update the landing page with the validated content
          // Use a type assertion to treat the validated content as part of the landing page
          (assessedLandingPage as Partial<LandingPageData>)[sectionKey] = validatedContent;
          
          // Update the enabled status based on the assessment
          if (assessedSection.assessment && 'enabled' in validatedContent) {
            (validatedContent as unknown as { enabled: boolean }).enabled = assessedSection.assessment.enabled;
          }
        }
      } catch (error) {
        this.logger.error(`Error assessing section: ${sectionType}`, {
          error: error instanceof Error ? error.message : String(error),
          context: 'LandingPageGenerationService',
        });
        // Continue with other sections even if one fails
      }
    }
    
    return assessedLandingPage;
  }

  /**
   * Build section order based on enabled sections
   * @param landingPage - Assessed landing page data
   */
  private buildSectionOrderFromEnabledSections(landingPage: LandingPageData): string[] {
    // Start with the original section order
    const newSectionOrder: string[] = [];
    
    // Include only sections that are enabled or required
    for (const sectionType of landingPage.sectionOrder) {
      const sectionKey = sectionType as keyof LandingPageData;
      const section = landingPage[sectionKey];
      
      if (!section) {
        continue;
      }
      
      const isRequired = REQUIRED_SECTION_TYPES.includes(sectionType);
      // Check if section is an object and has enabled property
      const sectionEnabled = (typeof section === 'object' && section !== null && 'enabled' in section) 
        ? (section as unknown as { enabled: boolean }).enabled === true 
        : true;
      
      if (isRequired || sectionEnabled) {
        newSectionOrder.push(sectionType);
      }
    }
    
    return newSectionOrder;
  }

  /**
   * Perform a final content review for overall consistency
   * This is part of the holistic editing phase without quality assessment
   * 
   * @param landingPage - Generated landing page data
   */
  private async performFinalContentReview(landingPage: LandingPageData): Promise<LandingPageData> {
    this.logger.debug('Performing holistic content review and editing', {
      context: 'LandingPageGenerationService',
    });
    
    try {
      // Create a prompt with the current landing page content
      const prompt = contentReviewPrompt
        .replace('{{CONTENT_TO_REVIEW}}', JSON.stringify(landingPage, null, 2));
      
      // Process the review
      const result = await this.getBrainProtocol().processQuery(prompt, {
        userId: 'system',
        userName: 'System',
        schema: LandingPageSchema,
      });
      
      // Return the reviewed landing page if successful
      if (result.object) {
        // Validate with the schema
        return LandingPageSchema.parse(result.object);
      }
      
      // If no object is returned, return the original
      return landingPage;
    } catch (error) {
      this.logger.error('Error during holistic content review', {
        error: error instanceof Error ? error.message : String(error),
        context: 'LandingPageGenerationService',
      });
      
      // Return the original if there's an error
      return landingPage;
    }
  }

  /**
   * Get the Brain Protocol instance used for AI operations
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