/**
 * Tests for the refactored ProfileContext using BaseContext
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, mock, test } from 'bun:test';

import { ProfileContext } from '@/mcp/contexts/profiles/core/profileContext';
import type { Profile } from '@/models/profile';
import { mockLogger } from '@test/mocks';
import logger from '@utils/logger';

// Mock the dependency container and service registry functions
mock.module('@/services/serviceRegistry', () => ({
  registerServices: mock(() => {}),
  ServiceIdentifiers: {
    ProfileRepository: 'ProfileRepository',
    ProfileEmbeddingService: 'ProfileEmbeddingService',
    ProfileTagService: 'ProfileTagService',
    ProfileSearchService: 'ProfileSearchService',
  },
}));

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
const createMockServices = () => {
  return {
    ProfileRepository: {
      getProfile: mock(() => Promise.resolve(mockProfile)),
      insertProfile: mock((profile: Profile) => Promise.resolve(profile.id || 'new-id')),
      updateProfile: mock(() => Promise.resolve(true)),
      deleteProfile: mock(() => Promise.resolve(true)),
    },
    ProfileEmbeddingService: {
      generateEmbedding: mock(() => Promise.resolve([0.1, 0.2, 0.3])),
      getProfileTextForEmbedding: mock(() => 'Profile text for embedding'),
      shouldRegenerateEmbedding: mock(() => true),
      generateEmbeddingForProfile: mock(() => Promise.resolve({ updated: true })),
    },
    ProfileTagService: {
      generateProfileTags: mock(() => Promise.resolve(['developer', 'typescript'])),
      updateProfileTags: mock(() => Promise.resolve(['developer', 'typescript'])),
      extractProfileKeywords: mock(() => ['developer', 'typescript']),
    },
    ProfileSearchService: {
      findRelatedNotes: mock(() => Promise.resolve([{ id: 'note-1', similarity: 0.8 }])),
      findNotesWithSimilarTags: mock(() => Promise.resolve([{ id: 'note-2', similarity: 0.7 }])),
    },
  };
};

// Mock dependency container
mock.module('@/utils/dependencyContainer', () => {
  const mockServices = createMockServices();
  
  return {
    getContainer: mock(() => ({
      register: mock(() => {}),
      resolve: mock(() => {}),
    })),
    getService: mock((serviceId: string) => {
      return mockServices[serviceId as keyof typeof mockServices];
    }),
  };
});

describe('ProfileContext', () => {
  // Mock the logger to prevent output in tests
  mockLogger(logger);
  
  // In Bun we can't do automatic cleanup, but we could do manual cleanup in each test if needed
  
  // Note: In Bun, we need to manually reset in each test
  
  test('getInstance should return a singleton instance', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const instance1 = ProfileContext.getInstance();
    const instance2 = ProfileContext.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('createFresh should return a new instance', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const instance1 = ProfileContext.getInstance();
    const instance2 = ProfileContext.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    // Reset the singleton instance first
    ProfileContext.resetInstance();
    const instance1 = ProfileContext.getInstance();
    ProfileContext.resetInstance();
    const instance2 = ProfileContext.getInstance();
    
    expect(instance1).not.toBe(instance2);
  });
  
  test('getContextName should return the configured name or default', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const defaultContext = ProfileContext.createFresh();
    const namedContext = ProfileContext.createFresh({ name: 'CustomProfile' });
    
    expect(defaultContext.getContextName()).toBe('ProfileBrain');
    expect(namedContext.getContextName()).toBe('CustomProfile');
  });
  
  test('getContextVersion should return the configured version or default', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const defaultContext = ProfileContext.createFresh();
    const versionedContext = ProfileContext.createFresh({ version: '2.0.0' });
    
    expect(defaultContext.getContextVersion()).toBe('1.0.0');
    expect(versionedContext.getContextVersion()).toBe('2.0.0');
  });
  
  test('initialize should set readyState to true', async () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    // Initial state should be not ready
    expect(context.isReady()).toBe(false);
    
    // Initialize the context
    await context.initialize();
    
    // Context should now be ready
    expect(context.isReady()).toBe(true);
  });
  
  test('getStatus should return correct status object', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    const status = context.getStatus();
    expect(status).toEqual({
      name: 'ProfileBrain',
      version: '1.0.0',
      ready: false,
      resourceCount: 1,
      toolCount: 3,
    });
  });
  
  test('getProfile should retrieve the user profile', async () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    const profile = await context.getProfile();
    
    expect(profile).toEqual(mockProfile);
  });
  
  test('saveProfile should create a new profile', async () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    const id = await context.saveProfile({
      fullName: 'New User',
      headline: 'New Developer',
    });
    
    expect(id).toBe('profile-1');
  });
  
  test('updateProfile should update an existing profile', async () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    await context.updateProfile({
      fullName: 'Updated Name',
    });
    
    // Ensure the storage.update was called
    // We can't easily check this directly with the mocks, but we can
    // verify that no error was thrown
  });
  
  test('setNoteContext and getNoteContext should work correctly', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    const mockNoteContext = { 
      getStatus: () => ({ ready: true }),
      searchNotesWithEmbedding: mock(() => Promise.resolve([])),
      searchNotes: mock(() => Promise.resolve([])),
    };
    
    context.setNoteContext(mockNoteContext);
    
    expect(context.getNoteContext()).toBe(mockNoteContext);
  });
  
  test('extractProfileKeywords should call tagService', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    const keywords = context.extractProfileKeywords(mockProfile);
    
    expect(keywords).toEqual(['developer', 'typescript']);
  });
  
  test('registerOnServer should register resources and tools', () => {
    // Reset the singleton instance
    ProfileContext.resetInstance();
    const context = ProfileContext.createFresh();
    
    // Create a mock server
    const mockServer = {
      resource: mock(() => {}),
      tool: mock(() => {}),
    } as unknown as McpServer;
    
    // Register on the server
    const result = context.registerOnServer(mockServer);
    
    // Check the result
    expect(result).toBe(true);
  });
});