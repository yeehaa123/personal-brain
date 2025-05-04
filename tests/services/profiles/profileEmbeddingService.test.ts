import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Profile } from '@/models/profile';
import type { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockProfileRepository } from '@test/__mocks__/repositories/profileRepository';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

// Mock the EmbeddingService directly
mock.module('@/resources/ai/embedding', () => ({
  EmbeddingService: MockEmbeddingService,
}));

// Will be initialized in beforeEach
let mockProfile: Profile;
let mockRepository: ProfileRepository;

// No need to add the static factory method as the class doesn't have one - we'll handle this in the test

describe('ProfileEmbeddingService', () => {
  let embeddingService: ProfileEmbeddingService;

  beforeEach(async () => {
    // Reset singleton instances to ensure test isolation
    ProfileEmbeddingService.resetInstance();
    MockEmbeddingService.resetInstance();
    MockProfileRepository.resetInstance();
    
    // Create a dev profile which already has appropriate fields for tests
    mockProfile = await MockProfile.createDeveloperProfile('profile-1');
    
    // Create the repository with our mock profile
    mockRepository = MockProfileRepository.createFresh([mockProfile]);
    
    // Create the embedding service using the standardized factory method
    const mockEmbeddingService = MockEmbeddingService.createFresh();
    
    // Use createFresh to create a new instance with our dependencies
    embeddingService = ProfileEmbeddingService.createFresh(
      mockEmbeddingService as unknown as EmbeddingService,
      mockRepository as unknown as ProfileRepository,
    );
  });

  test('should properly initialize', () => {
    expect(embeddingService).toBeDefined();
  });

  test('should create instance with dependency injection', () => {
    const mockEmbedding = MockEmbeddingService.createFresh();
    const service = ProfileEmbeddingService.createFresh(mockEmbedding as unknown as EmbeddingService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ProfileEmbeddingService);
  });

  test('should generate embedding for text', async () => {
    const text = 'This is a profile description for embedding generation';
    const embedding = await embeddingService.generateEmbedding(text);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
  });

  test('should determine when to regenerate embeddings', () => {
    // Should regenerate when important profile fields change
    const changes1: Partial<Profile> = {
      summary: 'New summary content',
    };
    expect(embeddingService.shouldRegenerateEmbedding(changes1)).toBe(true);

    const changes2: Partial<Profile> = {
      experiences: [
        {
          title: 'New Job',
          company: 'New Company',
          description: 'New role',
          starts_at: { day: 1, month: 1, year: 2023 },
          ends_at: null,
          company_linkedin_profile_url: null,
          company_facebook_profile_url: null,
          location: null,
          logo_url: null,
        },
      ],
    };
    expect(embeddingService.shouldRegenerateEmbedding(changes2)).toBe(true);

    // Should not regenerate for non-essential fields
    const changes3: Partial<Profile> = {
      updatedAt: new Date(),
    };
    expect(embeddingService.shouldRegenerateEmbedding(changes3)).toBe(false);
  });

  test('should generate profile text for embedding', () => {
    const profileText = embeddingService.getProfileTextForEmbedding(mockProfile);

    expect(profileText).toBeDefined();
    expect(typeof profileText).toBe('string');
    expect(profileText.length).toBeGreaterThan(0);

    // Should include important profile information
    expect(profileText).toContain('Jane Smith');
    // Update the expected text to match what's actually generated
    expect(profileText).toContain('Senior Software Engineer');
    expect(profileText).toContain('Senior Developer');
    expect(profileText).toContain('TechCorp');
    expect(profileText).toContain('University of Innovation');
  });

  test('should generate embedding for profile', async () => {
    // Mock the repository's getProfile and updateProfile methods
    mockRepository.getProfile = async () => mockProfile;
    mockRepository.updateProfile = async () => true;

    const result = await embeddingService.generateEmbeddingForProfile();

    expect(result).toBeDefined();
    expect(result.updated).toBe(true);
  });

  test('should handle profile with minimal information', () => {
    const minimalProfile: Partial<Profile> = {
      fullName: 'John Smith',
      // Missing most fields
    };

    const profileText = embeddingService.getProfileTextForEmbedding(minimalProfile);

    expect(profileText).toBeDefined();
    expect(typeof profileText).toBe('string');
    expect(profileText.length).toBeGreaterThan(0);
    expect(profileText).toContain('John Smith');
  });

  test('should skip undefined or null fields', () => {
    const partialProfile: Partial<Profile> = {
      fullName: 'John Smith',
      occupation: null,
      summary: undefined,
      headline: 'Developer',
    };

    const profileText = embeddingService.getProfileTextForEmbedding(partialProfile);

    expect(profileText).toBeDefined();
    expect(profileText).toContain('John Smith');
    expect(profileText).toContain('Developer');
    // Should not include null or undefined fields
    expect(profileText).not.toContain('null');
    expect(profileText).not.toContain('undefined');
  });
});
