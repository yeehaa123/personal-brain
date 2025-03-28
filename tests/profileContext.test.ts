import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { ProfileContext } from '../src/mcp/context/profileContext';
import { createMockEmbedding, mockEnv, resetMocks } from './mocks';
import { db } from '../src/db';

// Mock database
mock.module('../src/db', () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([
            {
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
                  startDate: '2020-01',
                  endDate: null
                }
              ],
              education: [
                {
                  degree: 'PhD in Systemic Design',
                  school: 'University of Innovation',
                  startDate: '2010-01',
                  endDate: '2014-01'
                }
              ],
              languages: ['English', 'JavaScript', 'Python'],
              city: 'Innovation City',
              state: 'Creative State',
              countryFullName: 'Futureland',
              embedding: createMockEmbedding('John Doe profile'),
              tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]),
          limit: () => Promise.resolve([
            {
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
                  startDate: '2020-01',
                  endDate: null
                }
              ],
              education: [
                {
                  degree: 'PhD in Systemic Design',
                  school: 'University of Innovation',
                  startDate: '2010-01',
                  endDate: '2014-01'
                }
              ],
              languages: ['English', 'JavaScript', 'Python'],
              city: 'Innovation City',
              state: 'Creative State',
              countryFullName: 'Futureland',
              embedding: createMockEmbedding('John Doe profile'),
              tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ])
        })
      }),
      insert: () => ({
        values: () => Promise.resolve({ insertId: 'mock-profile-id' })
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve({ changes: 1 })
        })
      })
    }
  };
});

// Mock NoteContext
const mockNoteContext = {
  searchNotes: async ({ query, tags, limit, includeContent }) => {
    // Always return notes with ecosystem tags for testing
    return [
      {
        id: 'note-1',
        title: 'Ecosystem Architecture Principles',
        content: includeContent === false ? '' : 'Content about ecosystem architecture',
        tags: ['ecosystem-architecture', 'innovation'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'note-2',
        title: 'Building Communities',
        content: includeContent === false ? '' : 'Content about community building',
        tags: ['community', 'collaboration'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  },
  searchNotesWithEmbedding: async (embedding, limit) => {
    return [
      {
        id: 'note-4',
        title: 'Semantic Note',
        content: 'Content related to the embedding',
        tags: ['semantic', 'ecosystem-architecture'],
        similarity: 0.85,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  },
  getRecentNotes: async (limit) => {
    return [
      {
        id: 'note-5',
        title: 'Recent Note',
        content: 'Recently added content',
        tags: ['ecosystem-architecture', 'recent'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
};

// Mock tag extraction
mock.module('../src/utils/tagExtractor', () => {
  return {
    extractTags: async (content, existingTags, maxTags) => {
      // Always return ecosystem architecture tags for our tests
      return ['ecosystem-architecture', 'innovation', 'collaboration', 'regenerative', 'decentralized'];
    }
  };
});

describe('ProfileContext', () => {
  let profileContext: ProfileContext;
  
  beforeAll(() => {
    mockEnv();
  });
  
  afterAll(() => {
    resetMocks();
  });
  
  beforeEach(() => {
    profileContext = new ProfileContext('mock-api-key');
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
  
  test('should generate profile tags', async () => {
    const profileText = `I am an Ecosystem Architect and innovator. I build systems that 
    foster collaboration and regenerative practices in communities and organizations.`;
    
    const tags = await profileContext.generateProfileTags(profileText);
    
    expect(tags).toBeDefined();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toContain('ecosystem-architecture');
    expect(tags).toContain('collaboration');
  });
  
  test('should update profile tags', async () => {
    const result = await profileContext.updateProfileTags(true);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result && result.length).toBeGreaterThan(0);
  });
  
  test('should prepare profile text for embedding', async () => {
    const profile = await profileContext.getProfile();
    
    if (profile) {
      // Access the private method using type assertion
      const profileText = (profileContext as any).getProfileTextForEmbedding(profile);
      
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
  
  test('should find related notes via tag matching', async () => {
    const relatedNotes = await profileContext.findRelatedNotes(mockNoteContext, 5);
    
    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
    expect(relatedNotes.length).toBeGreaterThan(0);
    
    // Verify that notes with matching tags were found
    const titles = relatedNotes.map(note => note.title);
    expect(titles).toContain('Ecosystem Architecture Principles');
  });
  
  test('should find similar tags between profile and notes', async () => {
    const profileTags = ['ecosystem-architecture', 'innovation', 'collaboration'];
    const result = await (profileContext as any).findNotesWithSimilarTags(mockNoteContext, profileTags, 3);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
  
  test('should fall back to embedding search when no tags match', async () => {
    // Create a custom mock NoteContext that only returns results for embedding search
    const customMockNoteContext = {
      ...mockNoteContext,
      searchNotes: async () => [], // Return empty array to force fallback
      searchNotesWithEmbedding: async () => [{
        id: 'semantic-note',
        title: 'Semantic Note',
        content: 'Content found through embedding search',
        tags: ['semantic'],
        similarity: 0.9,
        createdAt: new Date(),
        updatedAt: new Date()
      }]
    };
    
    const relatedNotes = await profileContext.findRelatedNotes(customMockNoteContext, 3);
    
    expect(relatedNotes).toBeDefined();
    expect(Array.isArray(relatedNotes)).toBe(true);
    expect(relatedNotes.length).toBeGreaterThan(0);
    
    // Should have fallen back to semantic search with the custom mock
    const titles = relatedNotes.map(note => note.title);
    expect(titles).toContain('Semantic Note');
  });
});