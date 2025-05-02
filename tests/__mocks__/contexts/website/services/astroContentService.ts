import { mock } from 'bun:test';

import type { AstroContentServiceTestHelpers } from '@/contexts/website/services/astroContentService';
import type { LandingPageData } from '@/contexts/website/websiteStorage';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createTestLandingPageData } from '@test/helpers';

/**
 * Mock implementation of AstroContentService for tests
 */
export class MockAstroContentService implements AstroContentServiceTestHelpers {
  private static instance: MockAstroContentService | null = null;
  
  // Properties needed to match the interface
  astroProjectPath: string = '/mock/astro/path';
  contentCollectionPath: string = '/mock/astro/path/src/content';
  logger = MockLogger.createFresh({ silent: true });
  spawnFunction = () => ({ 
    exited: Promise.resolve(0),
    stdout: new ReadableStream(),
    stderr: new ReadableStream(),
  });
  
  // Mock methods with default implementations that work well for tests
  verifyAstroProject = mock(() => Promise.resolve(true));
  writeLandingPageContent = mock<(data: LandingPageData) => Promise<boolean>>((_data: LandingPageData) => Promise.resolve(true));
  readLandingPageContent = mock<() => Promise<LandingPageData | null>>(() => Promise.resolve(
    createTestLandingPageData(),
  ));
  runAstroCommand = mock<(command: string) => Promise<{ success: boolean; output: string }>>((command: string) => {
    return Promise.resolve({ success: true, output: `Command ${command} executed successfully` });
  });
  getBuildDir = mock(() => '/mock/astro/path/dist');
  killProcess = mock(() => Promise.resolve(true));
  
  
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
      MockAstroContentService.instance.getBuildDir.mockClear();
      MockAstroContentService.instance.killProcess.mockClear();
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

  /**
   * Mock implementation of setSpawnFunction (no-op in mock)
   */
  setSpawnFunction = mock(() => {
    // No-op in mock
  });
  
}