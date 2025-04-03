/**
 * Mocks for repository tests
 */
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';
import { createMockEmbedding } from '@test/utils/embeddingUtils';

// Create mock notes
export function createMockNote(id: string, title: string, tags: string[] = []): Note {
  return {
    id,
    title,
    content: `This is the content of ${title}`,
    tags,
    embedding: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };
}

export function createMockNotes(): Note[] {
  return [
    createMockNote('note-1', 'Test Note 1', ['tag1', 'tag2']),
    createMockNote('note-2', 'Test Note 2'),
  ];
}

// Create mock profiles
export function createMockProfile(id: string = 'mock-profile-id'): Profile {
  return {
    id,
    publicIdentifier: null,
    profilePicUrl: null,
    backgroundCoverImageUrl: null,
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    followerCount: null,
    headline: 'Innovator | Thinker | Community Builder',
    summary: 'I build ecosystems that foster innovation and collaboration.',
    occupation: 'Ecosystem Architect',
    country: null,
    countryFullName: 'Futureland',
    city: 'Innovation City',
    state: 'Creative State',
    experiences: [
      {
        title: 'Ecosystem Architect',
        company: 'Ecosystem Corp',
        description: 'Building regenerative ecosystem architectures',
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
        degree_name: 'PhD in Systemic Design',
        school: 'University of Innovation',
        starts_at: { day: 1, month: 1, year: 2010 },
        ends_at: { day: 1, month: 1, year: 2014 },
        field_of_study: null,
        school_linkedin_profile_url: null,
        school_facebook_profile_url: null,
        description: null,
        logo_url: null,
        grade: null,
        activities_and_societies: null,
      },
    ],
    languages: ['English', 'JavaScript', 'Python'],
    languagesAndProficiencies: [
      { name: 'English', proficiency: 'Native' },
      { name: 'JavaScript', proficiency: 'Professional' },
    ],
    accomplishmentPublications: [
      {
        name: 'Ecosystem Architecture Theory',
        publisher: 'Journal of Innovation',
        published_on: { day: 1, month: 1, year: 2022 },
        description: 'A new approach to ecosystem design',
        url: 'https://example.com/publication',
      },
    ],
    accomplishmentHonorsAwards: null,
    accomplishmentProjects: null,
    volunteerWork: null,
    embedding: createMockEmbedding('John Doe profile'),
    tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Mock repository classes
export class MockNoteRepository {
  notes: Note[] = [];
  
  constructor(initialNotes: Note[] = createMockNotes()) {
    this.notes = [...initialNotes];
  }
  
  getById = async (id: string): Promise<Note | null> => {
    return this.notes.find(note => note.id === id) || null;
  };
  
  getAll = async (): Promise<Note[]> => {
    return [...this.notes];
  };
  
  create = async (note: Omit<Note, 'id'>): Promise<Note> => {
    const newNote = { ...note, id: `note-${Date.now()}` } as Note;
    this.notes.push(newNote);
    return newNote;
  };
  
  update = async (id: string, update: Partial<Note>): Promise<Note | null> => {
    const index = this.notes.findIndex(note => note.id === id);
    if (index === -1) return null;
    
    this.notes[index] = { ...this.notes[index], ...update };
    return this.notes[index];
  };
  
  delete = async (id: string): Promise<boolean> => {
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    return this.notes.length < initialLength;
  };
  
  searchByKeywords = async (_query: string | undefined, _tags?: string[], limit?: number, offset?: number): Promise<Note[]> => {
    // Unused parameters prefixed with _ to avoid warnings
    return this.notes.slice(offset || 0, (offset || 0) + (limit || this.notes.length));
  };
}

export class MockProfileRepository {
  profiles: Profile[] = [];
  
  constructor(initialProfiles: Profile[] = [createMockProfile()]) {
    this.profiles = [...initialProfiles];
  }
  
  getById = async (id: string): Promise<Profile | null> => {
    return this.profiles.find(profile => profile.id === id) || null;
  };
  
  getAll = async (): Promise<Profile[]> => {
    return [...this.profiles];
  };
  
  create = async (profile: Omit<Profile, 'id'>): Promise<Profile> => {
    const newProfile = { ...profile, id: `profile-${Date.now()}` } as Profile;
    this.profiles.push(newProfile);
    return newProfile;
  };
  
  update = async (id: string, update: Partial<Profile>): Promise<Profile | null> => {
    const index = this.profiles.findIndex(profile => profile.id === id);
    if (index === -1) return null;
    
    this.profiles[index] = { ...this.profiles[index], ...update };
    return this.profiles[index];
  };
  
  delete = async (id: string): Promise<boolean> => {
    const initialLength = this.profiles.length;
    this.profiles = this.profiles.filter(profile => profile.id !== id);
    return this.profiles.length < initialLength;
  };
}