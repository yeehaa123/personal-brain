import { mock } from 'bun:test';

import type { LandingPageData } from '@/contexts/website/websiteStorage';

/**
 * Mock implementation of LandingPageGenerationService for testing
 */
export class MockLandingPageGenerationService {
  private static instance: MockLandingPageGenerationService | null = null;
  
  // Add properties required by the interface
  private profileContext = null;
  logger = { info: () => {}, error: () => {}, warn: () => {} };
  
  // Mock state
  private defaultLandingPageData: LandingPageData = {
    name: 'Test User',
    title: 'Test User - Web Developer',
    tagline: 'Building innovative web applications',
  };
  
  // Mock methods
  generateLandingPageData = mock((overrides?: Partial<Record<string, unknown>>) => {
    // Return an enhanced landing page data structure with all required sections
    return Promise.resolve({
      ...this.defaultLandingPageData,
      // Add required sections for the enhanced landing page
      sectionOrder: ['hero', 'services', 'cta', 'footer'],
      hero: {
        headline: 'Test Headline',
        subheading: 'Test Subheading',
        ctaText: 'Get Started',
        ctaLink: '#contact',
      },
      services: {
        title: 'Services',
        items: [
          { title: 'Service 1', description: 'Description 1' },
          { title: 'Service 2', description: 'Description 2' },
        ],
      },
      cta: {
        title: 'Ready to Start?',
        subtitle: 'Contact us today',
        buttonText: 'Contact Now',
        buttonLink: '#contact',
        enabled: true,
      },
      footer: {
        copyrightText: `© ${new Date().getFullYear()} Test User. All rights reserved.`,
        enabled: true,
      },
      ...overrides,
    });
  });
  
  setProfileContext = mock(() => {
    // No-op in mock
  });
  
  getProfileContext = mock(() => {
    return this.profileContext;
  });
  
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockLandingPageGenerationService {
    if (!MockLandingPageGenerationService.instance) {
      MockLandingPageGenerationService.instance = new MockLandingPageGenerationService();
    }
    return MockLandingPageGenerationService.instance;
  }
  
  /**
   * Reset the singleton instance (for test isolation)
   */
  static resetInstance(): void {
    if (MockLandingPageGenerationService.instance) {
      MockLandingPageGenerationService.instance.generateLandingPageData.mockClear();
      MockLandingPageGenerationService.instance.setProfileContext.mockClear();
    }
    MockLandingPageGenerationService.instance = null;
  }
  
  /**
   * Create a fresh instance (for test isolation)
   */
  static createFresh(): MockLandingPageGenerationService {
    return new MockLandingPageGenerationService();
  }
  
  /**
   * Set custom landing page data for testing
   */
  setDefaultLandingPageData(data: LandingPageData): void {
    this.defaultLandingPageData = data;
  }
}