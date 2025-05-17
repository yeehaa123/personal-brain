import type { 
  WebsiteIdentityData,
} from '@/contexts/website/schemas/websiteIdentitySchema';
import type { 
  WebsiteIdentityService,
  WebsiteIdentityServiceConfig,
  WebsiteIdentityServiceDependencies,
} from '@/contexts/website/services/websiteIdentityService';
import type { Profile } from '@/models/profile';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import { Logger } from '@/utils/logger';

/**
 * Mock implementation of WebsiteIdentityService
 * Follows the Component Interface Standardization pattern with getInstance/resetInstance/createFresh
 */
export class MockWebsiteIdentityService {
  private static instance: MockWebsiteIdentityService | null = null;
  
  // Required properties from the interface
  protected logger = Logger.getInstance();
  private brainProtocol: BrainProtocol | null = null;
  
  // Mock identity data
  private identityData: WebsiteIdentityData = {
    name: 'Test User',
    email: 'test@example.com',
    company: 'Test Company',
    location: 'San Francisco, CA',
    occupation: 'Software Developer',
    industry: 'Technology',
    yearsExperience: 10,
    
    title: 'Test User - Software Development Expert',
    description: 'Professional software development services provided by Test User at Test Company.',
    tagline: 'Crafting elegant solutions to complex problems',
    keyAchievements: ['Achievement 1', 'Achievement 2'],
    pitch: 'I help businesses develop scalable and maintainable software solutions.',
    uniqueValue: 'A unique blend of technical expertise and business understanding.',
    
    formality: 'professional',
    personality: ['knowledgeable', 'trustworthy', 'precise'],
    emotion: 'confident',
    
    writingStyle: 'Clear and straightforward with a focus on technical accuracy',
    sentenceLength: 'varied',
    vocabLevel: 'moderate',
    useJargon: false,
    useHumor: false,
    useStories: true,
    
    coreValues: ['quality', 'efficiency', 'reliability'],
    targetAudience: ['businesses', 'startups', 'enterprises'],
    painPoints: ['complex development needs', 'technical debt', 'scalability challenges'],
    desiredAction: 'Contact Test User for professional software development services',
  };
  
  // Flag to control whether getIdentity should succeed
  private shouldSucceed = true;
  private shouldThrowProfileError = false;
  
  constructor(
    _config: WebsiteIdentityServiceConfig = {},
    dependencies?: Partial<WebsiteIdentityServiceDependencies>,
  ) {
    // Only set brainProtocol from dependencies, ignore the rest
    this.brainProtocol = dependencies?.brainProtocol ?? null;
  }
  
  // Mock methods
  // Service method that returns a result object
  public async getWebsiteIdentity(forceRegenerate = false): Promise<{
    success: boolean;
    message: string;
    data?: WebsiteIdentityData;
  }> {
    if (!this.shouldSucceed) {
      return {
        success: false,
        message: 'Mock identity generation failed',
      };
    }
    
    // If not forcing regeneration and we have existing identity data
    if (!forceRegenerate) {
      // Return a copy of the identity data
      return {
        success: true,
        message: 'Identity retrieved',
        data: { ...this.identityData },
      };
    }
    
    // Otherwise generate new identity
    return this.generateWebsiteIdentity();
  }
  
  // New simplified getIdentity method
  public async getIdentity(_forceRegenerate = false): Promise<WebsiteIdentityData> {
    if (!this.shouldSucceed) {
      throw new Error('Mock identity retrieval failed');
    }
    
    // Return a copy of the identity data
    return { ...this.identityData };
  }
  
  // New simplified generateIdentity method  
  public async generateIdentity(): Promise<WebsiteIdentityData> {
    if (!this.shouldSucceed) {
      throw new Error('Mock identity generation failed');
    }
    
    // Generate and return new identity
    return { ...this.identityData };
  }
  
  // Service method that returns a result object
  public async generateWebsiteIdentity(): Promise<{
    success: boolean;
    message: string;
    data?: WebsiteIdentityData;
  }> {
    if (!this.shouldSucceed) {
      return {
        success: false,
        message: 'Mock identity generation failed',
      };
    }
    
    try {
      // Get profile data - we don't need to use it in the mock
      await this.getProfileData();
      
      // If successful, return identity data
      return {
        success: true,
        message: 'Identity generated',
        data: { ...this.identityData },
      };
    } catch (error) {
      return {
        success: false,
        message: `Identity generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  private async getProfileData(): Promise<Profile> {
    if (this.shouldThrowProfileError) {
      throw new Error('Failed to get profile data');
    }
    
    // Get profile data - this is always successful in the mock
    // unless shouldThrowProfileError is true
    const profile = {
      displayName: 'Test User',
      email: 'test@example.com',
      id: 'test-profile',
      headline: 'Software Developer',
      summary: 'Experienced developer with a focus on web technologies',
      tags: ['developer', 'software', 'web'],
    };
    
    return profile;
  }
  
  public getBrainProtocol(): BrainProtocol {
    if (!this.brainProtocol) {
      throw new Error('BrainProtocol is not available');
    }
    return this.brainProtocol as BrainProtocol;
  }
  
  public setBrainProtocol(protocol: BrainProtocol): void {
    this.brainProtocol = protocol;
  }
  
  /**
   * Control whether mock operations succeed or fail
   */
  setShouldSucceed(shouldSucceed: boolean): void {
    this.shouldSucceed = shouldSucceed;
  }
  
  /**
   * Set whether profile data retrieval should fail
   */
  setShouldThrowProfileError(shouldThrow: boolean): void {
    this.shouldThrowProfileError = shouldThrow;
  }
  
  /**
   * Set identity data for testing
   */
  setIdentityData(data: WebsiteIdentityData): void {
    this.identityData = data;
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(
    config: WebsiteIdentityServiceConfig = {},
    dependencies?: Partial<WebsiteIdentityServiceDependencies>,
  ) {
    if (!MockWebsiteIdentityService.instance) {
      MockWebsiteIdentityService.instance = new MockWebsiteIdentityService(config, dependencies);
    }
    return MockWebsiteIdentityService.instance as unknown as WebsiteIdentityService;
  }
  
  /**
   * Reset singleton instance
   */
  static resetInstance(): void {
    MockWebsiteIdentityService.instance = null;
  }
  
  /**
   * Create fresh instance
   */
  static createFresh(
    config: WebsiteIdentityServiceConfig = {},
    dependencies?: Partial<WebsiteIdentityServiceDependencies>,
  ) {
    return new MockWebsiteIdentityService(config, dependencies) as unknown as WebsiteIdentityService;
  }
}

export default MockWebsiteIdentityService;