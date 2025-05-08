import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import { WebsiteContext } from '@/contexts';
import type { ProfileContext } from '@/contexts/profiles';
import type { AstroContentService, AstroContentServiceTestHelpers } from '@/contexts/website/services/astroContentService';
import type { WebsiteDeploymentManager } from '@/contexts/website/services/deployment';
import type { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { WebsiteIdentityService } from '@/contexts/website/services/websiteIdentityService';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteIdentityNoteAdapter } from '@test/__mocks__/contexts/website/adapters/websiteIdentityNoteAdapter';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/website/adapters/websiteStorageAdapter';
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockWebsiteDeploymentManager } from '@test/__mocks__/contexts/website/services/deployment/deploymentManager';
import { MockLandingPageGenerationService } from '@test/__mocks__/contexts/website/services/landingPageGenerationService';
import { MockWebsiteIdentityService } from '@test/__mocks__/contexts/website/services/websiteIdentityService';
import { createTestIdentityData, createTestLandingPageData } from '@test/helpers';

describe('WebsiteContext', () => {
  // Shared test resources
  let mockStorage: MockWebsiteStorageAdapter;
  let mockAstroService: AstroContentService & AstroContentServiceTestHelpers;
  let mockLandingPageService: MockLandingPageGenerationService;
  let mockDeployManager: MockWebsiteDeploymentManager;
  let mockProfileContext: MockProfileContext;
  let mockIdentityService: MockWebsiteIdentityService;
  // We use the adapter to create mock dependencies
  let context: WebsiteContext;
  
  // Reset singletons before each test
  beforeEach(() => {
    // Reset all singleton instances
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
    MockAstroContentService.resetInstance();
    MockLandingPageGenerationService.resetInstance();
    MockWebsiteDeploymentManager.resetInstance();
    MockProfileContext.resetInstance();
    MockWebsiteIdentityService.resetInstance();
    MockWebsiteIdentityNoteAdapter.resetInstance();
    
    // Create fresh instances for testing
    mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockAstroService = MockAstroContentService.createFresh() as unknown as AstroContentService & AstroContentServiceTestHelpers;
    mockLandingPageService = MockLandingPageGenerationService.createFresh();
    mockDeployManager = MockWebsiteDeploymentManager.createFresh();
    mockProfileContext = MockProfileContext.createFresh();
    // Create the adapter but we don't directly use it in tests
    MockWebsiteIdentityNoteAdapter.createFresh();
    mockIdentityService = MockWebsiteIdentityService.createFresh();
    
    // Set up a default context with all mock services
    context = WebsiteContext.createFresh({}, {
      storage: mockStorage,
      astroContentService: mockAstroService,
      landingPageGenerationService: mockLandingPageService as unknown as LandingPageGenerationService,
      profileContext: mockProfileContext as unknown as ProfileContext,
      deploymentManager: mockDeployManager as unknown as WebsiteDeploymentManager,
      identityService: mockIdentityService as unknown as WebsiteIdentityService,
    });
  });

  afterEach(() => {
    WebsiteContext.resetInstance();
  });

  test('storage operations delegate to the storage adapter', async () => {
    // Test initialization
    await context.initialize();
    expect(context.isReady()).toBe(true);
    
    // Test config operations
    await context.getConfig();
    expect(mockStorage.getWebsiteConfig).toHaveBeenCalled();
    
    const updates = { title: 'Updated Title' };
    await context.updateConfig(updates);
    expect(mockStorage.updateWebsiteConfig).toHaveBeenCalledWith(updates);
    
    // Test landing page operations
    const data = createTestLandingPageData();
    await context.saveLandingPageData(data);
    expect(mockStorage.saveLandingPageData).toHaveBeenCalled();
    
    mockStorage.setLandingPageData(data);
    await context.getLandingPageData();
    expect(mockStorage.getLandingPageData).toHaveBeenCalled();
    
    // Test storage getter/setter
    expect(context.getStorage()).toBe(mockStorage);
    
    const newStorage = MockWebsiteStorageAdapter.createFresh();
    context.setStorage(newStorage);
    expect(context.getStorage()).toBe(newStorage);
  });

  test('content generation features delegate to the appropriate services', async () => {
    // Set up test data
    const landingPageData = createTestLandingPageData();
    mockLandingPageService.generateLandingPageData = mock(() => Promise.resolve(landingPageData));
    
    const editedLandingPage = { 
      ...landingPageData, 
      hero: { ...landingPageData.hero, headline: 'Edited Headline' }, 
    };
    mockLandingPageService.editLandingPage = mock(() => Promise.resolve(editedLandingPage));
    
    const assessmentResult = {
      landingPage: landingPageData,
      assessments: {
        hero: {
          content: landingPageData.hero,
          assessment: {
            qualityScore: 8,
            confidenceScore: 9,
            combinedScore: 8.5,
            enabled: true,
            qualityJustification: 'Good',
            confidenceJustification: 'High',
            suggestedImprovements: 'None',
            improvementsApplied: false,
          },
          isRequired: true,
        },
      },
    };
    mockLandingPageService.assessLandingPageQuality = mock(() => Promise.resolve(assessmentResult));
    
    // Test service getter
    const service = await context.getAstroContentService();
    expect(service).toBe(mockAstroService);
    
    // Test landing page generation
    const generationResult = await context.generateLandingPage();
    expect(generationResult.success).toBe(true);
    expect(mockLandingPageService.generateLandingPageData).toHaveBeenCalled();
    
    // Test landing page editing
    const editResult = await context.editLandingPage();
    expect(editResult.success).toBe(true);
    expect(mockLandingPageService.editLandingPage).toHaveBeenCalled();
    
    // Test landing page quality assessment
    const assessmentResult1 = await context.assessLandingPage();
    expect(assessmentResult1.success).toBe(true);
    expect(mockLandingPageService.assessLandingPageQuality).toHaveBeenCalled();
    
    // Test website build
    mockAstroService.runAstroCommand = mock(() => Promise.resolve({ 
      success: true, 
      output: 'Build success', 
    }));
    
    const buildResult = await context.buildWebsite();
    expect(buildResult.success).toBe(true);
    expect(mockAstroService.runAstroCommand).toHaveBeenCalledWith('build');
  });

  test('deployment features manage website environments', async () => {
    // Verify that the deployment manager is set correctly
    expect(await context.getDeploymentManager()).toBe(mockDeployManager);
    
    // Test website build
    context.buildWebsite = mock(() => Promise.resolve({
      success: true,
      message: 'Success',
      output: 'Output',
    }));
    
    const buildResult = await context.handleWebsiteBuild();
    expect(buildResult.success).toBe(true);
    
    // Test failed build
    context.buildWebsite = mock(() => Promise.resolve({
      success: false,
      message: 'Failed',
      output: 'Error',
    }));
    
    const failedBuild = await context.handleWebsiteBuild();
    expect(failedBuild.success).toBe(false);
    expect(failedBuild.message).toContain('Failed to build');
    
    // Set promotion result
    mockDeployManager.setPromotionResult({
      success: true,
      message: 'Successfully promoted',
      url: 'https://example.com',
    });
    
    // Test promotion
    const promotion = await context.handleWebsitePromote();
    expect(promotion.success).toBe(true);
    expect(mockDeployManager.promoteToLive).toHaveBeenCalled();
    
    // Set environment statuses
    mockDeployManager.setEnvironmentStatus('preview', {
      buildStatus: 'Built' as const,
      fileCount: 123,
      accessStatus: 'Online',
    });
    
    mockDeployManager.setEnvironmentStatus('live', {
      buildStatus: 'Not Built' as const,
      fileCount: 0,
      accessStatus: 'Offline',
    });
    
    // Test preview status
    const previewStatus = await context.handleWebsiteStatus('preview');
    expect(previewStatus.success).toBe(true);
    expect(mockDeployManager.getEnvironmentStatus).toHaveBeenCalledWith('preview');
    
    // Test live status
    const liveStatus = await context.handleWebsiteStatus('live');
    expect(liveStatus.success).toBe(true);
    expect(mockDeployManager.getEnvironmentStatus).toHaveBeenCalledWith('live');
  });
  
  test('getDeploymentManager auto-creates a manager if none provided', async () => {
    // Create context without explicit deployment manager
    const contextWithoutManager = WebsiteContext.createFresh({}, {
      storage: mockStorage,
      astroContentService: mockAstroService,
    });
    
    // Get manager - it should be auto-created
    const manager = await contextWithoutManager.getDeploymentManager();
    expect(manager).toBeDefined();
  });

  test('identity service methods properly delegate to the identity service', async () => {
    // Set up test data
    const identityData = createTestIdentityData();
    const updatedIdentity = {
      ...identityData,
      creativeContent: {
        ...identityData.creativeContent,
        tagline: 'Updated tagline for testing',
      },
    };

    // Mock the methods
    mockIdentityService.getIdentity = mock((forceRegenerate = false) => {
      return Promise.resolve(forceRegenerate ? updatedIdentity : identityData);
    });
    
    mockIdentityService.generateIdentity = mock(() => {
      return Promise.resolve(identityData);
    });
    
    mockIdentityService.updateIdentity = mock((updates) => {
      const result = {
        ...identityData,
        ...updates,
        updatedAt: new Date(),
      };
      return Promise.resolve(result);
    });

    // Test the service getter
    const service = context.getIdentityService();
    // Just check that we get a service back, to avoid type issues
    expect(service).toBeDefined();

    // Test getIdentity method
    const identity = await context.getIdentity();
    expect(identity).toEqual(identityData);
    expect(mockIdentityService.getIdentity).toHaveBeenCalledWith(false);

    // Test getIdentity with forceRegenerate
    const regeneratedIdentity = await context.getIdentity(true);
    expect(regeneratedIdentity).toEqual(updatedIdentity);
    expect(mockIdentityService.getIdentity).toHaveBeenCalledWith(true);

    // Test generateIdentity method
    const generatedResult = await context.generateIdentity();
    expect(generatedResult.success).toBe(true);
    expect(generatedResult.data).toEqual(identityData);
    expect(mockIdentityService.generateIdentity).toHaveBeenCalled();

    // Test updateIdentity method
    const updateData = {
      creativeContent: {
        title: 'Updated Title',
        description: 'Updated Description',
        tagline: 'New test tagline',
        keyAchievements: ['Updated achievement'],
      },
    };
    
    const updateResult = await context.updateIdentity(updateData);
    expect(updateResult.success).toBe(true);
    expect(mockIdentityService.updateIdentity).toHaveBeenCalledWith(updateData, false);
  });
  
  test('landing page generation uses identity when available', async () => {
    // Set up test data
    const landingPageData = createTestLandingPageData();
    const identityData = createTestIdentityData();
    
    // Mock the services
    mockIdentityService.getIdentity = mock(() => Promise.resolve(identityData));
    mockLandingPageService.generateLandingPageData = mock(() => Promise.resolve(landingPageData));
    mockLandingPageService.editLandingPage = mock(() => Promise.resolve(landingPageData));
    
    // Test landing page generation with identity
    await context.generateLandingPage(true, false);
    expect(mockIdentityService.getIdentity).toHaveBeenCalledWith(false);
    expect(mockLandingPageService.generateLandingPageData).toHaveBeenCalledWith(identityData);
    
    // Test landing page generation with identity regeneration
    await context.generateLandingPage(true, true);
    expect(mockIdentityService.getIdentity).toHaveBeenCalledWith(true);
    
    // Test landing page generation without identity
    // Note: we can't check the exact parameter due to mock implementation details
    mockLandingPageService.generateLandingPageData.mockClear();
    await context.generateLandingPage(false);
    expect(mockLandingPageService.generateLandingPageData).toHaveBeenCalled();
    
    // Test landing page editing with identity
    await context.editLandingPage(true);
    expect(mockIdentityService.getIdentity).toHaveBeenCalled();
    expect(mockLandingPageService.editLandingPage).toHaveBeenCalled();
    
    // Test landing page editing without identity
    mockLandingPageService.editLandingPage.mockClear();
    await context.editLandingPage(false);
    expect(mockLandingPageService.editLandingPage).toHaveBeenCalled();
  });
});
