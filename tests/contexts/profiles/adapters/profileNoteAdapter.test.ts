import type { mock} from 'bun:test';
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';

import type { NoteContext } from '@/contexts/notes/noteContext';
import { ProfileNoteAdapter } from '@/contexts/profiles/adapters/profileNoteAdapter';
import type { Note } from '@/models/note';
import type { Profile } from '@/models/profile';
import type { TagExtractor } from '@/utils/tagExtractor';

// Create mock classes
class MockNoteContext {
  async getNoteById() { return null; }
  async createNote() { return 'note-id'; }
  async updateNote() { return true; }
}

class MockTagExtractor {
  async extractTags() { return ['software', 'engineer', 'typescript', 'react']; }
}

describe('ProfileNoteAdapter', () => {
  // Mock dependencies
  let mockNoteContext: MockNoteContext;
  let mockTagExtractor: MockTagExtractor;
  let adapter: ProfileNoteAdapter;
  
  // Sample profile for testing
  const sampleProfile: Profile = {
    displayName: 'Test User',
    email: 'test@example.com',
    headline: 'Software Engineer',
    summary: 'Experienced software engineer with expertise in TypeScript and React.',
    skills: ['TypeScript', 'React', 'Node.js'],
  };
  
  beforeEach(() => {
    // Create mock implementations
    mockNoteContext = new MockNoteContext();
    mockTagExtractor = new MockTagExtractor();
    
    // Set up spies
    spyOn(mockNoteContext, 'getNoteById');
    spyOn(mockNoteContext, 'createNote');
    spyOn(mockNoteContext, 'updateNote');
    spyOn(mockTagExtractor, 'extractTags');
    
    // Create a fresh adapter with mocked dependencies
    adapter = ProfileNoteAdapter.createFresh({
      noteContext: mockNoteContext as unknown as NoteContext,
      tagExtractor: mockTagExtractor as unknown as TagExtractor,
    });
  });
  
  test('should create singleton instance', () => {
    const instance1 = ProfileNoteAdapter.getInstance({
      noteContext: mockNoteContext as unknown as NoteContext,
      tagExtractor: mockTagExtractor as unknown as TagExtractor,
    });
    
    const instance2 = ProfileNoteAdapter.getInstance();
    
    expect(instance1).toBe(instance2);
    
    // Reset for other tests
    ProfileNoteAdapter.resetInstance();
  });
  
  test('should convert profile to note format with injected tag extractor', async () => {
    const noteData = await adapter.convertProfileToNote(sampleProfile);
    
    // Verify contents
    expect(noteData.title).toBe('Profile: Test User');
    expect(noteData.source).toBe('profile');
    expect(noteData.content).toContain('# Test User');
    expect(noteData.content).toContain('*Software Engineer*');
    expect(noteData.content).toContain('Experienced software engineer');
    expect(noteData.content).toContain('```json');
    
    // Verify tags were extracted and combined with profile skills
    expect(mockTagExtractor.extractTags).toHaveBeenCalled();
    
    // Assuming the mock returns the tags defined above
    const tags = noteData.tags || [];
    expect(tags).toContain('typescript');
    expect(tags).toContain('react');
    expect(tags).toContain('software');
    expect(tags).toContain('engineer');
    
    // Verify no duplicates in tags
    expect(new Set(tags).size).toBe(tags.length);
  });
  
  test('should save a new profile as a note', async () => {
    const result = await adapter.saveProfile(sampleProfile);
    
    expect(result).toBe(true);
    expect(mockNoteContext.getNoteById).toHaveBeenCalledWith(ProfileNoteAdapter.PROFILE_NOTE_ID);
    expect(mockNoteContext.createNote).toHaveBeenCalled();
  });
  
  test('should update an existing profile', async () => {
    // Set up the mock to return an existing note
    const existingNote: Note = {
      id: ProfileNoteAdapter.PROFILE_NOTE_ID,
      title: 'Profile: Old Name',
      content: 'Old content',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'profile',
      embedding: null,
      confidence: null,
      tags: null,
      conversationMetadata: null,
      verified: null,
    };
    
    // Override the spy to return an existing note
    (mockNoteContext.getNoteById as ReturnType<typeof mock>).mockImplementation(() => Promise.resolve(existingNote));
    
    const result = await adapter.saveProfile(sampleProfile);
    
    expect(result).toBe(true);
    expect(mockNoteContext.getNoteById).toHaveBeenCalledWith(ProfileNoteAdapter.PROFILE_NOTE_ID);
    expect(mockNoteContext.updateNote).toHaveBeenCalled();
  });
  
  test('should extract profile from note', async () => {
    // Create a note with profile data
    const noteWithProfile: Note = {
      id: ProfileNoteAdapter.PROFILE_NOTE_ID,
      title: 'Profile: Test User',
      content: `# Test User\n\nSome content\n\n<!-- Profile data -->\n\`\`\`json\n${JSON.stringify(sampleProfile, null, 2)}\n\`\`\``,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'profile',
      embedding: null,
      confidence: null,
      tags: null,
      conversationMetadata: null,
      verified: null,
    };
    
    const profile = adapter.convertNoteToProfile(noteWithProfile);
    
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Test User');
    expect(profile?.email).toBe('test@example.com');
    expect(profile?.skills).toContain('TypeScript');
  });
  
  test('should handle invalid note content', async () => {
    // Create a note with invalid JSON
    const noteWithInvalidData: Note = {
      id: ProfileNoteAdapter.PROFILE_NOTE_ID,
      title: 'Profile: Test User',
      content: '# Test User\n\nSome content\n\n<!-- Profile data -->\n```json\nInvalid JSON\n```',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'profile',
      embedding: null,
      confidence: null,
      tags: null,
      conversationMetadata: null,
      verified: null,
    };
    
    const profile = adapter.convertNoteToProfile(noteWithInvalidData);
    
    expect(profile).toBeNull();
  });
});