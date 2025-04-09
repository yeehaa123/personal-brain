import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ProfileContext } from '@/mcp/contexts/profiles';
import { LandingPageGenerationService } from '@/mcp/contexts/website/services/landingPageGenerationService';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockProfile } from '@test/__mocks__/models/profile';
import type { LandingPageData } from '@website/schemas';

describe('LandingPageGenerationService', () => {
  let service: LandingPageGenerationService;
  let mockProfileContext: MockProfileContext;
  
  beforeEach(() => {
    // Reset dependencies
    MockProfileContext.resetInstance();
    
    // Create a fresh profile context
    mockProfileContext = MockProfileContext.createFresh();
    
    // Create a fresh service instance
    service = LandingPageGenerationService.createFresh();
    
    // Set the mock profile context
    service.setProfileContext(mockProfileContext as unknown as ProfileContext);
  });
  
  afterEach(() => {
    // Clean up
    LandingPageGenerationService.resetInstance();
  });
  
  test('should have getInstance and resetInstance static methods', () => {
    expect(typeof LandingPageGenerationService.getInstance).toBe('function');
    expect(typeof LandingPageGenerationService.resetInstance).toBe('function');
    expect(typeof LandingPageGenerationService.createFresh).toBe('function');
  });
  
  test('getInstance should return a singleton instance', () => {
    const instance1 = LandingPageGenerationService.getInstance();
    const instance2 = LandingPageGenerationService.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const instance1 = LandingPageGenerationService.getInstance();
    LandingPageGenerationService.resetInstance();
    const instance2 = LandingPageGenerationService.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('createFresh should create a new instance', () => {
    const instance1 = LandingPageGenerationService.getInstance();
    const instance2 = LandingPageGenerationService.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('generateLandingPageData should extract data from profile', async () => {
    // Setup mock profile
    const mockProfile = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfile));
    
    const result = await service.generateLandingPageData();
    
    // Verify the generated data matches profile data
    expect(result).toEqual({
      name: mockProfile.fullName,
      title: `${mockProfile.fullName} - ${mockProfile.occupation || 'Personal Website'}`,
      tagline: mockProfile.headline || 'Welcome to my personal website',
    });
  });
  
  test('generateLandingPageData should handle missing profile', async () => {
    // Mock profile not found
    mockProfileContext.getProfile = mock(() => Promise.resolve(null));
    
    await expect(service.generateLandingPageData()).rejects.toThrow('No profile found');
  });
  
  test('generateLandingPageData should handle missing required fields', async () => {
    // Mock profile with missing fields
    const incompleteProfile = MockProfile.createMinimalProfile();
    mockProfileContext.getProfile = mock(() => Promise.resolve(incompleteProfile));
    
    const result = await service.generateLandingPageData();
    
    // Should use fallbacks
    expect(result.name).toBe(incompleteProfile.fullName);
    expect(result.title).toBe(`${incompleteProfile.fullName} - Personal Website`);
    expect(result.tagline).toBe('Welcome to my personal website');
  });
  
  test('generateLandingPageData should use occupation for title if available', async () => {
    // Mock profile with occupation
    const profileWithOccupation = MockProfile.createDeveloperProfile();
    mockProfileContext.getProfile = mock(() => Promise.resolve(profileWithOccupation));
    
    const result = await service.generateLandingPageData();
    
    // Should use occupation in title
    expect(result.title).toBe(`${profileWithOccupation.fullName} - ${profileWithOccupation.occupation}`);
  });
  
  test('generateLandingPageData should use headline for tagline if available', async () => {
    // Mock profile with headline
    const profileWithHeadline = MockProfile.createDeveloperProfile();
    mockProfileContext.getProfile = mock(() => Promise.resolve(profileWithHeadline));
    
    const result = await service.generateLandingPageData();
    
    // Should use headline for tagline (headline is defined in the developer profile)
    expect(result.tagline).toBe(profileWithHeadline.headline || '');
  });
  
  test('should allow customization via overrides', async () => {
    // Setup mock profile
    const mockProfile = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfile));
    
    const overrides: Partial<LandingPageData> = {
      tagline: 'Custom tagline',
    };
    
    const result = await service.generateLandingPageData(overrides);
    
    // Verify custom tagline was used
    expect(result.tagline).toBe('Custom tagline');
    // Standard fields should still be populated from profile
    expect(result.name).toBe(mockProfile.fullName);
  });
});