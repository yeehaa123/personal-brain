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
  generateLandingPageData = mock((overrides?: Partial<LandingPageData>) => {
    return Promise.resolve({
      ...this.defaultLandingPageData,
      ...overrides,
    });
  });
  
  setProfileContext = mock(() => {
    // No-op in mock
  });
  
  getProfileContext = mock(() => {
    return this.profileContext;
  });
  
  mapProfileToLandingPage = mock((profile: Record<string, unknown>) => {
    return {
      name: profile?.['fullName'] || 'Mock User',
      title: `${profile?.['fullName'] || 'Mock User'} - ${profile?.['occupation'] || 'Developer'}`,
      tagline: profile?.['headline'] || 'Mock tagline',
    };
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