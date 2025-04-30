import { mock } from 'bun:test';

// Import direct types we need
import type { LandingPageQualityAssessmentOptions } from '@/contexts/website/services/landingPageGenerationService';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';
import type { AssessedSection } from '@website/schemas/sectionQualitySchema';

/**
 * Mock implementation of LandingPageGenerationService
 * Follows the Component Interface Standardization pattern
 */
export class MockLandingPageGenerationService {
  private static instance: MockLandingPageGenerationService | null = null;
  
  // Mock landing page data
  private landingPageData: LandingPageData = {
    title: 'Test Landing Page',
    description: 'Test description',
    name: 'Test Name',
    tagline: 'Test Tagline',
    sectionOrder: ['hero', 'services', 'about', 'footer'],
    hero: {
      headline: 'Test Headline',
      subheading: 'Test Subheading',
      ctaText: 'Get Started',
      ctaLink: '#contact',
    },
    problemStatement: {
      title: 'Test Problem Statement',
      description: 'Test problem description',
      enabled: true,
    },
    services: {
      title: 'Test Services',
      items: [{ title: 'Service 1', description: 'Description 1' }],
    },
    process: {
      title: 'How We Work',
      steps: [{ step: 1, title: 'Step 1', description: 'Description' }],
      enabled: true,
    },
    caseStudies: {
      title: 'Case Studies',
      items: [],
      enabled: true,
    },
    expertise: {
      title: 'Expertise',
      items: [{ title: 'Expertise 1', description: 'Description 1' }],
      enabled: true,
    },
    about: {
      title: 'About Me',
      content: 'Test about content',
      enabled: true,
    },
    pricing: {
      title: 'Pricing',
      tiers: [],
      enabled: false,
    },
    faq: {
      title: 'FAQ',
      items: [{ question: 'Question 1', answer: 'Answer 1' }],
      enabled: true,
    },
    cta: {
      title: 'Get Started',
      buttonText: 'Contact Us',
      buttonLink: '#contact',
      enabled: true,
    },
    footer: {
      copyrightText: '© 2023 Test Company',
      enabled: true,
    },
  };
  
  // Mock methods
  public generateLandingPageData = mock(async (): Promise<LandingPageData> => {
    return { ...this.landingPageData };
  });
  
  public editLandingPage = mock(async (landingPage: LandingPageData): Promise<LandingPageData> => {
    // Create a copy of the landing page to simulate editing
    const editedLandingPage = { ...landingPage };
    // Make a simple change to indicate editing was performed
    if (editedLandingPage.hero && editedLandingPage.hero.headline) {
      editedLandingPage.hero.headline = `Edited: ${editedLandingPage.hero.headline}`;
    }
    return editedLandingPage;
  });
  
  public assessLandingPageQuality = mock(async (landingPage: LandingPageData, _options?: LandingPageQualityAssessmentOptions): Promise<{ 
    landingPage: LandingPageData; 
    assessments: Record<string, AssessedSection<unknown>>;
  }> => {
    return {
      landingPage: { ...landingPage },
      assessments: this.getSectionQualityAssessments(),
    };
  });
  
  public getSectionQualityAssessments = mock((): Record<string, AssessedSection<unknown>> => {
    return {
      hero: {
        content: this.landingPageData.hero,
        assessment: {
          qualityScore: 8,
          qualityJustification: 'Good hero section',
          confidenceScore: 9,
          confidenceJustification: 'Very confident',
          combinedScore: 8.5,
          enabled: true,
          suggestedImprovements: 'Minor improvements',
          improvementsApplied: false,
        },
        isRequired: true,
      },
      about: {
        content: this.landingPageData.about,
        assessment: {
          qualityScore: 7,
          qualityJustification: 'Good about section',
          confidenceScore: 8,
          confidenceJustification: 'Confident',
          combinedScore: 7.5,
          enabled: true,
          suggestedImprovements: 'Add more details',
          improvementsApplied: false,
        },
        isRequired: false,
      },
    };
  });
  
  public getBrainProtocol = mock((): BrainProtocol => {
    return {} as BrainProtocol;
  });
  
  public setBrainProtocol = mock((_protocol: BrainProtocol): void => {
    // Mock implementation
  });
  
  /**
   * Set landing page data for testing
   */
  setLandingPageData(data: LandingPageData): void {
    this.landingPageData = data;
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): MockLandingPageGenerationService {
    if (!MockLandingPageGenerationService.instance) {
      MockLandingPageGenerationService.instance = new MockLandingPageGenerationService();
    }
    return MockLandingPageGenerationService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  static resetInstance(): void {
    MockLandingPageGenerationService.instance = null;
  }
  
  /**
   * Create fresh instance
   */
  static createFresh(): MockLandingPageGenerationService {
    return new MockLandingPageGenerationService();
  }
}

export default MockLandingPageGenerationService;