/**
 * Tests for the refactored ProfileContext using BaseContext
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';


import { ProfileContext } from '@/contexts';
import type { Profile } from '@/models/profile';
import type { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import type { ProfileSearchService } from '@/services/profiles/profileSearchService';
import type { ProfileTagService } from '@/services/profiles/profileTagService';
import { silenceLogger } from '@test/__mocks__';
import { createMockMcpServer } from '@test/__mocks__/core/MockMcpServer';
import logger from '@utils/logger';

// Mock profile for testing
const mockProfile: Profile = {
  id: 'profile-1',
  fullName: 'Test User',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  embedding: [0.1, 0.2, 0.3],
  tags: ['developer', 'typescript'],
  publicIdentifier: 'testuser',
  headline: 'Software Developer',
  summary: 'Experienced developer',
  // Other fields as null or defaults
  profilePicUrl: null,
  backgroundCoverImageUrl: null,
  firstName: null,
  lastName: null,
  followerCount: 0,
  occupation: null,
  city: null,
  state: null,
  country: null,
  countryFullName: null,
  experiences: null,
  education: null,
  languages: null,
  languagesAndProficiencies: null,
  accomplishmentPublications: null,
  accomplishmentHonorsAwards: null,
  accomplishmentProjects: null,
  volunteerWork: null,
};

// Create mock services
const mockProfileRepository = {
  getProfile: mock(() => Promise.resolve(mockProfile)),
  insertProfile: mock((profile: Profile) => Promise.resolve(profile.id || 'new-id')),
  updateProfile: mock(() => Promise.resolve(true)),
  deleteProfile: mock(() => Promise.resolve(true)),
};

const mockProfileEmbeddingService = {
  generateEmbedding: mock(() => Promise.resolve([0.1, 0.2, 0.3])),
  getProfileTextForEmbedding: mock(() => 'Profile text for embedding'),
  shouldRegenerateEmbedding: mock(() => true),
  generateEmbeddingForProfile: mock(() => Promise.resolve({ updated: true })),
};

const mockProfileTagService = {
  generateProfileTags: mock(() => Promise.resolve(['developer', 'typescript'])),
  updateProfileTags: mock(() => Promise.resolve(['developer', 'typescript'])),
  extractProfileKeywords: mock(() => ['developer', 'typescript']),
};

const mockProfileSearchService = {
  findRelatedNotes: mock(() => Promise.resolve([{ id: 'note-1', similarity: 0.8 }])),
  findNotesWithSimilarTags: mock(() => Promise.resolve([{ id: 'note-2', similarity: 0.7 }])),
};

describe('ProfileContext', () => {
  // Mock the logger to prevent output in tests
  silenceLogger(logger);
  
  // Create a new context for each test with direct dependency injection
  let profileContext: ProfileContext;
  
  beforeEach(() => {
    // Reset the singleton instance first
    ProfileContext.resetInstance();
    
    // Create a fresh context with directly injected dependencies
    profileContext = new ProfileContext(
      { apiKey: 'mock-api-key' },
      {
        repository: mockProfileRepository as unknown as ProfileRepository,
        embeddingService: mockProfileEmbeddingService as unknown as ProfileEmbeddingService,
        tagService: mockProfileTagService as unknown as ProfileTagService,
        searchService: mockProfileSearchService as unknown as ProfileSearchService,
      }
    );
  });
  
  test('getInstance should return a singleton instance', () => {
    // We'll need to patch the createWithDependencies method temporarily for testing singleton
    const origCreateWithDependencies = ProfileContext.createWithDependencies;
    ProfileContext.createWithDependencies = mock(() => {
      return new ProfileContext(
        { apiKey: 'test-api-key' },
        {
          repository: mockProfileRepository as unknown as ProfileRepository,
          embeddingService: mockProfileEmbeddingService as unknown as ProfileEmbeddingService,
          tagService: mockProfileTagService as unknown as ProfileTagService,
          searchService: mockProfileSearchService as unknown as ProfileSearchService,
        }
      );
    });
    
    try {
      // Create a fresh instance and capture it
      const instance1 = ProfileContext.getInstance();
      
      // Get the instance again - should be the same object reference
      const instance2 = ProfileContext.getInstance();
      
      // Compare directly using strict equality
      expect(instance1 === instance2).toBe(true);
    } finally {
      // Restore original implementation
      ProfileContext.createWithDependencies = origCreateWithDependencies;
    }
  });
  
  test('createFresh should return a new instance', () => {
    // We'll need to patch the createWithDependencies method temporarily for testing
    const origCreateWithDependencies = ProfileContext.createWithDependencies;
    ProfileContext.createWithDependencies = mock(() => {
      return new ProfileContext(
        { apiKey: 'test-api-key' },
        {
          repository: mockProfileRepository as unknown as ProfileRepository,
          embeddingService: mockProfileEmbeddingService as unknown as ProfileEmbeddingService,
          tagService: mockProfileTagService as unknown as ProfileTagService,
          searchService: mockProfileSearchService as unknown as ProfileSearchService,
        }
      );
    });
    
    try {
      const instance1 = ProfileContext.getInstance();
      const instance2 = ProfileContext.createFresh();
      
      expect(instance1).not.toBe(instance2);
    } finally {
      // Restore original implementation
      ProfileContext.createWithDependencies = origCreateWithDependencies;
    }
  });
  
  test('resetInstance should clear the singleton instance', () => {
    // We'll need to patch the createWithDependencies method temporarily for testing
    const origCreateWithDependencies = ProfileContext.createWithDependencies;
    ProfileContext.createWithDependencies = mock(() => {
      return new ProfileContext(
        { apiKey: 'test-api-key' },
        {
          repository: mockProfileRepository as unknown as ProfileRepository,
          embeddingService: mockProfileEmbeddingService as unknown as ProfileEmbeddingService,
          tagService: mockProfileTagService as unknown as ProfileTagService,
          searchService: mockProfileSearchService as unknown as ProfileSearchService,
        }
      );
    });
    
    try {
      // Get first instance
      const instance1 = ProfileContext.getInstance();
      
      // Reset the singleton instance
      ProfileContext.resetInstance();
      
      // Get a new instance - should be different
      const instance2 = ProfileContext.getInstance();
      
      expect(instance1).not.toBe(instance2);
    } finally {
      // Restore original implementation
      ProfileContext.createWithDependencies = origCreateWithDependencies;
    }
  });
  
  test('getContextName should return the configured name or default', () => {
    // Test the instance created in beforeEach (default name)
    expect(profileContext.getContextName()).toBe('ProfileBrain');
    
    // Create a context with a custom name
    const namedContext = new ProfileContext(
      { name: 'CustomProfile' },
      {
        repository: mockProfileRepository as unknown as ProfileRepository,
        embeddingService: mockProfileEmbeddingService as unknown as ProfileEmbeddingService,
        tagService: mockProfileTagService as unknown as ProfileTagService,
        searchService: mockProfileSearchService as unknown as ProfileSearchService,
      }
    );
    
    expect(namedContext.getContextName()).toBe('CustomProfile');
  });
  
  test('getContextVersion should return the configured version or default', () => {
    // Test the instance created in beforeEach (default version)
    expect(profileContext.getContextVersion()).toBe('1.0.0');
    
    // Create a context with a custom version
    const versionedContext = new ProfileContext(
      { version: '2.0.0' },
      {
        repository: mockProfileRepository as unknown as ProfileRepository,
        embeddingService: mockProfileEmbeddingService as unknown as ProfileEmbeddingService,
        tagService: mockProfileTagService as unknown as ProfileTagService,
        searchService: mockProfileSearchService as unknown as ProfileSearchService,
      }
    );
    
    expect(versionedContext.getContextVersion()).toBe('2.0.0');
  });
  
  test('initialize should set readyState to true', async () => {
    // Initial state should be not ready
    expect(profileContext.isReady()).toBe(false);
    
    // Initialize the context
    await profileContext.initialize();
    
    // Context should now be ready
    expect(profileContext.isReady()).toBe(true);
  });
  
  test('getStatus should return correct status object', () => {
    const status = profileContext.getStatus();
    expect(status).toEqual({
      name: 'ProfileBrain',
      version: '1.0.0',
      ready: false,
      resourceCount: 1,
      toolCount: 3,
    });
  });
  
  test('getProfile should retrieve the user profile', async () => {
    const profile = await profileContext.getProfile();
    expect(profile).toEqual(mockProfile);
  });
  
  test('saveProfile should create a new profile', async () => {
    const id = await profileContext.saveProfile({
      fullName: 'New User',
      headline: 'New Developer',
    });
    
    expect(id).toBe('profile-1');
  });
  
  test('updateProfile should update an existing profile', async () => {
    await profileContext.updateProfile({
      fullName: 'Updated Name',
    });
    
    // Verify the mock was called
    expect(mockProfileRepository.updateProfile).toHaveBeenCalled();
  });
  
  test('setNoteContext and getNoteContext should work correctly', () => {
    const mockNoteContext = { 
      getStatus: () => ({ ready: true }),
      searchNotesWithEmbedding: mock(() => Promise.resolve([])),
      searchNotes: mock(() => Promise.resolve([])),
    };
    
    profileContext.setNoteContext(mockNoteContext);
    expect(profileContext.getNoteContext()).toBe(mockNoteContext);
  });
  
  test('extractProfileKeywords should call tagService', () => {
    const keywords = profileContext.extractProfileKeywords(mockProfile);
    expect(keywords).toEqual(['developer', 'typescript']);
    expect(mockProfileTagService.extractProfileKeywords).toHaveBeenCalled();
  });
  
  test('registerOnServer should register resources and tools', () => {
    // Create a standardized mock server with the new API style
    const mockServer = createMockMcpServer('ProfileBrainTest', '1.0.0');
    
    // Register on the server
    const result = profileContext.registerOnServer(mockServer);
    
    // Check the result
    expect(result).toBe(true);
    
    // Verify resources and tools were registered using the new API
    const registeredResources = mockServer.getRegisteredResources();
    const registeredTools = mockServer.getRegisteredTools();
    
    // Profile context should register 1 resource and 3 tools
    expect(registeredResources.length).toBe(1);
    expect(registeredTools.length).toBe(3);
    
    // Verify specific resource path
    expect(registeredResources[0].path).toBe('get');
    
    // Verify tool names (the mock stores names as path property)
    expect(registeredTools.some(tool => tool.path === 'Update Profile')).toBe(true);
    expect(registeredTools.some(tool => tool.path === 'Get Profile Tags')).toBe(true);
    expect(registeredTools.some(tool => tool.path === 'Update Profile Tags')).toBe(true);
  });
});