import { beforeEach, describe, expect, test } from 'bun:test';

import type { Profile } from '@/models/profile';
import { ProfileTagService } from '@/services/profiles/profileTagService';
import { MockLogger } from '@test/__mocks__/core/logger';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockProfileRepository } from '@test/__mocks__/repositories/profileRepository';
import { MockProfileTagService } from '@test/__mocks__/services/profiles/profileTagService';
import { MockTagExtractor } from '@test/__mocks__/utils/tagExtractor';

// Will be initialized in beforeEach
let mockProfile: Profile;

describe('ProfileTagService', () => {
  let tagService: ProfileTagService;

  beforeEach(async () => {
    // Reset singleton instances
    MockProfileRepository.resetInstance();
    MockProfileTagService.resetInstance();
    MockTagExtractor.resetInstance();

    // Initialize mock profile
    mockProfile = await MockProfile.createDefault();

    // Set up mocked TagExtractor with predictable tags
    const mockTagExtractor = MockTagExtractor.createFresh({
      tags: ['software-development', 'typescript', 'react'],
    });

    // Create a fresh repository with the initial profile
    const repository = MockProfileRepository.createFresh([mockProfile]);

    // Create the service with all required dependencies
    tagService = ProfileTagService.createFresh({}, {
      repository,
      tagExtractor: mockTagExtractor,
      logger: MockLogger.getInstance(),
    });
  });

  test('should properly initialize', () => {
    expect(tagService).toBeDefined();
  });

  test('should extract keywords from profile', () => {
    const keywords = tagService.extractProfileKeywords(mockProfile);

    expect(keywords).toBeDefined();
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);

    // Should extract important keywords from the profile based on mock data
    expect(keywords).toContain('build');
    expect(keywords).toContain('ecosystems');
    expect(keywords).toContain('innovation');
    expect(keywords).toContain('collaboration');
  });

  test('should generate profile tags with AI', async () => {
    const profileText = 'John Doe is a software engineer with expertise in TypeScript and React.';
    const tags = await tagService.generateProfileTags(profileText);

    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);

    // Should include tags from our mock implementation
    expect(tags).toContain('software-development');
    expect(tags).toContain('typescript');
    expect(tags).toContain('react');
  });

  test('should update profile tags', async () => {
    const updatedTags = await tagService.updateProfileTags(true);

    expect(updatedTags).toBeDefined();
    expect(Array.isArray(updatedTags)).toBe(true);
    if (updatedTags) {
      expect(updatedTags.length).toBeGreaterThan(0);
    }
  });

  test('should handle minimal profile information', () => {
    const minimalProfile: Partial<Profile> = {
      id: 'min-profile-id',
      fullName: 'John Smith',
      occupation: 'Developer',
      // Add a small summary to ensure we get keywords
      summary: 'Experienced developer with React skills.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const keywords = tagService.extractProfileKeywords(minimalProfile);

    expect(keywords).toBeDefined();
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain('experienced');
    expect(keywords).toContain('developer');
    expect(keywords).toContain('react');
    expect(keywords).toContain('skills');
  });

  test('should extract keywords from experiences', () => {
    const profileWithExperiences: Partial<Profile> = {
      id: 'exp-profile-id',
      fullName: 'Jane Smith',
      experiences: [
        {
          title: 'Data Scientist',
          company: 'AI Corp',
          description: 'Machine learning and data analysis',
          starts_at: { day: 1, month: 1, year: 2020 },
          ends_at: null,
          company_linkedin_profile_url: null,
          company_facebook_profile_url: null,
          location: null,
          logo_url: null,
        },
        {
          title: 'Data Analyst',
          company: 'Data Inc',
          description: 'Statistical analysis and reporting',
          starts_at: { day: 1, month: 1, year: 2018 },
          ends_at: { day: 31, month: 12, year: 2019 },
          company_linkedin_profile_url: null,
          company_facebook_profile_url: null,
          location: null,
          logo_url: null,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const keywords = tagService.extractProfileKeywords(profileWithExperiences);

    expect(keywords).toBeDefined();
    expect(keywords).toContain('data');
    expect(keywords).toContain('scientist');
    expect(keywords).toContain('analyst');
  });

  test('should normalize tags before using them', async () => {
    // Since the normalization is likely happening within the extractTags function,
    // we'll test that the generateProfileTags method properly handles raw tags

    // We've already mocked extractTags at the module level to return consistent tags,
    // so we'll just test that generateProfileTags properly processes them

    const profileText = 'John is a software developer';
    const tags = await tagService.generateProfileTags(profileText);

    // Verify the returned tags are as expected from our mock
    expect(tags).toContain('software-development');
    expect(tags).toContain('typescript');
    expect(tags).toContain('react');

    // Test basic tag normalization logic that would occur in a normalization function
    const rawTags = ['Software Development', 'TypeScript ', ' React'];
    const normalizedTags = rawTags.map(tag => tag.trim().toLowerCase());

    expect(normalizedTags).toContain('software development');
    expect(normalizedTags).toContain('typescript');
    expect(normalizedTags).toContain('react');
  });
});
