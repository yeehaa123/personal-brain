import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ProfileContext } from '@/mcp/contexts/profiles';
import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import type { AstroContentService, AstroContentServiceTestHelpers } from '@/mcp/contexts/website/services/astroContentService';
import type { LandingPageGenerationService } from '@/mcp/contexts/website/services/landingPageGenerationService';
import type { LandingPageData } from '@/mcp/contexts/website/storage/websiteStorage';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/website/adapters/websiteStorageAdapter';
// Import our mock implementations directly
import { MockAstroContentService } from '@test/__mocks__/contexts/website/services/astroContentService';
import { MockLandingPageGenerationService } from '@test/__mocks__/contexts/website/services/landingPageGenerationService';
import { MockProfile } from '@test/__mocks__/models/profile';

// Create our mock instances with proper typings
const mockAstroContentService = MockAstroContentService.createFresh() as unknown as AstroContentService & AstroContentServiceTestHelpers;
const mockLandingPageGenerationService = MockLandingPageGenerationService.createFresh() as unknown as LandingPageGenerationService;
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
  });

  afterEach(() => {
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
  });

  // Test Component Interface Standardization pattern
  test('getInstance should return a singleton instance', () => {
    const context1 = WebsiteContext.getInstance();
    const context2 = WebsiteContext.getInstance();

    expect(context1).toBe(context2);
  });

  test('createFresh should return a new instance', () => {
    const context1 = WebsiteContext.getInstance();
    const context2 = WebsiteContext.createFresh();

    expect(context1).not.toBe(context2);
  });

  test('resetInstance should clear the singleton instance', () => {
    const context1 = WebsiteContext.getInstance();
    WebsiteContext.resetInstance();
    const context2 = WebsiteContext.getInstance();

    expect(context1).not.toBe(context2);
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

    const landingPageData: LandingPageData = {
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
    };

    await context.saveLandingPageData(landingPageData);

    expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(landingPageData);
  });

  test('getLandingPageData should retrieve landing page data', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockStorage.setLandingPageData({
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
    });

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

  test('getContextName should return the configured name', () => {
    const context1 = WebsiteContext.createFresh();
    const context2 = WebsiteContext.createFresh({ name: 'custom-website' });

    expect(context1.getContextName()).toBe('website');
    expect(context2.getContextName()).toBe('custom-website');
  });

  test('getContextVersion should return the configured version', () => {
    const context1 = WebsiteContext.createFresh();
    const context2 = WebsiteContext.createFresh({ version: '2.0.0' });

    expect(context1.getContextVersion()).toBe('1.0.0');
    expect(context2.getContextVersion()).toBe('2.0.0');
  });

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

  test('buildWebsite should run the build command through astro service', async () => {
    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const result = await context.buildWebsite();

    expect(result.success).toBe(true);
    expect(mockAstroContentService.runAstroCommand).toHaveBeenCalledWith('build');
  });

  test('previewWebsite should start the Astro dev server using PM2', async () => {
    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const result = await context.previewWebsite();

    expect(result.success).toBe(true);
    expect(result.url).toBe('http://localhost:4321');
    expect(result.message).toBe('Website preview started with PM2');
    expect(mockAstroContentService.startDevServer).toHaveBeenCalled();
  });
  
  test('previewWebsite should handle errors when starting the server fails', async () => {
    // Configure the mock to simulate failure
    mockAstroContentService.setStartDevServerFailure('PM2 startup error');
    
    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const result = await context.previewWebsite();

    expect(result.success).toBe(false);
    expect(result.message).toBe('Failed to start website preview');
    expect(mockAstroContentService.startDevServer).toHaveBeenCalled();
  });
  
  test('stopPreviewWebsite should stop the Astro dev server using PM2', async () => {
    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const result = await context.stopPreviewWebsite();

    expect(result.success).toBe(true);
    expect(result.message).toBe('Website preview server stopped successfully');
    expect(mockAstroContentService.stopDevServer).toHaveBeenCalled();
  });
  
  test('stopPreviewWebsite should handle errors when stopping the server fails', async () => {
    // Configure the mock to simulate failure
    mockAstroContentService.setStopDevServerFailure();
    
    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const result = await context.stopPreviewWebsite();

    expect(result.success).toBe(false);
    expect(result.message).toBe('Failed to stop website preview server');
    expect(mockAstroContentService.stopDevServer).toHaveBeenCalled();
  });
});
