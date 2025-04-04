/**
 * Common test mocks for the personal-brain project
 */


import type { Note } from '@models/note';
import type { Profile } from '@models/profile';

import { clearTestEnv, setTestEnv } from './utils/envUtils';



// Mock deterministic embeddings for tests
export function createMockEmbedding(input: string, dimensions: number = 1536): number[] {
  // Create a deterministic embedding based on the input
  const seed = hashString(input);
  const embedding = Array(dimensions).fill(0).map((_, i) => {
    const x = Math.sin(seed + i * 0.1) * 10000;
    return (x - Math.floor(x)) * 0.8 - 0.4; // Values between -0.4 and 0.4
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Simple hash function for strings
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Create a mock note with specified properties
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

// Create a standard set of mock notes for testing
export function createMockNotes(): Note[] {
  return [
    createMockNote('note-1', 'Test Note 1', ['tag1', 'tag2']),
    createMockNote('note-2', 'Test Note 2'),
  ];
}

// Create a mock profile for testing
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
    languagesAndProficiencies: null,
    accomplishmentPublications: null,
    accomplishmentHonorsAwards: null,
    accomplishmentProjects: null,
    volunteerWork: null,
    embedding: createMockEmbedding('John Doe profile'),
    tags: ['ecosystem-architecture', 'innovation', 'collaboration'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Define tracker interfaces
interface DisplayListCall {
  items: unknown[];
  formatter?: (item: unknown, index: number) => string;
}

interface DisplayNotesCall {
  notes: unknown[];
  options?: Record<string, unknown>;
}

// Using array for backward compatibility with existing tests
export type PrintLabelValueCall = [string, unknown, Record<string, unknown>?];

// Create tracking objects for CLI interface call monitoring
export function createTrackers() {
  return {
    displayTitleCalls: [] as string[],
    displaySubtitleCalls: [] as string[],
    errorCalls: [] as string[],
    warnCalls: [] as string[],
    successCalls: [] as string[],
    infoCalls: [] as string[],
    printCalls: [] as string[],
    displayListCalls: [] as DisplayListCall[],
    displayNotesCalls: [] as DisplayNotesCall[],
    printLabelValueCalls: [] as PrintLabelValueCall[],
  };
}

// Logger interface
interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Mock logger functions
export function mockLogger(logger: Logger): Record<string, unknown> {
  const original = {
    info: logger.info,
    debug: logger.debug,
    warn: logger.warn,
    error: logger.error,
  };
  
  logger.info = () => {};
  logger.debug = () => {};
  logger.warn = () => {};
  logger.error = () => {};
  
  return original;
}

// Restore logger functions
export function restoreLogger(logger: Logger, original: Record<string, unknown>): void {
  logger.info = original['info'] as typeof logger.info;
  logger.debug = original['debug'] as typeof logger.debug;
  logger.warn = original['warn'] as typeof logger.warn;
  logger.error = original['error'] as typeof logger.error;
}

// Mock environment setup
export function mockEnv() {
  setTestEnv('ANTHROPIC_API_KEY', 'mock-api-key');
}

// Mock reset
export function resetMocks() {
  clearTestEnv('ANTHROPIC_API_KEY');
}