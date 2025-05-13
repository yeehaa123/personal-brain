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

// Standard content patterns for mock responses
const MOCK_CONTENT = {
  hero: {
    standard: {
      headline: 'New Hero Headline',
      subheading: 'New Hero Subheading',
      ctaText: 'New CTA Text',
      ctaLink: '#new-link',
      enabled: true,
    },
    retry: {
      headline: 'Retry Hero Headline',
      subheading: 'Retry Hero Subheading',
      ctaText: 'Retry CTA Text',
      ctaLink: '#retry-link',
      enabled: true,
    },
    fallback: {
      headline: 'Fallback Hero Headline',
      subheading: 'Fallback hero subheading',
      ctaText: 'Contact Us',
      ctaLink: '#contact',
      enabled: false,
    },
  },
  services: {
    standard: {
      title: 'New Services Title',
      items: [
        { title: 'Service 1', description: 'Service 1 description' },
        { title: 'Service 2', description: 'Service 2 description' },
      ],
    },
    fallback: {
      title: 'Our Services',
      items: [{ title: 'Service Example', description: 'Service description placeholder' }],
      enabled: false,
    },
  },
};

/**
 * Mock implementation of SectionGenerationService
 * Follows the Component Interface Standardization pattern with simplified logic
 */
export class MockSectionGenerationService {
  private static instance: MockSectionGenerationService | null = null;
  private brainProtocol: BrainProtocol | null = null;
  
  // Generate section mock with simplified content selection
  public generateSection = mock(async <T>(
    landingPage: LandingPageData,
    sectionType: string,
    _promptTemplate: string,
    _schema: z.ZodSchema,
    _identity: WebsiteIdentityData,
    options?: SectionGenerationOptions,
  ): Promise<SectionGenerationResult<T>> => {
    const isRetry = options?.isRetry || false;
    const contentType = isRetry ? 'retry' : 'standard';
    
    // Select content based on section type and whether it's a retry
    const mockContent = sectionType === 'hero' 
      ? MOCK_CONTENT.hero[contentType] 
      : sectionType === 'services'
        ? MOCK_CONTENT.services.standard
        : {
          title: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Title`,
          content: `${sectionType} content`,
          enabled: true,
        };
    
    // Update the landing page with mock content
    if (landingPage && sectionType in landingPage) {
      (landingPage as Record<string, unknown>)[sectionType] = mockContent;
    }
    
    return {
      status: SectionGenerationStatus.Completed,
      data: mockContent as unknown as T,
      retryCount: isRetry ? 1 : 0,
      duration: 123,
    };
  });
  
  // Apply fallback content with simplified selection
  public applyFallbackContent = mock((
    landingPage: LandingPageData,
    sectionType: string,
  ): unknown => {
    // Select fallback content based on section type
    const fallbackContent = sectionType === 'hero'
      ? MOCK_CONTENT.hero.fallback
      : sectionType === 'services'
        ? MOCK_CONTENT.services.fallback
        : {
          title: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}`,
          content: `This is a placeholder for ${sectionType} content`,
          enabled: false,
        };
    
    // Update the landing page with fallback content
    if (landingPage && sectionType in landingPage) {
      (landingPage as Record<string, unknown>)[sectionType] = fallbackContent;
    }
    
    return fallbackContent;
  });
  
  // BrainProtocol accessor methods
  public getBrainProtocol(): BrainProtocol {
    return this.brainProtocol || ({} as BrainProtocol);
  }
  
  public setBrainProtocol(protocol: BrainProtocol): void {
    this.brainProtocol = protocol;
  }
  
  // Component Interface Standardization Pattern implementation
  static getInstance(): MockSectionGenerationService {
    if (!MockSectionGenerationService.instance) {
      MockSectionGenerationService.instance = new MockSectionGenerationService();
    }
    return MockSectionGenerationService.instance;
  }
  
  static resetInstance(): void {
    MockSectionGenerationService.instance = null;
  }
  
  static createFresh(): MockSectionGenerationService {
    return new MockSectionGenerationService();
  }
}

export default MockSectionGenerationService;