import { mock } from 'bun:test';

import type { 
  AstroContentService,
  AstroContentServiceConfig,
  AstroContentServiceTestHelpers, 
  SpawnFunction, 
} from '@/contexts/website/services/astroContentService';
import type { LandingPageData } from '@/contexts/website/websiteStorage';
import { createTestLandingPageData } from '@test/helpers';

/**
 * Mock implementation of AstroContentService for tests
 * Follows the Component Interface Standardization pattern
 */
export class MockAstroContentService implements AstroContentServiceTestHelpers {
  private static instance: MockAstroContentService | null = null;
  
  // Mock implementation doesn't need to store these properties
  
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
  getAstroProjectPath = mock(() => '/mock/astro/path');
  killProcess = mock(() => Promise.resolve(true));
  
  /**
   * Get the singleton instance
   * 
   * @param config Optional configuration options
   * @returns The singleton instance
   */
  static getInstance(config: AstroContentServiceConfig = {}): AstroContentService {
    if (!MockAstroContentService.instance) {
      MockAstroContentService.instance = new MockAstroContentService(config);
    }
    return MockAstroContentService.instance as unknown as AstroContentService;
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
      MockAstroContentService.instance.getAstroProjectPath.mockClear();
      MockAstroContentService.instance.killProcess.mockClear();
    }
    MockAstroContentService.instance = null;
  }
  
  /**
   * Create a fresh instance
   * 
   * @param config Optional configuration options
   * @returns A new instance
   */
  static createFresh(config: AstroContentServiceConfig = {}): AstroContentService {
    return new MockAstroContentService(config) as unknown as AstroContentService;
  }
  
  /**
   * Constructor
   * @param config Configuration options (optional)
   */
  protected constructor(config: AstroContentServiceConfig = {}) {
    // If a specific project path was provided, update mock values
    if (config.astroProjectPath) {
      this.getBuildDir = mock(() => `${config.astroProjectPath}/dist`);
      this.getAstroProjectPath = mock(() => config.astroProjectPath as string);
    }
  }
  
  /**
   * Set landing page data for readLandingPageContent
   */
  setLandingPageData(data: LandingPageData | null): void {
    this.readLandingPageContent = mock<() => Promise<LandingPageData | null>>(() => Promise.resolve(data));
  }

  /**
   * Mock implementation of setSpawnFunction
   */
  setSpawnFunction = mock((_fn: SpawnFunction) => {
    // No-op in mock implementation
  });
}