/**
 * WebsiteIdentityService
 * 
 * Service for managing website identity information which is used
 * to maintain consistent branding and content across the website.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { ProfileContext } from '@/contexts/profiles';
import { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';
import type { Profile } from '@/models/profile';

import { WebsiteIdentityNoteAdapter } from '../adapters/websiteIdentityNoteAdapter';
import {
  WebsiteIdentitySchema,
  CreativeContentSchema,
  BrandIdentitySchema,
  type WebsiteIdentityData,
  type PersonalData,
  type CreativeContent,
  type BrandIdentity
} from '../schemas/websiteIdentitySchema';

// Import prompt templates
import creativeContentPrompt from './prompts/identity/creative-content.txt';
import brandIdentityPrompt from './prompts/identity/brand-identity.txt';

/**
 * Configuration options for WebsiteIdentityService
 */
export interface WebsiteIdentityServiceConfig {
  /** Custom configuration properties */
  [key: string]: unknown;
}

/**
 * Dependencies for WebsiteIdentityService
 */
export interface WebsiteIdentityServiceDependencies {
  /** Profile context for accessing profile data */
  profileContext: ProfileContext;
  /** Identity adapter for storage */
  identityAdapter: WebsiteIdentityNoteAdapter;
  /** Brain protocol for AI operations */
  brainProtocol?: BrainProtocol;
}

/**
 * Service for managing website identity information
 */
export class WebsiteIdentityService {
  /** The singleton instance */
  private static instance: WebsiteIdentityService | null = null;
  
  /** Logger instance */
  private readonly logger = Logger.getInstance();
  
  /** Dependencies */
  private readonly profileContext: ProfileContext;
  private readonly identityAdapter: WebsiteIdentityNoteAdapter;
  private brainProtocol: BrainProtocol | null = null;
  
  /**
   * Create a new WebsiteIdentityService
   * @param config Configuration options
   * @param dependencies Service dependencies
   */
  constructor(
    _config: WebsiteIdentityServiceConfig = {},
    dependencies: WebsiteIdentityServiceDependencies,
  ) {
    this.profileContext = dependencies.profileContext;
    this.identityAdapter = dependencies.identityAdapter;
    this.brainProtocol = dependencies.brainProtocol || null;
    
    this.logger.debug('WebsiteIdentityService initialized', {
      context: 'WebsiteIdentityService',
    });
  }
  
  /**
   * Get the singleton instance of WebsiteIdentityService
   * @param config Configuration options
   * @param dependencies Optional dependencies (will use defaults if not provided)
   */
  public static getInstance(
    config: WebsiteIdentityServiceConfig = {},
    dependencies?: Partial<WebsiteIdentityServiceDependencies>,
  ): WebsiteIdentityService {
    if (!WebsiteIdentityService.instance) {
      // Create default dependencies if needed
      const defaultDependencies: WebsiteIdentityServiceDependencies = {
        profileContext: ProfileContext.getInstance(),
        identityAdapter: WebsiteIdentityNoteAdapter.getInstance(),
      };
      
      // Merge with provided dependencies
      const mergedDependencies = {
        ...defaultDependencies,
        ...dependencies,
      };
      
      WebsiteIdentityService.instance = new WebsiteIdentityService(config, mergedDependencies);
    }
    
    return WebsiteIdentityService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    WebsiteIdentityService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * @param config Configuration options
   * @param dependencies Service dependencies
   */
  public static createFresh(
    config: WebsiteIdentityServiceConfig = {},
    dependencies?: Partial<WebsiteIdentityServiceDependencies>,
  ): WebsiteIdentityService {
    // Create default dependencies if needed
    const defaultDependencies: WebsiteIdentityServiceDependencies = {
      profileContext: ProfileContext.getInstance(),
      identityAdapter: WebsiteIdentityNoteAdapter.getInstance(),
    };
    
    // Merge with provided dependencies
    const mergedDependencies = {
      ...defaultDependencies,
      ...dependencies,
    };
    
    return new WebsiteIdentityService(config, mergedDependencies);
  }
  
  /**
   * Get current identity data or generate if not exists
   * @param forceRegenerate Whether to force regeneration of identity data
   */
  async getIdentity(forceRegenerate = false): Promise<WebsiteIdentityData | null> {
    try {
      // If not forcing regeneration, try to get existing identity data
      if (!forceRegenerate) {
        const existingIdentity = await this.identityAdapter.getIdentityData();
        if (existingIdentity) {
          this.logger.debug('Retrieved existing identity data', {
            context: 'WebsiteIdentityService',
          });
          return existingIdentity;
        }
      }
      
      // No existing identity or forcing regeneration, generate new identity
      this.logger.info('Generating new website identity', {
        context: 'WebsiteIdentityService',
        forceRegenerate,
      });
      
      return this.generateIdentity();
    } catch (error) {
      this.logger.error('Error getting identity', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteIdentityService',
      });
      return null;
    }
  }
  
  /**
   * Generate a new identity based on profile data
   * @returns The generated identity data
   */
  async generateIdentity(): Promise<WebsiteIdentityData> {
    // Get profile data
    const profile = await this.profileContext.getProfile();
    
    if (!profile) {
      // Create default identity if no profile exists
      this.logger.debug('No profile found, creating default identity', {
        context: 'WebsiteIdentityService',
      });
      return this.createDefaultIdentity();
    }
    
    // Extract personal data from profile
    const personalData = this.extractPersonalDataFromProfile(profile);
    
    // Generate creative content using BrainProtocol
    const creativeContent = await this.generateCreativeContent(personalData);
    
    // Generate brand identity using BrainProtocol
    const brandIdentity = await this.generateBrandIdentity(personalData, creativeContent);
    
    // Combine into identity data
    const identityData: WebsiteIdentityData = {
      personalData,
      creativeContent,
      brandIdentity
    };
    
    // Validate with schema
    const validatedData = WebsiteIdentitySchema.parse(identityData);
    
    // Save to storage
    await this.identityAdapter.saveIdentityData(validatedData);
    
    this.logger.info('Successfully generated and saved identity data', {
      context: 'WebsiteIdentityService',
    });
    
    return validatedData;
  }
  
  /**
   * Update identity data with partial new data
   * @param updates Partial updates to apply to identity data
   * @param shallow Whether to do a shallow merge (default: false)
   */
  async updateIdentity(
    updates: Partial<WebsiteIdentityData>,
    shallow = false
  ): Promise<WebsiteIdentityData | null> {
    try {
      // Get current identity data
      const current = await this.identityAdapter.getIdentityData();
      if (!current) {
        this.logger.warn('No existing identity to update, generating new one', {
          context: 'WebsiteIdentityService',
        });
        
        // If no current identity, generate a new one with the updates merged in
        const defaultIdentity = await this.generateIdentity();
        return this.mergeIdentityData(defaultIdentity, updates, shallow);
      }
      
      // Merge current with updates
      const updated = this.mergeIdentityData(current, updates, shallow);
      
      // Save updated identity
      const success = await this.identityAdapter.saveIdentityData(updated);
      
      if (!success) {
        throw new Error('Failed to save updated identity data');
      }
      
      this.logger.info('Successfully updated identity data', {
        context: 'WebsiteIdentityService',
      });
      
      return updated;
    } catch (error) {
      this.logger.error('Error updating identity', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteIdentityService',
      });
      return null;
    }
  }
  
  /**
   * Extract personal data from profile
   * @param profile The user profile
   */
  private extractPersonalDataFromProfile(profile: Profile): PersonalData {
    // Extract what we can from the profile directly
    return {
      name: profile.fullName || 'Professional User',
      email: 'contact@example.com', // Default email
      company: undefined, // We don't have this field directly in Profile
      occupation: undefined, // We don't have this field directly in Profile
      industry: undefined, // We don't have this field in Profile
      yearsExperience: undefined, // We don't have this field in Profile
      location: profile.city ? 
        [profile.city, profile.state]
          .filter(Boolean)
          .join(', ') : 
        undefined
    };
  }
  
  /**
   * Generate creative content for website identity
   * @param personalData Personal data to use as input
   */
  async generateCreativeContent(personalData: PersonalData): Promise<CreativeContent> {
    this.logger.debug('Generating creative content', {
      context: 'WebsiteIdentityService',
    });
    
    // Prepare prompt with replacements
    let prompt = creativeContentPrompt
      .replace('{{name}}', personalData.name)
      .replace('{{company}}', personalData.company ? ` from ${personalData.company}` : '')
      .replace('{{occupation}}', personalData.occupation ? ` who is a ${personalData.occupation}` : '');
    
    try {
      const result = await this.getBrainProtocol().processQuery(prompt, {
        userId: 'system',
        userName: 'System',
        schema: CreativeContentSchema, // Pass the schema for validation
      });
      
      if (result.object) {
        // Type check and ensure all required fields
        const generatedContent = result.object as Partial<CreativeContent>;
        
        const content: CreativeContent = {
          title: typeof generatedContent.title === 'string' ? 
            generatedContent.title : 
            `${personalData.name} - ${personalData.occupation || 'Professional Services'}`,
          
          description: typeof generatedContent.description === 'string' ? 
            generatedContent.description : 
            `Professional services provided by ${personalData.name}${personalData.company ? ` at ${personalData.company}` : ''}.`,
          
          tagline: typeof generatedContent.tagline === 'string' ? 
            generatedContent.tagline : 
            'Expert solutions for your needs',
          
          pitch: typeof generatedContent.pitch === 'string' ? 
            generatedContent.pitch : 
            undefined,
          
          uniqueValue: typeof generatedContent.uniqueValue === 'string' ? 
            generatedContent.uniqueValue : 
            undefined,
          
          keyAchievements: Array.isArray(generatedContent.keyAchievements) ? 
            generatedContent.keyAchievements : 
            []
        };
        
        this.logger.debug('Generated creative content', {
          context: 'WebsiteIdentityService',
        });
        
        return content;
      }
    } catch (error) {
      this.logger.error('Error generating creative content', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteIdentityService',
      });
    }
    
    // Return fallback/default creative content
    return {
      title: `${personalData.name} - ${personalData.occupation || 'Professional Services'}`,
      description: `Professional services provided by ${personalData.name}${personalData.company ? ` at ${personalData.company}` : ''}.`,
      tagline: 'Expert solutions for your needs',
      keyAchievements: []
    };
  }
  
  /**
   * Generate brand identity for consistent content generation
   * @param personalData Personal data to use as input
   * @param creativeContent Creative content to use as input
   */
  async generateBrandIdentity(
    personalData: PersonalData,
    creativeContent: CreativeContent
  ): Promise<BrandIdentity> {
    this.logger.debug('Generating brand identity', {
      context: 'WebsiteIdentityService',
    });
    
    // Prepare prompt with replacements
    let prompt = brandIdentityPrompt
      .replace('{{name}}', personalData.name)
      .replace('{{occupation}}', personalData.occupation ? `, a ${personalData.occupation}` : '')
      .replace('{{tagline}}', creativeContent.tagline)
      .replace('{{pitch}}', creativeContent.pitch ? `Their pitch is: "${creativeContent.pitch}"` : '')
      .replace('{{uniqueValue}}', creativeContent.uniqueValue ? `Their unique value is: "${creativeContent.uniqueValue}"` : '');
    
    try {
      const result = await this.getBrainProtocol().processQuery(prompt, {
        userId: 'system',
        userName: 'System',
        schema: BrandIdentitySchema, // Pass the schema for validation
      });
      
      if (result.object) {
        // Type check and build brand identity with fallbacks
        const generatedIdentity = result.object as Partial<BrandIdentity>;
        const defaultIdentity = this.createDefaultBrandIdentity(personalData);
        
        // Check for required nested objects
        const tone = generatedIdentity.tone || defaultIdentity.tone;
        const contentStyle = generatedIdentity.contentStyle || defaultIdentity.contentStyle;
        const values = generatedIdentity.values || defaultIdentity.values;
        
        const identity: BrandIdentity = {
          tone: {
            formality: tone.formality || defaultIdentity.tone.formality,
            personality: Array.isArray(tone.personality) ? tone.personality : defaultIdentity.tone.personality,
            emotion: tone.emotion || defaultIdentity.tone.emotion
          },
          contentStyle: {
            writingStyle: contentStyle.writingStyle || defaultIdentity.contentStyle.writingStyle,
            sentenceLength: contentStyle.sentenceLength || defaultIdentity.contentStyle.sentenceLength,
            vocabLevel: contentStyle.vocabLevel || defaultIdentity.contentStyle.vocabLevel,
            useJargon: typeof contentStyle.useJargon === 'boolean' ? contentStyle.useJargon : defaultIdentity.contentStyle.useJargon,
            useHumor: typeof contentStyle.useHumor === 'boolean' ? contentStyle.useHumor : defaultIdentity.contentStyle.useHumor,
            useStories: typeof contentStyle.useStories === 'boolean' ? contentStyle.useStories : defaultIdentity.contentStyle.useStories
          },
          values: {
            coreValues: Array.isArray(values.coreValues) ? values.coreValues : defaultIdentity.values.coreValues,
            targetAudience: Array.isArray(values.targetAudience) ? values.targetAudience : defaultIdentity.values.targetAudience,
            painPoints: Array.isArray(values.painPoints) ? values.painPoints : defaultIdentity.values.painPoints,
            desiredAction: values.desiredAction || defaultIdentity.values.desiredAction
          }
        };
        
        this.logger.debug('Generated brand identity', {
          context: 'WebsiteIdentityService',
        });
        
        return identity;
      }
    } catch (error) {
      this.logger.error('Error generating brand identity', {
        error: error instanceof Error ? error.message : String(error),
        context: 'WebsiteIdentityService',
      });
    }
    
    // Return fallback/default brand identity
    return this.createDefaultBrandIdentity(personalData);
  }
  
  /**
   * Create default brand identity when generation fails
   * @param personalData Personal data to use in defaults
   */
  private createDefaultBrandIdentity(personalData: PersonalData): BrandIdentity {
    return {
      tone: {
        formality: 'professional',
        personality: ['knowledgeable', 'trustworthy', 'helpful'],
        emotion: 'confident'
      },
      contentStyle: {
        writingStyle: 'Clear and straightforward with a focus on expertise',
        sentenceLength: 'varied',
        vocabLevel: 'moderate',
        useJargon: false,
        useHumor: false,
        useStories: true
      },
      values: {
        coreValues: ['expertise', 'quality', 'integrity'],
        targetAudience: ['professionals', 'businesses'],
        painPoints: ['lack of expertise', 'need for specialized knowledge'],
        desiredAction: `Contact ${personalData.name} for professional services`
      }
    };
  }
  
  /**
   * Create default identity when no profile exists
   */
  private createDefaultIdentity(): WebsiteIdentityData {
    const defaultPersonalData: PersonalData = {
      name: 'Professional Expert',
      email: 'contact@example.com'
    };
    
    return {
      personalData: defaultPersonalData,
      creativeContent: {
        title: 'Professional Services',
        description: 'Expert professional services tailored to your needs',
        tagline: 'Expert solutions for your needs',
        keyAchievements: []
      },
      brandIdentity: this.createDefaultBrandIdentity(defaultPersonalData)
    };
  }
  
  /**
   * Merge identity data with updates
   * @param current Current identity data
   * @param updates Partial updates to apply
   * @param shallow Whether to do a shallow merge
   */
  private mergeIdentityData(
    current: WebsiteIdentityData,
    updates: Partial<WebsiteIdentityData>,
    shallow = false
  ): WebsiteIdentityData {
    // Create a deep copy of current data
    const result = JSON.parse(JSON.stringify(current)) as WebsiteIdentityData;
    
    // Update top-level sections if provided
    if (updates.personalData && typeof updates.personalData === 'object') {
      if (shallow) {
        result.personalData = updates.personalData as PersonalData;
      } else {
        result.personalData = { ...result.personalData, ...updates.personalData };
      }
    }
    
    if (updates.creativeContent && typeof updates.creativeContent === 'object') {
      if (shallow) {
        result.creativeContent = updates.creativeContent as CreativeContent;
      } else {
        result.creativeContent = { ...result.creativeContent, ...updates.creativeContent };
      }
    }
    
    if (updates.brandIdentity && typeof updates.brandIdentity === 'object') {
      if (shallow) {
        result.brandIdentity = updates.brandIdentity as BrandIdentity;
      } else {
        // Deep merge for brand identity
        const currentBrand = result.brandIdentity;
        const updateBrand = updates.brandIdentity as Partial<BrandIdentity>;
        
        // Merge tone if provided
        if (updateBrand.tone && typeof updateBrand.tone === 'object') {
          result.brandIdentity.tone = { ...currentBrand.tone, ...updateBrand.tone };
        }
        
        // Merge content style if provided
        if (updateBrand.contentStyle && typeof updateBrand.contentStyle === 'object') {
          result.brandIdentity.contentStyle = { ...currentBrand.contentStyle, ...updateBrand.contentStyle };
        }
        
        // Merge values if provided
        if (updateBrand.values && typeof updateBrand.values === 'object') {
          result.brandIdentity.values = { ...currentBrand.values, ...updateBrand.values };
        }
      }
    }
    
    // We no longer track updatedAt timestamp
    
    // Validate with schema
    return WebsiteIdentitySchema.parse(result);
  }
  
  /**
   * Get the Brain Protocol instance
   */
  private getBrainProtocol(): BrainProtocol {
    if (!this.brainProtocol) {
      this.brainProtocol = BrainProtocol.getInstance();
    }
    return this.brainProtocol;
  }
  
  /**
   * Set the Brain Protocol instance (mainly for testing)
   * @param protocol The brain protocol to use
   */
  setBrainProtocol(protocol: BrainProtocol): void {
    this.brainProtocol = protocol;
  }
}