import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { WebsiteContext } from '@/contexts';
import type { ProfileContext } from '@/contexts/profiles';
import type { AstroContentService, AstroContentServiceTestHelpers } from '@/contexts/website/services/astroContentService';
import type { WebsiteDeploymentManager } from '@/contexts/website/services/deployment';
import type { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/website/adapters/websiteStorageAdapter';
// Import our mock implementations directly
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockWebsiteDeploymentManager } from '@test/__mocks__/contexts/website/services/deployment/deploymentManager';
import { MockLandingPageGenerationService } from '@test/__mocks__/contexts/website/services/landingPageGenerationService';
import { MockProfile } from '@test/__mocks__/models/profile';
import { createTestLandingPageData } from '@test/helpers';

// Create our mock instances with proper typings
const mockAstroContentService = MockAstroContentService.createFresh() as unknown as AstroContentService & AstroContentServiceTestHelpers;
describe('WebsiteContext', () => {
  // Set up and tear down for each test
  beforeEach(() => {
    // Reset singletons
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();

    // Reset by creating fresh instances for each test instead of trying to clear mocks
    // We're recasting to the correct types after creating fresh instances
    MockAstroContentService.resetInstance();
    MockLandingPageGenerationService.resetInstance();
    MockWebsiteDeploymentManager.resetInstance();
  });

  afterEach(() => {
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
  });

  // Test storage-related methods
  test('basic storage and configuration methods work correctly', async () => {
    // Create a mock storage adapter
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    // Test initialization
    await context.initialize();
    expect(context.isReady()).toBe(true);
    
    // Test config operations
    await context.getConfig();
    expect(mockStorage.getWebsiteConfig).toHaveBeenCalled();
    
    const updates = { title: 'Updated Title', author: 'Updated Author' };
    await context.updateConfig(updates);
    expect(mockStorage.updateWebsiteConfig).toHaveBeenCalledWith(updates);
    
    // Test landing page data operations
    const landingPageData = createTestLandingPageData();
    await context.saveLandingPageData(landingPageData);
    expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(landingPageData);
    
    mockStorage.setLandingPageData(landingPageData);
    await context.getLandingPageData();
    expect(mockStorage.getLandingPageData).toHaveBeenCalled();
    
    // Test storage getter/setter
    expect(context.getStorage()).toBe(mockStorage);
    
    const mockStorage2 = MockWebsiteStorageAdapter.createFresh();
    context.setStorage(mockStorage2);
    expect(context.getStorage()).toBe(mockStorage2);
  });

  // REMOVED TEST: test('getContextName should return...


  // REMOVED TEST: test('getContextVersion should return...


  // Tests for Astro and landing page content generation
  test('content generation and management features work correctly', async () => {
    // Create mocks
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const mockProfileContext = MockProfileContext.createFresh();
    const freshAstroContentService = MockAstroContentService.createFresh() as unknown as AstroContentService & AstroContentServiceTestHelpers;
    const freshLandingPageService = MockLandingPageGenerationService.createFresh();
    
    // Mock profile data
    const mockProfileObj = MockProfile.createWithCustomData('profile-1', {
      fullName: 'Test User',
      occupation: 'Developer',
      headline: 'Building great things',
    });
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfileObj));
    
    // Mock landing page data
    const mockLandingPageData = createTestLandingPageData();
    mockStorage.getLandingPageData = mock(() => Promise.resolve(mockLandingPageData));
    freshLandingPageService.generateLandingPageData = mock(() => Promise.resolve(mockLandingPageData));
    
    // Mock assessment data
    const assessmentResult = {
      landingPage: { ...mockLandingPageData },
      assessments: {
        hero: {
          content: mockLandingPageData.hero,
          assessment: {
            qualityScore: 8,
            qualityJustification: 'Good quality hero section',
            confidenceScore: 9,
            confidenceJustification: 'High confidence in hero section',
            combinedScore: 8.5,
            enabled: true,
            suggestedImprovements: 'Could add a better headline',
            improvementsApplied: false,
          },
          isRequired: true,
        },
      },
    };
    freshLandingPageService.assessLandingPageQuality = mock(() => Promise.resolve(assessmentResult));
    
    // Mock edited landing page
    const editedLandingPage = { 
      ...mockLandingPageData, 
      hero: { 
        ...mockLandingPageData.hero, 
        headline: 'Edited: ' + mockLandingPageData.hero.headline, 
      }, 
    };
    freshLandingPageService.editLandingPage = mock(() => Promise.resolve(editedLandingPage));
    
    // Create context with all mocked services
    const context = WebsiteContext.createFresh({
      storage: mockStorage,
      astroContentService: freshAstroContentService,
      landingPageGenerationService: freshLandingPageService as unknown as LandingPageGenerationService,
      profileContext: mockProfileContext as unknown as ProfileContext,
    });
    
    // Test getting astro service
    const service = await context.getAstroContentService();
    expect(service).toBe(freshAstroContentService);
    
    // Test landing page generation
    const generationResult = await context.generateLandingPage();
    expect(generationResult.success).toBe(true);
    expect(freshLandingPageService.generateLandingPageData).toHaveBeenCalled();
    
    // Test landing page editing
    const editResult = await context.editLandingPage();
    expect(editResult.success).toBe(true);
    expect(editResult.message).toContain('Successfully edited landing page');
    expect(freshLandingPageService.editLandingPage).toHaveBeenCalled();
    
    // Test landing page quality assessment
    const assessmentResult1 = await context.assessLandingPage({ applyRecommendations: false });
    expect(assessmentResult1.success).toBe(true);
    expect(freshLandingPageService.assessLandingPageQuality).toHaveBeenCalled();
    
    // Test website building
    const buildResult = await context.buildWebsite();
    expect(buildResult.success).toBe(true);
    expect(freshAstroContentService.runAstroCommand).toHaveBeenCalledWith('build');
  });

  // Tests for deployment features
  test('deployment management features work correctly', async () => {
    // Create a fresh mock deployment manager
    const mockDeployManager = MockWebsiteDeploymentManager.createFresh();
    
    // Set up status data
    mockDeployManager.setEnvironmentStatus('preview', {
      buildStatus: 'Built' as const,
      fileCount: 123,
      accessStatus: 'Test Status',
    });
    
    mockDeployManager.setEnvironmentStatus('live', {
      buildStatus: 'Not Built' as const,
      fileCount: 0,
      accessStatus: 'Not Accessible',
    });
    
    // Set up promotion result
    mockDeployManager.setPromotionResult({
      success: true,
      message: 'Test promotion message',
      url: 'https://test.example.com',
    });
    
    // Create context with mocked services
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
      deploymentManager: mockDeployManager as unknown as WebsiteDeploymentManager,
    });
    
    // Test deployment manager accessor
    const deploymentManager = await context.getDeploymentManager();
    expect(deploymentManager).toBe(mockDeployManager);
    
    // Test successful website build
    context.buildWebsite = mock(() => Promise.resolve({
      success: true,
      message: 'Website built successfully',
      output: 'Build output...',
    }));
    const buildResult = await context.handleWebsiteBuild();
    expect(buildResult.success).toBe(true);
    expect(buildResult.url).toBe('https://preview.example.com');
    
    // Test build error handling
    context.buildWebsite = mock(() => Promise.resolve({
      success: false,
      message: 'Build error',
      output: 'Error output...',
    }));
    const failedBuildResult = await context.handleWebsiteBuild();
    expect(failedBuildResult.success).toBe(false);
    expect(failedBuildResult.message).toContain('Failed to build website');
    
    // Test website promotion
    const promotionResult = await context.handleWebsitePromote();
    expect(promotionResult.success).toBe(true);
    expect(promotionResult.message).toBe('Test promotion message');
    expect(promotionResult.url).toBe('https://test.example.com');
    expect(mockDeployManager.promoteToLive).toHaveBeenCalled();
    
    // Test website status
    const previewStatus = await context.handleWebsiteStatus();
    expect(previewStatus.success).toBe(true);
    expect(previewStatus.data?.environment).toBe('preview');
    expect(previewStatus.data?.fileCount).toBe(123);
    expect(mockDeployManager.getEnvironmentStatus).toHaveBeenCalledWith('preview');
    
    const liveStatus = await context.handleWebsiteStatus('live');
    expect(liveStatus.success).toBe(true);
    expect(liveStatus.data?.environment).toBe('live');
    expect(liveStatus.data?.buildStatus).toBe('Not Built');
    expect(mockDeployManager.getEnvironmentStatus).toHaveBeenCalledWith('live');
    
    // Test auto-creation of deployment manager
    const contextWithoutManager = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });
    const autoCreatedManager = await contextWithoutManager.getDeploymentManager();
    expect(autoCreatedManager).toBeDefined();
  });
});
