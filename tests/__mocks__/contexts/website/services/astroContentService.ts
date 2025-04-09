import { mock } from 'bun:test';

import type { LandingPageData } from '@/mcp/contexts/website/storage/websiteStorage';

/**
 * Mock implementation of AstroContentService for tests
 */
export class MockAstroContentService {
  private static instance: MockAstroContentService | null = null;
  
  // We don't need to mock private properties that aren't accessed
  astroProjectPath: string = '/mock/astro/path';
  logger = { info: () => {}, error: () => {}, warn: () => {} };
  spawnFunction = () => ({ 
    exited: Promise.resolve(0),
    stdout: new ReadableStream(),
    stderr: new ReadableStream(),
  });
  
  // Mock methods
  verifyAstroProject = mock(() => Promise.resolve(true));
  writeLandingPageContent = mock<(data: LandingPageData) => Promise<boolean>>((_data: LandingPageData) => Promise.resolve(true));
  readLandingPageContent = mock<() => Promise<LandingPageData | null>>(() => Promise.resolve(null));
  runAstroCommand = mock<(command: string) => Promise<{ success: boolean; output: string }>>((command: string) => {
    return Promise.resolve({ success: true, output: `Command ${command} executed successfully` });
  });
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