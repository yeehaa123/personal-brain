import { mock } from 'bun:test';
import type { z } from 'zod';

import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import { SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import type { 
  SectionGenerationOptions, 
  SectionGenerationResult,
} from '@/contexts/website/types/landingPageTypes';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';

/**
 * Mock implementation of SectionGenerationService
 * Follows the Component Interface Standardization pattern
 */
export class MockSectionGenerationService {
  private static instance: MockSectionGenerationService | null = null;
  private brainProtocol: BrainProtocol | null = null;
  
  // Mock methods
  public generateSection = mock(async <T>(
    landingPage: LandingPageData,
    sectionType: string,
    _promptTemplate: string,
    _schema: z.ZodSchema,
    _identity: WebsiteIdentityData,
    options?: SectionGenerationOptions,
  ): Promise<SectionGenerationResult<T>> => {
    // Generate mock result based on section type
    const isRetry = options?.isRetry || false;
    
    // Create mock content based on section type
    let mockContent: Record<string, unknown> = {};
    
    switch (sectionType) {
    case 'hero':
      mockContent = {
        headline: isRetry ? 'Retry Hero Headline' : 'New Hero Headline',
        subheading: isRetry ? 'Retry Hero Subheading' : 'New Hero Subheading',
        ctaText: isRetry ? 'Retry CTA Text' : 'New CTA Text',
        ctaLink: isRetry ? '#retry-link' : '#new-link',
        enabled: true,
      };
      break;
    case 'services':
      mockContent = {
        title: isRetry ? 'Retry Services Title' : 'New Services Title',
        items: [
          { title: 'Service 1', description: 'Service 1 description' },
          { title: 'Service 2', description: 'Service 2 description' },
        ],
      };
      break;
    default:
      mockContent = {
        title: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Title`,
        content: `${sectionType} content`,
        enabled: true,
      };
    }
    
    // Update the landing page with mock content
    if (landingPage && sectionType in landingPage) {
      (landingPage as Record<string, unknown>)[sectionType] = mockContent;
    }
    
    // Return success result
    return {
      status: SectionGenerationStatus.Completed,
      data: mockContent as unknown as T,
      retryCount: isRetry ? 1 : 0,
      duration: 123,
    };
  });
  
  public applyFallbackContent = mock((
    landingPage: LandingPageData,
    sectionType: string,
  ): unknown => {
    // Create mock fallback content based on section type
    let fallbackContent: Record<string, unknown> = {};
    
    switch (sectionType) {
    case 'hero':
      fallbackContent = {
        headline: 'Fallback Hero Headline',
        subheading: 'Fallback hero subheading',
        ctaText: 'Contact Us',
        ctaLink: '#contact',
        enabled: false,
      };
      break;
    case 'services':
      fallbackContent = {
        title: 'Our Services',
        items: [{ title: 'Service Example', description: 'Service description placeholder' }],
        enabled: false,
      };
      break;
    default:
      fallbackContent = {
        title: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}`,
        content: `This is a placeholder for ${sectionType} content`,
        enabled: false,
      };
    }
    
    // Update the landing page with fallback content
    if (landingPage && sectionType in landingPage) {
      (landingPage as Record<string, unknown>)[sectionType] = fallbackContent;
    }
    
    return fallbackContent;
  });
  
  /**
   * Get the Brain Protocol instance
   */
  public getBrainProtocol(): BrainProtocol {
    if (!this.brainProtocol) {
      this.brainProtocol = {} as BrainProtocol;
    }
    return this.brainProtocol;
  }
  
  /**
   * Set the Brain Protocol instance
   */
  public setBrainProtocol(protocol: BrainProtocol): void {
    this.brainProtocol = protocol;
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): MockSectionGenerationService {
    if (!MockSectionGenerationService.instance) {
      MockSectionGenerationService.instance = new MockSectionGenerationService();
    }
    return MockSectionGenerationService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  static resetInstance(): void {
    MockSectionGenerationService.instance = null;
  }
  
  /**
   * Create fresh instance
   */
  static createFresh(): MockSectionGenerationService {
    return new MockSectionGenerationService();
  }
}

export default MockSectionGenerationService;