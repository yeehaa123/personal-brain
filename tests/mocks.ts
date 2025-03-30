/**
 * Common test mocks for the personal-brain project
 */
import type { Note } from '../src/models/note';
import type { Profile } from '../src/models/profile';

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
        endDate: null,
      },
    ],
    education: [
      {
        degree: 'PhD in Systemic Design',
        school: 'University of Innovation',
        startDate: '2010-01',
        endDate: '2014-01',
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
}

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
    displayListCalls: [] as any[],
    displayNotesCalls: [] as any[],
    printLabelValueCalls: [] as any[],
  };
}

// Mock logger functions
export function mockLogger(logger: any) {
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
export function restoreLogger(logger: any, original: any) {
  logger.info = original.info;
  logger.debug = original.debug;
  logger.warn = original.warn;
  logger.error = original.error;
}

// Mock environment setup
export function mockEnv() {
  process.env.ANTHROPIC_API_KEY = 'mock-api-key';
}

// Mock reset
export function resetMocks() {
  delete process.env.ANTHROPIC_API_KEY;
}