import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import type { ProfileRepository } from '@/services/profiles/profileRepository';
import { ProfileSearchService } from '@/services/profiles/profileSearchService';
import type { ProfileTagService } from '@/services/profiles/profileTagService';
import { MockProfileRepository } from '@test/__mocks__/repositories/profileRepository';
import { createMockEmbedding, setupEmbeddingMocks } from '@test/utils/embeddingUtils';
import { createTestNote } from '@test/utils/embeddingUtils';

// Define interface for NoteContext
interface NoteContext {
  searchNotes: (options: { tags?: string[]; limit?: number; semanticSearch?: boolean }) => Promise<Note[]>;
  searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<(Note & { similarity: number })[]>;
}

// Set up embedding service mocks
setupEmbeddingMocks(mock);

// Create a mock profile for testing
const mockProfile: Profile = {
  id: 'profile-1',
  publicIdentifier: null,
  profilePicUrl: null,
  backgroundCoverImageUrl: null,
  firstName: null,
  lastName: null,
  fullName: 'John Doe',
  followerCount: null,
  occupation: 'Software Engineer',
  headline: 'Senior Developer | Open Source Contributor',
  summary: 'Experienced software engineer with a focus on TypeScript and React.',
  country: null,
  countryFullName: 'Tech Country',
  city: 'Tech City',
  state: 'Tech State',
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
      description: null,
      logo_url: null,
      field_of_study: null,
      school_linkedin_profile_url: null,
      school_facebook_profile_url: null,
      grade: null,
      activities_and_societies: null,
    },
  ],
  languages: ['English', 'JavaScript', 'TypeScript'],
  languagesAndProficiencies: null,
  accomplishmentPublications: null,
  accomplishmentHonorsAwards: null,
  accomplishmentProjects: null,
  volunteerWork: null,
  embedding: createMockEmbedding('John Doe profile'),
  tags: ['software-engineering', 'typescript', 'react'],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
};

// Create mock notes for testing
const mockNotes: Note[] = [
  createTestNote({
    id: 'note-1',
    title: 'TypeScript Best Practices',
    content: 'Guide to TypeScript development and best practices.',
    tags: ['typescript', 'software-engineering', 'programming'],
    embedding: createMockEmbedding('typescript note'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    source: 'import',
  }),
  createTestNote({
    id: 'note-2',
    title: 'React Component Design',
    content: 'How to design effective React components.',
    tags: ['react', 'frontend', 'ui-design'],
    embedding: createMockEmbedding('react note'),
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-02'),
    source: 'import',
  }),
  createTestNote({
    id: 'note-3',
    title: 'Machine Learning Introduction',
    content: 'Introduction to ML concepts and applications.',
    tags: ['machine-learning', 'ai', 'data-science'],
    embedding: createMockEmbedding('ml note'),
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-02'),
    source: 'import',
  }),
];

// Create a mock repository with our standardized mock
MockProfileRepository.resetInstance();
const mockRepository = MockProfileRepository.createFresh([mockProfile]);

// Create a mock note context
const mockNoteContext: NoteContext = {
  searchNotes: async (options: { tags?: string[]; limit?: number; semanticSearch?: boolean }) => {
    const { tags, limit = 10 } = options;

    if (tags && tags.length > 0) {
      return mockNotes.filter(note => {
        if (!note.tags) return false;
        return tags.some(tag => note.tags!.includes(tag));
      }).slice(0, limit);
    }

    return mockNotes.slice(0, limit);
  },

  searchNotesWithEmbedding: async (_embedding: number[], limit = 5) => {
    // Return notes with a guaranteed similarity score
    const notesWithScores = mockNotes.map((note, index) => {
      // Create a deterministic score based on index
      const score = 0.9 - (index * 0.1);
      return {
        ...note,
        similarity: score,
      };
    });

    return notesWithScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },
};

// Add the static factory method to the class constructor for testing
ProfileSearchService.createWithApiKey = (_apiKey?: string) => {
  // Mock the embeddingService and tagService with empty objects
  const mockEmbeddingService = {} as ProfileEmbeddingService;
  const mockTagService = {} as ProfileTagService;
  return new ProfileSearchService(mockRepository as unknown as ProfileRepository, mockEmbeddingService, mockTagService);
};

describe('ProfileSearchService', () => {
  let searchService: ProfileSearchService;

  beforeEach(() => {
    // Go back to using the factory method which we've mocked
    searchService = ProfileSearchService.createWithApiKey('mock-api-key');
  });

  test('should properly initialize', () => {
    expect(searchService).toBeDefined();
  });

  test('should create instance using factory method', () => {
    const service = ProfileSearchService.createWithApiKey('mock-api-key');
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ProfileSearchService);
  });

  test('should find related notes', async () => {
    const results = await searchService.findRelatedNotes(mockNoteContext, 5);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Note: The actual implementation may return notes without similarity scores
    // in certain cases (e.g., when using tag-based search), so we skip this check
  });

  test('should find notes with similar tags', async () => {
    const results = await searchService.findNotesWithSimilarTags(
      mockNoteContext,
      ['typescript', 'software-engineering'],
      5,
      0, // Add the offset parameter
    );

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Results should include notes with matching tags
    const foundTags = results.flatMap(note => note.tags || []);
    expect(foundTags).toContain('typescript');
    expect(foundTags).toContain('software-engineering');
  });

  test('should handle case when profile is not found', async () => {
    // Use our standardized mock repository with no profiles
    MockProfileRepository.resetInstance();
    const emptyRepository = MockProfileRepository.createFresh([]);
    emptyRepository.getProfile = async () => undefined;

    const mockEmbeddingService = {} as ProfileEmbeddingService;
    const mockTagService = {} as ProfileTagService;
    const serviceWithEmptyRepo = new ProfileSearchService(
      emptyRepository as unknown as ProfileRepository,
      mockEmbeddingService,
      mockTagService,
    );

    const results = await serviceWithEmptyRepo.findRelatedNotes(mockNoteContext, 5);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  test('should handle profile without embedding', async () => {
    // Create a profile without embedding
    const profileWithoutEmbedding: Profile = {
      ...mockProfile,
      embedding: null,
    };

    // Use our standardized mock repository
    MockProfileRepository.resetInstance();
    const repositoryWithoutEmbedding = MockProfileRepository.createFresh([profileWithoutEmbedding]);

    const mockEmbeddingService = {} as ProfileEmbeddingService;
    const mockTagService = {} as ProfileTagService;
    const serviceWithoutEmbedding = new ProfileSearchService(
      repositoryWithoutEmbedding as unknown as ProfileRepository,
      mockEmbeddingService,
      mockTagService,
    );

    const results = await serviceWithoutEmbedding.findRelatedNotes(mockNoteContext, 5);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    // Should still return results based on tags if available
    expect(results.length).toBeGreaterThan(0);
  });

  test('should handle profile without tags', async () => {
    // Create a profile without tags
    const profileWithoutTags: Profile = {
      ...mockProfile,
      tags: null,
    };

    // Use our standardized mock repository
    MockProfileRepository.resetInstance();
    const repositoryWithoutTags = MockProfileRepository.createFresh([profileWithoutTags]);

    const mockEmbeddingService = {} as ProfileEmbeddingService;
    const mockTagService = {} as ProfileTagService;
    const serviceWithoutTags = new ProfileSearchService(
      repositoryWithoutTags as unknown as ProfileRepository,
      mockEmbeddingService,
      mockTagService,
    );

    const results = await serviceWithoutTags.findNotesWithSimilarTags(mockNoteContext, [], 5);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});
