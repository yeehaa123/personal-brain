import { test, expect, describe, beforeEach, mock, beforeAll, afterAll } from 'bun:test';
import { ProfileContext } from '@mcp/context/profileContext';
import { createMockEmbedding, mockEnv, resetMocks } from '@test/mocks';

// Mock database
mock.module('@/db', () => {
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
            },
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
            },
          ]),
        }),
      }),
      insert: () => ({
        values: () => Promise.resolve({ insertId: 'mock-profile-id' }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve({ changes: 1 }),
        }),
      }),
    },
  };
});

// Create a mock NoteContext that implements the required interface
const mockNoteContext = {
  // Implement minimal required methods
  searchNotes: async (options: { 
    query?: string; 
    tags?: string[]; 
    limit?: number; 
    includeContent?: boolean
  }) => {
    const includeContent = options.includeContent !== false;
    // Always return notes with ecosystem tags for testing
    return [
      {
        id: 'note-1',
        title: 'Ecosystem Architecture Principles',
        content: includeContent ? 'Content about ecosystem architecture' : '',
        tags: ['ecosystem-architecture', 'innovation'],
        embedding: createMockEmbedding('ecosystem note'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'note-2',
        title: 'Building Communities',
        content: includeContent ? 'Content about community building' : '',
        tags: ['community', 'collaboration'],
        embedding: createMockEmbedding('community note'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  },
  
  searchNotesWithEmbedding: async (embedding: number[], _limit: number = 5) => {
    // Return notes with embeddings and similarity score
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
  
  getRecentNotes: async (_limit: number = 5) => {
    return [
      {
        id: 'note-5',
        title: 'Recent Note',
        content: 'Recently added content',
        tags: ['ecosystem-architecture', 'recent'],
        embedding: createMockEmbedding('recent note'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  },
  
  // Stub implementations of other required methods
  getNoteById: async (id: string) => {
    return {
      id,
      title: 'Test Note',
      content: 'Test content',
      tags: ['test'],
      embedding: createMockEmbedding('test'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
  
  createNote: async () => 'mock-note-id',
  getRelatedNotes: async () => [],
  generateEmbeddingsForAllNotes: async () => ({ updated: 0, failed: 0 }),
  getNoteCount: async () => 5,
};

// Mock tag extraction
mock.module('@utils/tagExtractor', () => {
  return {
    extractTags: async (_content: unknown, _existingTags: unknown, _maxTags: unknown) => {
      // Always return ecosystem architecture tags for our tests
      return ['ecosystem-architecture', 'innovation', 'collaboration', 'regenerative', 'decentralized'];
    },
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
      // Access the private method using a type assertion to unknown first
      const profileTextMethod = (profileContext as unknown as { 
        getProfileTextForEmbedding: (p: Record<string, unknown>) => string 
      }).getProfileTextForEmbedding;
      
      const profileText = profileTextMethod(profile);
      
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
    const result = await (profileContext as unknown as { 
      findNotesWithSimilarTags: (
        noteContext: typeof mockNoteContext, 
        tags: string[], 
        limit: number,
      ) => Promise<Array<unknown>>
    }).findNotesWithSimilarTags(mockNoteContext, profileTags, 3);
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
  
  test('should fall back to embedding search when no tags match', async () => {
    // Create a custom mock NoteContext that only returns results for embedding search
    const customMockNoteContext = {
      ...mockNoteContext,
      // Override searchNotes to return empty results and force fallback
      searchNotes: async (_options: unknown) => [], 
      // Override searchNotesWithEmbedding to return semantic results
      searchNotesWithEmbedding: async (_embedding: number[], _limit: number = 5) => [{
        id: 'semantic-note',
        title: 'Semantic Note',
        content: 'Content found through embedding search',
        tags: ['semantic'],
        embedding: createMockEmbedding('semantic fallback note'),
        similarity: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
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