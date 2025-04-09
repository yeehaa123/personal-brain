import { mock } from 'bun:test';

import type { LandingPageData } from '@website/schemas';

/**
 * Mock implementation of AstroContentService for tests
 */
export class MockAstroContentService {
  private static instance: MockAstroContentService | null = null;
  
  // Mock methods
  verifyAstroProject = mock(() => Promise.resolve(true));
  writeLandingPageContent = mock(() => Promise.resolve(true));
  readLandingPageContent = mock<() => Promise<LandingPageData | null>>(() => Promise.resolve(null));
  runAstroCommand = mock(() => Promise.resolve({ success: true, output: 'Command executed successfully' }));
  
  /**
   * Get the singleton instance
   */
  static getInstance(): MockAstroContentService {
    if (!MockAstroContentService.instance) {
      MockAstroContentService.instance = new MockAstroContentService();
    }
    return MockAstroContentService.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    if (MockAstroContentService.instance) {
      MockAstroContentService.instance.verifyAstroProject.mockClear();
      MockAstroContentService.instance.writeLandingPageContent.mockClear();
      MockAstroContentService.instance.readLandingPageContent.mockClear();
      MockAstroContentService.instance.runAstroCommand.mockClear();
    }
    MockAstroContentService.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(): MockAstroContentService {
    return new MockAstroContentService();
  }
  
  /**
   * Set landing page data for readLandingPageContent
   */
  setLandingPageData(data: LandingPageData | null): void {
    this.readLandingPageContent = mock<() => Promise<LandingPageData | null>>(() => Promise.resolve(data));
  }
}