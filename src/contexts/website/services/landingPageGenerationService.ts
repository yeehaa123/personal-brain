import { z } from 'zod';

import type { Profile } from '@/models/profile';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import { 
  type EnhancedLandingPageData, 
  EnhancedLandingPageSchema,
  type LandingPageData,
  LandingPageSchema,
} from '@website/schemas';

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
  async generateLandingPageData(overrides?: Partial<EnhancedLandingPageData>): Promise<EnhancedLandingPageData> {
    try {
      // Get profile data using the messaging system
      const profile = await this.getProfileData();
      
      if (!profile) {
        throw new Error('No profile found');
      }
      
      this.logger.info('Generating enhanced landing page data from brain content', {
        context: 'LandingPageGenerationService',
      });
      
      // Execute multiple AI generations in parallel for different sections
      const [
        basicInfo,
        heroSection,
        problemStatement,
        servicesSection,
        processSection,
        testimonialsSection,
        expertiseSection,
        aboutSection,
        faqSection,
        ctaSection,
        footerSection,
      ] = await Promise.all([
        this.generateBasicLandingPageInfo(),
        this.generateHeroSection(),
        this.generateProblemStatementSection(),
        this.generateServicesSection(),
        this.generateProcessSection(),
        this.generateTestimonialsSection(),
        this.generateExpertiseSection(),
        this.generateAboutSection(),
        this.generateFaqSection(),
        this.generateCtaSection(),
        this.generateFooterSection(),
      ]);
      
      // Combine all sections into a complete enhanced landing page
      const enhancedData: EnhancedLandingPageData = {
        // Basic information from the basicInfo generation
        title: basicInfo.title,
        description: 'description' in basicInfo ? (basicInfo as {description: string}).description : `Professional website for ${profile.fullName}`,
        name: basicInfo.name || profile.fullName,
        tagline: basicInfo.tagline,
        
        // Default section order - exclude any that are disabled
        sectionOrder: [
          'hero', // Always included
          ...(problemStatement.enabled ? ['problemStatement'] : []),
          'services', // Always included
          ...(processSection.enabled ? ['process'] : []),
          ...(testimonialsSection.enabled ? ['testimonials'] : []),
          ...(expertiseSection.enabled ? ['expertise'] : []),
          ...(aboutSection.enabled ? ['about'] : []),
          ...(faqSection.enabled ? ['faq'] : []),
          'cta', // Always included
          'footer', // Always included
        ],
        
        // Include all sections, some may be disabled depending on data quality
        hero: heroSection,
        services: servicesSection,
        cta: ctaSection,
        footer: footerSection,
        
        // Optional sections - only include if they're enabled
        ...(problemStatement.enabled ? { problemStatement } : {}),
        ...(processSection.enabled ? { process: processSection } : {}),
        ...(testimonialsSection.enabled ? { testimonials: testimonialsSection } : {}),
        ...(expertiseSection.enabled ? { expertise: expertiseSection } : {}),
        ...(aboutSection.enabled ? { about: aboutSection } : {}),
        ...(faqSection.enabled ? { faq: faqSection } : {}),
      };
      
      // Apply any overrides
      const result = {
        ...enhancedData,
        ...overrides,
      };
      
      // Validate with schema - this ensures the final object matches the expected structure
      const validationResult = EnhancedLandingPageSchema.safeParse(result);
      
      if (!validationResult.success) {
        this.logger.error('Enhanced landing page data failed validation', {
          errors: validationResult.error.format(),
          context: 'LandingPageGenerationService',
        });
        
        // Attempt to fix the issues by providing default values
        const fixedData = this.fixEnhancedLandingPageData(result);
        return fixedData;
      }
      
      this.logger.info('Successfully generated enhanced landing page with sections', {
        sections: result.sectionOrder,
        context: 'LandingPageGenerationService',
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error generating enhanced landing page data', { 
        error, 
        context: 'LandingPageGenerationService', 
      });
      throw error;
    }
  }
  
  /**
   * Apply fixes to invalid enhanced landing page data
   * This adds missing required fields if validation failed
   */
  private fixEnhancedLandingPageData(data: Partial<EnhancedLandingPageData>): EnhancedLandingPageData {
    // Ensure basic information
    const title = data.title || 'Professional Services';
    const name = data.name || 'Professional Consultant';
    const tagline = data.tagline || 'Expert services to help you succeed';
    const description = data.description || `Professional website for ${name}`;
    
    // Ensure hero section
    const hero = data.hero || {
      headline: title,
      subheading: tagline,
      ctaText: 'Contact Me',
      ctaLink: '#contact',
    };
    
    // Ensure services section
    const services = data.services || {
      title: 'Services',
      items: [{
        title: 'Professional Consulting',
        description: 'Expert consulting services tailored to your needs',
      }],
    };
    
    // Ensure CTA section
    const cta = data.cta || {
      title: 'Ready to Get Started?',
      subtitle: 'Let\'s discuss how I can help you achieve your goals.',
      buttonText: 'Contact Me',
      buttonLink: '#contact',
      enabled: true,
    };
    
    // Ensure footer section
    const footer = data.footer || {
      copyrightText: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
      enabled: true,
    };
    
    // Determine which sections are available and enabled
    const hasProblemStatement = data.problemStatement?.enabled === true;
    const hasProcess = data.process?.enabled === true;
    const hasTestimonials = data.testimonials?.enabled === true;
    const hasExpertise = data.expertise?.enabled === true;
    const hasAbout = data.about?.enabled === true;
    const hasFaq = data.faq?.enabled === true;
    
    // Create section order based on available and enabled sections
    const sectionOrder = [
      'hero', // Always included
      ...(hasProblemStatement ? ['problemStatement'] : []),
      'services', // Always included
      ...(hasProcess ? ['process'] : []),
      ...(hasTestimonials ? ['testimonials'] : []),
      ...(hasExpertise ? ['expertise'] : []),
      ...(hasAbout ? ['about'] : []),
      ...(hasFaq ? ['faq'] : []),
      'cta', // Always included
      'footer', // Always included
    ];
    
    // Create the fixed data with only enabled sections
    const fixedData: EnhancedLandingPageData = {
      title,
      name,
      tagline,
      description,
      sectionOrder,
      hero,
      services,
      cta,
      footer,
    };
    
    // Add optional sections only if they're present and enabled
    if (hasProblemStatement && data.problemStatement) {
      fixedData.problemStatement = data.problemStatement;
    }
    
    if (hasProcess && data.process) {
      fixedData.process = data.process;
    }
    
    if (hasTestimonials && data.testimonials) {
      fixedData.testimonials = data.testimonials;
    }
    
    if (hasExpertise && data.expertise) {
      fixedData.expertise = data.expertise;
    }
    
    if (hasAbout && data.about) {
      fixedData.about = data.about;
    }
    
    if (hasFaq && data.faq) {
      fixedData.faq = data.faq;
    }
    
    return fixedData;
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
  
  // Private method removed as part of simplification
  
  /**
   * Generate basic landing page information
   * This is the core function for generating the basic info using Zod schema validation
   */
  private async generateBasicLandingPageInfo(): Promise<LandingPageData> {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Define a schema for basic landing page info with description
    // We extend the standard LandingPageSchema with an additional description field
    const BasicLandingPageInfoSchema = LandingPageSchema.extend({
      description: z.string().optional(),
    });
    
    // Create a query prompt for generating landing page content that explicitly references the schema
    const query = `Please analyze my personal brain content and generate enhanced landing page content for my website.
    
Based on the information in my notes and profile, create:
1. A name for the landing page (can be my name or something creative)
2. A title for the browser tab and SEO (typically "[Name] - [Occupation]" but make it compelling)
3. A tagline (a short, memorable phrase that captures the essence of my work/interests)
4. A meta description (under 160 characters) that summarizes my services for SEO

Your response MUST conform to this Zod schema:
\`\`\`typescript
const BasicLandingPageInfoSchema = z.object({
  name: z.string(),
  title: z.string(), 
  tagline: z.string(),
  description: z.string().optional()
});
\`\`\`

Format your response as valid JSON matching this schema exactly, with properly escaped strings.

The output should reflect the key themes in my notes, be professional, concise, and impactful.`;

    // Use BrainProtocol to process the query
    const response = await brainProtocol.processQuery(query, {
      userId: 'system',
      userName: 'System',
    });
    
    // Extract the JSON response
    try {
      // Look for JSON object in the response text
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response');
      }

      // Extract and parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Use extended schema to validate the response structure
      const validationResult = BasicLandingPageInfoSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        // Return the validated data
        return validationResult.data;
      } else {
        // Log validation errors
        this.logger.error('AI response validation failed for basic landing page info', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        
        // Try to validate against the original schema as fallback
        const fallbackValidation = LandingPageSchema.safeParse(parsedContent);
        if (fallbackValidation.success) {
          return fallbackValidation.data;
        }
        
        throw new Error('AI response did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error parsing AI response for basic landing page info', {
        error,
        context: 'LandingPageGenerationService',
        response: response.answer,
      });
      throw new Error('Failed to parse AI-generated content');
    }
  }
  
  /**
   * Generate hero section content using Zod schema validation
   */
  private async generateHeroSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create a schema for validating hero section data
    const HeroSectionGenerationSchema = z.object({
      headline: z.string(),
      subheading: z.string(),
      ctaText: z.string(),
      ctaLink: z.string().default('#contact'),
      imageUrl: z.string().optional(),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a compelling hero section for my professional services landing page.

Generate:
1. A headline (5-10 words) that clearly communicates my value proposition
2. A subheading (15-25 words) that elaborates on my expertise and value to clients
3. Call-to-action button text (2-5 words)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const HeroSectionSchema = z.object({
  headline: z.string(),
  subheading: z.string(),
  ctaText: z.string(),
  ctaLink: z.string().default('#contact'),
  imageUrl: z.string().optional()
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

The content should be professional, focus on the services I provide, and compel visitors to continue reading.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for hero section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = HeroSectionGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        return validationResult.data;
      } else {
        this.logger.error('AI response validation failed for hero section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for hero section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating hero section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a default hero section
      return {
        headline: 'Expert Services Tailored to Your Needs',
        subheading: 'Specialized professional services to help you achieve your goals and overcome challenges.',
        ctaText: 'Get Started',
        ctaLink: '#contact',
      };
    }
  }
  
  /**
   * Generate problem statement section using Zod schema validation
   */
  private async generateProblemStatementSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create a schema for validating problem statement section data
    const ProblemStatementGenerationSchema = z.object({
      title: z.string(),
      description: z.string(),
      bulletPoints: z.array(z.string()).optional(),
      quality: z.enum(['high', 'medium', 'low']),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a problem statement section for my professional services landing page.

This section should articulate the pain points and challenges that my potential clients face, which my services can address.

Generate:
1. A title for the section (4-7 words)
2. A compelling description (2-3 paragraphs) that articulates these challenges
3. 3-5 bullet points highlighting specific problems my clients typically face

Your response MUST conform to this Zod schema:
\`\`\`typescript
const ProblemStatementSchema = z.object({
  title: z.string(),
  description: z.string(),
  bulletPoints: z.array(z.string()).optional(),
  quality: z.enum(['high', 'medium', 'low']) // Your assessment of content quality based on available data
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

The content should be empathetic, focused on the client's perspective, and prepare them to see my services as the solution.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for problem statement');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = ProblemStatementGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // Check the quality assessment from the AI
        const quality = data.quality.toLowerCase();
        
        // Only enable the section if quality is medium or high
        const enabled = quality === 'high' || quality === 'medium';
        
        return {
          title: data.title,
          description: data.description,
          bulletPoints: data.bulletPoints || [],
          enabled,
        };
      } else {
        this.logger.error('AI response validation failed for problem statement section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for problem statement section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating problem statement section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a disabled problem statement section
      return {
        title: 'Challenges You Might Be Facing',
        description: 'Many professionals encounter obstacles that can hinder progress and growth.',
        bulletPoints: ['Difficulty achieving goals', 'Challenges with limited resources', 'Navigating complex decisions'],
        enabled: false, // Disable by default since this is fallback content
      };
    }
  }
  
  /**
   * Generate services section using Zod schema validation
   */
  private async generateServicesSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schemas for validating services section data
    const ServiceItemGenerationSchema = z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
      details: z.string().optional(),
    });
    
    const ServicesGenerationSchema = z.object({
      title: z.string(),
      introduction: z.string().optional(),
      items: z.array(ServiceItemGenerationSchema),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a comprehensive services section for my professional landing page.

Generate:
1. A title for the services section
2. A brief introduction paragraph explaining my approach to services (optional)
3. 3-6 specific services I offer, each with:
   - Title (3-5 words)
   - Description (1-2 sentences)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const ServiceItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  details: z.string().optional()
});

const ServicesSchema = z.object({
  title: z.string(),
  introduction: z.string().optional(),
  items: z.array(ServiceItemSchema)
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

The services should be specific, clear, and focused on client value rather than just listing capabilities.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for services section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = ServicesGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        return validationResult.data;
      } else {
        this.logger.error('AI response validation failed for services section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for services section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating services section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return default services section with placeholder data
      return {
        title: 'Services',
        items: [
          {
            title: 'Professional Consulting',
            description: 'Expert consulting services tailored to your specific needs and challenges.',
          },
          {
            title: 'Strategic Planning',
            description: 'Develop clear, actionable strategies to achieve your organizational goals.',
          },
          {
            title: 'Implementation Support',
            description: 'Hands-on assistance to ensure successful execution of strategic initiatives.',
          },
        ],
      };
    }
  }
  
  /**
   * Generate process section using Zod schema validation
   */
  private async generateProcessSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schemas for validating process section data
    const ProcessStepGenerationSchema = z.object({
      step: z.number(),
      title: z.string(),
      description: z.string(),
    });
    
    const ProcessGenerationSchema = z.object({
      title: z.string(),
      introduction: z.string().optional(),
      steps: z.array(ProcessStepGenerationSchema),
      quality: z.enum(['high', 'medium', 'low']),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a "How I Work" process section for my professional services landing page.

Generate:
1. A title for the process section
2. A brief introduction paragraph explaining my working methodology (optional)
3. 3-5 step process with:
   - Step number
   - Step title (2-4 words)
   - Brief description of each step (1-2 sentences)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const ProcessStepSchema = z.object({
  step: z.number(),
  title: z.string(),
  description: z.string()
});

const ProcessSchema = z.object({
  title: z.string(),
  introduction: z.string().optional(),
  steps: z.array(ProcessStepSchema),
  quality: z.enum(['high', 'medium', 'low']) // Your assessment of content quality based on available data
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

Focus on a client-centered process that shows how I deliver results through a structured approach.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for process section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = ProcessGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // Check if we have enough steps (at least 3)
        const hasEnoughSteps = data.steps.length >= 3;
        
        // Check the quality assessment from the AI
        const quality = data.quality.toLowerCase();
        
        // Enable the section only if quality is sufficient and we have enough steps
        const enabled = (quality === 'high' || quality === 'medium') && hasEnoughSteps;
        
        return {
          title: data.title,
          introduction: data.introduction,
          steps: data.steps,
          enabled,
        };
      } else {
        this.logger.error('AI response validation failed for process section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for process section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating process section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a disabled process section
      return {
        title: 'My Process',
        steps: [
          {
            step: 1,
            title: 'Discovery',
            description: 'Understanding your needs and challenges through in-depth consultation.',
          },
          {
            step: 2,
            title: 'Strategy',
            description: 'Developing a customized plan tailored to your specific situation.',
          },
          {
            step: 3,
            title: 'Implementation',
            description: 'Executing the strategy with careful attention to detail and regular updates.',
          },
        ],
        enabled: false, // Disable by default since this is fallback content
      };
    }
  }
  
  // All section generators follow the same pattern with Zod schemas for validation
  
  /**
   * Generate testimonials section using Zod schema validation
   */
  private async generateTestimonialsSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schemas for validating testimonials section data
    const TestimonialItemGenerationSchema = z.object({
      quote: z.string(),
      author: z.string(),
      company: z.string().optional(),
      imageUrl: z.string().optional(),
    });
    
    const TestimonialsGenerationSchema = z.object({
      title: z.string(),
      introduction: z.string().optional(),
      items: z.array(TestimonialItemGenerationSchema),
      quality: z.enum(['high', 'medium', 'low']),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a testimonials section for my professional services landing page.

Generate:
1. A title for the testimonials section
2. An optional brief introduction (1-2 sentences about client success)
3. 2-4 client testimonials, each with:
   - A quote from the client (1-3 sentences)
   - The client's name
   - Their company/organization (if available)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const TestimonialItemSchema = z.object({
  quote: z.string(),
  author: z.string(),
  company: z.string().optional(),
  imageUrl: z.string().optional()
});

const TestimonialsSchema = z.object({
  title: z.string(),
  introduction: z.string().optional(),
  items: z.array(TestimonialItemSchema),
  quality: z.enum(['high', 'medium', 'low']) // Your assessment of content quality based on available data
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

If you don't find specific client testimonials in my notes, please generate realistic-sounding testimonials based on the services you've identified. However, rate the quality as "low" in this case to indicate these are placeholder testimonials.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for testimonials section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = TestimonialsGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // Only enable if we have at least one testimonial and quality is medium or high
        const hasTestimonials = data.items.length > 0;
        const quality = data.quality.toLowerCase();
        const enabled = hasTestimonials && (quality === 'high' || quality === 'medium');
        
        return {
          title: data.title,
          introduction: data.introduction,
          items: data.items,
          enabled,
        };
      } else {
        this.logger.error('AI response validation failed for testimonials section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for testimonials section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating testimonials section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a disabled testimonials section
      return {
        title: 'Client Testimonials',
        items: [
          {
            quote: 'The services provided exceeded my expectations. Highly recommended for anyone seeking professional assistance.',
            author: 'Client Name',
            company: 'Company Name',
          },
        ],
        enabled: false, // Disable by default since this is fallback content
      };
    }
  }
  
  /**
   * Generate expertise section using Zod schema validation
   */
  private async generateExpertiseSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schemas for validating expertise section data
    const ExpertiseItemGenerationSchema = z.object({
      title: z.string(),
      description: z.string().optional(),
    });
    
    const CredentialItemGenerationSchema = z.object({
      title: z.string(),
      issuer: z.string().optional(),
      year: z.string().optional(),
    });
    
    const ExpertiseGenerationSchema = z.object({
      title: z.string(),
      introduction: z.string().optional(),
      items: z.array(ExpertiseItemGenerationSchema),
      credentials: z.array(CredentialItemGenerationSchema).optional(),
      quality: z.enum(['high', 'medium', 'low']),
    });
    
    const query = `Based on my profile and notes in my personal brain, create an expertise section for my professional services landing page.

Generate:
1. A title for the expertise section
2. An optional brief introduction (1-2 sentences about my specializations)
3. 3-6 areas of expertise, each with:
   - Title (2-4 words)
   - Optional brief description (1 sentence)
4. Optional: 2-4 credentials/certifications, each with:
   - Title of credential
   - Optional issuing organization
   - Optional year received

Your response MUST conform to this Zod schema:
\`\`\`typescript
const ExpertiseItemSchema = z.object({
  title: z.string(),
  description: z.string().optional()
});

const CredentialItemSchema = z.object({
  title: z.string(),
  issuer: z.string().optional(),
  year: z.string().optional()
});

const ExpertiseSchema = z.object({
  title: z.string(),
  introduction: z.string().optional(),
  items: z.array(ExpertiseItemSchema),
  credentials: z.array(CredentialItemSchema).optional(),
  quality: z.enum(['high', 'medium', 'low']) // Your assessment of content quality based on available data
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

Focus on specific expertise areas rather than general skills, prioritizing specialized knowledge from my notes and profile.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for expertise section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = ExpertiseGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // Only enable if we have at least 3 expertise items and quality is medium or high
        const hasEnoughExpertise = data.items.length >= 3;
        const quality = data.quality.toLowerCase();
        const enabled = hasEnoughExpertise && (quality === 'high' || quality === 'medium');
        
        return {
          title: data.title,
          introduction: data.introduction,
          items: data.items,
          credentials: data.credentials,
          enabled,
        };
      } else {
        this.logger.error('AI response validation failed for expertise section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for expertise section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating expertise section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a disabled expertise section
      return {
        title: 'Areas of Expertise',
        items: [
          { title: 'Strategic Planning', description: 'Developing effective long-term strategies' },
          { title: 'Project Management', description: 'Overseeing complex initiatives from start to finish' },
          { title: 'Process Optimization', description: 'Improving efficiency and effectiveness of operations' },
        ],
        enabled: false, // Disable by default since this is fallback content
      };
    }
  }
  
  /**
   * Generate about section using Zod schema validation
   */
  private async generateAboutSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schema for validating about section data
    const AboutSectionGenerationSchema = z.object({
      title: z.string(),
      content: z.string(),
      imageUrl: z.string().optional(),
      quality: z.enum(['high', 'medium', 'low']),
    });
    
    const query = `Based on my profile and notes in my personal brain, create an "About Me" section for my professional services landing page.

Generate:
1. A title for the about section
2. Detailed content (2-3 paragraphs) that tells my professional story, including:
   - My background and experience
   - My approach to working with clients
   - My professional philosophy and values
3. Optional: Suggestion for an image URL if relevant information is found

Your response MUST conform to this Zod schema:
\`\`\`typescript
const AboutSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  imageUrl: z.string().optional(),
  quality: z.enum(['high', 'medium', 'low']) // Your assessment of content quality based on available data
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

The content should be professional but personable, focusing on what makes my approach unique and valuable to clients.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for about section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = AboutSectionGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // Only enable if quality is medium or high and content has sufficient length
        const hasSubstantialContent = data.content.length >= 200;
        const quality = data.quality.toLowerCase();
        const enabled = hasSubstantialContent && (quality === 'high' || quality === 'medium');
        
        return {
          title: data.title,
          content: data.content,
          imageUrl: data.imageUrl,
          enabled,
        };
      } else {
        this.logger.error('AI response validation failed for about section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for about section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating about section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a disabled about section
      return {
        title: 'About Me',
        content: 'With years of professional experience, I am dedicated to providing high-quality services to my clients. My approach combines industry knowledge with tailored solutions to address your specific needs and challenges.',
        enabled: false, // Disable by default since this is fallback content
      };
    }
  }
  
  /**
   * Generate FAQ section using Zod schema validation
   */
  private async generateFaqSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schemas for validating FAQ section data
    const FaqItemGenerationSchema = z.object({
      question: z.string(),
      answer: z.string(),
    });
    
    const FaqGenerationSchema = z.object({
      title: z.string(),
      introduction: z.string().optional(),
      items: z.array(FaqItemGenerationSchema),
      quality: z.enum(['high', 'medium', 'low']),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a FAQ section for my professional services landing page.

Generate:
1. A title for the FAQ section
2. An optional brief introduction (1 sentence)
3. 4-6 frequently asked questions, each with:
   - The question (phrased from client perspective)
   - A comprehensive answer (1-3 sentences)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string()
});

const FaqSchema = z.object({
  title: z.string(),
  introduction: z.string().optional(),
  items: z.array(FaqItemSchema),
  quality: z.enum(['high', 'medium', 'low']) // Your assessment of content quality based on available data
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

Focus on questions that address common client concerns, objections, or unclear aspects of the services. The answers should be helpful, clear, and persuasive.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for FAQ section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = FaqGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // Only enable if we have at least 3 FAQs and quality is medium or high
        const hasEnoughFaqs = data.items.length >= 3;
        const quality = data.quality.toLowerCase();
        const enabled = hasEnoughFaqs && (quality === 'high' || quality === 'medium');
        
        return {
          title: data.title,
          introduction: data.introduction,
          items: data.items,
          enabled,
        };
      } else {
        this.logger.error('AI response validation failed for FAQ section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for FAQ section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating FAQ section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a disabled FAQ section
      return {
        title: 'Frequently Asked Questions',
        items: [
          { 
            question: 'What services do you offer?', 
            answer: 'I provide a range of professional services tailored to meet your specific needs and objectives.', 
          },
          { 
            question: 'How do you typically work with clients?', 
            answer: 'I follow a structured process that begins with understanding your goals, developing a custom strategy, and implementing solutions with regular communication throughout.', 
          },
          { 
            question: 'How can I get started working with you?', 
            answer: 'Simply reach out through the contact form, and we\'ll schedule an initial consultation to discuss your needs.', 
          },
        ],
        enabled: false, // Disable by default since this is fallback content
      };
    }
  }
  
  /**
   * Generate call-to-action section using Zod schema validation
   */
  private async generateCtaSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schema for validating CTA section data
    const CtaSectionGenerationSchema = z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      buttonText: z.string(),
      buttonLink: z.string().default('#contact'),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a compelling call-to-action section for my professional services landing page.

Generate:
1. A title for the CTA section (short and action-oriented)
2. An optional subtitle to provide additional context (1 sentence)
3. Button text (2-4 words, action-oriented)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const CtaSectionSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  buttonText: z.string(),
  buttonLink: z.string().default('#contact')
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

The CTA should be persuasive, clear about the next steps, and compelling for potential clients.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for CTA section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = CtaSectionGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // CTA is always enabled as it's a critical component
        return {
          title: data.title,
          subtitle: data.subtitle,
          buttonText: data.buttonText,
          buttonLink: data.buttonLink || '#contact',
          enabled: true, // Always enabled
        };
      } else {
        this.logger.error('AI response validation failed for CTA section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for CTA section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating CTA section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a default CTA section
      return {
        title: 'Ready to Get Started?',
        subtitle: 'Let\'s discuss how I can help you achieve your goals.',
        buttonText: 'Contact Me',
        buttonLink: '#contact',
        enabled: true, // Always enabled even for fallback
      };
    }
  }
  
  /**
   * Generate footer section using Zod schema validation
   */
  private async generateFooterSection() {
    // Get the BrainProtocol instance
    const brainProtocol = this.getBrainProtocol();
    
    // Create schema for validating footer section data
    const ContactDetailsGenerationSchema = z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      social: z.array(z.object({
        platform: z.string(),
        url: z.string(),
      })).optional(),
    });
    
    const FooterSectionGenerationSchema = z.object({
      contactDetails: ContactDetailsGenerationSchema.optional(),
      copyrightText: z.string().optional(),
      links: z.array(z.object({
        text: z.string(),
        url: z.string(),
      })).optional(),
    });
    
    const query = `Based on my profile and notes in my personal brain, create a footer section for my professional services landing page.

Generate:
1. Optional contact details, including:
   - Email address
   - Phone number
   - Social media links
2. Copyright text
3. Optional footer links (such as Privacy Policy, Terms, etc.)

Your response MUST conform to this Zod schema:
\`\`\`typescript
const ContactDetailsSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  social: z.array(z.object({
    platform: z.string(),
    url: z.string()
  })).optional()
});

const FooterSectionSchema = z.object({
  contactDetails: ContactDetailsSchema.optional(),
  copyrightText: z.string().optional(),
  links: z.array(z.object({
    text: z.string(),
    url: z.string()
  })).optional()
});
\`\`\`

Format your response as valid JSON matching this schema exactly.

If you don't find specific contact information, include only the copyright text with the current year.`;
    
    try {
      // Use BrainProtocol to process the query
      const response = await brainProtocol.processQuery(query, {
        userId: 'system',
        userName: 'System',
      });
      
      // Extract JSON from response
      const responseText = response.answer.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in AI response for footer section');
      }
      
      // Parse the JSON content
      const jsonContent = jsonMatch[0];
      const parsedContent = JSON.parse(jsonContent);
      
      // Validate against our schema
      const validationResult = FooterSectionGenerationSchema.safeParse(parsedContent);
      
      if (validationResult.success) {
        const data = validationResult.data;
        
        // If no copyright text was provided, add a default one
        const copyrightText = data.copyrightText || 
          `© ${new Date().getFullYear()} All rights reserved.`;
        
        // Footer is always enabled
        return {
          contactDetails: data.contactDetails,
          copyrightText,
          links: data.links,
          enabled: true, // Always enabled
        };
      } else {
        this.logger.error('AI response validation failed for footer section', {
          errors: validationResult.error.format(),
          content: parsedContent,
          context: 'LandingPageGenerationService',
        });
        throw new Error('AI response for footer section did not match expected schema');
      }
    } catch (error) {
      this.logger.error('Error generating footer section', {
        error,
        context: 'LandingPageGenerationService',
      });
      
      // Return a default footer section
      return {
        copyrightText: `© ${new Date().getFullYear()} All rights reserved.`,
        enabled: true, // Always enabled even for fallback
      };
    }
  }
}

export default LandingPageGenerationService;