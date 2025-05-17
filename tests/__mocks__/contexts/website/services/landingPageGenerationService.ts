import { mock } from 'bun:test';

// Import direct types we need
import type { WebsiteIdentityData } from '@/contexts/website/schemas/websiteIdentitySchema';
import type { LandingPageGenerationService, LandingPageQualityAssessmentOptions } from '@/contexts/website/services/landingPageGenerationService';
import { type LandingPageGenerationOptions, SectionGenerationStatus } from '@/contexts/website/types/landingPageTypes';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';
import type { AssessedSection } from '@website/schemas/sectionQualitySchema';

/**
 * Mock implementation of LandingPageGenerationService
 * Follows the Component Interface Standardization pattern
 * Implements required interface
 */
export class MockLandingPageGenerationService {
  private static instance: MockLandingPageGenerationService | null = null;


  // Mock generation status for controlling test behavior
  public generationStatus: Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }> = {
    hero: { status: SectionGenerationStatus.Completed, data: {} },
    services: { status: SectionGenerationStatus.Completed, data: {} },
    about: { status: SectionGenerationStatus.Completed, data: {} },
    pricing: { status: SectionGenerationStatus.Failed, error: 'Failed to generate pricing section' },
    faq: { status: SectionGenerationStatus.Failed, error: 'Failed to generate FAQ section' },
  };

  // Mock landing page data - make public for testing access
  public landingPageData: LandingPageData = {
    title: 'Test Landing Page',
    description: 'Test description',
    name: 'Test Name',
    tagline: 'Test Tagline',
    sectionOrder: ['hero', 'services', 'about', 'footer', 'pricing', 'faq'],
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
  public generateLandingPageData = mock(async (
    _identity: WebsiteIdentityData | null,
    _onProgress?: (step: string, index: number) => void,
    _options?: LandingPageGenerationOptions,
  ): Promise<{
    landingPage: LandingPageData;
    generationStatus: Record<string, { status: string; data?: unknown; error?: string }>;
  }> => {
    return {
      landingPage: { ...this.landingPageData },
      generationStatus: { ...this.generationStatus },
    };
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

  public getGenerationStatus = mock((): Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }> => {
    return { ...this.generationStatus };
  });

  public getBrainProtocol = mock((): BrainProtocol => {
    return {} as BrainProtocol;
  });

  public setBrainProtocol = mock((_protocol: BrainProtocol): void => {
    // Mock implementation
  });

  /**
   * Regenerate a specific section
   */
  public regenerateSection = mock(async (
    landingPage: LandingPageData,
    sectionType: string,
  ): Promise<{ success: boolean; message: string }> => {
    if (sectionType in landingPage) {
      // Update the section to simulate regeneration
      if (sectionType === 'hero' && landingPage.hero) {
        landingPage.hero.headline = 'Regenerated Headline';
      } else if (sectionType === 'services' && landingPage.services) {
        landingPage.services.title = 'Regenerated Services';
      } else if (sectionType === 'pricing' && landingPage.pricing) {
        landingPage.pricing.title = 'Regenerated Pricing';
        landingPage.pricing.enabled = true;

        // Update generation status to completed
        this.generationStatus[sectionType] = {
          status: SectionGenerationStatus.Completed,
          data: landingPage.pricing,
        };
      } else if (sectionType === 'faq' && landingPage.faq) {
        landingPage.faq.title = 'Regenerated FAQ';
        landingPage.faq.enabled = true;

        // Update generation status to completed
        this.generationStatus[sectionType] = {
          status: SectionGenerationStatus.Completed,
          data: landingPage.faq,
        };
      }

      return {
        success: true,
        message: `Successfully regenerated ${sectionType} section`,
      };
    }

    return {
      success: false,
      message: `Section ${sectionType} not found in landing page`,
    };
  });

  /**
   * Regenerate all failed sections
   */
  public regenerateFailedSections = mock(async (
    landingPage: LandingPageData,
    _identity: WebsiteIdentityData,
  ): Promise<{
    success: boolean;
    message: string;
    results: {
      attempted: number;
      succeeded: number;
      failed: number;
      sections: Record<string, { success: boolean; message: string }>;
    }
  }> => {
    // Find failed sections
    const failedSections = Object.entries(this.generationStatus)
      .filter(([_, status]) => status.status === SectionGenerationStatus.Failed)
      .map(([sectionType]) => sectionType);

    if (failedSections.length === 0) {
      return {
        success: true,
        message: 'No failed sections found to regenerate',
        results: {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          sections: {},
        },
      };
    }

    // Track results for each section
    const results: Record<string, { success: boolean; message: string }> = {};
    let succeeded = 0;
    let failed = 0;

    // Try to regenerate each section
    for (const sectionType of failedSections) {
      try {
        // Simulate successful regeneration for 'pricing' and failure for 'faq'
        if (sectionType === 'pricing') {
          if (landingPage.pricing) {
            landingPage.pricing.title = 'Regenerated Pricing';
            landingPage.pricing.enabled = true;

            // Update generation status to completed
            this.generationStatus[sectionType] = {
              status: SectionGenerationStatus.Completed,
              data: landingPage.pricing,
            };
          }

          results[sectionType] = {
            success: true,
            message: `Successfully regenerated ${sectionType} section`,
          };
          succeeded++;
        } else {
          results[sectionType] = {
            success: false,
            message: `Failed to regenerate ${sectionType} section: Generation error`,
          };
          failed++;
        }
      } catch (error) {
        results[sectionType] = {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
        failed++;
      }
    }

    // Generate summary
    const totalAttempted = failedSections.length;
    const message = `Attempted to regenerate ${totalAttempted} sections: ${succeeded} succeeded, ${failed} failed`;

    return {
      success: failed === 0,
      message,
      results: {
        attempted: totalAttempted,
        succeeded,
        failed,
        sections: results,
      },
    };
  });

  /**
   * Set landing page data for testing
   */
  setLandingPageData(data: LandingPageData): void {
    this.landingPageData = data;
  }

  /**
   * Set generation status for testing
   */
  setGenerationStatus(status: Record<string, { status: string; data?: unknown; error?: string; retryCount?: number }>): void {
    this.generationStatus = status;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!MockLandingPageGenerationService.instance) {
      MockLandingPageGenerationService.instance = new MockLandingPageGenerationService();
    }
    return MockLandingPageGenerationService.instance as unknown as LandingPageGenerationService;
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
  static createFresh() {
    return new MockLandingPageGenerationService() as unknown as LandingPageGenerationService;
  }
}

export default MockLandingPageGenerationService;
