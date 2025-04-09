import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ProfileContext } from '@/mcp/contexts/profiles';
import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import { AstroContentService } from '@/mcp/contexts/website/services/astroContentService';
import { LandingPageGenerationService } from '@/mcp/contexts/website/services/landingPageGenerationService';
import type { LandingPageData } from '@/mcp/contexts/website/storage/websiteStorage';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/website/websiteStorageAdapter';

// Create a properly typed mock AstroContentService
class MockAstroContentService extends AstroContentService {
  constructor() {
    super('/mock/astro/path');
  }
  
  override verifyAstroProject = mock(() => Promise.resolve(true));
  override writeLandingPageContent = mock(() => Promise.resolve(true));
  override readLandingPageContent = mock(() => Promise.resolve(null));
  override runAstroCommand = mock(() => Promise.resolve({ success: true, output: 'Command executed successfully' }));
}

// Create our mock instance
const mockAstroContentService = new MockAstroContentService();

// Create a properly typed mock LandingPageGenerationService
class MockLandingPageGenerationService extends LandingPageGenerationService {
  override setProfileContext = mock(() => {});
  override generateLandingPageData = mock(() => Promise.resolve({
    name: 'Test User',
    title: 'Test User - Developer',
    tagline: 'Building great software',
  }));
}

// Create our mock instance
const mockLandingPageGenerationService = new MockLandingPageGenerationService();

// Create a typed mock for the LandingPageGenerationService.getInstance
const mockLandingPageGenerationServiceGetInstance = 
  mock(() => mockLandingPageGenerationService);

// Store original implementation
const OriginalLandingPageGenerationService = {
  getInstance: LandingPageGenerationService.getInstance,
};

describe('WebsiteContext', () => {
  // Set up and tear down for each test
  beforeEach(() => {
    // Reset singletons
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();

    // Reset mocks
    mockAstroContentService.verifyAstroProject.mockClear();
    mockAstroContentService.writeLandingPageContent.mockClear();
    mockAstroContentService.readLandingPageContent.mockClear();
    mockAstroContentService.runAstroCommand.mockClear();
    mockLandingPageGenerationService.generateLandingPageData.mockClear();
    mockLandingPageGenerationService.setProfileContext.mockClear();

    // Mock the LandingPageGenerationService getInstance
    LandingPageGenerationService.getInstance = mockLandingPageGenerationServiceGetInstance;
  });

  afterEach(() => {
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();

    // Restore the original implementations
    LandingPageGenerationService.getInstance = OriginalLandingPageGenerationService.getInstance;
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

  test('previewWebsite should run the dev command through astro service', async () => {
    mockAstroContentService.runAstroCommand = mock(() =>
      Promise.resolve({ success: true, output: 'Local: http://localhost:4321' }),
    );

    // Create context with mocked Astro service
    const context = WebsiteContext.createFresh({
      astroContentService: mockAstroContentService,
    });

    const result = await context.previewWebsite();

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(mockAstroContentService.runAstroCommand).toHaveBeenCalledWith('dev');
  });
});
