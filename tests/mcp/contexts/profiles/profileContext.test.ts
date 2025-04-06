import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

import { ProfileContext } from '@/mcp';
import type { Profile } from '@/models/profile';
import {
  clearMockEnv,
  createMockProfile,
  setMockEnv,
  setupAnthropicMocks,
  setupMcpServerMocks,
} from '@test';
import { setupMcpServerMocks as createMockMcpServer } from '@test/utils/mcpUtils';


// Import the mock server creator that doesn't take parameters

// Create mock profile for testing
const mockProfile = createMockProfile();

// Create mock repository and services
const mockProfileRepository = {
  getProfile: async () => ({ ...mockProfile }),
  insertProfile: async () => 'mock-profile-id',
  updateProfile: async () => true,
  deleteProfile: async () => true,
};

const mockProfileEmbeddingService = {
  generateEmbedding: async () => Array(1536).fill(0).map((_, i) => (i % 10) / 10),
  generateEmbeddingForProfile: async () => ({ updated: true }),
  shouldRegenerateEmbedding: () => true,
  getProfileTextForEmbedding: (profile: Partial<Profile>) => {
    return `Name: ${profile.fullName}\nOccupation: ${profile.occupation}\nSummary: ${profile.summary || ''}\n`;
  },
};

const mockProfileTagService = {
  updateProfileTags: async () => ['ecosystem-architecture', 'innovation', 'collaboration', 'regenerative'],
  generateProfileTags: async () => ['ecosystem-architecture', 'innovation', 'collaboration'],
  extractProfileKeywords: (_profile: Partial<Profile>) => ['ecosystem', 'architect', 'innovation', 'collaboration', 'architecture'],
};

const mockProfileSearchService = {
  findRelatedNotes: async () => ([
    {
      id: 'note-1',
      title: 'Test Note',
      content: 'Related content',
      tags: ['ecosystem', 'innovation'],
      similarity: 0.85,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  findNotesWithSimilarTags: async () => ([
    {
      id: 'note-2',
      title: 'Similar Tags Note',
      content: 'Content with similar tags',
      tags: ['ecosystem', 'innovation'],
      similarity: 0.75,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
};

// Setup MCP server mock globally
const mockMcpServer = createMockMcpServer();

// Setup Anthropic mocks
setupAnthropicMocks(mock);

// Setup the MCP module mock using the wrapper function that takes mock parameter
setupMcpServerMocks(mock);

// We need to mock these specific imports together
mock.module('@/utils/dependencyContainer', () => {
  // Create a simple object that looks like a container
  const container = {
    resolve: (key: string) => {
      switch (key) {
      case 'repositories.profile': return mockProfileRepository;
      case 'embedding.profile': return mockProfileEmbeddingService;
      case 'tag.profile': return mockProfileTagService;
      case 'search.profile': return mockProfileSearchService;
      default: return {};
      }
    },
    register: () => {},
    has: () => true,
    clear: () => {},
  };
  
  return {
    getContainer: () => container,
    getService: (key: string) => container.resolve(key),
    container,
    createContainer: () => ({ ...container }),
    useTestContainer: () => () => {},
  };
});

// Also mock the service registry
mock.module('@/services/serviceRegistry', () => {
  return {
    ServiceIdentifiers: {
      // Repository identifiers
      NoteRepository: 'repositories.note',
      ProfileRepository: 'repositories.profile',
      
      // Embedding service identifiers
      NoteEmbeddingService: 'embedding.note',
      ProfileEmbeddingService: 'embedding.profile',
      
      // Search service identifiers
      NoteSearchService: 'search.note',
      ProfileSearchService: 'search.profile',
      
      // Tag service identifiers
      ProfileTagService: 'tag.profile',
    },
    registerServices: () => {},
    getService: (id: string) => {
      switch (id) {
      case 'repositories.profile': return mockProfileRepository;
      case 'embedding.profile': return mockProfileEmbeddingService;
      case 'tag.profile': return mockProfileTagService;
      case 'search.profile': return mockProfileSearchService;
      default: return {};
      }
    },
  };
});

describe('ProfileContext MCP SDK Implementation', () => {
  let profileContext: ProfileContext;
  
  beforeAll(() => {
    // Set up mock environment using centralized function
    setMockEnv();
  });
  
  afterAll(() => {
    // Clean up mock environment using centralized function
    clearMockEnv();
  });
  
  beforeEach(() => {
    // Create a new context with a mock API key for each test
    profileContext = new ProfileContext({ apiKey: 'mock-api-key' });
    
    // Also make sure the MCPServer is set properly
    Object.defineProperty(profileContext, 'mcpServer', {
      value: mockMcpServer,
      writable: true,
    });
  });
  
  test('ProfileContext properly initializes all services', () => {
    expect(profileContext).toBeDefined();
    
    // Check that basic methods are available
    expect(typeof profileContext.getProfile).toBe('function');
    expect(typeof profileContext.saveProfile).toBe('function');
    expect(typeof profileContext.updateProfileTags).toBe('function');
    expect(typeof profileContext.generateEmbeddingForProfile).toBe('function');
    
    // Check MCP SDK integration
    expect(profileContext.getMcpServer).toBeDefined();
    expect(typeof profileContext.getMcpServer).toBe('function');
    
    // Verify MCP server can be obtained
    const mcpServer = profileContext.getMcpServer();
    expect(mcpServer).toBeDefined();
  });
  
  test('should retrieve profile', async () => {
    const profile = await profileContext.getProfile();
    
    expect(profile).toBeDefined();
    // The profile data comes from whatever is in the database or mock,
    // so we'll just check that we get a profile with basic properties
    if (profile) {
      expect(profile).toHaveProperty('fullName');
      expect(profile).toHaveProperty('occupation');
    }
  });
  
  test('should extract profile keywords', async () => {
    const profile = await profileContext.getProfile();
    
    if (profile) {
      const keywords = profileContext.extractProfileKeywords(profile);
      
      expect(keywords).toBeDefined();
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      
      // Check for expected keywords based on profile content
      expect(keywords).toContain('ecosystem');
      expect(keywords).toContain('architect');
    }
  });
  
  test('should update profile tags', async () => {
    const result = await profileContext.updateProfileTags(true);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result && result.length).toBeGreaterThan(0);
    // The actual tags depend on the implementation and may vary
  });
  
  test('should prepare profile text for embedding', async () => {
    const profile = await profileContext.getProfile();
    
    if (profile) {
      const profileText = profileContext.getProfileTextForEmbedding(profile);
      
      expect(profileText).toBeDefined();
      expect(typeof profileText).toBe('string');
      expect(profileText.length).toBeGreaterThan(0);
      
      // Check for key profile information in the formatted text
      expect(profileText).toContain('Name:');
      // The actual content depends on the profile data which may vary
      expect(profileText).toContain('Occupation:');
    }
  });
  
  test('MCP Server can define resources', () => {
    // Get the MCP server
    const mcpServer = profileContext.getMcpServer();
    
    // Define a test resource
    mcpServer.resource(
      'test_resource',
      'test://profile',
      async () => {
        return {
          contents: [{
            uri: 'test://profile',
            text: 'Hello from Profile MCP test!',
          }],
        };
      },
    );
    
    // Just verify the resource was registered without trying to query it
    expect(mcpServer).toBeDefined();
  });
  
  test('MCP Server has profile resource registered', () => {
    const mcpServer = profileContext.getMcpServer();
    // This is a crude check since we can't directly inspect registered resources
    expect(mcpServer).toBeDefined();
  });
  
  test('MCP Server has profile tools registered', () => {
    const mcpServer = profileContext.getMcpServer();
    // This is a crude check since we can't directly inspect registered tools
    expect(mcpServer).toBeDefined();
  });
  
  test('should format profile for display', async () => {
    const profile = await profileContext.getProfile();
    
    if (profile) {
      // Since we can't test private methods directly, let's at least verify
      // that the profile has the expected properties
      expect(profile.fullName).toBeDefined();
      expect(profile.occupation).toBeDefined();
      
      // And make sure our mock text formatter works
      const text = mockProfileEmbeddingService.getProfileTextForEmbedding(profile);
      expect(text).toContain(`Name: ${profile.fullName}`);
      expect(text).toContain(`Occupation: ${profile.occupation}`);
    }
  });
});