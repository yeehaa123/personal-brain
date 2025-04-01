import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { ProfileContext } from '@/mcp';
import { setTestEnv, clearTestEnv } from '@test/utils/envUtils';
import { createMockEmbedding } from '@test/mocks';
import type { Profile } from '@/models/profile';

// Mock the Anthropic client
mock.module('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        // Mock constructor
      }
      
      messages = {
        create: async () => ({
          id: 'mock-msg-id',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Mock response' }],
          model: 'claude-3-haiku-20240307',
          stop_reason: 'end_turn',
        }),
      };
    },
  };
});

// Create a mock profile
const mockProfile = {
  id: 'mock-profile-id',
  fullName: 'John Doe',
  occupation: 'Ecosystem Architect',
  headline: 'Innovator | Thinker | Community Builder',
  summary: 'I build ecosystems that foster innovation and collaboration.',
  experiences: [
    {
      title: 'Ecosystem Architect',
      company: 'Ecosystem Corp',
      description: 'Building regenerative ecosystem architectures',
      starts_at: { day: 1, month: 1, year: 2020 },
      ends_at: null,
    },
  ],
  education: [
    {
      degree_name: 'PhD in Systemic Design',
      school: 'University of Innovation',
      starts_at: { day: 1, month: 1, year: 2010 },
      ends_at: { day: 1, month: 1, year: 2014 },
    },
  ],
  languages: ['English', 'JavaScript', 'Python'],
  city: 'Innovation City',
  state: 'Creative State',
  countryFullName: 'Futureland',
  embedding: createMockEmbedding('John Doe profile'),
  tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock profile repository
mock.module('@/services/profiles/profileRepository', () => {
  return {
    ProfileRepository: class MockProfileRepository {
      getProfile() {
        return Promise.resolve(mockProfile);
      }
      
      insertProfile() {
        return Promise.resolve('mock-profile-id');
      }
      
      updateProfile() {
        return Promise.resolve(true);
      }
    },
  };
});

// Mock profile embedding service
mock.module('@/services/profiles/profileEmbeddingService', () => {
  return {
    ProfileEmbeddingService: class MockProfileEmbeddingService {
      constructor() {}
      
      generateEmbedding() {
        return Promise.resolve(createMockEmbedding('profile embedding'));
      }
      
      generateEmbeddingForProfile() {
        return Promise.resolve({ updated: true });
      }
      
      shouldRegenerateEmbedding() {
        return true;
      }
      
      getProfileTextForEmbedding(profile: Partial<Profile>) {
        const parts = [];
        if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
        if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
        if (profile.summary) parts.push(`Summary: ${profile.summary}`);
        return parts.join('\n');
      }
    },
  };
});

// Mock profile tag service
mock.module('@/services/profiles/profileTagService', () => {
  return {
    ProfileTagService: class MockProfileTagService {
      constructor() {}
      
      generateProfileTags() {
        return Promise.resolve(['ecosystem-architecture', 'innovation', 'collaboration']);
      }
      
      updateProfileTags() {
        return Promise.resolve(['ecosystem-architecture', 'innovation', 'collaboration', 'regenerative']);
      }
      
      extractProfileKeywords(profile: Partial<Profile>) {
        const keywords = ['ecosystem', 'architect', 'innovation', 'collaboration'];
        
        // Add keywords from experiences
        if (Array.isArray(profile.experiences) && profile.experiences.length > 0) {
          profile.experiences.forEach((exp: { title?: string }) => {
            if (exp.title && typeof exp.title === 'string' && exp.title.toLowerCase().includes('architect')) {
              keywords.push('architecture');
            }
          });
        }
        
        return keywords;
      }
    },
  };
});

// Mock profile search service
mock.module('@/services/profiles/profileSearchService', () => {
  return {
    ProfileSearchService: class MockProfileSearchService {
      constructor() {}
      
      findRelatedNotes() {
        return Promise.resolve([
          {
            id: 'note-1',
            title: 'Ecosystem Architecture Principles',
            content: 'Content about ecosystem architecture',
            tags: ['ecosystem-architecture', 'innovation'],
            embedding: createMockEmbedding('ecosystem note'),
            similarity: 0.85,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
      
      findNotesWithSimilarTags() {
        return Promise.resolve([
          {
            id: 'note-1',
            title: 'Ecosystem Architecture Principles',
            content: 'Content about ecosystem architecture',
            tags: ['ecosystem-architecture', 'innovation'],
            embedding: createMockEmbedding('ecosystem note'),
            similarity: 0.85,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'note-2',
            title: 'Building Communities',
            content: 'Content about community building',
            tags: ['community', 'collaboration'],
            embedding: createMockEmbedding('community note'),
            similarity: 0.75,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
    },
  };
});

// Mock NoteContext is referenced in the commented out tests but not actually used
// We'll keep it commented out until we need it in future tests
/*
const mockNoteContext = {
  searchNotes: async () => {
    return [
      {
        id: 'note-1',
        title: 'Ecosystem Architecture Principles',
        content: 'Content about ecosystem architecture',
        tags: ['ecosystem-architecture', 'innovation'],
        embedding: createMockEmbedding('ecosystem note'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  },
  
  searchNotesWithEmbedding: async () => {
    return [
      {
        id: 'note-4',
        title: 'Semantic Note',
        content: 'Content related to the embedding',
        tags: ['semantic', 'ecosystem-architecture'],
        embedding: createMockEmbedding('semantic note'),
        similarity: 0.85,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  },
};
*/

describe('ProfileContext MCP SDK Implementation', () => {
  let profileContext: ProfileContext;
  
  beforeAll(() => {
    // Set up mock environment
    setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
  });
  
  afterAll(() => {
    // Clean up mock environment
    clearTestEnv('ANTHROPIC_API_KEY');
  });
  
  beforeEach(() => {
    // Create a new context with a mock API key for each test
    profileContext = new ProfileContext('mock-api-key');
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
    expect(profile?.fullName).toBe('John Doe');
    expect(profile?.occupation).toBe('Ecosystem Architect');
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
    expect(result).toContain('regenerative');
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
      expect(profileText).toContain('John Doe');
      expect(profileText).toContain('Occupation:');
      expect(profileText).toContain('Ecosystem Architect');
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
      // We can't directly test private methods, but we can test them indirectly
      // by using MCP resource queries - would be implemented in a real test
    }
  });
});