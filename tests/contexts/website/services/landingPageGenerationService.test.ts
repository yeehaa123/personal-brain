import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

import type { ProfileContext } from '@/contexts/profiles';
import { LandingPageGenerationService } from '@/contexts/website/services/landingPageGenerationService';
import type { BrainProtocol } from '@/protocol/brainProtocol';
import { MockProfileContext } from '@test/__mocks__/contexts/profileContext';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockBrainProtocol } from '@test/__mocks__/protocol/brainProtocol';
import type { LandingPageData } from '@website/schemas';

describe('LandingPageGenerationService', () => {
  let service: LandingPageGenerationService;
  let mockProfileContext: MockProfileContext;
  let mockBrainProtocol: MockBrainProtocol;

  beforeEach(() => {
    // Reset dependencies
    MockProfileContext.resetInstance();
    MockBrainProtocol.resetInstance();

    // Configure mock brain protocol
    mockBrainProtocol = MockBrainProtocol.getInstance();

    // Override the processQuery method to return landing page data
    mockBrainProtocol.processQuery = mock((query: unknown) => Promise.resolve({
      query,
      answer: `{
        "name": "AI Generated Name",
        "title": "AI Generated Title",
        "tagline": "AI Generated Tagline"
      }`,
      citations: [],
      relatedNotes: [],
    }));

    // Create a fresh profile context
    mockProfileContext = MockProfileContext.createFresh();

    // Create a fresh service instance
    service = LandingPageGenerationService.createFresh();

    // Set the mock profile context
    service.setProfileContext(mockProfileContext as unknown as ProfileContext);

    // Mock getBrainProtocol to return our configured mock
    spyOn(service, 'getBrainProtocol').mockImplementation(() => {
      return mockBrainProtocol as unknown as BrainProtocol;
    });
  });

  afterEach(() => {
    // Clean up
    LandingPageGenerationService.resetInstance();
  });

  test('generateLandingPageData should return AI-generated content', async () => {
    // Setup mock profile
    const mockProfile = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfile));

    const result = await service.generateLandingPageData();

    // Verify the generated data matches AI-enhanced content
    expect(result).toEqual({
      name: 'AI Generated Name',
      title: 'AI Generated Title',
      tagline: 'AI Generated Tagline',
    });
  });

  test('generateLandingPageData should handle missing profile', async () => {
    // Mock profile not found
    mockProfileContext.getProfile = mock(() => Promise.resolve(null));

    await expect(service.generateLandingPageData()).rejects.toThrow('No profile found');
  });

  test('should apply custom overrides to AI-generated content', async () => {
    // Setup mock profile
    const mockProfile = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfile));

    const overrides: Partial<LandingPageData> = {
      tagline: 'Custom tagline',
    };

    const result = await service.generateLandingPageData(overrides);

    // Verify custom tagline was used while AI content was used for other fields
    expect(result).toEqual({
      name: 'AI Generated Name',
      title: 'AI Generated Title',
      tagline: 'Custom tagline',
    });
  });

  test('should throw an error if BrainProtocol returns invalid JSON', async () => {
    // Setup mock profile
    const mockProfile = MockProfile.createDefault();
    mockProfileContext.getProfile = mock(() => Promise.resolve(mockProfile));

    // Configure mock brain protocol to return invalid JSON
    mockBrainProtocol.processQuery = mock((query: unknown) => Promise.resolve({
      query,
      answer: 'This is not valid JSON',
      citations: [],
      relatedNotes: [],
    }));

    // Should throw an error
    await expect(service.generateLandingPageData()).rejects.toThrow();
  });
});
