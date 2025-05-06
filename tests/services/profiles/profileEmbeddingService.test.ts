/**
 * Profile Embedding Service Tests
 * 
 * Tests the service responsible for generating and managing
 * embeddings for user profiles.
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Profile } from '@/models/profile';
import type { EmbeddingService } from '@/resources/ai/embedding/embeddings';
import { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockProfileRepository } from '@test/__mocks__/repositories/profileRepository';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

// Mock the embedding service
mock.module('@/resources/ai/embedding', () => ({
  EmbeddingService: MockEmbeddingService,
}));

describe('ProfileEmbeddingService', () => {
  // Test state
  let mockProfile: Profile;
  let mockRepository: ProfileRepository;
  let embeddingService: ProfileEmbeddingService;
  let mockEmbeddingService: EmbeddingService;

  // Setup before each test
  beforeEach(async () => {
    // Reset singletons for test isolation
    ProfileEmbeddingService.resetInstance();
    MockEmbeddingService.resetInstance();
    MockProfileRepository.resetInstance();
    
    // Create test data
    mockProfile = await MockProfile.createDeveloperProfile('profile-1');
    mockRepository = MockProfileRepository.createFresh([mockProfile]);
    mockEmbeddingService = MockEmbeddingService.createFresh() as unknown as EmbeddingService;
    
    // Create service instance with dependencies
    embeddingService = ProfileEmbeddingService.createFresh(
      mockEmbeddingService,
      mockRepository as unknown as ProfileRepository,
    );
  });

  test('correctly initializes, generates embeddings, and handles profile changes', async () => {
    // Test text to embed
    const testText = 'This is a profile description for embedding generation';
    
    // Create test profile variations
    const profileChanges = {
      important: [
        { summary: 'New summary content' } as Partial<Profile>,
        { 
          experiences: [{
            title: 'New Job',
            company: 'New Company',
            description: 'New role',
            starts_at: { day: 1, month: 1, year: 2023 },
            ends_at: null,
            company_linkedin_profile_url: null,
            company_facebook_profile_url: null,
            location: null,
            logo_url: null,
          }],
        } as Partial<Profile>,
      ],
      nonEssential: { updatedAt: new Date() } as Partial<Profile>,
      
      minimal: { fullName: 'John Smith' } as Partial<Profile>,
      
      partial: {
        fullName: 'John Smith',
        occupation: null,
        summary: undefined,
        headline: 'Developer',
      } as Partial<Profile>,
    };
    
    // Mock repository methods for profile embedding generation
    mockRepository.getProfile = async () => mockProfile;
    mockRepository.updateProfile = async () => true;
    
    // Generate text embedding and profile embedding
    const textEmbedding = await embeddingService.generateEmbedding(testText);
    const profileText = embeddingService.getProfileTextForEmbedding(mockProfile);
    const profileResult = await embeddingService.generateEmbeddingForProfile();
    
    // Execute tests for minimal and partial profiles
    const minimalProfileText = embeddingService.getProfileTextForEmbedding(profileChanges.minimal);
    const partialProfileText = embeddingService.getProfileTextForEmbedding(profileChanges.partial);
    
    // Comprehensive assertion validating all embedding functionality
    expect({
      initialization: {
        serviceInitialized: embeddingService !== undefined,
        implementsCorrectClass: embeddingService instanceof ProfileEmbeddingService,
      },
      
      embeddingGeneration: {
        textEmbedding: {
          embedsText: textEmbedding !== undefined,
          returnsArray: Array.isArray(textEmbedding),
          hasValues: textEmbedding.length > 0,
        },
        
        profileEmbedding: {
          generatesResult: profileResult !== undefined,
          marksAsUpdated: profileResult.updated === true,
        },
      },
      
      regenerationLogic: {
        detectsImportantChanges: profileChanges.important.every(
          change => embeddingService.shouldRegenerateEmbedding(change),
        ),
        ignoresNonEssentialChanges: !embeddingService.shouldRegenerateEmbedding(profileChanges.nonEssential),
      },
      
      profileTextGeneration: {
        fullProfile: {
          returnsString: typeof profileText === 'string',
          hasContent: profileText.length > 0,
          includesName: profileText.includes('Jane Smith'),
          includesOccupation: profileText.includes('Senior Software Engineer'),
          includesExperience: profileText.includes('Senior Developer') && profileText.includes('TechCorp'),
          includesEducation: profileText.includes('University of Innovation'),
        },
        
        minimalProfile: {
          returnsString: typeof minimalProfileText === 'string',
          hasContent: minimalProfileText.length > 0,
          includesName: minimalProfileText.includes('John Smith'),
        },
        
        partialProfile: {
          includesName: partialProfileText.includes('John Smith'),
          includesHeadline: partialProfileText.includes('Developer'),
          skipsNullFields: !partialProfileText.includes('null'),
          skipsUndefinedFields: !partialProfileText.includes('undefined'),
        },
      },
    }).toMatchObject({
      initialization: {
        serviceInitialized: true,
        implementsCorrectClass: true,
      },
      
      embeddingGeneration: {
        textEmbedding: {
          embedsText: true,
          returnsArray: true,
          hasValues: true,
        },
        
        profileEmbedding: {
          generatesResult: true,
          marksAsUpdated: true,
        },
      },
      
      regenerationLogic: {
        detectsImportantChanges: true,
        ignoresNonEssentialChanges: true,
      },
      
      profileTextGeneration: {
        fullProfile: {
          returnsString: true,
          hasContent: true,
          includesName: true,
          includesOccupation: true,
          includesExperience: true,
          includesEducation: true,
        },
        
        minimalProfile: {
          returnsString: true,
          hasContent: true,
          includesName: true,
        },
        
        partialProfile: {
          includesName: true,
          includesHeadline: true,
          skipsNullFields: true,
          skipsUndefinedFields: true,
        },
      },
    });
  });
});
