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
// Use type assertion since our mock doesn't implement the full interface
const mockLandingPageGenerationService = MockLandingPageGenerationService.createFresh() as unknown as LandingPageGenerationService;
const mockDeploymentManager = MockWebsiteDeploymentManager.createFresh() as unknown as WebsiteDeploymentManager;
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

  // Test methods
  test('initialize should set readyState to true', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });

    await context.initialize();

    expect(context.isReady()).toBe(true);
    expect(mockStorage.initialize).toHaveBeenCalled();
  });

  test('getConfig should return website configuration', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });

    await context.getConfig();

    expect(mockStorage.getWebsiteConfig).toHaveBeenCalled();
  });

  test('updateConfig should update website configuration', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });

    const updates = {
      title: 'Updated Title',
      author: 'Updated Author',
    };

    await context.updateConfig(updates);

    expect(mockStorage.updateWebsiteConfig).toHaveBeenCalledWith(updates);
  });

  test('saveLandingPageData should save landing page data', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });

    const landingPageData = createTestLandingPageData();

    await context.saveLandingPageData(landingPageData);

    expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(landingPageData);
  });

  test('getLandingPageData should retrieve landing page data', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const testData = createTestLandingPageData();
    mockStorage.setLandingPageData(testData);

    const context = WebsiteContext.createFresh({ storage: mockStorage });

    await context.getLandingPageData();

    expect(mockStorage.getLandingPageData).toHaveBeenCalled();
  });

  test('getStorage should return the storage adapter', () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });

    expect(context.getStorage()).toBe(mockStorage);
  });

  test('setStorage should update the storage adapter', () => {
    const mockStorage1 = MockWebsiteStorageAdapter.createFresh();
    const mockStorage2 = MockWebsiteStorageAdapter.createFresh();

    const context = WebsiteContext.createFresh({ storage: mockStorage1 });
    context.setStorage(mockStorage2);

    expect(context.getStorage()).toBe(mockStorage2);
  });

  // REMOVED TEST: test('getContextName should return...


  // REMOVED TEST: test('getContextVersion should return...


  // Tests for Astro integration
  test('getAstroContentService should return an AstroContentService instance', async () => {
    // Create a properly typed mock AstroContentService
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const service = await context.getAstroContentService();

    expect(service).toBe(mockAstroContentService);
  });

  test('generateLandingPage should extract data from profile and write to content service', async () => {
    // Setup
    const profileData = {
      name: 'Test User',
      title: 'Developer',
      tagline: 'Building great things',
    };

    // Create a fresh mock profile context
    const mockProfileContext = MockProfileContext.createFresh();

    // Create a properly typed mock for the getProfile method
    const mockProfileObj = MockProfile.createWithCustomData('profile-1', {
      fullName: profileData.name,
      occupation: profileData.title.split(' - ')[1],
      headline: profileData.tagline,
    });
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfileObj));

    // Create context with mocked services
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
      landingPageGenerationService: mockLandingPageGenerationService,
      profileContext: mockProfileContext as unknown as ProfileContext,
    });

    const result = await context.generateLandingPage();

    // Assertions
    expect(result.success).toBe(true);
    expect(mockLandingPageGenerationService.generateLandingPageData).toHaveBeenCalled();
    expect(mockAstroContentService.writeLandingPageContent).toHaveBeenCalled();
  });

  test('generateLandingPage should generate landing page without quality assessment', async () => {
    // Setup
    const mockProfileContext = MockProfileContext.createFresh();
    const mockProfileObj = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfileObj));

    // Create a fresh mock with our standardized implementation
    MockLandingPageGenerationService.resetInstance();
    const freshLandingPageService = MockLandingPageGenerationService.createFresh();

    // Use the test helper to create a complete landing page data object
    const mockLandingPageData = createTestLandingPageData();

    // Simple implementation for generating landing page
    const generateImplementation = mock(() => Promise.resolve(mockLandingPageData));
    freshLandingPageService.generateLandingPageData = generateImplementation;

    // Create context with mocked services
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
      landingPageGenerationService: freshLandingPageService as unknown as LandingPageGenerationService,
      profileContext: mockProfileContext as unknown as ProfileContext,
    });

    // Test basic generation
    const result = await context.generateLandingPage();

    // Assertions
    expect(result.success).toBe(true);
    expect(generateImplementation).toHaveBeenCalled();
    expect(mockAstroContentService.writeLandingPageContent).toHaveBeenCalled();
  });

  test('editLandingPage should perform holistic editing on the landing page', async () => {
    // Setup
    const mockProfileContext = MockProfileContext.createFresh();
    
    // Create a fresh mock
    MockLandingPageGenerationService.resetInstance();
    const freshLandingPageService = MockLandingPageGenerationService.createFresh();
    
    // Use the test helper to create a complete landing page data object
    const mockLandingPageData = createTestLandingPageData();
    
    // Mock storage to return some landing page data
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockStorage.getLandingPageData = mock(() => Promise.resolve(mockLandingPageData));
    
    // Mock the edit function
    const editedLandingPage = { 
      ...mockLandingPageData, 
      hero: { 
        ...mockLandingPageData.hero, 
        headline: 'Edited: ' + mockLandingPageData.hero.headline, 
      }, 
    };
    freshLandingPageService.editLandingPage = mock(() => Promise.resolve(editedLandingPage));
    
    // Mock the content service write function
    mockAstroContentService.writeLandingPageContent = mock(() => Promise.resolve(true));
    
    // Create context with mocked services
    const context = WebsiteContext.createFresh({
      storage: mockStorage,
      astroContentService: mockAstroContentService,
      landingPageGenerationService: freshLandingPageService as unknown as LandingPageGenerationService,
      profileContext: mockProfileContext as unknown as ProfileContext,
    });
    
    // Execute the edit function
    const result = await context.editLandingPage();
    
    // Assertions
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully edited landing page');
    expect(result.data).toEqual(editedLandingPage);
    expect(freshLandingPageService.editLandingPage).toHaveBeenCalledWith(mockLandingPageData);
    expect(mockAstroContentService.writeLandingPageContent).toHaveBeenCalledWith(editedLandingPage);
  });

  test('assessLandingPage should assess landing page quality', async () => {
    // Setup
    const mockProfileContext = MockProfileContext.createFresh();
    const mockProfileObj = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfileObj));

    // Create a fresh mock with our standardized implementation
    MockLandingPageGenerationService.resetInstance();
    const freshLandingPageService = MockLandingPageGenerationService.createFresh();

    // Use the test helper to create a complete landing page data object
    const mockLandingPageData = createTestLandingPageData();

    // Mock storage to return some landing page data
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockStorage.getLandingPageData = mock(() => Promise.resolve(mockLandingPageData));

    // Mock the assessment function
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

    // Create context with mocked services
    const context = WebsiteContext.createFresh({
      storage: mockStorage,
      astroContentService: mockAstroContentService,
      landingPageGenerationService: freshLandingPageService as unknown as LandingPageGenerationService,
      profileContext: mockProfileContext as unknown as ProfileContext,
    });

    // Test assessment without applying recommendations
    const result = await context.assessLandingPage({
      qualityThresholds: {
        minCombinedScore: 7,
        minQualityScore: 6,
        minConfidenceScore: 6,
      },
      applyRecommendations: false,
    });

    // Create a fresh mock to reset state
    const newWriteMock = mock(() => Promise.resolve(true));
    mockAstroContentService.writeLandingPageContent = newWriteMock;
    
    // Assertions
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully assessed landing page quality');
    expect(freshLandingPageService.assessLandingPageQuality).toHaveBeenCalled();
    expect(newWriteMock).not.toHaveBeenCalled();

    // Test assessment with applying recommendations
    const anotherWriteMock = mock(() => Promise.resolve(true));
    mockAstroContentService.writeLandingPageContent = anotherWriteMock;
    const resultWithRecommendations = await context.assessLandingPage({
      applyRecommendations: true,
    });

    // Assertions
    expect(resultWithRecommendations.success).toBe(true);
    expect(resultWithRecommendations.message).toContain('applied quality recommendations');
    expect(anotherWriteMock).toHaveBeenCalled();
  });

  test('buildWebsite should run the build command through astro service', async () => {
    // Clear any previously called methods on the existing mock
    MockAstroContentService.resetInstance();

    // Create a fresh mock with our standardized implementation
    const freshMockAstroContentService = MockAstroContentService.createFresh() as unknown as AstroContentService & AstroContentServiceTestHelpers;

    // Create context with the standardized mock
    const context = WebsiteContext.createFresh({
      astroContentService: freshMockAstroContentService,
    });

    const result = await context.buildWebsite();

    expect(result.success).toBe(true);
    expect(freshMockAstroContentService.runAstroCommand).toHaveBeenCalledWith('build');
  });

  // Tests for Caddy-based approach
  test('handleWebsiteBuild should build the website to preview environment', async () => {
    // Reset and create a fresh mock deployment manager
    MockWebsiteDeploymentManager.resetInstance();
    const mockDeployManager = MockWebsiteDeploymentManager.createFresh();
    
    // Create context with mocked services
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
      deploymentManager: mockDeployManager as unknown as WebsiteDeploymentManager,
    });

    // Mock the buildWebsite method to return success
    context.buildWebsite = mock(() => Promise.resolve({
      success: true,
      message: 'Website built successfully',
      output: 'Build output...',
    }));

    const result = await context.handleWebsiteBuild();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Website built successfully');
    expect(result.path).toBeDefined();
    // URL should come from the mock deployment manager's environment status
    expect(result.url).toBe('https://preview.example.com');
  });

  test('handleWebsiteBuild should handle errors when build fails', async () => {
    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    // Mock the buildWebsite method to return failure
    context.buildWebsite = mock(() => Promise.resolve({
      success: false,
      message: 'Build error',
      output: 'Error output...',
    }));

    const result = await context.handleWebsiteBuild();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to build website');
  });

  test('getDeploymentManager should create deployment manager if not injected', async () => {
    // Create context without providing a deployment manager
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    // Get the deployment manager
    const deploymentManager = await context.getDeploymentManager();

    // The method should create a deployment manager
    expect(deploymentManager).toBeDefined();
  });

  test('getDeploymentManager should return injected deployment manager', async () => {
    // Create context with mocked deployment manager
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
      deploymentManager: mockDeploymentManager,
    });

    // Get the deployment manager
    const deploymentManager = await context.getDeploymentManager();

    // The method should return the injected deployment manager
    expect(deploymentManager).toBe(mockDeploymentManager);
  });

  test('handleWebsitePromote should use the deployment manager', async () => {
    // Create a manager with spied methods
    const spiedManager = MockWebsiteDeploymentManager.createFresh();
    spiedManager.setPromotionResult({
      success: true,
      message: 'Test promotion message',
      url: 'https://test.example.com',
    });

    // Create context with mocked deployment manager
    const context = WebsiteContext.createFresh({
      deploymentManager: spiedManager as unknown as WebsiteDeploymentManager,
    });

    const result = await context.handleWebsitePromote();

    // Should delegate to the deployment manager
    expect(result.success).toBe(true);
    expect(result.message).toBe('Test promotion message');
    expect(result.url).toBe('https://test.example.com');

    // Verify the deployment manager was called
    expect(spiedManager.promoteToProduction).toHaveBeenCalled();
  });

  test('handleWebsiteStatus should use the deployment manager', async () => {
    // Create a manager with spied methods
    const spiedManager = MockWebsiteDeploymentManager.createFresh();
    spiedManager.setEnvironmentStatus('preview', {
      buildStatus: 'Built' as const,
      fileCount: 123,
      accessStatus: 'Test Status',
    });

    // Create context with mocked deployment manager
    const context = WebsiteContext.createFresh({
      deploymentManager: spiedManager as unknown as WebsiteDeploymentManager,
    });

    // Test preview environment
    const previewResult = await context.handleWebsiteStatus();

    // Verify result contains the data from our mock
    expect(previewResult.success).toBe(true);
    expect(previewResult.data?.environment).toBe('preview');
    expect(previewResult.data?.fileCount).toBe(123);
    expect(previewResult.data?.accessStatus).toBe('Test Status');

    // Verify the deployment manager was called with the correct environment
    expect(spiedManager.getEnvironmentStatus).toHaveBeenCalledWith('preview');

    // Test production environment
    spiedManager.setEnvironmentStatus('production', {
      buildStatus: 'Not Built' as const,
      fileCount: 0,
      accessStatus: 'Not Accessible',
    });

    const prodResult = await context.handleWebsiteStatus('production');

    // Verify result contains the data from our mock
    expect(prodResult.success).toBe(true);
    expect(prodResult.data?.environment).toBe('production');
    expect(prodResult.data?.buildStatus).toBe('Not Built');
    expect(prodResult.data?.fileCount).toBe(0);
    expect(prodResult.data?.accessStatus).toBe('Not Accessible');

    // Verify the deployment manager was called with the correct environment
    expect(spiedManager.getEnvironmentStatus).toHaveBeenCalledWith('production');
  });
});
