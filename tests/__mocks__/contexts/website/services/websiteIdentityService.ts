import { mock } from 'bun:test';

// Import direct types we need
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';

/**
 * Mock implementation of WebsiteIdentityService
 * Follows the Component Interface Standardization pattern
 */
export class MockWebsiteIdentityService {
  private static instance: MockWebsiteIdentityService | null = null;
  
  // Mock identity data
  private identityData: WebsiteIdentityData = {
    personalData: {
      name: 'Test User',
      email: 'test@example.com',
      company: 'Test Company',
      occupation: 'Software Developer',
    },
    creativeContent: {
      title: 'Test User - Software Development Expert',
      description: 'Professional software development services provided by Test User at Test Company.',
      tagline: 'Crafting elegant solutions to complex problems',
      keyAchievements: ['Achievement 1', 'Achievement 2'],
      pitch: 'I help businesses develop scalable and maintainable software solutions.',
      uniqueValue: 'A unique blend of technical expertise and business understanding.',
    },
    brandIdentity: {
      tone: {
        formality: 'professional',
        personality: ['knowledgeable', 'trustworthy', 'precise'],
        emotion: 'confident',
      },
      contentStyle: {
        writingStyle: 'Clear and straightforward with a focus on technical accuracy',
        sentenceLength: 'varied',
        vocabLevel: 'moderate',
        useJargon: false,
        useHumor: false,
        useStories: true,
      },
      values: {
        coreValues: ['quality', 'efficiency', 'reliability'],
        targetAudience: ['businesses', 'startups', 'enterprises'],
        painPoints: ['complex development needs', 'technical debt', 'scalability challenges'],
        desiredAction: 'Contact Test User for professional software development services',
      },
    }
  };
  
  // Mock methods
  public getIdentity = mock(async (forceRegenerate = false): Promise<WebsiteIdentityData | null> => {
    if (forceRegenerate) {
      // Create a new instance with the current time to simulate regeneration
      return {
        ...this.identityData
      };
    }
    return { ...this.identityData };
  });
  
  public generateIdentity = mock(async (): Promise<WebsiteIdentityData> => {
    // Create a new instance to simulate generation
    return {
      ...this.identityData
    };
  });
  
  public updateIdentity = mock(async (
    updates: Partial<WebsiteIdentityData>,
    shallow = false
  ): Promise<WebsiteIdentityData | null> => {
    if (shallow) {
      // For shallow updates, replace sections completely
      const updatedIdentity = { ...this.identityData };
      
      if (updates.personalData) {
        updatedIdentity.personalData = { ...updates.personalData };
      }
      
      if (updates.creativeContent) {
        updatedIdentity.creativeContent = { ...updates.creativeContent };
      }
      
      if (updates.brandIdentity) {
        updatedIdentity.brandIdentity = { ...updates.brandIdentity };
      }
      
      // We no longer track updatedAt timestamp
      return updatedIdentity;
    } else {
      // For deep updates, merge properties
      const updatedIdentity = { ...this.identityData };
      
      if (updates.personalData) {
        updatedIdentity.personalData = { ...updatedIdentity.personalData, ...updates.personalData };
      }
      
      if (updates.creativeContent) {
        updatedIdentity.creativeContent = { ...updatedIdentity.creativeContent, ...updates.creativeContent };
      }
      
      if (updates.brandIdentity) {
        const brandIdentity = { ...updatedIdentity.brandIdentity };
        
        if (updates.brandIdentity.tone) {
          brandIdentity.tone = { ...brandIdentity.tone, ...updates.brandIdentity.tone };
        }
        
        if (updates.brandIdentity.contentStyle) {
          brandIdentity.contentStyle = { 
            ...brandIdentity.contentStyle, 
            ...updates.brandIdentity.contentStyle 
          };
        }
        
        if (updates.brandIdentity.values) {
          brandIdentity.values = { ...brandIdentity.values, ...updates.brandIdentity.values };
        }
        
        updatedIdentity.brandIdentity = brandIdentity;
      }
      
      // We no longer track updatedAt timestamp
      return updatedIdentity;
    }
  });
  
  public getBrainProtocol = mock((): BrainProtocol => {
    return {} as BrainProtocol;
  });
  
  public setBrainProtocol = mock((_brainProtocol: BrainProtocol): void => {
    // Mock implementation
  });
  
  /**
   * Set identity data for testing
   */
  setIdentityData(data: WebsiteIdentityData): void {
    this.identityData = data;
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): MockWebsiteIdentityService {
    if (!MockWebsiteIdentityService.instance) {
      MockWebsiteIdentityService.instance = new MockWebsiteIdentityService();
    }
    return MockWebsiteIdentityService.instance;
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
  static createFresh(): MockWebsiteIdentityService {
    return new MockWebsiteIdentityService();
  }
}

export default MockWebsiteIdentityService;