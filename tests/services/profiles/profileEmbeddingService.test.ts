import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Profile } from '@/models/profile';
import { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import { 
  MockProfileRepository,
  setupEmbeddingMocks,
} from '@test';
import { createMockProfile } from '@test/__mocks__/models/profile';


// Set up embedding service mocks
setupEmbeddingMocks(mock);

// Create a mock profile for testing - using the standard createMockProfile but customizing it
const mockProfile: Profile = {
  ...createMockProfile('profile-1'),
  headline: 'Senior Developer | Open Source Contributor',
  summary: 'Experienced software engineer with a focus on TypeScript and React.',
  experiences: [
    {
      title: 'Senior Developer',
      company: 'Tech Corp',
      description: 'Leading development of web applications',
      starts_at: { day: 1, month: 1, year: 2020 },
      ends_at: null,
      company_linkedin_profile_url: null,
      company_facebook_profile_url: null,
      location: null,
      logo_url: null,
    },
  ],
  education: [
    {
      degree_name: 'Computer Science',
      school: 'University of Technology',
      starts_at: { day: 1, month: 9, year: 2012 },
      ends_at: { day: 30, month: 6, year: 2016 },
      field_of_study: null,
      school_linkedin_profile_url: null,
      school_facebook_profile_url: null,
      description: null,
      logo_url: null,
      grade: null,
      activities_and_societies: null,
    },
  ],
  tags: ['software-engineering', 'typescript', 'react'],
};

// Create a mock repository with the test profile
const mockRepository = new MockProfileRepository(mockProfile);

// No need to add the static factory method as the class doesn't have one - we'll handle this in the test

describe('ProfileEmbeddingService', () => {
  let embeddingService: ProfileEmbeddingService;
  
  beforeEach(() => {
    // Create the service
    embeddingService = new ProfileEmbeddingService('mock-api-key');
    
    // Replace the repository in the service with our mock
    Object.defineProperty(embeddingService, 'repository', {
      value: mockRepository,
      writable: true,
    });
  });
  
  test('should properly initialize', () => {
    expect(embeddingService).toBeDefined();
  });
  
  test('should create instance with API key', () => {
    const service = new ProfileEmbeddingService('mock-api-key');
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
    expect(profileText).toContain('John Doe');
    // Update the expected text to match what's actually generated
    expect(profileText).toContain('Ecosystem Architect');
    expect(profileText).toContain('Senior Developer');
    expect(profileText).toContain('Tech Corp');
    expect(profileText).toContain('University of Technology');
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